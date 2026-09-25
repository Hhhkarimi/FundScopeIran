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
- امتیاز جامع توضیح‌پذیر ۰ تا ۱۰۰ با پوشش داده و پنج بُعد قابل مشاهده
- نقشه حرارتی، Treemap، scatter «بازده × اندازه صندوق»، رهبران بازده و جریان پول
- ذخیره Snapshot ساعتی و تاریخچه روزانه در فایل‌های versioned داخل Git، بدون دیتابیس
- CSV قابل دانلود از `/api/funds.csv`
- بک‌فیل NAV، AUM و قیمت تاریخی ETFها با `npm run backfill`
- GitHub Actions برای Refresh ساعتی بدون وابستگی به Cron پلن Vercel
- API health و refresh امن
- SEO: metadata، canonical، sitemap، robots، JSON-LD Dataset/FinancialProduct
- GEO/AEO: صفحه روش‌شناسی، تعریف فرمول‌ها، `llms.txt` و صفحات پایدار برای هر صندوق

## معماری داده

```text
Fipiran funds/NAV ───┐
                     ├──> normalize/merge ──> quality gate ──> Git-backed files ──> Next.js
TSETMC funds/market ─┘                              │
                                                   ├── latest JSON/CSV + manifest
                                                   └── hourly + daily historical partitions
```

`Fipiran` منبع اول NAV و اطلاعات صندوق است. اگر این منبع از runner گیت‌هاب در دسترس نباشد، universe واقعی صندوق‌ها از endpoint صندوق‌های `TSETMC` خوانده می‌شود؛ داده ساختگی به‌عنوان fallback وارد مسیر تولید نمی‌شود. قیمت، معاملات و تاریخچه ETF از TSETMC تکمیل می‌شود. هر snapshot پیش از جایگزینی از quality gate عبور می‌کند؛ پاسخ کم‌تعداد، شناسه‌های مصنوعی، رکورد تکراری، مقدار ناممکن یا افت ناگهانی تعداد صندوق‌ها رد می‌شود و snapshot سالم قبلی باقی می‌ماند.

## 1) نصب محلی

```bash
npm install
cp .env.example .env.local
```

دیتابیس لازم نیست. برنامه مستقیماً فایل‌های پوشه `data/` را می‌خواند. حالت نمایشی فقط با درخواست صریح زیر فعال می‌شود:

```env
DEMO_MODE=true
```

در Production این متغیر را تعریف نکنید؛ در صورت نبود snapshot واقعی، UI به‌جای عدد ساختگی حالت خالی نشان می‌دهد.

سپس:

```bash
npm run dev
```

## 2) اولین Scrape واقعی

برای crawl، اعتبارسنجی و ذخیره فایل‌های آخرین snapshot:

```bash
npm run refresh
```

دستور معادل برای ساخت خروجی:

```bash
npm run scrape:csv
```

خروجی CSV UTF-8 BOM دارد تا در Excel فارسی درست باز شود.

## 3) تاریخچه واقعی

برای دریافت حداکثر دو سال NAV صندوق‌ها و قیمت ETFها و نگهداری در فایل‌های سالانه اجرا کنید:

```bash
npm run backfill
```

پیش‌فرض همه صندوق‌ها را بررسی می‌کند. برای تست محدود:

```bash
BACKFILL_LIMIT=10 npm run backfill
```

خروجی در `data/history/funds-YYYY.ndjson` با کلید یکتای «تاریخ + شماره ثبت» merge می‌شود؛ بنابراین اجرای دوباره رکورد تکراری تولید نمی‌کند. workflow هفتگی نیز این بک‌فیل را خودکار اجرا می‌کند.

## 4) GitHub Actions

Workflow آماده است:

```text
.github/workflows/hourly-refresh.yml
```

Workflow هر ساعت در دقیقه ۷ بدون دیتابیس اجرا می‌شود، فایل‌های `data/funds-latest.csv` و `data/funds-latest.json` را به‌روزرسانی و در ریپو commit می‌کند. اجرای دستی نیز با `workflow_dispatch` ممکن است.

فایل `history-backfill.yml` هفته‌ای یک‌بار تاریخچه را بازسازی می‌کند. هر دو workflow از یک concurrency group استفاده می‌کنند تا commitهای داده با هم برخورد نکنند.

ساختار ذخیره‌سازی:

| فایل | کاربرد |
|---|---|
| `data/funds-latest.json` | آخرین snapshot پذیرفته‌شده |
| `data/funds-latest.csv` | خروجی قابل دانلود |
| `data/manifest.json` | وضعیت منابع، کیفیت و checksum |
| `data/history/market.json` | تاریخچه ساعتی شاخص‌های تجمیعی |
| `data/history/funds-YYYY.ndjson` | تاریخچه روزانه هر صندوق |
| `data/raw/YYYY/MM/*.json.gz` | نسخه فشرده روزانه برای ممیزی |

## 5) Deploy روی Vercel

Repo را به Vercel Import کنید و Environment Variables زیر را تنظیم کنید:

```env
NEXT_PUBLIC_SITE_URL=https://your-domain.example
ALLOW_SOURCE_DEGRADATION=true
```

`vercel.json` عمداً Cron ندارد تا روی Hobby نیز deploy شود. Refresh ساعتی پیش‌فرض از GitHub Actions انجام می‌شود.

روی فایل‌سیستم Vercel چیزی نوشته نمی‌شود، چون پایدار نیست. GitHub Actions فایل‌ها را commit می‌کند و همان commit یک deploy تازه در Vercel می‌سازد.

## 6) Source adapterها

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

### امتیاز جامع صندوق

امتیاز جامع یک مقایسه نسبی درون گروه صندوق است و از پنج بُعد ساخته می‌شود:

- عملکرد: ۳۵٪
- نقدشوندگی: ۲۵٪
- تعادل قیمت بازار با NAV: ۲۰٪
- اندازه صندوق: ۱۰٪
- تقاضای حقیقی: ۱۰٪

مؤلفه‌های فاقد داده حذف و وزن بقیه بازتوزیع می‌شود. UI درصد پوشش را نمایش می‌دهد و در پوشش کمتر از ۴۵٪ امتیاز نهایی را مخفی می‌کند. این شاخص برای مقایسه اولیه است و توصیه سرمایه‌گذاری یا پیش‌بینی بازده نیست.

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

## مدل نگهداری داده

داده به‌جای جدول در فایل‌های JSON، CSV، NDJSON و JSON فشرده نگهداری می‌شود. Git تاریخ تغییرات، rollback و audit trail را فراهم می‌کند؛ پارتیشن سالانه نیز رشد فایل تاریخچه را کنترل می‌کند.

## ملاحظات Production

1. **واحد پول:** داده‌های خام قیمت و ارزش در این پروژه به‌صورت ریال نگهداری می‌شوند. اگر منبع یک فیلد را با واحد متفاوت ارائه کرد، adapter باید نرمال‌سازی شود.
2. **TSETMC Geo/WAF:** در بعضی شبکه‌های خارج ایران ممکن است درخواست‌ها block شوند. `ALLOW_SOURCE_DEGRADATION=true` مانع از شکست کامل pipeline می‌شود.
3. **Rate limit:** این پروژه از endpointهای bulk استفاده می‌کند و در refresh ساعتی درخواست‌های بسیار محدودی می‌فرستد.
4. **Schema drift:** قبل از تصمیم مالی، داده همان روز را با سایت منبع مقایسه کنید.
5. **Caching:** UI و CSV یک ساعت revalidate می‌شوند؛ جمع‌آوری داده مستقل از render است.
6. **رشد ریپو:** نسخه فشرده روزانه و پارتیشن سالانه حجم را کنترل می‌کند؛ اندازه ریپو باید دوره‌ای پایش شود.

## توسعه بعدی پیشنهادی

- صفحات مقایسه ۲ تا ۵ صندوق با URL قابل share
- هشدارهای قابل تنظیم برای تغییر حباب NAV و جریان پول غیرعادی
- هشدار حباب NAV و جریان پول غیرعادی
- snapshot image برای اشتراک شبکه‌های اجتماعی
- تست قرارداد API با fixtureهای anonymized
- materialized view برای داشبوردهای بسیار پربازدید

## Disclaimer

این پروژه برای تحلیل و نمایش داده طراحی شده است. اطلاعات ممکن است با تأخیر، نقص یا خطای منبع همراه باشد و توصیه خرید/فروش یا مشاوره سرمایه‌گذاری نیست.
