import assert from "node:assert/strict";
import test from "node:test";
import { validateSnapshot } from "../lib/data-quality";
import type { FundRow } from "../lib/types";

function row(index: number): FundRow {
  return {
    regNo: String(100000 + index), insCode: String(200000 + index), symbol: `F${index}`,
    name: `صندوق واقعی ${index}`, fundTypeId: 6, fundTypeName: "سهامی", category: "سهامی",
    typeOfInvest: "ETF", manager: null, website: null, isEtf: true, market: "بورس",
    initiatedAt: null, sourceUpdatedAt: null, capturedAt: new Date().toISOString(),
    lastPrice: 1000, closingPrice: 1000, previousPrice: 990, priceMin: 980, priceMax: 1010,
    tradeCount: 10, volume: 1000, tradeValue: 1_000_000,
    navCancel: 995, navIssue: 1005, navStatistical: 1000, navPremiumPct: 0.5,
    netAsset: 10_000_000, fundSize: null,
    dailyReturn: 1, weeklyReturn: null, monthlyReturn: null, quarterlyReturn: null,
    sixMonthReturn: null, annualReturn: null, lifetimeReturn: null,
    stockPct: null, bondPct: null, cashPct: null, depositPct: null, otherPct: null, commodityPct: null,
    unitsSubDay: null, unitsRedDay: null, netUnitsFlow: null,
    individualBuyCount: null, individualSellCount: null, individualBuyVolume: null,
    individualSellVolume: null, realMoneyFlow: null, individualBuyPerCapita: null,
    individualSellPerCapita: null, buyPowerRatio: null
  };
}

test("accepts a sufficiently complete real snapshot", () => {
  const report = validateSnapshot(Array.from({ length: 20 }, (_, index) => row(index)));
  assert.equal(report.accepted, true);
  assert.equal(report.metrics.navCoveragePct, 100);
});

test("rejects synthetic identifiers", () => {
  const rows = Array.from({ length: 20 }, (_, index) => row(index));
  rows[0].regNo = "DEMO-1";
  assert.ok(validateSnapshot(rows).errors.includes("synthetic_rows_detected"));
});

test("rejects duplicates and impossible negative values", () => {
  const rows = Array.from({ length: 20 }, (_, index) => row(index));
  rows[1].regNo = rows[0].regNo;
  rows[2].netAsset = -1;
  const errors = validateSnapshot(rows).errors.join(",");
  assert.match(errors, /duplicate_reg_no/);
  assert.match(errors, /negative_domain_values/);
});

test("rejects an abrupt fund-universe drop", () => {
  const previous = Array.from({ length: 50 }, (_, index) => row(index));
  const current = Array.from({ length: 20 }, (_, index) => row(index));
  assert.match(validateSnapshot(current, previous).errors.join(","), /abrupt_row_drop/);
});
