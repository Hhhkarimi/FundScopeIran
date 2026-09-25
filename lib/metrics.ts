import type { DashboardSummary, FundRow } from "@/lib/types";

function median(values: number[]) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function summarize(rows: FundRow[]): DashboardSummary {
  const etfs = rows.filter((row) => row.isEtf);
  const totalNetAsset = rows.reduce((sum, row) => sum + (row.netAsset || 0), 0);
  const etfTradeValue = etfs.reduce((sum, row) => sum + (row.tradeValue || 0), 0);
  const totalRealMoneyFlow = etfs.reduce((sum, row) => sum + (row.realMoneyFlow || 0), 0);
  const premiums = etfs.map((row) => row.navPremiumPct).filter((v): v is number => v !== null);
  const returns = etfs.map((row) => row.dailyReturn).filter((v): v is number => v !== null);
  const positiveSharePct = returns.length
    ? (100 * returns.filter((value) => value > 0).length) / returns.length
    : null;

  const flowScale = Math.max(etfTradeValue * 0.02, 1);
  const flowComponent = 50 + 50 * Math.tanh(totalRealMoneyFlow / flowScale);
  const pulseScore =
    positiveSharePct === null ? null : Math.round(clamp(positiveSharePct * 0.7 + flowComponent * 0.3, 0, 100));

  return {
    fundCount: rows.length,
    etfCount: etfs.length,
    totalNetAsset,
    etfTradeValue,
    totalRealMoneyFlow,
    medianNavPremiumPct: median(premiums),
    positiveSharePct,
    pulseScore
  };
}
