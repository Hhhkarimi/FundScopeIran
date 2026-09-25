import type { DashboardData, FundCategory, FundRow } from "@/lib/types";
import { summarize } from "@/lib/metrics";

const names: Array<[string, string, FundCategory]> = [
  ["نمونه طلا", "طلا", "طلا"],
  ["نمونه درآمد ثابت", "ثبات", "درآمد ثابت"],
  ["نمونه سهامی", "رشد", "سهامی"],
  ["نمونه اهرمی", "اهرم‌نما", "اهرمی"],
  ["نمونه شاخصی", "شاخص‌نما", "شاخصی"],
  ["نمونه بخشی", "بخش‌نما", "بخشی"]
];

export function demoDashboard(): DashboardData {
  const capturedAt = new Date().toISOString();
  const rows: FundRow[] = names.map(([name, symbol, category], index) => {
    const returnValue = [-0.8, 0.18, 1.5, 2.2, -0.15, 0.72][index];
    const nav = 100_000 + index * 17_500;
    const price = nav * (1 + [-0.006, 0.001, 0.012, -0.018, 0.004, 0.008][index]);
    return {
      regNo: `DEMO-${index + 1}`,
      insCode: `DEMO${index + 1}`,
      symbol,
      name,
      fundTypeId: index + 1,
      fundTypeName: category,
      category,
      typeOfInvest: "قابل معامله",
      manager: "داده نمایشی",
      website: null,
      isEtf: true,
      market: index % 2 ? "فرابورس" : "بورس",
      initiatedAt: null,
      sourceUpdatedAt: capturedAt,
      capturedAt,
      lastPrice: Math.round(price),
      closingPrice: Math.round(price * 0.998),
      previousPrice: Math.round(price / (1 + returnValue / 100)),
      priceMin: Math.round(price * 0.985),
      priceMax: Math.round(price * 1.018),
      tradeCount: 1400 + index * 420,
      volume: 2_000_000 + index * 1_200_000,
      tradeValue: 220_000_000_000 + index * 105_000_000_000,
      navCancel: nav,
      navIssue: nav * 1.002,
      navStatistical: nav * 1.001,
      navPremiumPct: ((price / nav) - 1) * 100,
      netAsset: 18_000_000_000_000 + index * 12_000_000_000_000,
      fundSize: null,
      dailyReturn: returnValue,
      weeklyReturn: returnValue * 2.1,
      monthlyReturn: returnValue * 6.2,
      quarterlyReturn: returnValue * 9.5,
      sixMonthReturn: returnValue * 13.2,
      annualReturn: 18 + index * 9.4,
      lifetimeReturn: null,
      stockPct: category === "سهامی" ? 82 : category === "درآمد ثابت" ? 9 : 25,
      bondPct: category === "درآمد ثابت" ? 76 : 12,
      cashPct: 4,
      depositPct: category === "درآمد ثابت" ? 10 : 3,
      otherPct: 8,
      commodityPct: category === "طلا" ? 81 : 0,
      unitsSubDay: 9000 + index * 1200,
      unitsRedDay: 7000 + index * 900,
      netUnitsFlow: 2000 + index * 300,
      individualBuyCount: 500 + index * 80,
      individualSellCount: 470 + index * 70,
      individualBuyVolume: 1_200_000 + index * 400_000,
      individualSellVolume: 1_050_000 + index * 360_000,
      realMoneyFlow: (150_000 + index * 40_000) * price,
      individualBuyPerCapita: 240_000_000 + index * 20_000_000,
      individualSellPerCapita: 225_000_000 + index * 17_000_000,
      buyPowerRatio: 1.04 + index * 0.06
    };
  });

  const history = Array.from({ length: 24 }, (_, i) => ({
    capturedAt: new Date(Date.now() - (23 - i) * 3_600_000).toISOString(),
    totalNetAsset: rows.reduce((s, r) => s + (r.netAsset || 0), 0) * (0.98 + i * 0.001),
    etfTradeValue: rows.reduce((s, r) => s + (r.tradeValue || 0), 0) * (0.7 + (i % 8) * 0.05),
    totalRealMoneyFlow: (i - 10) * 28_000_000_000,
    positiveSharePct: 38 + ((i * 7) % 45)
  }));

  return {
    mode: "demo",
    generatedAt: capturedAt,
    summary: summarize(rows),
    funds: rows,
    history,
    sourceStatus: { fipiran: "unknown", tsetmc: "unknown" }
  };
}
