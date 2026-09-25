import { resilientFetchJson } from "@/lib/sources/http";

const BASE = (process.env.FIPIRAN_BASE_URL || "https://www.fipiran.com/services").replace(/\/$/, "");
const headers = {
  Referer: "https://www.fipiran.com/",
  "Content-Type": "application/json"
};

export type RawFipiranFund = Record<string, unknown> & {
  regNo?: string;
  name?: string;
  fundType?: number;
  typeOfInvest?: string;
  smallSymbolName?: string | null;
  insCode?: string | null;
};

export type RawInstrument = Record<string, unknown> & {
  insCode?: string;
  marketCode?: number;
  smallSymbolName?: string;
};

export type RawTransaction = Record<string, unknown> & { insCode?: string };

export async function fetchFundUniverse() {
  const payload = await resilientFetchJson<{
    items?: RawFipiranFund[];
    totalCount?: number;
  }>(`${BASE}/fund/fundcompare/`, {
    source: "Fipiran fundcompare",
    method: "POST",
    headers,
    body: JSON.stringify({ regNos: [], showMarketMakers: false })
  });

  return payload.items || [];
}

export async function fetchFundTypes() {
  const payload = await resilientFetchJson<{
    items?: Array<{ fundType?: number; name?: string; isActive?: boolean }>;
  }>(`${BASE}/fund/fundtype`, {
    source: "Fipiran fund types",
    headers: { Referer: "https://www.fipiran.com/" }
  });
  return payload.items || [];
}

export async function fetchEtfMarketSnapshot() {
  const params = new URLSearchParams({
    pageIndex: "0",
    pageSize: "9999",
    sort: "asc",
    column: "smallSymbolName",
    symboltype: "305",
    markettype: "1,2"
  });

  const payload = await resilientFetchJson<{
    items?: Array<{
      instruments?: RawInstrument[];
      instrumentTransactions?: RawTransaction[];
    }>;
  }>(`${BASE}/instrument/instrumentcompare?${params.toString()}`, {
    source: "Fipiran ETF market snapshot",
    headers: { Referer: "https://www.fipiran.com/" }
  });

  const first = payload.items?.[0];
  return {
    instruments: first?.instruments || [],
    transactions: first?.instrumentTransactions || []
  };
}

export async function fetchFundNavHistory(regNo: string, groupId = "0") {
  const params = new URLSearchParams({ regno: regNo, groupId, showAll: "true" });
  return resilientFetchJson<Array<Record<string, unknown>>>(
    `${BASE}/chart/getfundchart?${params.toString()}`,
    { source: "Fipiran NAV history", headers: { Referer: "https://www.fipiran.com/" } }
  );
}

export async function fetchFundAssetHistory(regNo: string, groupId = "0") {
  const params = new URLSearchParams({ regno: regNo, groupId, showAll: "true" });
  return resilientFetchJson<Array<Record<string, unknown>>>(
    `${BASE}/chart/getfundnetassetchart?${params.toString()}`,
    { source: "Fipiran net asset history", headers: { Referer: "https://www.fipiran.com/" } }
  );
}

export async function fetchInstrumentClientType(insCode: string) {
  const params = new URLSearchParams({ insCode });
  const payload = await resilientFetchJson<{
    item?: Array<{ instrumentClientTypes?: Array<Record<string, unknown>> }>;
  }>(`${BASE}/instrument/getinstrument?${params.toString()}`, {
    source: `Fipiran client type ${insCode}`,
    headers: { Referer: "https://www.fipiran.com/" },
    retries: 0,
    timeoutMs: 8_000
  });
  const row = payload.item?.[0]?.instrumentClientTypes?.[0];
  return row ? { ...row, insCode } : null;
}

export async function fetchFipiranClientTypes(
  insCodes: string[],
  limit = Number(process.env.FIPIRAN_CLIENT_FALLBACK_LIMIT || "100")
) {
  const selected = [...new Set(insCodes)].filter(Boolean).slice(0, Math.max(0, limit));
  const rows: Array<Record<string, unknown>> = [];
  const concurrency = 6;
  for (let i = 0; i < selected.length; i += concurrency) {
    const batch = selected.slice(i, i + concurrency);
    const settled = await Promise.allSettled(batch.map((code) => fetchInstrumentClientType(code)));
    for (const result of settled) {
      if (result.status === "fulfilled" && result.value) rows.push(result.value);
    }
  }
  if (selected.length && !rows.length) {
    throw new Error("Fipiran client-type fallback returned no usable rows");
  }
  return rows;
}

export async function fetchInstrumentPriceHistory(insCode: string, pageSize = 99999) {
  const params = new URLSearchParams({
    insCode,
    pageSize: String(pageSize),
    pageIndex: "0"
  });
  const payload = await resilientFetchJson<{ items?: Array<Record<string, unknown>> }>(
    `${BASE}/instrument/instrumenthistory?${params.toString()}`,
    { source: `Fipiran instrument history ${insCode}`, headers: { Referer: "https://www.fipiran.com/" } }
  );
  return payload.items || [];
}
