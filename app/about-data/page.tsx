import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Database, ShieldCheck, Sigma } from "lucide-react";

export const metadata: Metadata = {
  title: "روش‌شناسی و منابع داده",
  description: "روش جمع‌آوری، نرمال‌سازی و محاسبه شاخص‌های FundScope Iran.",
  alternates: { canonical: "/about-data" }
};

export default function AboutDataPage() {
  return (
    <main className="shell py-10 sm:py-16">
      <Link href="/" className="mb-7 inline-flex items-center gap-2 text-sm text-white/55 hover:text-white"><ArrowRight size={16}/>بازگشت به داشبورد</Link>
      <section className="glass card max-w-5xl p-6 sm:p-10">
        <p className="text-xs font-bold text-lime-200">DATA METHODOLOGY</p>
        <h1 className="mt-3 text-3xl font-black sm:text-5xl">روش‌شناسی داده و تعریف شاخص‌ها</h1>
        <p className="mt-5 max-w-3xl text-sm leading-8 text-white/55">این صفحه برای شفافیت داده، SEO و پاسخ‌پذیری موتورهای جست‌وجوی مولد طراحی شده است. هر شاخص مشتق‌شده با تعریف و محدودیت آن توضیح داده می‌شود.</p>

        <div className="mt-9 grid gap-4 md:grid-cols-3">
          <article className="rounded-3xl border border-white/[0.08] bg-white/[0.025] p-5"><Database size={20} className="text-sky-300"/><h2 className="mt-4 font-bold">منابع</h2><p className="micro mt-2">فهرست، NAV، بازده و مشخصات صندوق‌ها از سرویس‌های Fipiran. داده معامله و حقیقی/حقوقی ETFها با TSETMC تکمیل می‌شود. در صورت محدودیت یک منبع، وضعیت آن در داشبورد degraded نمایش داده می‌شود.</p></article>
          <article className="rounded-3xl border border-white/[0.08] bg-white/[0.025] p-5"><Sigma size={20} className="text-lime-200"/><h2 className="mt-4 font-bold">محاسبات مشتق‌شده</h2><p className="micro mt-2">حباب NAV = قیمت بازار تقسیم بر NAV ابطال منهای یک. جریان پول حقیقی یک برآورد حجمی است: اختلاف حجم خرید و فروش حقیقی × قیمت مرجع؛ بنابراین عدد رسمی ارزش خرید/فروش نیست.</p></article>
          <article className="rounded-3xl border border-white/[0.08] bg-white/[0.025] p-5"><ShieldCheck size={20} className="text-emerald-300"/><h2 className="mt-4 font-bold">کنترل کیفیت</h2><p className="micro mt-2">درخواست‌ها timeout/retry دارند، پاسخ HTML یا WAF به‌عنوان block تشخیص داده می‌شود و هر Snapshot با زمان ثبت مستقل در PostgreSQL نگهداری می‌شود.</p></article>
        </div>

        <div className="mt-9 space-y-7 text-sm leading-8 text-white/65">
          <section><h2 className="text-xl font-bold text-white">به‌روزرسانی ساعتی</h2><p className="mt-2">Workflow گیت‌هاب در ابتدای هر ساعت scraper را اجرا می‌کند. این انتخاب علاوه بر مستقل کردن جمع‌آوری از زمان پاسخ UI، برای شرایطی که Vercel Hobby اجازه Cron ساعتی نمی‌دهد مناسب است. در Vercel Pro می‌توان فایل vercel.pro.json را جایگزین vercel.json کرد.</p></section>
          <section><h2 className="text-xl font-bold text-white">شاخص نبض بازار</h2><p className="mt-2">شاخص داخلی ۰ تا ۱۰۰ است و ۷۰٪ وزن را از سهم ETFهای دارای بازده روزانه مثبت و ۳۰٪ را از جهت جریان تقریبی حقیقی می‌گیرد. این شاخص استاندارد رسمی بازار سرمایه نیست و برای نمایش سریع وضعیت نسبی طراحی شده است.</p></section>
          <section><h2 className="text-xl font-bold text-white">واحد پول و تاریخ</h2><p className="mt-2">مقادیر قیمت و ارزش با واحد ریال ذخیره می‌شوند. زمان‌ها در دیتابیس UTC ذخیره و در رابط کاربری با منطقه زمانی تهران نمایش داده می‌شوند.</p></section>
          <section><h2 className="text-xl font-bold text-white">محدودیت‌ها</h2><p className="mt-2">سرویس‌های عمومی ممکن است schema، محدودیت دسترسی یا رفتار شبکه‌ای خود را تغییر دهند. به همین دلیل source adapterها مستقل از UI هستند و خطای هر منبع می‌تواند بدون شکستن کل داشبورد degrade شود. داده برای تصمیم‌گیری سرمایه‌گذاری باید با منبع رسمی همان روز تطبیق داده شود.</p></section>
        </div>
      </section>
    </main>
  );
}
