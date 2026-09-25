import type { FundRow } from "@/lib/types";

export type SnapshotQuality = {
  accepted: boolean;
  errors: string[];
  warnings: string[];
  metrics: {
    rowCount: number;
    duplicateRegNos: number;
    navCoveragePct: number;
    marketCoveragePct: number;
    assetCoveragePct: number;
    insCodeCoveragePct: number;
  };
};

const pct = (part: number, total: number) => total ? Math.round(1000 * part / total) / 10 : 0;

export function validateSnapshot(rows: FundRow[], previousRows: FundRow[] = []): SnapshotQuality {
  const errors: string[] = [];
  const warnings: string[] = [];
  const minRows = Number(process.env.MIN_REAL_FUND_ROWS || "20");
  const ids = rows.map((row) => row.regNo);
  const duplicateRegNos = ids.length - new Set(ids).size;
  const etfs = rows.filter((row) => row.isEtf);
  const invalidNonNegative = rows.filter((row) => [
    row.navCancel, row.navIssue, row.navStatistical, row.netAsset,
    row.tradeCount, row.volume, row.tradeValue
  ].some((value) => value !== null && value < 0));

  if (rows.length < minRows) errors.push(`row_count_below_minimum:${rows.length}<${minRows}`);
  if (rows.some((row) => row.regNo.startsWith("DEMO-"))) errors.push("synthetic_rows_detected");
  if (rows.some((row) => !row.regNo.trim() || !row.name.trim())) errors.push("missing_fund_identity");
  if (duplicateRegNos) errors.push(`duplicate_reg_no:${duplicateRegNos}`);
  if (invalidNonNegative.length) errors.push(`negative_domain_values:${invalidNonNegative.length}`);
  if (rows.some((row) => new Date(row.capturedAt).getTime() > Date.now() + 5 * 60_000)) errors.push("future_capture_timestamp");
  if (previousRows.length >= minRows && rows.length < previousRows.length * 0.6) {
    errors.push(`abrupt_row_drop:${previousRows.length}->${rows.length}`);
  }

  const navCount = rows.filter((row) => row.navCancel !== null && row.navCancel > 0).length;
  const marketCount = etfs.filter((row) => (row.lastPrice ?? row.closingPrice) !== null).length;
  const assetCount = rows.filter((row) => row.netAsset !== null && row.netAsset > 0).length;
  const insCodeCount = etfs.filter((row) => Boolean(row.insCode)).length;
  const navCoveragePct = pct(navCount, rows.length);
  const marketCoveragePct = pct(marketCount, etfs.length);
  const assetCoveragePct = pct(assetCount, rows.length);
  const insCodeCoveragePct = pct(insCodeCount, etfs.length);

  if (navCoveragePct < 50) warnings.push(`low_nav_coverage:${navCoveragePct}%`);
  if (etfs.length && marketCoveragePct < 60) warnings.push(`low_market_coverage:${marketCoveragePct}%`);
  if (assetCoveragePct < 40) warnings.push(`low_asset_coverage:${assetCoveragePct}%`);

  return {
    accepted: errors.length === 0,
    errors,
    warnings,
    metrics: { rowCount: rows.length, duplicateRegNos, navCoveragePct, marketCoveragePct, assetCoveragePct, insCodeCoveragePct }
  };
}

export function assertSnapshotQuality(rows: FundRow[], previousRows: FundRow[] = []) {
  const report = validateSnapshot(rows, previousRows);
  if (!report.accepted) throw new Error(`Snapshot rejected by quality gate: ${report.errors.join(", ")}`);
  return report;
}
