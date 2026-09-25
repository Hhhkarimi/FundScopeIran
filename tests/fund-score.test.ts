import assert from "node:assert/strict";
import test from "node:test";
import { scoreFunds } from "../lib/fund-score";
import type { FundRow } from "../lib/types";

function fund(regNo: string, overrides: Partial<FundRow> = {}): FundRow {
  return {
    regNo, insCode: null, symbol: regNo, name: regNo, fundTypeId: null, fundTypeName: null,
    category: "سهامی", typeOfInvest: null, manager: null, website: null, isEtf: true,
    market: "بورس", initiatedAt: null, sourceUpdatedAt: null, capturedAt: "2026-01-01T00:00:00.000Z",
    lastPrice: 100, closingPrice: 100, previousPrice: 99, priceMin: 98, priceMax: 102,
    tradeCount: 100, volume: 1000, tradeValue: 100_000, navCancel: 100, navIssue: 101,
    navStatistical: 100, navPremiumPct: 0, netAsset: 1_000_000, fundSize: null,
    dailyReturn: 1, weeklyReturn: 2, monthlyReturn: 5, quarterlyReturn: 8, sixMonthReturn: 12,
    annualReturn: 25, lifetimeReturn: null, stockPct: 70, bondPct: 10, cashPct: 5,
    depositPct: 5, otherPct: 10, commodityPct: 0, unitsSubDay: null, unitsRedDay: null,
    netUnitsFlow: null, individualBuyCount: 10, individualSellCount: 10,
    individualBuyVolume: 600, individualSellVolume: 400, realMoneyFlow: 20_000,
    individualBuyPerCapita: 60, individualSellPerCapita: 40, buyPowerRatio: 1.5,
    ...overrides
  };
}

test("scores stay in range and reward stronger peer data", () => {
  const rows = [
    fund("weak", { dailyReturn: -1, monthlyReturn: -2, annualReturn: 5, tradeValue: 10_000, tradeCount: 10, netAsset: 100_000, realMoneyFlow: -2_000, buyPowerRatio: 0.7, navPremiumPct: 8 }),
    fund("middle"),
    fund("good", { dailyReturn: 2, monthlyReturn: 10, annualReturn: 40, tradeValue: 1_000_000, tradeCount: 1000, netAsset: 10_000_000, realMoneyFlow: 300_000, buyPowerRatio: 2, navPremiumPct: 0.2 }),
    fund("best", { dailyReturn: 3, monthlyReturn: 14, annualReturn: 50, tradeValue: 2_000_000, tradeCount: 2000, netAsset: 20_000_000, realMoneyFlow: 800_000, buyPowerRatio: 3, navPremiumPct: 0.1 })
  ];
  const scores = scoreFunds(rows);
  assert.ok((scores.get("best")?.total ?? 0) > (scores.get("weak")?.total ?? 100));
  for (const score of scores.values()) assert.ok(score.total !== null && score.total >= 0 && score.total <= 100);
});

test("reweights missing dimensions and reports coverage", () => {
  const sparse = fund("sparse", { tradeValue: null, tradeCount: null, netAsset: null, realMoneyFlow: null, buyPowerRatio: null });
  const score = scoreFunds([sparse, fund("peer")]).get("sparse");
  assert.equal(score?.coverage, 55);
  assert.notEqual(score?.total, null);
  assert.equal(score?.confidence, "محدود");
});

test("withholds total when less than 45 percent of dimensions are available", () => {
  const sparse = fund("sparse", {
    dailyReturn: null, monthlyReturn: null, annualReturn: null, tradeValue: null, tradeCount: null,
    netAsset: null, realMoneyFlow: null, buyPowerRatio: null
  });
  const score = scoreFunds([sparse]).get("sparse");
  assert.equal(score?.coverage, 20);
  assert.equal(score?.total, null);
  assert.equal(score?.label, "داده ناکافی");
});
