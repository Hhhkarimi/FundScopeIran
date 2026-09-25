import { mergeFundData, TSETMC_FUND_TYPES } from "../lib/etl";
import { mergeHistoricalPoints } from "../lib/file-store";
import { fetchDailyPriceHistory, fetchTsetmcFundDetails, fetchTsetmcFundUniverse } from "../lib/sources/tsetmc";

type Point = {
  regNo: string;
  date: string;
  closePrice: number | null;
  lastPrice: number | null;
  navCancel: number | null;
  navIssue: number | null;
  navStatistical: number | null;
  volume: number | null;
  tradeValue: number | null;
  netAsset: number | null;
  dailyReturn: number | null;
};

const numberOrNull = (value: unknown) => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(String(value).replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
};

function isoDate(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  const raw = String(value);
  if (/^\d{8}$/.test(raw)) return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

async function main() {
  const capturedAt = new Date().toISOString();
  const rows = mergeFundData({
    funds: await fetchTsetmcFundUniverse(),
    fundTypes: TSETMC_FUND_TYPES,
    instruments: [], transactions: [], clientTypes: [], marketWatch: [], capturedAt
  });
  const limit = Number(process.env.BACKFILL_LIMIT || "0");
  const days = Number(process.env.BACKFILL_DAYS || "730");
  const cutoff = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
  const selected = limit > 0 ? rows.slice(0, limit) : rows;
  const allPoints: Point[] = [];
  let failures = 0;
  const concurrency = 4;

  for (let offset = 0; offset < selected.length; offset += concurrency) {
    const batch = selected.slice(offset, offset + concurrency);
    const results = await Promise.allSettled(batch.map(async (fund) => {
      const [details, prices] = await Promise.all([
        fetchTsetmcFundDetails(fund.regNo).catch(() => null),
        fund.insCode ? fetchDailyPriceHistory(fund.insCode, 0).catch(() => []) : Promise.resolve([])
      ]);
      const byDate = new Map<string, Point>();
      const stats = Array.isArray(details?.stats) ? details.stats as Array<Record<string, unknown>> : [];
      for (const stat of stats) {
        const date = isoDate(stat.recordDate ?? stat.date);
        if (!date || date < cutoff) continue;
        byDate.set(date, {
          regNo: fund.regNo, date, closePrice: null, lastPrice: null,
          navCancel: numberOrNull(stat.navRed ?? stat.cancelNav),
          navIssue: numberOrNull(stat.navSub ?? stat.issueNav),
          navStatistical: numberOrNull(stat.navStat ?? stat.statisticalNav),
          volume: null, tradeValue: null,
          netAsset: numberOrNull(stat.netAsset), dailyReturn: null
        });
      }
      for (const price of prices) {
        const date = isoDate(price.dEven ?? price.transactionDate ?? price.date);
        if (!date || date < cutoff) continue;
        const current = byDate.get(date) || {
          regNo: fund.regNo, date, closePrice: null, lastPrice: null,
          navCancel: null, navIssue: null, navStatistical: null,
          volume: null, tradeValue: null, netAsset: null, dailyReturn: null
        };
        current.closePrice = numberOrNull(price.pClosing ?? price.closingPrice ?? price.pc);
        current.lastPrice = numberOrNull(price.pDrCotVal ?? price.lastTransaction ?? price.pl);
        current.volume = numberOrNull(price.qTotTran5J ?? price.numberOfVolume ?? price.tvol);
        current.tradeValue = numberOrNull(price.qTotCap ?? price.transactionValue ?? price.tval);
        byDate.set(date, current);
      }
      const ordered = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
      let previousNav: number | null = null;
      for (const point of ordered) {
        if (previousNav && point.navCancel) point.dailyReturn = (point.navCancel / previousNav - 1) * 100;
        if (point.navCancel) previousNav = point.navCancel;
      }
      return ordered;
    }));

    results.forEach((result) => {
      if (result.status === "fulfilled") allPoints.push(...result.value);
      else { failures += 1; console.warn(result.reason); }
    });
    console.log(`Backfill progress ${Math.min(offset + concurrency, selected.length)}/${selected.length}`);
    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  if (!allPoints.length) throw new Error("Historical backfill returned no real points");
  await mergeHistoricalPoints(allPoints);
  console.log(JSON.stringify({ ok: true, funds: selected.length, points: allPoints.length, failures, cutoff }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
