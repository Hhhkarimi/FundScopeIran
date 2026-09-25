import { resilientFetchJson } from "@/lib/sources/http";

const BASE = (process.env.TSETMC_BASE_URL || "https://cdn.tsetmc.com/api").replace(/\/$/, "");

export type RawClientType = Record<string, unknown> & { insCode?: string | number };
export type RawMarketWatch = Record<string, unknown> & { insCode?: string | number };
export type RawTsetmcFund = Record<string, unknown> & { regNo?: string | number };

const FUND_TYPE_CODES = [4, 5, 6, 7, 11, 12, 13, 14, 16, 17];

export async function fetchTsetmcFundUniverse() {
  const results = await Promise.allSettled(FUND_TYPE_CODES.map(async (fundType) => {
    const payload = await resilientFetchJson<{ funds?: RawTsetmcFund[] }>(
      `${BASE}/Fund/GetFunds/${fundType}`,
      { source: `TSETMC fund universe type ${fundType}`, headers: { Referer: "https://www.tsetmc.com/" }, retries: 1 }
    );
    return (payload.funds || []).map((fund) => ({
      ...fund,
      fundType: Number(fund.fundType) || fundType
    }));
  }));
  const funds = results.flatMap((result) => result.status === "fulfilled" ? result.value : []);
  if (!funds.length) {
    const failures = results.filter((result) => result.status === "rejected").length;
    throw new Error(`TSETMC fund universe failed for all ${failures} fund types`);
  }
  return [...new Map(funds.map((fund) => [String(fund.regNo), fund])).values()];
}

export async function fetchTsetmcFundDetails(regNo: string) {
  const payload = await resilientFetchJson<{ fund?: Record<string, unknown> }>(
    `${BASE}/Fund/GetFundInDetail/${encodeURIComponent(regNo)}`,
    { source: `TSETMC fund details ${regNo}`, headers: { Referer: "https://www.tsetmc.com/" }, retries: 1 }
  );
  return payload.fund || null;
}

export async function fetchClientTypesAll() {
  const payload = await resilientFetchJson<{ clientTypeAllDto?: RawClientType[] }>(
    `${BASE}/ClientType/GetClientTypeAll`,
    { source: "TSETMC client type" }
  );
  return payload.clientTypeAllDto || [];
}

export async function fetchMarketWatch() {
  const query = new URLSearchParams({
    market: "0",
    industrialGroup: "",
    showTraded: "false",
    withBestLimits: "false",
    hEven: "0",
    RefID: "0"
  });
  for (let i = 1; i <= 9; i += 1) query.set(`paperTypes[${i - 1}]`, String(i));

  const payload = await resilientFetchJson<{ marketwatch?: RawMarketWatch[] }>(
    `${BASE}/ClosingPrice/GetMarketWatch?${query.toString()}`,
    { source: "TSETMC market watch" }
  );
  return payload.marketwatch || [];
}

export async function fetchDailyPriceHistory(insCode: string, top = 0) {
  const payload = await resilientFetchJson<{ closingPriceDaily?: Array<Record<string, unknown>> }>(
    `${BASE}/ClosingPrice/GetClosingPriceDailyList/${encodeURIComponent(insCode)}/${top}`,
    { source: "TSETMC price history" }
  );
  return payload.closingPriceDaily || [];
}
