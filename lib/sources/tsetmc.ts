import { resilientFetchJson } from "@/lib/sources/http";

const BASE = (process.env.TSETMC_BASE_URL || "https://cdn.tsetmc.com/api").replace(/\/$/, "");

export type RawClientType = Record<string, unknown> & { insCode?: string | number };
export type RawMarketWatch = Record<string, unknown> & { insCode?: string | number };

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
