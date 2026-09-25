# FundScope Iran — داشبورد صندوق‌های سرمایه‌گذاری ایران

وب‌اپ RTL و آماده‌ی GitHub/Vercel برای پایش صندوق‌های سرمایه‌گذاری ایران با Refresh ساعتی، CSV، نمودارهای تعاملی، صفحات اختصاصی صندوق و زیرساخت SEO/GEO.

> **نکته مهم:** APIهای Fipiran/TSETMC عمومی‌اند اما قرارداد رسمی و پایدار تضمین‌شده‌ای ندارند. Source adapterها عمداً از UI جدا شده‌اند تا تغییر endpoint یا محدودیت جغرافیایی با کمترین تغییر مدیریت شود. قبل از استفاده تجاری، شرایط استفاده‌ی منابع را بررسی کنید.

## قابلیت‌ها

- Next.js App Router + TypeScript + Tailwind CSS + Recharts
- رابط فارسی RTL با فونت self-hosted **Vazirmatn** از Fontsource و حالت روشن/تیره
- پوشش صندوق‌های ETF و صدور/ابطالی در داده Fipiran
- تکمیل معاملات ETF با Fipiran و در صورت دسترسی TSETMC
- NAV ابطال/صدور/آماری، AUM، بازده روزانه تا سالانه، ترکیب دارایی
- قیمت، حجم، ارزش و تعداد معاملات ETFها
- حباب/تخفیف NAV
- ورود/خروج تقریبی پول حقیقی، سرانه خرید/فروش و نسبت قدرت خرید
- نقشه حرارتی، Treemap، scatter «بازده × اندازه صندوق»، رهبران بازده و جریان پول
- ذخیره Snapshot ساعتی در PostgreSQL (Supabase/Neon/هر Postgres سازگار)
- CSV قابل دانلود از `/api/funds.csv`
- بک‌فیل NAV، AUM و قیمت تاریخی ETFها با `npm run backfill`
- GitHub Actions برای Refresh ساعتی بدون وابستگی به Cron پلن Vercel
- API health و refresh امن
- SEO: metadata، canonical، sitemap، robots، JSON-LD Dataset/FinancialProduct
- GEO/AEO: صفحه روش‌شناسی، تعریف فرمول‌ها، `llms.txt` و صفحات پایدار برای هر صندوق

## معماری داده

```text
Fipiran fundcompare ───────┐
Fipiran fund types ────────┼──> normalize/merge ──> PostgreSQL hourly snapshots ──> Next.js dashboard
Fipiran ETF market ────────┤                                │
TSETMC client type ────────┤                                ├──> /api/funds.csv
TSETMC market watch ───────┘                                └──> SEO fund pages
```

`Fipiran` منبع اصلی universe صندوق‌هاست. `TSETMC` منبع مکمل است؛ اگر به‌خاطر WAF/IP در دسترس نباشد، pipeline با وضعیت `degraded` ادامه پیدا می‌کند. قیمت/تاریخچه از Fipiran تکمیل می‌شود و برای حقیقی/حقوقی، تعداد محدودی از ETFهای پرتراکنش از endpoint جزئی Fipiran به‌عنوان fallback غنی‌سازی می‌شوند (`FIPIRAN_CLIENT_FALLBACK_LIMIT`).

## 1) نصب محلی

```bash
npm install
cp .env.example .env.local
```

دیتابیس اختیاری است. بدون `DATABASE_URL` برنامه از Snapshot فایل استفاده می‌کند و تا پیش از اولین Refresh، خودکار با داده نمایشی بالا می‌آید:

```env
DEMO_MODE=true
```

اعداد DEMO صراحتاً در UI با برچسب داده نمایشی مشخص می‌شوند.

سپس:

```bash
npm run dev
```

## 2) ساخت دیتابیس (اختیاری)

یک پروژه Supabase یا Neon بسازید و فایل زیر را در SQL editor اجرا کنید:

```text
db/migrations/001_init.sql
```

بعد `DATABASE_URL` را در `.env.local` و در Secrets گیت‌هاب/Vercel قرار دهید. اگر حالت بدون دیتابیس را می‌خواهید، این مرحله را کامل رد کنید.

## 3) اولین Scrape واقعی و CSV

برای Scrape + ذخیره اختیاری در PostgreSQL + ساخت `data/funds-latest.csv`:

```bash
npm run refresh
```

فقط برای ساخت CSV بدون ذخیره DB:

```bash
npm run scrape:csv
```

خروجی CSV UTF-8 BOM دارد تا در Excel فارسی درست باز شود.

## 4) تاریخچه حداکثری

پس از اولین refresh (برای ایجاد رکوردهای `funds`) بک‌فیل را اجرا کنید:

```bash
npm run backfill
```

پیش‌فرض همه صندوق‌ها را بررسی می‌کند. برای تست محدود:

```bash
BACKFILL_LIMIT=10 npm run backfill
```

اگر دسترسی TSETMC از شبکه شما مشکل دارد:

```bash
BACKFILL_ETF_PRICES=false npm run backfill
```

NAV و AUM تاریخی از Fipiran ذخیره می‌شود. تاریخچه قیمت ETF ابتدا از Fipiran و در صورت شکست از TSETMC دریافت و در `fund_daily_history` ثبت می‌شود.

## 5) GitHub Actions ساعتی

Workflow آماده است:

```text
.github/workflows/hourly-refresh.yml
```

Workflow هر ساعت در دقیقه ۷ بدون دیتابیس اجرا می‌شود، فایل‌های `data/funds-latest.csv` و `data/funds-latest.json` را به‌روزرسانی و در ریپو commit می‌کند. اجرای دستی نیز با `workflow_dispatch` ممکن است.

## 6) Deploy روی Vercel

Repo را به Vercel Import کنید و Environment Variables زیر را تنظیم کنید:

```env
CRON_SECRET=...
NEXT_PUBLIC_SITE_URL=https://your-domain.example
ALLOW_SOURCE_DEGRADATION=true
```

`vercel.json` عمداً Cron ندارد تا روی Hobby نیز deploy شود. Refresh ساعتی پیش‌فرض از GitHub Actions انجام می‌شود.

### Vercel Pro Cron (اختیاری)

اگر پلن شما Cron ساعتی را پشتیبانی می‌کند، محتوای `vercel.pro.json` را جایگزین `vercel.json` کنید. مسیر `/api/cron/refresh` با `CRON_SECRET` محافظت می‌شود و Vercel آن را به صورت Bearer token ارسال می‌کند.

## 7) Source adapterها

اگر endpointها تغییر کردند، معمولاً فقط این فایل‌ها نیاز به اصلاح دارند:

```text
lib/sources/fipiran.ts
lib/sources/tsetmc.ts
```

HTTP retry، timeout و تشخیص پاسخ‌های WAF/HTML در `lib/sources/http.ts` متمرکز است.

## تعریف شاخص‌های مشتق‌شده

### حباب NAV

```text
NAV Premium % = (Market Price / Cancellation NAV - 1) × 100
```

### جریان تقریبی پول حقیقی

```text
Estimated Flow = (Individual Buy Volume - Individual Sell Volume) × Reference Price
```

این عدد **برآورد** است، چون از حجم و قیمت مرجع ساخته می‌شود و الزاماً برابر ارزش نقدی دقیق سمت خرید/فروش نیست.

### قدرت خرید حقیقی

```text
Buy Power = (Buy Volume / Buyer Count) / (Sell Volume / Seller Count)
```

این نسبت قدرت خرید **حجمی** است.

### شاخص نبض بازار

شاخص نمایشی داخلی ۰ تا ۱۰۰:

- ۷۰٪: سهم ETFهای دارای بازده روزانه مثبت
- ۳۰٪: مؤلفه جهت جریان تقریبی حقیقی با مقیاس نرم (tanh)

این شاخص رسمی بازار سرمایه و توصیه سرمایه‌گذاری نیست.

## مسیرهای مهم

| مسیر | کاربرد |
|---|---|
| `/` | داشبورد اصلی |
| `/funds/{regNo}` | صفحه SEO هر صندوق |
| `/about-data` | روش‌شناسی و منابع |
| `/api/funds.csv` | دانلود Snapshot آخر |
| `/api/health` | سلامت/تازگی داده |
| `/api/cron/refresh` | Refresh محافظت‌شده |
| `/sitemap.xml` | Sitemap پویا |
| `/robots.txt` | Robots |
| `/llms.txt` | توضیح ساختاری برای موتورهای مولد |

## مدل داده

سه جدول اصلی:

- `funds`: اطلاعات پایدار صندوق
- `fund_snapshots`: snapshotهای ساعتی بازار/NAV/بازده
- `fund_daily_history`: تاریخچه روزانه NAV و قیمت
- `refresh_runs`: وضعیت منابع در هر اجرای scraper

## ملاحظات Production

1. **واحد پول:** داده‌های خام قیمت و ارزش در این پروژه به‌صورت ریال نگهداری می‌شوند. اگر منبع یک فیلد را با واحد متفاوت ارائه کرد، adapter باید نرمال‌سازی شود.
2. **TSETMC Geo/WAF:** در بعضی شبکه‌های خارج ایران ممکن است درخواست‌ها block شوند. `ALLOW_SOURCE_DEGRADATION=true` مانع از شکست کامل pipeline می‌شود.
3. **Rate limit:** این پروژه از endpointهای bulk استفاده می‌کند و در refresh ساعتی درخواست‌های بسیار محدودی می‌فرستد.
4. **Schema drift:** قبل از تصمیم مالی، داده همان روز را با سایت منبع مقایسه کنید.
5. **Caching:** UI و CSV یک ساعت revalidate می‌شوند؛ جمع‌آوری داده مستقل از render است.
6. **امنیت:** `CRON_SECRET` و `DATABASE_URL` را هرگز commit نکنید.

## توسعه بعدی پیشنهادی

- صفحات مقایسه ۲ تا ۵ صندوق با URL قابل share
- نمودار تاریخچه NAV/قیمت از `fund_daily_history`
- هشدار حباب NAV و جریان پول غیرعادی
- snapshot image برای اشتراک شبکه‌های اجتماعی
- تست قرارداد API با fixtureهای anonymized
- materialized view برای داشبوردهای بسیار پربازدید

## Disclaimer

این پروژه برای تحلیل و نمایش داده طراحی شده است. اطلاعات ممکن است با تأخیر، نقص یا خطای منبع همراه باشد و توصیه خرید/فروش یا مشاوره سرمایه‌گذاری نیست.
