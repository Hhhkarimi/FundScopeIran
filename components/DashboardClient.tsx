"use client";

import Link from "next/link";
import { useMemo, useState, type CSSProperties } from "react";
import {
  Activity,
  ArrowDownLeft,
  ArrowUpRight,
  BarChart3,
  Database,
  Download,
  Filter,
  Gauge,
  Layers3,
  Search,
  Star,
  Trophy,
  WalletCards
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  Treemap,
  XAxis,
  YAxis
} from "recharts";
import { KpiCard } from "@/components/KpiCard";
import FundScoreBadge from "@/components/FundScoreBadge";
import ThemeToggle from "@/components/ThemeToggle";
import WatchlistButton from "@/components/WatchlistButton";
import { compactRial, faDateTime, faNumber, percent } from "@/lib/format";
import { scoreFunds } from "@/lib/fund-score";
import type { DashboardData, FundRow } from "@/lib/types";
import { useWatchlist } from "@/lib/watchlist";

const categoryColors: Record<string, string> = {
  "طلا": "#f7cf65",
  "درآمد ثابت": "#76d7ff",
  "سهامی": "#51d7a4",
  "اهرمی": "#ff8a8a",
  "مختلط": "#a994ff",
  "شاخصی": "#8ec7ff",
  "بخشی": "#f5a7d6",
  "املاک": "#f5b66e",
  "جسورانه": "#b7f37c",
  "بازارگردانی": "#a8b6b0",
  "سایر": "#758a81"
};

function returnClass(value: number | null) {
  if (value === null || value === 0) return "neutral";
  return value > 0 ? "positive" : "negative";
}

function axisCompact(value: number) {
  const abs = Math.abs(value);
  if (abs >= 1e12) return `${(value / 1e12).toFixed(0)}T`;
  if (abs >= 1e9) return `${(value / 1e9).toFixed(0)}B`;
  if (abs >= 1e6) return `${(value / 1e6).toFixed(0)}M`;
  return String(value);
}

function shortName(name: string, max = 18) {
  return name.length > max ? `${name.slice(0, max)}…` : name;
}

function StatusDot({ status }: { status: "ok" | "degraded" | "unknown" }) {
  const className = status === "ok" ? "bg-emerald-400" : status === "degraded" ? "bg-amber-400" : "bg-white/30";
  const label = status === "ok" ? "فعال" : status === "degraded" ? "محدود" : "نامشخص";
  return <span className="inline-flex items-center gap-1.5 text-xs text-white/55"><span className={`h-1.5 w-1.5 rounded-full ${className}`} />{label}</span>;
}

function Pulse({ score }: { score: number | null }) {
  const safe = score ?? 0;
  const title = score === null ? "نامشخص" : safe >= 65 ? "گرم" : safe <= 35 ? "سرد" : "متعادل";
  return (
    <div className="flex items-center gap-4">
      <div className="pulse-ring h-[86px] w-[86px] rounded-full" style={{ "--score": `${safe}%` } as CSSProperties}>
        <div className="absolute inset-0 z-10 flex items-center justify-center text-xl font-bold">{score ?? "—"}</div>
      </div>
      <div>
        <p className="text-sm font-semibold">نبض بازار: {title}</p>
        <p className="micro mt-1 max-w-[250px]">شاخص داخلی ۰ تا ۱۰۰ بر پایه سهم صندوق‌های مثبت و جهت جریان تقریبی پول حقیقی؛ شاخص رسمی یا توصیه سرمایه‌گذاری نیست.</p>
      </div>
    </div>
  );
}

function HeatCell({ fund }: { fund: FundRow }) {
  const ret = fund.dailyReturn;
  const intensity = ret === null ? 0.04 : Math.min(0.34, 0.07 + Math.abs(ret) / 16);
  const background = ret === null
    ? `rgba(255,255,255,${intensity})`
    : ret >= 0
      ? `rgba(67,209,158,${intensity})`
      : `rgba(255,122,122,${intensity})`;
  return (
    <Link href={`/funds/${encodeURIComponent(fund.regNo)}`} className="rounded-xl border border-white/[0.06] p-3 transition hover:-translate-y-0.5 hover:border-white/20" style={{ background }}>
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-xs font-semibold">{fund.symbol || shortName(fund.name, 12)}</span>
        <span className={`text-xs font-bold ${returnClass(ret)}`}>{percent(ret)}</span>
      </div>
      <p className="mt-2 truncate text-[10px] text-white/45">{fund.category}</p>
    </Link>
  );
}

export default function DashboardClient({ data }: { data: DashboardData }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("همه");
  const [etfOnly, setEtfOnly] = useState(false);
  const [watchlistOnly, setWatchlistOnly] = useState(false);
  const watchlist = useWatchlist();
  const scoreMap = useMemo(() => scoreFunds(data.funds), [data.funds]);

  const categories = useMemo(
    () => ["همه", ...Array.from(new Set(data.funds.map((fund) => fund.category)))],
    [data.funds]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.funds.filter((fund) => {
      const matchText = !q || `${fund.name} ${fund.symbol || ""} ${fund.manager || ""}`.toLowerCase().includes(q);
      const matchCategory = category === "همه" || fund.category === category;
      const matchEtf = !etfOnly || fund.isEtf;
      const matchWatchlist = !watchlistOnly || watchlist.has(fund.regNo);
      return matchText && matchCategory && matchEtf && matchWatchlist;
    });
  }, [data.funds, query, category, etfOnly, watchlist, watchlistOnly]);

  const watchedFunds = useMemo(
    () => data.funds.filter((fund) => watchlist.has(fund.regNo)),
    [data.funds, watchlist]
  );

  const topScores = useMemo(
    () => data.funds
      .map((fund) => ({ fund, score: scoreMap.get(fund.regNo) }))
      .filter((item) => item.score?.total !== null && (item.score?.coverage || 0) >= 65)
      .sort((a, b) => (b.score?.total || 0) - (a.score?.total || 0))
      .slice(0, 4),
    [data.funds, scoreMap]
  );

  const movers = useMemo(() => {
    const ranked = [...data.funds].filter((f) => f.dailyReturn !== null).sort((a, b) => (b.dailyReturn || 0) - (a.dailyReturn || 0));
    const gainers = ranked.slice(0, 4);
    const losers = ranked.slice(-4).reverse();
    return [...gainers, ...losers];
  }, [data.funds]);
  const topFlows = useMemo(
    () => [...data.funds].filter((f) => f.realMoneyFlow !== null).sort((a, b) => Math.abs(b.realMoneyFlow || 0) - Math.abs(a.realMoneyFlow || 0)).slice(0, 8),
    [data.funds]
  );
  const heatFunds = useMemo(
    () => [...data.funds].filter((f) => f.isEtf).sort((a, b) => (b.tradeValue || 0) - (a.tradeValue || 0)).slice(0, 24),
    [data.funds]
  );
  const treemapData = useMemo(() => {
    const grouped = new Map<string, number>();
    for (const fund of data.funds) grouped.set(fund.category, (grouped.get(fund.category) || 0) + (fund.netAsset || 0));
    return Array.from(grouped, ([name, size]) => ({ name, size }));
  }, [data.funds]);
  const scatterData = useMemo(
    () => data.funds.filter((f) => f.isEtf && f.netAsset && f.monthlyReturn !== null).map((f) => ({
      name: f.symbol || f.name,
      x: f.netAsset,
      y: f.monthlyReturn,
      z: Math.max(18, Math.min(90, Math.sqrt((f.tradeValue || 0) / 1e8) * 3)),
      category: f.category
    })),
    [data.funds]
  );

  const flowTone = data.summary.totalRealMoneyFlow > 0 ? "positive" : data.summary.totalRealMoneyFlow < 0 ? "negative" : "default";

  return (
    <main className="pb-16">
      <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#07100edb] backdrop-blur-xl">
        <div className="shell flex min-h-16 items-center justify-between gap-4 py-3">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl border border-lime-200/20 bg-lime-200/10 text-lime-200"><BarChart3 size={20} /></div>
            <div>
              <div className="flex items-center gap-2"><span className="font-bold tracking-tight">FundScope Iran</span><span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-white/45">داده ساعتی</span></div>
              <p className="hidden text-[11px] text-white/40 sm:block">رادار تحلیلی صندوق‌های سرمایه‌گذاری ایران</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <a href="#watchlist" className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 px-3 text-xs text-white/65 transition hover:border-white/20 hover:bg-white/5" aria-label={`دیده‌بان من، ${watchlist.count} صندوق`}>
              <Star size={15} fill={watchlist.count ? "currentColor" : "none"} className={watchlist.count ? "text-lime-200" : ""}/>
              <span className="hidden sm:inline">دیده‌بان</span>
              <span className="metric-value rounded-md bg-white/[0.06] px-1.5 py-0.5 text-[10px]">{faNumber(watchlist.count)}</span>
            </a>
            <Link href="/about-data" className="hidden rounded-xl border border-white/10 px-3 py-2 text-xs text-white/65 transition hover:bg-white/5 md:block">روش‌شناسی داده</Link>
            <a href="/api/funds.csv" className="inline-flex items-center gap-2 rounded-xl bg-lime-200 px-3.5 py-2 text-xs font-bold text-[#0a1713] transition hover:bg-lime-100"><Download size={15} />CSV</a>
          </div>
        </div>
      </header>

      <section className="shell pt-8">
        <div className="grid-bg glass card relative overflow-hidden px-5 py-7 sm:px-8 sm:py-9">
          <div className="absolute -left-20 top-0 h-64 w-64 rounded-full bg-lime-300/[0.055] blur-3xl" />
          <div className="relative grid gap-8 lg:grid-cols-[1.5fr_.7fr] lg:items-center">
            <div>
              <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-white/50">
                <span className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1">آخرین بروزرسانی: {faDateTime(data.generatedAt)}</span>
                {data.sourceStatus.fundbase === "ok" ? (
                  <span className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1">Fundbase / Investats <StatusDot status="ok" /></span>
                ) : <>
                  <span className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1">Fipiran <StatusDot status={data.sourceStatus.fipiran} /></span>
                  <span className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1">TSETMC <StatusDot status={data.sourceStatus.tsetmc} /></span>
                </>}
              </div>
              <h1 className="max-w-4xl text-3xl font-black leading-[1.45] tracking-tight sm:text-5xl">بازار صندوق‌ها را در یک نگاه <span className="text-lime-200">ببین، مقایسه کن، کشف کن.</span></h1>
              <p className="mt-4 max-w-3xl text-sm leading-8 text-white/55 sm:text-base">داشبورد ساعتی صندوق‌های سرمایه‌گذاری با NAV، بازده، ارزش معاملات، جریان پول، ترکیب دارایی و نماهای تحلیلی قابل اشتراک.</p>
              {data.mode !== "live" && (
                <div className="mt-5 rounded-2xl border border-amber-300/20 bg-amber-300/[0.06] px-4 py-3 text-xs leading-6 text-amber-100/80">
                  {data.mode === "demo" ? "حالت DEMO فعال است؛ اعداد این صفحه نمایشی هستند و داده بازار واقعی نیستند." : "هنوز Snapshot واقعی تولید نشده است. Workflow به‌روزرسانی ساعتی را اجرا کنید."}
                </div>
              )}
            </div>
            <div className="rounded-3xl border border-white/10 bg-black/10 p-5">
              <Pulse score={data.summary.pulseScore} />
              <div className="mt-5 grid grid-cols-2 gap-3 border-t border-white/[0.07] pt-4">
                <div><p className="micro">سهم صندوق‌های مثبت</p><p className="mt-1 font-semibold">{percent(data.summary.positiveSharePct, 1)}</p></div>
                <div><p className="micro">حباب میانه NAV</p><p className="mt-1 font-semibold">{percent(data.summary.medianNavPremiumPct, 2)}</p></div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <KpiCard icon={Layers3} label="تعداد صندوق‌ها" value={faNumber(data.summary.fundCount)} hint={`${faNumber(data.summary.etfCount)} صندوق قابل معامله`} />
          <KpiCard icon={WalletCards} label="خالص ارزش دارایی‌ها" value={compactRial(data.summary.totalNetAsset)} hint="مجموع آخرین AUM/NAV گزارش‌شده" />
          <KpiCard icon={Activity} label="ارزش معاملات ETF" value={compactRial(data.summary.etfTradeValue)} hint="تجمیع آخرین روز معاملاتی" />
          <KpiCard icon={ArrowUpRight} label="جریان تقریبی حقیقی" value={compactRial(data.summary.totalRealMoneyFlow)} hint="برآورد حجمی × قیمت؛ رسمی نیست" tone={flowTone} />
          <KpiCard icon={Gauge} label="حباب میانه NAV" value={percent(data.summary.medianNavPremiumPct)} hint="فاصله قیمت بازار تا NAV ابطال" />
        </div>

        <section id="watchlist" className="watchlist-panel mt-5 scroll-mt-24 overflow-hidden rounded-[22px] border border-lime-200/15 bg-lime-200/[0.035]">
          <div className="flex flex-col gap-3 border-b border-lime-200/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-lime-200/10 text-lime-200"><Star size={17} fill="currentColor"/></div>
              <div><h2 className="font-bold">دیده‌بان من</h2><p className="micro">صندوق‌های مهم شما؛ فقط در همین مرورگر ذخیره می‌شوند.</p></div>
            </div>
            {watchedFunds.length > 0 && <button type="button" onClick={() => { setWatchlistOnly(true); document.getElementById("fund-table")?.scrollIntoView({ behavior: "smooth" }); }} className="text-right text-xs font-bold text-lime-200 hover:text-lime-100">نمایش در جدول ←</button>}
          </div>
          {watchedFunds.length ? (
            <div className="grid gap-px bg-white/[0.055] sm:grid-cols-2 xl:grid-cols-4">
              {watchedFunds.slice(0, 8).map((fund) => (
                <article key={fund.regNo} className="watchlist-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <Link href={`/funds/${encodeURIComponent(fund.regNo)}`} className="min-w-0"><p className="truncate font-bold">{fund.symbol || fund.name}</p><p className="mt-1 truncate text-[11px] text-white/40">{fund.name}</p></Link>
                    <WatchlistButton regNo={fund.regNo} fundName={fund.name}/>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-xs"><div><p className="micro">بازده روزانه</p><p className={`metric-value mt-1 font-bold ${returnClass(fund.dailyReturn)}`}>{percent(fund.dailyReturn)}</p></div><div><p className="micro">حباب NAV</p><p className={`metric-value mt-1 font-bold ${returnClass(fund.navPremiumPct)}`}>{percent(fund.navPremiumPct)}</p></div></div>
                </article>
              ))}
            </div>
          ) : (
            <div className="grid gap-4 px-5 py-7 sm:grid-cols-[1fr_auto] sm:items-center sm:px-6">
              <div><p className="text-sm font-semibold">هنوز صندوقی را نشان نکرده‌اید.</p><p className="micro mt-1">از ستاره کنار هر صندوق استفاده کنید؛ انتخاب‌ها بدون حساب کاربری بین بازدیدهای شما باقی می‌مانند.</p></div>
              <a href="#fund-table" className="inline-flex items-center justify-center gap-2 rounded-xl border border-lime-200/20 px-4 py-2.5 text-xs font-bold text-lime-200 transition hover:bg-lime-200/10"><Star size={14}/>رفتن به فهرست صندوق‌ها</a>
            </div>
          )}
        </section>

        <section className="score-overview mt-5 overflow-hidden rounded-[22px] border border-sky-300/15 bg-sky-300/[0.03]">
          <div className="flex flex-col gap-3 border-b border-sky-300/10 px-5 py-4 sm:flex-row sm:items-end sm:justify-between sm:px-6">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-sky-300/10 text-sky-200"><Trophy size={17}/></div>
              <div><h2 className="font-bold">صندوق‌های متوازن امروز</h2><p className="micro">بالاترین امتیاز جامع با پوشش داده حداقل ۶۵٪؛ مقایسه درون گروه مشابه انجام می‌شود.</p></div>
            </div>
            <Link href="/about-data#fund-score" className="text-xs font-bold text-sky-200 hover:text-sky-100">فرمول و محدودیت‌ها ←</Link>
          </div>
          {topScores.length ? (
            <div className="grid gap-px bg-white/[0.055] sm:grid-cols-2 xl:grid-cols-4">
              {topScores.map(({ fund, score }, index) => (
                <Link key={fund.regNo} href={`/funds/${encodeURIComponent(fund.regNo)}`} className="score-rank-card group p-4 transition hover:bg-sky-300/[0.045]">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0"><p className="truncate font-bold"><span className="ml-2 text-[10px] text-white/25">{faNumber(index + 1)}</span>{fund.symbol || fund.name}</p><p className="mt-1 truncate text-[11px] text-white/40">{fund.category} · {score?.peerLabel}</p></div>
                    <FundScoreBadge score={score}/>
                  </div>
                  <p className="micro mt-4 line-clamp-2">{score?.summary}</p>
                </Link>
              ))}
            </div>
          ) : <p className="micro px-6 py-7">برای رتبه‌بندی مطمئن، هنوز داده کافی نداریم.</p>}
          <p className="border-t border-sky-300/10 px-5 py-3 text-[10px] leading-5 text-white/35 sm:px-6">این رتبه‌بندی توصیه خرید نیست؛ عملکرد گذشته، نقدشوندگی، فاصله با NAV، اندازه و تقاضای حقیقی را در Snapshot فعلی خلاصه می‌کند.</p>
        </section>

        <div className="mt-5 grid gap-5 xl:grid-cols-[1.45fr_.8fr]">
          <section className="glass card p-5 sm:p-6">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div><p className="text-base font-bold">روند ۷۲ Snapshot اخیر</p><p className="micro mt-1">ارزش معاملات ETF و جریان تقریبی پول حقیقی</p></div>
              <span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] text-white/45">Hourly</span>
            </div>
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.history} margin={{ top: 8, right: 6, left: 6, bottom: 0 }}>
                  <defs>
                    <linearGradient id="tradeGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#78d6ff" stopOpacity={0.35}/><stop offset="100%" stopColor="#78d6ff" stopOpacity={0}/></linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(255,255,255,.055)" vertical={false} />
                  <XAxis dataKey="capturedAt" tickFormatter={(v) => new Intl.DateTimeFormat("fa-IR", { hour: "2-digit" }).format(new Date(v))} tick={{ fill: "rgba(255,255,255,.35)", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={axisCompact} tick={{ fill: "rgba(255,255,255,.35)", fontSize: 10 }} axisLine={false} tickLine={false} width={45} />
                  <Tooltip formatter={(v: any, n: any) => [compactRial(Number(v)), n === "etfTradeValue" ? "ارزش معاملات" : "جریان حقیقی"]} labelFormatter={(v) => faDateTime(String(v))} />
                  <Area type="monotone" dataKey="etfTradeValue" stroke="#78d6ff" fill="url(#tradeGradient)" strokeWidth={2} />
                  <Area type="monotone" dataKey="totalRealMoneyFlow" stroke="#d7ff69" fillOpacity={0} strokeWidth={1.8} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="glass card p-5 sm:p-6">
            <div className="mb-4"><p className="text-base font-bold">نقشه حرارتی ETFها</p><p className="micro mt-1">۲۴ صندوق با بیشترین ارزش معاملات؛ رنگ بر اساس بازده روزانه</p></div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-3">
              {heatFunds.length ? heatFunds.map((fund) => <HeatCell key={fund.regNo} fund={fund} />) : <p className="micro col-span-full py-16 text-center">داده کافی وجود ندارد.</p>}
            </div>
          </section>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
          <section className="glass card p-5 sm:p-6">
            <div className="mb-4"><p className="text-base font-bold">برندگان و بازندگان روز</p><p className="micro mt-1">۴ بازده بالاتر و ۴ بازده پایین‌تر در Snapshot فعلی</p></div>
            <div className="h-[290px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={movers} layout="vertical" margin={{ left: 10, right: 10 }}>
                  <CartesianGrid stroke="rgba(255,255,255,.05)" horizontal={false} />
                  <XAxis type="number" tick={{ fill: "rgba(255,255,255,.35)", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="symbol" width={58} tick={{ fill: "rgba(255,255,255,.58)", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v: any) => percent(Number(v))} />
                  <Bar dataKey="dailyReturn" radius={[6, 6, 6, 6]}>{movers.map((item) => <Cell key={item.regNo} fill={(item.dailyReturn || 0) >= 0 ? "#43d19e" : "#ff7a7a"} />)}</Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="glass card p-5 sm:p-6">
            <div className="mb-4"><p className="text-base font-bold">اندازه بازار بر اساس گروه</p><p className="micro mt-1">Treemap بر پایه خالص ارزش دارایی گزارش‌شده</p></div>
            <div className="h-[290px]">
              <ResponsiveContainer width="100%" height="100%">
                <Treemap data={treemapData} dataKey="size" nameKey="name" stroke="#10241e" content={(props: any) => {
                  const { x, y, width, height, name, index } = props;
                  if (width < 40 || height < 28) return <g />;
                  return <g><rect x={x} y={y} width={width} height={height} rx={8} fill={categoryColors[name] || "#758a81"} fillOpacity={0.78} /><text x={x + width / 2} y={y + height / 2} textAnchor="middle" dominantBaseline="central" fill="#07100e" fontSize={11} fontWeight={800}>{shortName(name, 10)}</text></g>;
                }} />
              </ResponsiveContainer>
            </div>
          </section>

          <section className="glass card p-5 sm:p-6 lg:col-span-2 xl:col-span-1">
            <div className="mb-4"><p className="text-base font-bold">جریان پول حقیقی</p><p className="micro mt-1">بیشترین قدرمطلق ورود/خروج تقریبی میان ETFها</p></div>
            <div className="space-y-3">
              {topFlows.map((fund) => {
                const flow = fund.realMoneyFlow || 0;
                return <Link key={fund.regNo} href={`/funds/${fund.regNo}`} className="flex items-center justify-between rounded-2xl border border-white/[0.06] bg-white/[0.018] px-3.5 py-3 transition hover:bg-white/[0.04]">
                  <div className="flex items-center gap-3"><div className={`grid h-9 w-9 place-items-center rounded-xl ${flow >= 0 ? "bg-emerald-400/10 text-emerald-300" : "bg-red-400/10 text-red-300"}`}>{flow >= 0 ? <ArrowDownLeft size={16}/> : <ArrowUpRight size={16}/>}</div><div><p className="text-sm font-semibold">{fund.symbol || shortName(fund.name, 14)}</p><p className="micro">{fund.category}</p></div></div>
                  <span className={`text-xs font-bold ${returnClass(flow)}`}>{compactRial(flow)}</span>
                </Link>;
              })}
              {!topFlows.length && <p className="micro py-16 text-center">داده حقیقی/حقوقی در دسترس نیست.</p>}
            </div>
          </section>
        </div>

        <section className="glass card mt-5 p-5 sm:p-6">
          <div className="grid gap-5 lg:grid-cols-[.8fr_1.2fr] lg:items-start">
            <div>
              <div className="flex items-center gap-2 text-lime-200"><span className="h-px w-6 bg-lime-200/50"/><span className="text-xs font-bold">نقشه بازده × اندازه</span></div>
              <h2 className="mt-3 text-2xl font-black">بازده ماهانه در برابر اندازه صندوق</h2>
              <p className="mt-3 text-sm leading-7 text-white/50">هر نقطه یک ETF است. محور افقی AUM و محور عمودی بازده یک‌ماهه را نشان می‌دهد؛ برای پیدا کردن صندوق‌های بزرگ با رفتار غیرعادی مناسب است.</p>
              <div className="mt-5 flex flex-wrap gap-2">{Object.entries(categoryColors).slice(0, 7).map(([name, color]) => <span key={name} className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.06] px-2.5 py-1 text-[10px] text-white/55"><span className="h-2 w-2 rounded-full" style={{ background: color }}/>{name}</span>)}</div>
            </div>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 15, right: 12, bottom: 10, left: 10 }}>
                  <CartesianGrid stroke="rgba(255,255,255,.05)" />
                  <XAxis type="number" dataKey="x" name="AUM" tickFormatter={axisCompact} tick={{ fill: "rgba(255,255,255,.35)", fontSize: 10 }} axisLine={false} />
                  <YAxis type="number" dataKey="y" name="بازده ماهانه" tickFormatter={(v) => `${v}%`} tick={{ fill: "rgba(255,255,255,.35)", fontSize: 10 }} axisLine={false} />
                  <Tooltip cursor={{ strokeDasharray: "3 3" }} formatter={(v: any, n: any) => n === "AUM" ? compactRial(Number(v)) : percent(Number(v))} />
                  <Scatter data={scatterData} shape={(props: any) => <circle cx={props.cx} cy={props.cy} r={Math.max(4, Math.min(11, props.payload?.z || 5))} fill={categoryColors[props.payload?.category] || "#d7ff69"} fillOpacity={0.78} stroke="rgba(255,255,255,.38)" strokeWidth={1}/>} />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        <section id="fund-table" className="glass card mt-5 scroll-mt-24 overflow-hidden">
          <div className="border-b border-white/[0.07] p-5 sm:p-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div><p className="text-lg font-bold">دیتاست صندوق‌ها</p><p className="micro mt-1">جست‌وجو، فیلتر و ورود به صفحه جزئیات هر صندوق</p></div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <label className="flex min-w-[260px] items-center gap-2 rounded-xl border border-white/10 bg-black/10 px-3 py-2.5"><Search size={15} className="text-white/35"/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="نام، نماد یا مدیر صندوق..." className="w-full bg-transparent text-xs outline-none placeholder:text-white/25"/></label>
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-xl border border-white/10 bg-[#0c1d18] px-3 py-2.5 text-xs outline-none">{categories.map((c) => <option key={c}>{c}</option>)}</select>
                <button onClick={() => setEtfOnly((v) => !v)} className={`inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs transition ${etfOnly ? "border-lime-200/30 bg-lime-200/10 text-lime-200" : "border-white/10 text-white/60 hover:bg-white/5"}`}><Filter size={14}/>فقط ETF</button>
                <button onClick={() => setWatchlistOnly((value) => !value)} className={`inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs transition ${watchlistOnly ? "border-lime-200/30 bg-lime-200/10 text-lime-200" : "border-white/10 text-white/60 hover:bg-white/5"}`}><Star size={14} fill={watchlistOnly ? "currentColor" : "none"}/>دیده‌بان من</button>
              </div>
            </div>
          </div>
          <div className="table-scroll overflow-x-auto">
            <table className="w-full min-w-[1120px] border-collapse text-right text-xs">
              <thead className="bg-white/[0.025] text-white/38"><tr>{["صندوق", "امتیاز جامع", "نوع", "بازار", "قیمت آخر", "NAV ابطال", "حباب NAV", "روزانه", "ماهانه", "AUM", "ارزش معاملات", "جریان حقیقی", "قدرت خرید"].map((h) => <th key={h} className="whitespace-nowrap px-4 py-3.5 font-medium">{h}</th>)}</tr></thead>
              <tbody>
                {filtered.slice(0, 150).map((fund) => <tr key={fund.regNo} className="border-t border-white/[0.055] transition hover:bg-white/[0.025]">
                  <td className="px-4 py-3.5"><div className="flex items-center gap-3"><WatchlistButton regNo={fund.regNo} fundName={fund.name}/><Link href={`/funds/${fund.regNo}`} className="block min-w-0"><div className="font-bold text-white/90">{fund.symbol || "بدون نماد"}</div><div className="mt-1 max-w-[220px] truncate text-[10px] text-white/38">{fund.name}</div></Link></div></td>
                  <td className="px-4 py-3.5"><FundScoreBadge score={scoreMap.get(fund.regNo)} compact/></td>
                  <td className="px-4 py-3.5"><span className="rounded-full border border-white/[0.07] px-2 py-1 text-[10px] text-white/55">{fund.category}</span></td>
                  <td className="px-4 py-3.5 text-white/55">{fund.market}</td>
                  <td className="metric-value px-4 py-3.5">{faNumber(fund.lastPrice || fund.closingPrice)}</td>
                  <td className="metric-value px-4 py-3.5">{faNumber(fund.navCancel)}</td>
                  <td className={`metric-value px-4 py-3.5 ${returnClass(fund.navPremiumPct)}`}>{percent(fund.navPremiumPct)}</td>
                  <td className={`metric-value px-4 py-3.5 ${returnClass(fund.dailyReturn)}`}>{percent(fund.dailyReturn)}</td>
                  <td className={`metric-value px-4 py-3.5 ${returnClass(fund.monthlyReturn)}`}>{percent(fund.monthlyReturn)}</td>
                  <td className="metric-value px-4 py-3.5 text-white/65">{compactRial(fund.netAsset)}</td>
                  <td className="metric-value px-4 py-3.5 text-white/65">{compactRial(fund.tradeValue)}</td>
                  <td className={`metric-value px-4 py-3.5 ${returnClass(fund.realMoneyFlow)}`}>{compactRial(fund.realMoneyFlow)}</td>
                  <td className="metric-value px-4 py-3.5">{fund.buyPowerRatio === null ? "—" : faNumber(fund.buyPowerRatio, 2)}</td>
                </tr>)}
                {!filtered.length && <tr><td colSpan={13} className="px-5 py-14 text-center"><Star className="mx-auto text-white/20" size={24}/><p className="mt-3 text-sm font-semibold">صندوقی با این فیلتر پیدا نشد.</p><p className="micro mt-1">فیلترها را تغییر دهید یا چند صندوق را به دیده‌بان اضافه کنید.</p></td></tr>}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-white/[0.06] px-5 py-3 text-[11px] text-white/35"><span>{faNumber(filtered.length)} نتیجه</span><span>حداکثر ۱۵۰ ردیف در جدول؛ CSV شامل همه ردیف‌هاست.</span></div>
        </section>

        <footer className="mt-8 flex flex-col gap-3 border-t border-white/[0.06] py-6 text-xs text-white/35 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2"><Database size={14}/><span>منابع: صفحات عمومی Fundbase/Investats و منابع مستقیم بازار — آرشیو فایل‌محور</span></div>
          <p>این داشبورد ابزار اطلاعاتی است و توصیه خرید/فروش محسوب نمی‌شود.</p>
        </footer>
      </section>
    </main>
  );
}
