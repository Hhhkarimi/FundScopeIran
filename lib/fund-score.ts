import type { FundRow } from "@/lib/types";

export type FundScoreDimensionId = "performance" | "liquidity" | "navBalance" | "scale" | "demand";

export type FundScoreDimension = {
  id: FundScoreDimensionId;
  label: string;
  score: number | null;
  weight: number;
  dataCoverage: number;
};

export type FundScore = {
  total: number | null;
  label: "قوی" | "قابل‌توجه" | "متعادل" | "نیازمند بررسی" | "داده ناکافی";
  coverage: number;
  confidence: "بالا" | "متوسط" | "محدود";
  peerLabel: string;
  dimensions: FundScoreDimension[];
  summary: string;
};

type Metric = {
  value: number | null;
  share: number;
  direction?: "higher" | "lower-absolute";
};

type DimensionDefinition = {
  id: FundScoreDimensionId;
  label: string;
  weight: number;
  metrics: (fund: FundRow) => Metric[];
};

const DIMENSIONS: DimensionDefinition[] = [
  {
    id: "performance",
    label: "عملکرد",
    weight: 35,
    metrics: (fund) => [
      { value: fund.dailyReturn, share: 15 },
      { value: fund.monthlyReturn, share: 45 },
      { value: fund.annualReturn, share: 40 }
    ]
  },
  {
    id: "liquidity",
    label: "نقدشوندگی",
    weight: 25,
    metrics: (fund) => [
      { value: positiveLog(fund.tradeValue), share: 70 },
      { value: positiveLog(fund.tradeCount), share: 30 }
    ]
  },
  {
    id: "navBalance",
    label: "تعادل قیمت و NAV",
    weight: 20,
    metrics: (fund) => [{ value: fund.navPremiumPct, share: 100, direction: "lower-absolute" }]
  },
  {
    id: "scale",
    label: "اندازه صندوق",
    weight: 10,
    metrics: (fund) => [{ value: positiveLog(fund.netAsset), share: 100 }]
  },
  {
    id: "demand",
    label: "تقاضای حقیقی",
    weight: 10,
    metrics: (fund) => [
      { value: flowRatio(fund), share: 60 },
      { value: safeLog(fund.buyPowerRatio), share: 40 }
    ]
  }
];

function positiveLog(value: number | null) {
  return value !== null && value > 0 ? Math.log1p(value) : null;
}

function safeLog(value: number | null) {
  return value !== null && value > 0 ? Math.log(value) : null;
}

function flowRatio(fund: FundRow) {
  if (fund.realMoneyFlow === null || fund.tradeValue === null || fund.tradeValue <= 0) return null;
  return fund.realMoneyFlow / fund.tradeValue;
}

function percentile(value: number, peers: number[]) {
  if (peers.length <= 1) return 50;
  const lower = peers.filter((peer) => peer < value).length;
  const equal = peers.filter((peer) => peer === value).length;
  return (100 * (lower + (equal - 1) / 2)) / (peers.length - 1);
}

function metricScore(metric: Metric, peerMetrics: Metric[]) {
  if (metric.value === null || !Number.isFinite(metric.value)) return null;
  if (metric.direction === "lower-absolute") {
    return Math.max(0, 100 - Math.min(100, Math.abs(metric.value) * 10));
  }
  const values = peerMetrics.map((item) => item.value).filter((value): value is number => value !== null && Number.isFinite(value));
  return percentile(metric.value, values);
}

function dimensionScore(fund: FundRow, peers: FundRow[], definition: DimensionDefinition) {
  const metrics = definition.metrics(fund);
  const peerMetricSets = peers.map((peer) => definition.metrics(peer));
  let scoreSum = 0;
  let availableShare = 0;

  metrics.forEach((metric, index) => {
    const score = metricScore(metric, peerMetricSets.map((set) => set[index]));
    if (score === null) return;
    scoreSum += score * metric.share;
    availableShare += metric.share;
  });

  return {
    score: availableShare ? scoreSum / availableShare : null,
    dataCoverage: availableShare
  };
}

function scoreLabel(total: number | null): FundScore["label"] {
  if (total === null) return "داده ناکافی";
  if (total >= 75) return "قوی";
  if (total >= 60) return "قابل‌توجه";
  if (total >= 45) return "متعادل";
  return "نیازمند بررسی";
}

function scoreSummary(total: number | null, dimensions: FundScoreDimension[]) {
  if (total === null) return "برای جمع‌بندی منصفانه، داده کافی از این صندوق نداریم.";
  const available = dimensions.filter((dimension): dimension is FundScoreDimension & { score: number } => dimension.score !== null);
  const strongest = [...available].sort((a, b) => b.score - a.score)[0];
  const weakest = [...available].sort((a, b) => a.score - b.score)[0];
  if (!strongest || !weakest) return "امتیاز با داده‌های فعلی محاسبه شده است.";
  if (strongest.id === weakest.id) return `${strongest.label} تنها بُعد دارای داده کافی است.`;
  return `نقطه قوت فعلی: ${strongest.label}؛ بخش نیازمند بررسی: ${weakest.label}.`;
}

/**
 * Produces a transparent, peer-relative 0–100 score for each fund.
 * The caller only sees this interface; cohort selection, missing-data
 * reweighting and metric normalization stay inside the module.
 */
export function scoreFunds(funds: FundRow[]): Map<string, FundScore> {
  const categoryGroups = new Map<string, FundRow[]>();
  for (const fund of funds) categoryGroups.set(fund.category, [...(categoryGroups.get(fund.category) || []), fund]);

  return new Map(funds.map((fund) => {
    const categoryPeers = categoryGroups.get(fund.category) || [];
    const peers = categoryPeers.length >= 4 ? categoryPeers : funds;
    const peerLabel = categoryPeers.length >= 4 ? `در گروه ${fund.category}` : "در کل بازار";
    const dimensions = DIMENSIONS.map((definition) => {
      const result = dimensionScore(fund, peers, definition);
      return { id: definition.id, label: definition.label, weight: definition.weight, ...result };
    });
    const available = dimensions.filter((dimension) => dimension.score !== null);
    const coverage = Math.round(available.reduce((sum, dimension) => sum + dimension.weight * dimension.dataCoverage / 100, 0));
    const weighted = available.reduce((sum, dimension) => sum + (dimension.score || 0) * dimension.weight * dimension.dataCoverage / 100, 0);
    const total = coverage >= 45 && available.length >= 2 ? Math.round(weighted / coverage) : null;

    return [fund.regNo, {
      total,
      label: scoreLabel(total),
      coverage,
      confidence: coverage >= 85 ? "بالا" : coverage >= 65 ? "متوسط" : "محدود",
      peerLabel,
      dimensions,
      summary: scoreSummary(total, dimensions)
    } satisfies FundScore];
  }));
}
