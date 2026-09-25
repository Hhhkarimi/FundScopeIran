import { db } from "../lib/db";
import { fetchFundAssetHistory, fetchFundNavHistory, fetchFundUniverse, fetchInstrumentPriceHistory } from "../lib/sources/fipiran";
import { fetchDailyPriceHistory } from "../lib/sources/tsetmc";

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const numberOrNull = (value: unknown) => {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

function isoDate(value: unknown): string | null {
  if (!value) return null;
  const s = String(value);
  if (/^\d{8}$/.test(s)) return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
  const date = new Date(s);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

async function main() {
  const sql = db();
  const funds = await fetchFundUniverse();
  const limit = Number(process.env.BACKFILL_LIMIT || "0");
  const selected = limit > 0 ? funds.slice(0, limit) : funds;
  const includePrices = process.env.BACKFILL_ETF_PRICES !== "false";

  console.log(`Backfilling ${selected.length} funds. ETF prices: ${includePrices}`);

  for (let index = 0; index < selected.length; index += 1) {
    const fund = selected[index];
    const regNo = fund.regNo ? String(fund.regNo) : null;
    if (!regNo) continue;
    const groupId = fund.groupId ? String(fund.groupId) : "0";
    process.stdout.write(`[${index + 1}/${selected.length}] ${fund.smallSymbolName || fund.name || regNo} ... `);

    try {
      const [navHistory, assetHistory] = await Promise.all([
        fetchFundNavHistory(regNo, groupId),
        fetchFundAssetHistory(regNo, groupId)
      ]);

      const byDate = new Map<string, {
        navCancel: number | null; navIssue: number | null; navStatistical: number | null;
        netAsset: number | null; unitsSubDay: number | null; unitsRedDay: number | null;
      }>();

      for (const item of navHistory) {
        const date = isoDate(item.date);
        if (!date) continue;
        const current = byDate.get(date) || { navCancel: null, navIssue: null, navStatistical: null, netAsset: null, unitsSubDay: null, unitsRedDay: null };
        current.navCancel = numberOrNull(item.cancelNav);
        current.navIssue = numberOrNull(item.issueNav);
        current.navStatistical = numberOrNull(item.statisticalNav);
        byDate.set(date, current);
      }
      for (const item of assetHistory) {
        const date = isoDate(item.date);
        if (!date) continue;
        const current = byDate.get(date) || { navCancel: null, navIssue: null, navStatistical: null, netAsset: null, unitsSubDay: null, unitsRedDay: null };
        current.netAsset = numberOrNull(item.netAsset);
        current.unitsSubDay = numberOrNull(item.unitsSubDAY);
        current.unitsRedDay = numberOrNull(item.unitsRedDAY);
        byDate.set(date, current);
      }

      const ordered = [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b));
      let previousNav: number | null = null;
      for (const [date, item] of ordered) {
        const dailyReturn = previousNav && item.navCancel && previousNav > 0
          ? ((item.navCancel / previousNav) - 1) * 100
          : null;
        await sql`
          insert into fund_daily_history (
            reg_no, trade_date, nav_cancel, nav_issue, nav_statistical, net_asset, daily_return, source
          ) values (
            ${regNo}, ${date}, ${item.navCancel}, ${item.navIssue}, ${item.navStatistical},
            ${item.netAsset}, ${dailyReturn}, 'fipiran'
          ) on conflict (reg_no, trade_date, source) do update set
            nav_cancel = excluded.nav_cancel,
            nav_issue = excluded.nav_issue,
            nav_statistical = excluded.nav_statistical,
            net_asset = excluded.net_asset,
            daily_return = excluded.daily_return
        `;
        if (item.navCancel !== null) previousNav = item.navCancel;
      }

      if (includePrices && fund.insCode) {
        let history: Array<Record<string, unknown>> = [];
        let priceSource = "fipiran";
        try {
          history = await fetchInstrumentPriceHistory(String(fund.insCode));
        } catch (fipiranError) {
          try {
            history = await fetchDailyPriceHistory(String(fund.insCode), 0);
            priceSource = "tsetmc";
          } catch (tsetmcError) {
            console.warn(`price history skipped: Fipiran=${fipiranError instanceof Error ? fipiranError.message : fipiranError}; TSETMC=${tsetmcError instanceof Error ? tsetmcError.message : tsetmcError}`);
          }
        }
        for (const item of history) {
          const date = isoDate(item.transactionDate ?? item.dEven ?? item.date);
          if (!date) continue;
          await sql`
            insert into fund_daily_history (
              reg_no, trade_date, close_price, last_price, volume, trade_value, source
            ) values (
              ${regNo}, ${date}, ${numberOrNull(item.closingPrice ?? item.pClosing ?? item.pc)},
              ${numberOrNull(item.lastTransaction ?? item.pDrCotVal ?? item.pl)},
              ${numberOrNull(item.numberOfVolume ?? item.qTotTran5J ?? item.tvol)},
              ${numberOrNull(item.transactionValue ?? item.qTotCap ?? item.tval)}, ${priceSource}
            ) on conflict (reg_no, trade_date, source) do update set
              close_price = excluded.close_price,
              last_price = excluded.last_price,
              volume = excluded.volume,
              trade_value = excluded.trade_value
          `;
        }
      }

      console.log("ok");
    } catch (error) {
      console.log(`failed: ${error instanceof Error ? error.message : error}`);
    }
    await pause(250);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
