import { db, hasDatabase } from "@/lib/db";
import type { DashboardData, FundRow, HistoryPoint } from "@/lib/types";

function n(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function replaceSnapshot(
  rows: FundRow[],
  sourceStatus: DashboardData["sourceStatus"]
) {
  if (!hasDatabase()) {
    throw new Error("DATABASE_URL is required to persist hourly snapshots");
  }
  const sql = db();
  const capturedAt = rows[0]?.capturedAt || new Date().toISOString();

  await sql.begin(async (tx) => {
    for (const row of rows) {
      await tx`
        insert into funds (
          reg_no, ins_code, symbol, name, fund_type_id, fund_type_name, category,
          type_of_invest, manager, website, is_etf, market, initiated_at, source_updated_at, updated_at
        ) values (
          ${row.regNo}, ${row.insCode}, ${row.symbol}, ${row.name}, ${row.fundTypeId},
          ${row.fundTypeName}, ${row.category}, ${row.typeOfInvest}, ${row.manager}, ${row.website},
          ${row.isEtf}, ${row.market}, ${row.initiatedAt}, ${row.sourceUpdatedAt}, now()
        )
        on conflict (reg_no) do update set
          ins_code = excluded.ins_code,
          symbol = excluded.symbol,
          name = excluded.name,
          fund_type_id = excluded.fund_type_id,
          fund_type_name = excluded.fund_type_name,
          category = excluded.category,
          type_of_invest = excluded.type_of_invest,
          manager = excluded.manager,
          website = excluded.website,
          is_etf = excluded.is_etf,
          market = excluded.market,
          initiated_at = excluded.initiated_at,
          source_updated_at = excluded.source_updated_at,
          updated_at = now()
      `;

      await tx`
        insert into fund_snapshots (
          reg_no, captured_at, last_price, closing_price, previous_price, price_min, price_max,
          trade_count, volume, trade_value, nav_cancel, nav_issue, nav_statistical, nav_premium_pct,
          net_asset, fund_size, daily_return, weekly_return, monthly_return, quarterly_return,
          six_month_return, annual_return, lifetime_return, stock_pct, bond_pct, cash_pct,
          deposit_pct, other_pct, commodity_pct, units_sub_day, units_red_day, net_units_flow,
          individual_buy_count, individual_sell_count, individual_buy_volume, individual_sell_volume,
          real_money_flow, individual_buy_per_capita, individual_sell_per_capita, buy_power_ratio
        ) values (
          ${row.regNo}, ${capturedAt}, ${row.lastPrice}, ${row.closingPrice}, ${row.previousPrice},
          ${row.priceMin}, ${row.priceMax}, ${row.tradeCount}, ${row.volume}, ${row.tradeValue},
          ${row.navCancel}, ${row.navIssue}, ${row.navStatistical}, ${row.navPremiumPct},
          ${row.netAsset}, ${row.fundSize}, ${row.dailyReturn}, ${row.weeklyReturn}, ${row.monthlyReturn},
          ${row.quarterlyReturn}, ${row.sixMonthReturn}, ${row.annualReturn}, ${row.lifetimeReturn},
          ${row.stockPct}, ${row.bondPct}, ${row.cashPct}, ${row.depositPct}, ${row.otherPct},
          ${row.commodityPct}, ${row.unitsSubDay}, ${row.unitsRedDay}, ${row.netUnitsFlow},
          ${row.individualBuyCount}, ${row.individualSellCount}, ${row.individualBuyVolume},
          ${row.individualSellVolume}, ${row.realMoneyFlow}, ${row.individualBuyPerCapita},
          ${row.individualSellPerCapita}, ${row.buyPowerRatio}
        )
        on conflict (reg_no, captured_at) do nothing
      `;
    }

    await tx`
      insert into refresh_runs (captured_at, row_count, source_status)
      values (${capturedAt}, ${rows.length}, ${JSON.stringify(sourceStatus)}::jsonb)
      on conflict (captured_at) do update set row_count = excluded.row_count, source_status = excluded.source_status
    `;
  });
}

export async function readLatestRows(): Promise<FundRow[]> {
  if (!hasDatabase()) return [];
  const sql = db();
  const rows = await sql`
    with latest as (
      select max(captured_at) as captured_at from fund_snapshots
    )
    select
      f.reg_no, f.ins_code, f.symbol, f.name, f.fund_type_id, f.fund_type_name, f.category,
      f.type_of_invest, f.manager, f.website, f.is_etf, f.market, f.initiated_at, f.source_updated_at,
      s.*
    from fund_snapshots s
    join latest l on s.captured_at = l.captured_at
    join funds f on f.reg_no = s.reg_no
    order by coalesce(s.net_asset, 0) desc, f.name asc
  `;

  return rows.map((r: Record<string, unknown>) => ({
    regNo: String(r.reg_no),
    insCode: r.ins_code ? String(r.ins_code) : null,
    symbol: r.symbol ? String(r.symbol) : null,
    name: String(r.name),
    fundTypeId: n(r.fund_type_id),
    fundTypeName: r.fund_type_name ? String(r.fund_type_name) : null,
    category: String(r.category) as FundRow["category"],
    typeOfInvest: r.type_of_invest ? String(r.type_of_invest) : null,
    manager: r.manager ? String(r.manager) : null,
    website: r.website ? String(r.website) : null,
    isEtf: Boolean(r.is_etf),
    market: String(r.market) as FundRow["market"],
    initiatedAt: r.initiated_at ? new Date(String(r.initiated_at)).toISOString() : null,
    sourceUpdatedAt: r.source_updated_at ? new Date(String(r.source_updated_at)).toISOString() : null,
    capturedAt: new Date(String(r.captured_at)).toISOString(),
    lastPrice: n(r.last_price),
    closingPrice: n(r.closing_price),
    previousPrice: n(r.previous_price),
    priceMin: n(r.price_min),
    priceMax: n(r.price_max),
    tradeCount: n(r.trade_count),
    volume: n(r.volume),
    tradeValue: n(r.trade_value),
    navCancel: n(r.nav_cancel),
    navIssue: n(r.nav_issue),
    navStatistical: n(r.nav_statistical),
    navPremiumPct: n(r.nav_premium_pct),
    netAsset: n(r.net_asset),
    fundSize: n(r.fund_size),
    dailyReturn: n(r.daily_return),
    weeklyReturn: n(r.weekly_return),
    monthlyReturn: n(r.monthly_return),
    quarterlyReturn: n(r.quarterly_return),
    sixMonthReturn: n(r.six_month_return),
    annualReturn: n(r.annual_return),
    lifetimeReturn: n(r.lifetime_return),
    stockPct: n(r.stock_pct),
    bondPct: n(r.bond_pct),
    cashPct: n(r.cash_pct),
    depositPct: n(r.deposit_pct),
    otherPct: n(r.other_pct),
    commodityPct: n(r.commodity_pct),
    unitsSubDay: n(r.units_sub_day),
    unitsRedDay: n(r.units_red_day),
    netUnitsFlow: n(r.net_units_flow),
    individualBuyCount: n(r.individual_buy_count),
    individualSellCount: n(r.individual_sell_count),
    individualBuyVolume: n(r.individual_buy_volume),
    individualSellVolume: n(r.individual_sell_volume),
    realMoneyFlow: n(r.real_money_flow),
    individualBuyPerCapita: n(r.individual_buy_per_capita),
    individualSellPerCapita: n(r.individual_sell_per_capita),
    buyPowerRatio: n(r.buy_power_ratio)
  }));
}

export async function readHistory(limit = 72): Promise<HistoryPoint[]> {
  if (!hasDatabase()) return [];
  const sql = db();
  const rows = await sql`
    select
      captured_at,
      coalesce(sum(net_asset), 0) as total_net_asset,
      coalesce(sum(trade_value) filter (where is_etf), 0) as etf_trade_value,
      coalesce(sum(real_money_flow) filter (where is_etf), 0) as total_real_money_flow,
      100.0 * count(*) filter (where is_etf and daily_return > 0)
        / nullif(count(*) filter (where is_etf and daily_return is not null), 0) as positive_share_pct
    from fund_snapshots s
    join funds f using (reg_no)
    group by captured_at
    order by captured_at desc
    limit ${limit}
  `;
  return rows.reverse().map((r: Record<string, unknown>) => ({
    capturedAt: new Date(String(r.captured_at)).toISOString(),
    totalNetAsset: n(r.total_net_asset) || 0,
    etfTradeValue: n(r.etf_trade_value) || 0,
    totalRealMoneyFlow: n(r.total_real_money_flow) || 0,
    positiveSharePct: n(r.positive_share_pct)
  }));
}

export async function readLatestSourceStatus(): Promise<DashboardData["sourceStatus"]> {
  if (!hasDatabase()) return { fipiran: "unknown", tsetmc: "unknown" };
  const sql = db();
  const rows = await sql`select source_status from refresh_runs order by captured_at desc limit 1`;
  const value = rows[0]?.source_status as DashboardData["sourceStatus"] | undefined;
  return value || { fipiran: "unknown", tsetmc: "unknown" };
}

export async function readFund(regNo: string): Promise<FundRow | null> {
  const rows = await readLatestRows();
  return rows.find((row) => row.regNo === regNo) || null;
}

export async function readFundHistory(regNo: string, limit = 365): Promise<import("@/lib/types").FundHistoryPoint[]> {
  if (!hasDatabase()) return [];
  const sql = db();
  const rows = await sql`
    select * from (
      select
        trade_date,
        max(close_price) filter (where close_price is not null) as close_price,
        max(last_price) filter (where last_price is not null) as last_price,
        max(nav_cancel) filter (where source = 'fipiran') as nav_cancel,
        max(nav_issue) filter (where source = 'fipiran') as nav_issue,
        max(nav_statistical) filter (where source = 'fipiran') as nav_statistical,
        max(volume) filter (where volume is not null) as volume,
        max(trade_value) filter (where trade_value is not null) as trade_value
      from fund_daily_history
      where reg_no = ${regNo}
      group by trade_date
      order by trade_date desc
      limit ${limit}
    ) h
    order by trade_date asc
  `;
  return rows.map((r: Record<string, unknown>) => ({
    date: new Date(String(r.trade_date)).toISOString().slice(0, 10),
    closePrice: n(r.close_price),
    lastPrice: n(r.last_price),
    navCancel: n(r.nav_cancel),
    navIssue: n(r.nav_issue),
    navStatistical: n(r.nav_statistical),
    volume: n(r.volume),
    tradeValue: n(r.trade_value)
  }));
}
