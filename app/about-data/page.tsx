import type { Metadata } from "next";
import Link from "next/link";
import { Archive, ArrowRight, ShieldCheck, Sigma } from "lucide-react";

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
          <article className="rounded-3xl border border-white/[0.08] bg-white/[0.025] p-5"><Archive size={20} className="text-sky-300"/><h2 className="mt-4 font-bold">منابع و آرشیو</h2><p className="micro mt-2">NAV و مشخصات صندوق‌ها از Fipiran و در زمان عدم دسترسی، از فهرست واقعی صندوق‌های TSETMC دریافت می‌شود. snapshot و تاریخچه در فایل‌های versioned گیت نگهداری می‌شوند؛ دیتابیس لازم نیست.</p></article>
          <article className="rounded-3xl border border-white/[0.08] bg-white/[0.025] p-5"><Sigma size={20} className="text-lime-200"/><h2 className="mt-4 font-bold">محاسبات مشتق‌شده</h2><p className="micro mt-2">حباب NAV = قیمت بازار تقسیم بر NAV ابطال منهای یک. جریان پول حقیقی یک برآورد حجمی است: اختلاف حجم خرید و فروش حقیقی × قیمت مرجع؛ بنابراین عدد رسمی ارزش خرید/فروش نیست.</p></article>
          <article className="rounded-3xl border border-white/[0.08] bg-white/[0.025] p-5"><ShieldCheck size={20} className="text-emerald-300"/><h2 className="mt-4 font-bold">کنترل کیفیت</h2><p className="micro mt-2">پاسخ ناقص، رکورد تکراری، مقدار منفی ناممکن و افت ناگهانی تعداد صندوق‌ها رد می‌شود. در شکست crawl، آخرین snapshot سالم حفظ می‌شود و داده نمایشی جای آن را نمی‌گیرد.</p></article>
        </div>

        <div className="mt-9 space-y-7 text-sm leading-8 text-white/65">
          <section><h2 className="text-xl font-bold text-white">به‌روزرسانی و تاریخچه</h2><p className="mt-2">Workflow گیت‌هاب هر ساعت crawler و quality gate را اجرا می‌کند و در صورت پذیرش، آخرین JSON/CSV و manifest را commit می‌کند. تاریخچه تجمیعی ساعتی نگهداری می‌شود و آخرین مشاهده معتبر هر روز در پارتیشن سالانه صندوق‌ها قرار می‌گیرد. بک‌فیل هفتگی تا دو سال NAV و قیمت ETF را بازیابی می‌کند.</p></section>
          <section><h2 className="text-xl font-bold text-white">شاخص نبض بازار</h2><p className="mt-2">شاخص داخلی ۰ تا ۱۰۰ است و ۷۰٪ وزن را از سهم ETFهای دارای بازده روزانه مثبت و ۳۰٪ را از جهت جریان تقریبی حقیقی می‌گیرد. این شاخص استاندارد رسمی بازار سرمایه نیست و برای نمایش سریع وضعیت نسبی طراحی شده است.</p></section>
          <section id="fund-score" className="scroll-mt-24"><h2 className="text-xl font-bold text-white">امتیاز جامع صندوق</h2><p className="mt-2">امتیاز جامع، خلاصه‌ای ۰ تا ۱۰۰ از پنج بُعد است: عملکرد ۳۵٪، نقدشوندگی ۲۵٪، تعادل قیمت بازار با NAV بیست درصد، اندازه صندوق ۱۰٪ و تقاضای حقیقی ۱۰٪. عملکرد، نقدشوندگی، اندازه و تقاضا به‌صورت رتبه صدکی با صندوق‌های همان گروه مقایسه می‌شوند؛ اگر یک گروه کمتر از چهار عضو داشته باشد، مبنا کل بازار است. تعادل NAV بر اساس فاصله مطلق قیمت از NAV سنجیده می‌شود.</p><p className="mt-3">اگر داده یک بُعد موجود نباشد، آن بُعد حذف و وزن مؤلفه‌های موجود بازتوزیع می‌شود. درصد پوشش در کنار امتیاز نشان داده می‌شود و با پوشش کمتر از ۴۵٪ یا کمتر از دو بُعد، عدد نهایی منتشر نمی‌شود. این امتیاز پیش‌بینی بازده، رتبه‌بندی رسمی یا توصیه خرید نیست.</p></section>
          <section><h2 className="text-xl font-bold text-white">واحد پول و تاریخ</h2><p className="mt-2">مقادیر قیمت و ارزش با واحد ریال ذخیره می‌شوند. زمان Snapshotها UTC است و در رابط کاربری با منطقه زمانی تهران نمایش داده می‌شود.</p></section>
          <section><h2 className="text-xl font-bold text-white">محدودیت‌ها</h2><p className="mt-2">سرویس‌های عمومی ممکن است schema، محدودیت دسترسی یا رفتار شبکه‌ای خود را تغییر دهند. به همین دلیل source adapterها مستقل از UI هستند و خطای هر منبع می‌تواند بدون شکستن کل داشبورد degrade شود. داده برای تصمیم‌گیری سرمایه‌گذاری باید با منبع رسمی همان روز تطبیق داده شود.</p></section>
        </div>
      </section>
    </main>
  );
}
