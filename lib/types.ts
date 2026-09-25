export type FundCategory =
  | "طلا"
  | "درآمد ثابت"
  | "سهامی"
  | "اهرمی"
  | "مختلط"
  | "شاخصی"
  | "بخشی"
  | "املاک"
  | "جسورانه"
  | "بازارگردانی"
  | "سایر";

export type FundRow = {
  regNo: string;
  insCode: string | null;
  symbol: string | null;
  name: string;
  fundTypeId: number | null;
  fundTypeName: string | null;
  category: FundCategory;
  typeOfInvest: string | null;
  manager: string | null;
  website: string | null;
  isEtf: boolean;
  market: "بورس" | "فرابورس" | "نامشخص";
  initiatedAt: string | null;
  sourceUpdatedAt: string | null;
  capturedAt: string;

  lastPrice: number | null;
  closingPrice: number | null;
  previousPrice: number | null;
  priceMin: number | null;
  priceMax: number | null;
  tradeCount: number | null;
  volume: number | null;
  tradeValue: number | null;

  navCancel: number | null;
  navIssue: number | null;
  navStatistical: number | null;
  navPremiumPct: number | null;
  netAsset: number | null;
  fundSize: number | null;

  dailyReturn: number | null;
  weeklyReturn: number | null;
  monthlyReturn: number | null;
  quarterlyReturn: number | null;
  sixMonthReturn: number | null;
  annualReturn: number | null;
  lifetimeReturn: number | null;

  stockPct: number | null;
  bondPct: number | null;
  cashPct: number | null;
  depositPct: number | null;
  otherPct: number | null;
  commodityPct: number | null;

  unitsSubDay: number | null;
  unitsRedDay: number | null;
  netUnitsFlow: number | null;

  individualBuyCount: number | null;
  individualSellCount: number | null;
  individualBuyVolume: number | null;
  individualSellVolume: number | null;
  realMoneyFlow: number | null;
  individualBuyPerCapita: number | null;
  individualSellPerCapita: number | null;
  buyPowerRatio: number | null;
};

export type DashboardSummary = {
  fundCount: number;
  etfCount: number;
  totalNetAsset: number;
  etfTradeValue: number;
  totalRealMoneyFlow: number;
  medianNavPremiumPct: number | null;
  positiveSharePct: number | null;
  pulseScore: number | null;
};

export type HistoryPoint = {
  capturedAt: string;
  totalNetAsset: number;
  etfTradeValue: number;
  totalRealMoneyFlow: number;
  positiveSharePct: number | null;
};

export type DashboardData = {
  mode: "live" | "demo" | "empty";
  generatedAt: string;
  summary: DashboardSummary;
  funds: FundRow[];
  history: HistoryPoint[];
  sourceStatus: {
    fipiran: "ok" | "degraded" | "unknown";
    tsetmc: "ok" | "degraded" | "unknown";
    fundbase?: "ok" | "degraded" | "unknown";
  };
};

export type RefreshResult = {
  capturedAt: string;
  rowCount: number;
  etfCount: number;
  sourceStatus: DashboardData["sourceStatus"];
  warnings: string[];
};

export type FundHistoryPoint = {
  date: string;
  closePrice: number | null;
  lastPrice: number | null;
  navCancel: number | null;
  navIssue: number | null;
  navStatistical: number | null;
  volume: number | null;
  tradeValue: number | null;
};
