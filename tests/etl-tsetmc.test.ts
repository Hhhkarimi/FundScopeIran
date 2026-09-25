import assert from "node:assert/strict";
import test from "node:test";
import { mergeFundData } from "../lib/etl";

test("normalizes the real TSETMC fund response shape", () => {
  const [fund] = mergeFundData({
    funds: [{
      regNo: "11172", mfName: "آرمان سپهر آتی", fundType: 7,
      recordDate: "2026-09-24T00:00:00", navRed: 32640, navSub: 32804,
      navStat: 32640, netAsset: 1_202_616_601_072, day1Return: 0.607,
      day30Return: 3.524, day365Return: 28.691, portfolioStock: 65.89,
      portfolioBond: 12.51, portfolioDeposit: 20.64, unitsSub: 4, unitsRed: 1,
      manager: "سبدگردان آرمان آتی", webSite: "https://example.ir"
    }],
    fundTypes: [{ fundType: 7, name: "مختلط" }],
    instruments: [], transactions: [], clientTypes: [], marketWatch: [],
    capturedAt: "2026-09-25T10:00:00.000Z"
  });

  assert.equal(fund.regNo, "11172");
  assert.equal(fund.name, "آرمان سپهر آتی");
  assert.equal(fund.category, "مختلط");
  assert.equal(fund.navCancel, 32640);
  assert.equal(fund.dailyReturn, 0.607);
  assert.equal(fund.annualReturn, 28.691);
  assert.equal(fund.stockPct, 65.89);
  assert.equal(fund.netUnitsFlow, 3);
  assert.equal(fund.website, "https://example.ir");
});
