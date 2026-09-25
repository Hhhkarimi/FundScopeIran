create table if not exists funds (
  reg_no text primary key,
  ins_code text unique,
  symbol text,
  name text not null,
  fund_type_id integer,
  fund_type_name text,
  category text not null default 'سایر',
  type_of_invest text,
  manager text,
  website text,
  is_etf boolean not null default false,
  market text not null default 'نامشخص',
  initiated_at timestamptz,
  source_updated_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists funds_is_etf_idx on funds (is_etf);
create index if not exists funds_category_idx on funds (category);
create index if not exists funds_symbol_idx on funds (symbol);

create table if not exists fund_snapshots (
  id bigserial primary key,
  reg_no text not null references funds(reg_no) on delete cascade,
  captured_at timestamptz not null,
  last_price numeric,
  closing_price numeric,
  previous_price numeric,
  price_min numeric,
  price_max numeric,
  trade_count numeric,
  volume numeric,
  trade_value numeric,
  nav_cancel numeric,
  nav_issue numeric,
  nav_statistical numeric,
  nav_premium_pct double precision,
  net_asset numeric,
  fund_size numeric,
  daily_return double precision,
  weekly_return double precision,
  monthly_return double precision,
  quarterly_return double precision,
  six_month_return double precision,
  annual_return double precision,
  lifetime_return double precision,
  stock_pct double precision,
  bond_pct double precision,
  cash_pct double precision,
  deposit_pct double precision,
  other_pct double precision,
  commodity_pct double precision,
  units_sub_day numeric,
  units_red_day numeric,
  net_units_flow numeric,
  individual_buy_count numeric,
  individual_sell_count numeric,
  individual_buy_volume numeric,
  individual_sell_volume numeric,
  real_money_flow numeric,
  individual_buy_per_capita numeric,
  individual_sell_per_capita numeric,
  buy_power_ratio double precision,
  unique (reg_no, captured_at)
);

create index if not exists fund_snapshots_captured_idx on fund_snapshots (captured_at desc);
create index if not exists fund_snapshots_reg_captured_idx on fund_snapshots (reg_no, captured_at desc);

create table if not exists fund_daily_history (
  id bigserial primary key,
  reg_no text not null references funds(reg_no) on delete cascade,
  trade_date date not null,
  close_price numeric,
  last_price numeric,
  nav_cancel numeric,
  nav_issue numeric,
  nav_statistical numeric,
  net_asset numeric,
  volume numeric,
  trade_value numeric,
  daily_return double precision,
  source text not null,
  unique (reg_no, trade_date, source)
);

create index if not exists fund_daily_history_reg_date_idx on fund_daily_history (reg_no, trade_date desc);

create table if not exists refresh_runs (
  captured_at timestamptz primary key,
  row_count integer not null,
  source_status jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
