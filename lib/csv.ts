import type { FundRow } from "@/lib/types";

function escapeCell(value: unknown) {
  if (value === null || value === undefined) return "";
  const text = String(value);
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

const columns: Array<[keyof FundRow, string]> = [
  ["capturedAt", "captured_at"],
  ["regNo", "reg_no"],
  ["insCode", "ins_code"],
  ["symbol", "symbol"],
  ["name", "name_fa"],
  ["fundTypeName", "fund_type"],
  ["category", "category"],
  ["typeOfInvest", "investment_type"],
  ["market", "market"],
  ["isEtf", "is_etf"],
  ["manager", "manager"],
  ["website", "website"],
  ["lastPrice", "last_price_rial"],
  ["closingPrice", "closing_price_rial"],
  ["previousPrice", "previous_price_rial"],
  ["priceMin", "price_min_rial"],
  ["priceMax", "price_max_rial"],
  ["navCancel", "cancel_nav_rial"],
  ["navIssue", "issue_nav_rial"],
  ["navStatistical", "statistical_nav_rial"],
  ["navPremiumPct", "nav_premium_pct"],
  ["netAsset", "net_asset_rial"],
  ["dailyReturn", "daily_return_pct"],
  ["weeklyReturn", "weekly_return_pct"],
  ["monthlyReturn", "monthly_return_pct"],
  ["quarterlyReturn", "quarterly_return_pct"],
  ["sixMonthReturn", "six_month_return_pct"],
  ["annualReturn", "annual_return_pct"],
  ["tradeCount", "trade_count"],
  ["volume", "volume"],
  ["tradeValue", "trade_value_rial"],
  ["realMoneyFlow", "estimated_individual_money_flow_rial"],
  ["individualBuyPerCapita", "estimated_individual_buy_per_capita_rial"],
  ["individualSellPerCapita", "estimated_individual_sell_per_capita_rial"],
  ["buyPowerRatio", "individual_buy_power_ratio"],
  ["unitsSubDay", "units_subscribed_day"],
  ["unitsRedDay", "units_redeemed_day"],
  ["netUnitsFlow", "net_units_flow"],
  ["stockPct", "stock_pct"],
  ["bondPct", "bond_pct"],
  ["cashPct", "cash_pct"],
  ["depositPct", "deposit_pct"],
  ["commodityPct", "commodity_pct"],
  ["otherPct", "other_pct"],
  ["sourceUpdatedAt", "source_updated_at"]
];

export function fundsToCsv(rows: FundRow[]) {
  const header = columns.map(([, label]) => escapeCell(label)).join(",");
  const body = rows.map((row) => columns.map(([key]) => escapeCell(row[key])).join(","));
  return `\uFEFF${[header, ...body].join("\n")}\n`;
}
