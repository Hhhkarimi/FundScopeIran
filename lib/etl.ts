import type { FundCategory, FundRow, RefreshResult } from "@/lib/types";
import {
  fetchEtfMarketSnapshot,
  fetchFundTypes,
  fetchFundUniverse,
  fetchFipiranClientTypes,
  type RawFipiranFund,
  type RawInstrument,
  type RawTransaction
} from "@/lib/sources/fipiran";
import {
  fetchClientTypesAll,
  fetchTsetmcFundUniverse,
  fetchMarketWatch,
  type RawClientType,
  type RawMarketWatch
} from "@/lib/sources/tsetmc";
import { replaceSnapshot } from "@/lib/repository";

const ALLOW_DEGRADATION = process.env.ALLOW_SOURCE_DEGRADATION !== "false";
const TSETMC_FUND_TYPES = [
  { fundType: 4, name: "درآمد ثابت" },
  { fundType: 5, name: "کالایی" },
  { fundType: 6, name: "سهامی" },
  { fundType: 7, name: "مختلط" },
  { fundType: 11, name: "بازارگردانی" },
  { fundType: 12, name: "جسورانه" },
  { fundType: 13, name: "پروژه" },
  { fundType: 14, name: "املاک" },
  { fundType: 16, name: "خصوصی" },
  { fundType: 17, name: "صندوق سرمایه‌گذاری" }
];

function text(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const result = String(value).trim();
  return result ? result : null;
}

function identifier(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value)) return String(Math.trunc(value));
  const result = text(value);
  return result?.replace(/\.0$/, "") || null;
}

function num(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(String(value).replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function pickNum(row: Record<string, unknown> | undefined, keys: string[]): number | null {
  if (!row) return null;
  for (const key of keys) {
    const value = num(row[key]);
    if (value !== null) return value;
  }
  return null;
}

function pickText(row: Record<string, unknown> | undefined, keys: string[]): string | null {
  if (!row) return null;
  for (const key of keys) {
    const value = text(row[key]);
    if (value !== null) return value;
  }
  return null;
}

function categoryFrom(...values: Array<unknown>): FundCategory {
  const s = values.filter(Boolean).join(" ").toLowerCase();
  if (/طلا|زر|gold/.test(s)) return "طلا";
  if (/درآمد ثابت|fixed/.test(s)) return "درآمد ثابت";
  if (/اهرم/.test(s)) return "اهرمی";
  if (/مختلط/.test(s)) return "مختلط";
  if (/شاخص/.test(s)) return "شاخصی";
  if (/بخش|بخشی/.test(s)) return "بخشی";
  if (/املاک|مستغلات|real estate/.test(s)) return "املاک";
  if (/جسور|venture/.test(s)) return "جسورانه";
  if (/بازارگردان/.test(s)) return "بازارگردانی";
  if (/سهام|سهامی|stock|equity/.test(s)) return "سهامی";
  return "سایر";
}

function websiteOf(fund: RawFipiranFund) {
  const raw = fund.websiteAddress ?? fund.webSite;
  if (Array.isArray(raw)) return text(raw[0]);
  return text(raw);
}

function marketFromInstrument(instrument?: RawInstrument): FundRow["market"] {
  const code = num(instrument?.marketCode);
  if (code === 1) return "بورس";
  if (code === 2 || code === 4) return "فرابورس";
  return "نامشخص";
}

function mapByInsCode<T extends Record<string, unknown>>(rows: T[]) {
  const map = new Map<string, T>();
  for (const row of rows) {
    const code = pickText(row, ["insCode", "inscode", "instrumentCode"]);
    if (code) map.set(code, row);
  }
  return map;
}

function transactionFromTsetmc(row?: RawMarketWatch): Partial<RawTransaction> {
  if (!row) return {};
  return {
    insCode: pickText(row, ["insCode", "inscode"]) || undefined,
    lastTransaction: pickNum(row, ["pDrCotVal", "pl", "lastTransaction"]),
    closingPrice: pickNum(row, ["pClosing", "pc", "closingPrice"]),
    priceYesterday: pickNum(row, ["priceYesterday", "py"]),
    priceMin: pickNum(row, ["priceMin", "pMin", "pmin"]),
    priceMax: pickNum(row, ["priceMax", "pMax", "pmax"]),
    numberOfTransactions: pickNum(row, ["zTotTran", "tno", "numberOfTransactions"]),
    numberOfVolume: pickNum(row, ["qTotTran5J", "tvol", "numberOfVolume"]),
    transactionValue: pickNum(row, ["qTotCap", "tval", "transactionValue"])
  };
}

function deriveClientMetrics(client: RawClientType | undefined, price: number | null) {
  const buyCount = pickNum(client, ["buy_CountI", "buy_I_Count", "buyICount", "individualBuyCount", "nBuyCount", "numberIndividualsBuyers"]);
  const sellCount = pickNum(client, ["sell_CountI", "sell_I_Count", "sellICount", "individualSellCount", "nSellCount", "numberIndividualsSellers"]);
  const buyVolume = pickNum(client, ["buy_I_Volume", "buyIVolume", "individualBuyVolume", "nBuyVolume", "sumIndividualBuyVolume"]);
  const sellVolume = pickNum(client, ["sell_I_Volume", "sellIVolume", "individualSellVolume", "nSellVolume", "sumIndividualSellVolume"]);

  const realMoneyFlow =
    price !== null && buyVolume !== null && sellVolume !== null
      ? (buyVolume - sellVolume) * price
      : null;
  const buyPerCapita =
    price !== null && buyVolume !== null && buyCount && buyCount > 0
      ? (buyVolume * price) / buyCount
      : null;
  const sellPerCapita =
    price !== null && sellVolume !== null && sellCount && sellCount > 0
      ? (sellVolume * price) / sellCount
      : null;
  const buyPowerRatio =
    buyVolume !== null && sellVolume !== null && buyCount && sellCount && buyCount > 0 && sellCount > 0 && sellVolume > 0
      ? (buyVolume / buyCount) / (sellVolume / sellCount)
      : null;

  return {
    individualBuyCount: buyCount,
    individualSellCount: sellCount,
    individualBuyVolume: buyVolume,
    individualSellVolume: sellVolume,
    realMoneyFlow,
    individualBuyPerCapita: buyPerCapita,
    individualSellPerCapita: sellPerCapita,
    buyPowerRatio
  };
}

export function mergeFundData(args: {
  funds: RawFipiranFund[];
  fundTypes: Array<{ fundType?: number; name?: string }>;
  instruments: RawInstrument[];
  transactions: RawTransaction[];
  clientTypes: RawClientType[];
  marketWatch: RawMarketWatch[];
  capturedAt: string;
}): FundRow[] {
  const typeMap = new Map(
    args.fundTypes
      .filter((i) => typeof i.fundType === "number")
      .map((i) => [i.fundType as number, i.name || `نوع ${i.fundType}`])
  );
  const instrumentMap = mapByInsCode(args.instruments);
  const transactionMap = mapByInsCode(args.transactions);
  const clientMap = mapByInsCode(args.clientTypes);
  const tsetmcMap = mapByInsCode(args.marketWatch);

  return args.funds
    .map((fund): FundRow | null => {
      const regNo = identifier(fund.regNo ?? fund.regno ?? fund.registrationNumber ?? fund.fundId);
      const name = pickText(fund, ["name", "fundName", "mfName", "lVal30", "companyName"]);
      if (!regNo || !name) return null;

      const insCode = identifier(fund.insCode ?? fund.inscode ?? fund.instrumentCode);
      const instrument = insCode ? instrumentMap.get(insCode) : undefined;
      const fipiTransaction = insCode ? transactionMap.get(insCode) : undefined;
      const tsetmcTransaction = insCode ? transactionFromTsetmc(tsetmcMap.get(insCode)) : undefined;
      const transaction = { ...tsetmcTransaction, ...fipiTransaction } as RawTransaction;
      const client = insCode ? clientMap.get(insCode) : undefined;
      const fundTypeId = num(fund.fundType ?? fund.fundTypeId ?? fund.type);
      const fundTypeName = fundTypeId !== null ? typeMap.get(fundTypeId) || null : null;
      const typeOfInvest = pickText(fund, ["typeOfInvest", "investmentType"]);
      const symbol = pickText(fund, ["smallSymbolName", "symbol", "lVal18AFC"]) || pickText(instrument, ["smallSymbolName"]);
      const isEtf = Boolean(insCode || symbol || /قابل معامله|ETF/i.test(typeOfInvest || ""));

      const lastPrice = pickNum(transaction, ["lastTransaction", "pDrCotVal", "pl"]);
      const closingPrice = pickNum(transaction, ["closingPrice", "pClosing", "pc"]);
      const navCancel = pickNum(fund, ["cancelNav", "navRed", "navCancel"]);
      const navPremiumPct =
        isEtf && navCancel && navCancel > 0 && (lastPrice ?? closingPrice) !== null
          ? (((lastPrice ?? closingPrice) as number) / navCancel - 1) * 100
          : null;

      const unitsSubDay = pickNum(fund, ["unitsSubDAY", "unitsSub"]);
      const unitsRedDay = pickNum(fund, ["unitsRedDAY", "unitsRed"]);
      const priceForFlow = closingPrice ?? lastPrice;
      const clientMetrics = deriveClientMetrics(client, priceForFlow);

      return {
        regNo,
        insCode,
        symbol,
        name,
        fundTypeId,
        fundTypeName,
        category: categoryFrom(fundTypeName, typeOfInvest, name, symbol),
        typeOfInvest,
        manager: pickText(fund, ["manager", "fundManager", "managerName"]),
        website: websiteOf(fund),
        isEtf,
        market: marketFromInstrument(instrument),
        initiatedAt: pickText(fund, ["initiationDate", "startDate"]),
        sourceUpdatedAt: pickText(fund, ["rankLastUpdate", "recordDate", "date"]),
        capturedAt: args.capturedAt,

        lastPrice,
        closingPrice,
        previousPrice: pickNum(transaction, ["priceYesterday", "py"]),
        priceMin: pickNum(transaction, ["priceMin", "pMin", "pmin"]),
        priceMax: pickNum(transaction, ["priceMax", "pMax", "pmax"]),
        tradeCount: pickNum(transaction, ["numberOfTransactions", "zTotTran", "tno"]),
        volume: pickNum(transaction, ["numberOfVolume", "qTotTran5J", "tvol"]),
        tradeValue: pickNum(transaction, ["transactionValue", "qTotCap", "tval"]),

        navCancel,
        navIssue: pickNum(fund, ["issueNav", "navSub", "navIssue"]),
        navStatistical: pickNum(fund, ["statisticalNav", "navStat", "navStatistical"]),
        navPremiumPct,
        netAsset: num(fund.netAsset),
        fundSize: num(fund.fundSize),

        dailyReturn: pickNum(fund, ["dailyEfficiency", "day1Return"]),
        weeklyReturn: pickNum(fund, ["weeklyEfficiency", "day7Return"]),
        monthlyReturn: pickNum(fund, ["monthlyEfficiency", "day30Return"]),
        quarterlyReturn: pickNum(fund, ["quarterlyEfficiency", "day90Return"]),
        sixMonthReturn: pickNum(fund, ["sixMonthEfficiency", "day180Return"]),
        annualReturn: pickNum(fund, ["annualEfficiency", "day365Return"]),
        lifetimeReturn: pickNum(fund, ["efficiency", "dayFirstReturn"]),

        stockPct: pickNum(fund, ["stock", "portfolioStock"]),
        bondPct: pickNum(fund, ["bond", "portfolioBond"]),
        cashPct: pickNum(fund, ["cash", "portfolioCash"]),
        depositPct: pickNum(fund, ["deposit", "portfolioDeposit"]),
        otherPct: pickNum(fund, ["other", "portfolioOther"]),
        commodityPct: pickNum(fund, ["commodity", "portfolioCommodity"]),

        unitsSubDay,
        unitsRedDay,
        netUnitsFlow:
          unitsSubDay !== null && unitsRedDay !== null ? unitsSubDay - unitsRedDay : null,

        ...clientMetrics
      };
    })
    .filter((row): row is FundRow => Boolean(row));
}

async function optional<T>(label: string, task: Promise<T>, warnings: string[], fallback: T): Promise<T> {
  try {
    return await task;
  } catch (error) {
    if (!ALLOW_DEGRADATION) throw error;
    warnings.push(`${label}: ${error instanceof Error ? error.message : "unknown error"}`);
    return fallback;
  }
}

export async function scrapeFundRows(): Promise<{
  rows: FundRow[];
  result: RefreshResult;
}> {
  const capturedAt = new Date().toISOString();
  const warnings: string[] = [];

  let funds: RawFipiranFund[] = [];
  try {
    funds = await fetchFundUniverse();
  } catch (error) {
    if (!ALLOW_DEGRADATION) throw error;
    warnings.push(`Fipiran fund universe: ${error instanceof Error ? error.message : "unknown error"}`);
  }

  if (!funds.length) {
    const fallbackFunds = await fetchTsetmcFundUniverse();
    funds = fallbackFunds as RawFipiranFund[];
    warnings.push("Fipiran: unavailable; using the real TSETMC fund universe fallback");
  }
  const [fundTypes, etfMarket, tsetmcClientTypes, marketWatch] = await Promise.all([
    optional("Fipiran fund types", fetchFundTypes(), warnings, []),
    optional("Fipiran ETF market", fetchEtfMarketSnapshot(), warnings, { instruments: [], transactions: [] }),
    optional("TSETMC client types", fetchClientTypesAll(), warnings, []),
    optional("TSETMC market watch", fetchMarketWatch(), warnings, [])
  ]);

  if (!tsetmcClientTypes.length && !marketWatch.length) {
    warnings.push("TSETMC: bulk endpoints returned no rows; using Fipiran where possible");
  }

  let clientTypes: RawClientType[] = tsetmcClientTypes;
  if (!clientTypes.length && etfMarket.instruments.length) {
    const tradedCodes = [...etfMarket.transactions]
      .sort((a, b) => (pickNum(b, ["transactionValue"]) || 0) - (pickNum(a, ["transactionValue"]) || 0))
      .map((item) => pickText(item, ["insCode"]))
      .filter((code): code is string => Boolean(code));
    const allCodes = etfMarket.instruments.map((item) => String(item.insCode || "")).filter(Boolean);
    const fallback = await optional(
      "Fipiran client fallback",
      fetchFipiranClientTypes([...tradedCodes, ...allCodes]),
      warnings,
      []
    );
    clientTypes = fallback as RawClientType[];
  }

  const rows = mergeFundData({
    funds,
    fundTypes: fundTypes.length ? fundTypes : TSETMC_FUND_TYPES,
    instruments: etfMarket.instruments,
    transactions: etfMarket.transactions,
    clientTypes,
    marketWatch,
    capturedAt
  });

  if (!rows.length) throw new Error("All real-data sources returned an empty fund universe");

  const fipiranDegraded = warnings.some((w) => w.startsWith("Fipiran"));
  const tsetmcDegraded = warnings.some((w) => w.startsWith("TSETMC"));
  return {
    rows,
    result: {
      capturedAt,
      rowCount: rows.length,
      etfCount: rows.filter((row) => row.isEtf).length,
      sourceStatus: {
        fipiran: fipiranDegraded ? "degraded" : "ok",
        tsetmc: tsetmcDegraded ? "degraded" : "ok"
      },
      warnings
    }
  };
}

export async function refreshSnapshot(): Promise<RefreshResult> {
  const { rows, result } = await scrapeFundRows();
  await replaceSnapshot(rows, result.sourceStatus);
  return result;
}
