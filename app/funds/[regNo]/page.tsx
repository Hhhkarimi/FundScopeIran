import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ExternalLink } from "lucide-react";
import { readFundHistory } from "@/lib/repository";
import { getDashboardData } from "@/lib/dashboard";
import FundHistoryChart from "@/components/FundHistoryChart";
import { compactRial, faDateTime, faNumber, percent } from "@/lib/format";

export const revalidate = 3600;

export async function generateMetadata({ params }: { params: Promise<{ regNo: string }> }): Promise<Metadata> {
  const { regNo } = await params;
  const dashboard = await getDashboardData();
  const fund = dashboard.funds.find((item) => item.regNo === decodeURIComponent(regNo)) || null;
  if (!fund) return { title: "صندوق یافت نشد" };
  const title = `${fund.symbol ? `${fund.symbol} — ` : ""}${fund.name}`;
  return {
    title,
    description: `اطلاعات ${fund.name}: NAV، بازده، ارزش معاملات، حباب NAV، AUM و جریان پول.` ,
    alternates: { canonical: `/funds/${encodeURIComponent(fund.regNo)}` },
    openGraph: { title, description: `داشبورد تحلیلی ${fund.name}` }
  };
}

function Stat({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4"><p className="micro">{label}</p><p className={`metric-value mt-2 text-lg font-bold ${className}`}>{value}</p></div>;
}

export default async function FundPage({ params }: { params: Promise<{ regNo: string }> }) {
  const { regNo } = await params;
  const dashboard = await getDashboardData();
  const fund = dashboard.funds.find((item) => item.regNo === decodeURIComponent(regNo)) || null;
  if (!fund) notFound();
  const history = fund.regNo.startsWith("DEMO-") ? [] : await readFundHistory(fund.regNo);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://example.com";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FinancialProduct",
    name: fund.name,
    identifier: fund.regNo,
    url: `${siteUrl}/funds/${encodeURIComponent(fund.regNo)}`,
    category: fund.category,
    provider: fund.manager ? { "@type": "Organization", name: fund.manager } : undefined,
    description: `صندوق سرمایه‌گذاری ${fund.name}${fund.symbol ? ` با نماد ${fund.symbol}` : ""}`
  };

  const positive = (value: number | null) => value === null ? "neutral" : value > 0 ? "positive" : value < 0 ? "negative" : "neutral";

  return (
    <main className="shell py-9 sm:py-14">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Link href="/" className="mb-6 inline-flex items-center gap-2 text-sm text-white/55 hover:text-white"><ArrowRight size={16}/>بازگشت به داشبورد</Link>
      <section className="glass card p-6 sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2"><span className="rounded-full border border-lime-200/20 bg-lime-200/10 px-2.5 py-1 text-xs text-lime-200">{fund.category}</span><span className="rounded-full border border-white/10 px-2.5 py-1 text-xs text-white/45">{fund.market}</span>{fund.isEtf && <span className="rounded-full border border-white/10 px-2.5 py-1 text-xs text-white/45">ETF</span>}</div>
            <h1 className="mt-4 text-3xl font-black leading-[1.5] sm:text-5xl">{fund.symbol && <span className="text-lime-200">{fund.symbol} </span>}{fund.name}</h1>
            <p className="mt-3 text-sm text-white/45">مدیر: {fund.manager || "—"} · آخرین Snapshot: {faDateTime(fund.capturedAt)}</p>
          </div>
          {fund.website && <a href={fund.website} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-xs text-white/65 hover:bg-white/5">وب‌سایت صندوق<ExternalLink size={14}/></a>}
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="آخرین قیمت" value={`${faNumber(fund.lastPrice || fund.closingPrice)} ریال`} />
          <Stat label="NAV ابطال" value={`${faNumber(fund.navCancel)} ریال`} />
          <Stat label="حباب NAV" value={percent(fund.navPremiumPct)} className={positive(fund.navPremiumPct)} />
          <Stat label="خالص ارزش دارایی" value={compactRial(fund.netAsset)} />
          <Stat label="بازده روزانه" value={percent(fund.dailyReturn)} className={positive(fund.dailyReturn)} />
          <Stat label="بازده یک‌ماهه" value={percent(fund.monthlyReturn)} className={positive(fund.monthlyReturn)} />
          <Stat label="بازده یک‌ساله" value={percent(fund.annualReturn)} className={positive(fund.annualReturn)} />
          <Stat label="ارزش معاملات" value={compactRial(fund.tradeValue)} />
          <Stat label="جریان تقریبی حقیقی" value={compactRial(fund.realMoneyFlow)} className={positive(fund.realMoneyFlow)} />
          <Stat label="سرانه خرید حقیقی" value={compactRial(fund.individualBuyPerCapita)} />
          <Stat label="سرانه فروش حقیقی" value={compactRial(fund.individualSellPerCapita)} />
          <Stat label="قدرت خرید حجمی" value={fund.buyPowerRatio === null ? "—" : faNumber(fund.buyPowerRatio, 2)} />
        </div>

        <div className="mt-6 rounded-3xl border border-white/[0.07] bg-black/10 p-5 sm:p-6">
          <div className="mb-4"><h2 className="font-bold">تاریخچه قیمت و NAV</h2><p className="micro mt-1">حداکثر ۳۶۵ روز از داده Backfill شده؛ برای صندوق‌های غیر ETF ممکن است فقط NAV نمایش داده شود.</p></div>
          <FundHistoryChart data={history} />
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <div className="rounded-3xl border border-white/[0.07] bg-black/10 p-5"><h2 className="font-bold">ترکیب دارایی</h2><div className="mt-4 space-y-3">{[["سهام",fund.stockPct],["اوراق",fund.bondPct],["سپرده",fund.depositPct],["کالا",fund.commodityPct],["سایر",fund.otherPct]].map(([label,value]) => <div key={String(label)}><div className="mb-1.5 flex justify-between text-xs"><span className="text-white/55">{label}</span><span>{percent(value as number | null,1)}</span></div><div className="h-2 overflow-hidden rounded-full bg-white/[0.05]"><div className="h-full rounded-full bg-lime-200/70" style={{ width: `${Math.max(0, Math.min(100, Number(value || 0)))}%` }}/></div></div>)}</div></div>
          <div className="rounded-3xl border border-white/[0.07] bg-black/10 p-5"><h2 className="font-bold">مشخصات داده</h2><dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-4 text-xs"><div><dt className="text-white/35">شماره ثبت</dt><dd className="mt-1">{fund.regNo}</dd></div><div><dt className="text-white/35">InsCode</dt><dd className="mt-1">{fund.insCode || "—"}</dd></div><div><dt className="text-white/35">نوع سرمایه‌گذاری</dt><dd className="mt-1">{fund.typeOfInvest || "—"}</dd></div><div><dt className="text-white/35">نوع صندوق</dt><dd className="mt-1">{fund.fundTypeName || "—"}</dd></div><div><dt className="text-white/35">صدور امروز</dt><dd className="mt-1">{faNumber(fund.unitsSubDay)}</dd></div><div><dt className="text-white/35">ابطال امروز</dt><dd className="mt-1">{faNumber(fund.unitsRedDay)}</dd></div></dl></div>
        </div>

        <p className="micro mt-6 border-t border-white/[0.07] pt-5">جریان پول حقیقی و قدرت خرید، شاخص‌های مشتق‌شده از حجم حقیقی/حقوقی و قیمت هستند و ممکن است با محاسبات پلتفرم‌های دیگر متفاوت باشند. برای معامله، داده را با منبع رسمی روز تطبیق دهید.</p>
      </section>
    </main>
  );
}
