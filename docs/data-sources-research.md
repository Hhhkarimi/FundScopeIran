# تحقیق منابع داده و تاریخچهٔ بدون دیتابیس

تاریخ بررسی: ۲۰۲۶-۰۹-۲۵

## یادداشت اجرایی پس از تست runner

در اجرای واقعی GitHub Actions، اتصال runnerهای Azure به هر دو دامنهٔ FIPIRAN و TSETMC timeout شد. بنابراین مسیر زمان‌بندی‌شدهٔ production به صفحات عمومی `app.fundbase.ir` منتقل شد. این صفحات دادهٔ صندوق را با JSON-LD قابل ماشین‌خواندن و متن قابل مشاهده ارائه می‌کنند و منبع داده را Fundbase/Investats و در Dataset صفحه، TSETMC و فیپ‌ایران اعلام می‌کنند. crawler با Chrome، concurrency سه، یک بار در پایان روز بازار اجرا می‌شود؛ endpoint یا کلید خصوصی استخراج نمی‌کند. adapterهای مستقیم زیر برای اجرای محلی/runner داخل ایران حفظ شده‌اند.

دادهٔ جاری قیمت، NAV، حباب، حجم، ارزش معامله و AUM از صفحهٔ عمومی هر صندوق خوانده می‌شود. سری تاریخی جریان پول موجود در همان صفحات در فایل‌های سالانهٔ `fundbase-flows-YYYY.ndjson` backfill می‌شود و قیمت/NAV روزانه از روز آغاز pipeline در `funds-YYYY.ndjson` نگهداری خواهد شد.

## جمع‌بندی اجرایی

برای اینکه داده‌های FundScopeIran تا حد ممکن واقعی، قابل ردگیری و بدون دیتابیس باشند، پیشنهاد نهایی این است:

1. **FIPIRAN منبع اصلی داده‌های صندوق** باشد: فهرست و نوع صندوق، NAV صدور/ابطال/آماری، خالص ارزش دارایی و بازده‌های منتشرشده.
2. **TSETMC منبع اصلی داده‌های بازار ETF** باشد: قیمت پایانی و آخرین معامله، حجم و ارزش معاملات، تعداد معاملات و تفکیک حقیقی/حقوقی.
3. اتصال دو منبع با `insCode` انجام شود و هویت پایدار هر صندوق در اپ با `regNo` باقی بماند.
4. هر اجرای کرالر، یک snapshot خامِ زمان‌دار برای ممیزی و یک ردیف نرمال‌شده برای تاریخچه تولید کند؛ تاریخچه در فایل‌های سالانهٔ CSV/JSON داخل Git نگهداری شود.
5. GitHub Actions هر ساعت اجرا شود، اما تاریخچهٔ ماندگار **روزانه** باشد؛ اجرای ساعتی فایل همان روز را به‌روزرسانی می‌کند تا از رشد غیرضروری مخزن جلوگیری شود.

این معماری «بدون دیتابیس» است، ولی به معنی تضمین real-time یا بی‌خطا بودن منبع ثالث نیست. endpointهای زیر روی دامنه‌های متعلق به منابع قرار دارند، با این حال مستندات عمومیِ نسخه‌بندی‌شده، SLA و سقف درخواست رسمی برای آن‌ها پیدا نشد. بنابراین باید آن‌ها را API داخلی وب‌سایت در نظر گرفت و تغییر schema یا مسدودشدن موقت را جزو حالت‌های عادی طراحی کرد.

## منابع و endpointهای قابل استفاده

### ۱. FIPIRAN — دادهٔ مرجع صندوق و NAV

دامنهٔ فعلی سرویس: `https://www.fipiran.com/services/`

| کاربرد | درخواست | دادهٔ مورد نیاز |
|---|---|---|
| فهرست جامع صندوق‌ها | `POST /fund/fundcompare/` با بدنهٔ `{"regNos":[],"showMarketMakers":false}` | `regNo`, `name`, `fundType`, `insCode`, `smallSymbolName`, بازده‌ها، NAV و خالص دارایی |
| انواع صندوق | `GET /fund/fundtype` | نگاشت `fundType` به عنوان فارسی |
| تاریخچه NAV هر واحد | `GET /chart/getfundchart?regno=...&groupId=0&showAll=true` | `date`, `issueNav`, `cancelNav`, `statisticalNav` |
| تاریخچه خالص دارایی | `GET /chart/getfundnetassetchart?regno=...&groupId=0&showAll=true` | `date`, `netAsset`, `unitsSubDAY`, `unitsRedDAY` |
| فهرست ETF و معاملهٔ جاری | `GET /instrument/instrumentcompare?...&symboltype=305&markettype=1,2` | `insCode`، نماد، قیمت، حجم و ارزش |
| تاریخچه ابزار بورسی | `GET /instrument/instrumenthistory?insCode=...&pageSize=99999&pageIndex=0` | قیمت و معاملهٔ روزانه |
| جزئیات یک ابزار | `GET /instrument/getinstrument?insCode=...` | اطلاعات نماد، معامله و client type |

شواهد:

- پیاده‌سازی client متن‌باز FIPIRAN، دامنهٔ سرویس، `Referer` و User-Agent مرورگر را صریحاً نشان می‌دهد: <https://github.com/5j9/fipiran/blob/main/fipiran/__init__.py>
- همان client مسیرها و مدل دادهٔ `fundcompare`، `fundtype`، تاریخچه NAV و خالص دارایی را پیاده کرده است: <https://github.com/5j9/fipiran/blob/main/fipiran/funds.py>
- مسیرهای `instrumentcompare`، `getinstrument` و `instrumenthistory` و فیلدهای معامله در کد قابل مشاهده‌اند: <https://github.com/5j9/fipiran/blob/main/fipiran/symbols.py>
- صفحهٔ رسمی مقایسه صندوق‌ها: <https://www.fipiran.com/mf/list>
- صفحهٔ رسمی نمادها: <https://www.fipiran.com/symbol/list>

نکتهٔ منبع‌شناسی: مخزن `5j9/fipiran` متعلق به خود FIPIRAN نیست و فقط برای کشف قرارداد endpointها استفاده شده است؛ دادهٔ اجرایی باید مستقیماً از دامنهٔ `fipiran.com` دریافت شود. در نتیجه، endpoint رسمی‌دامنه است ولی قرارداد آن **مستند و تضمین‌شدهٔ عمومی** محسوب نمی‌شود.

### ۲. TSETMC — دادهٔ اصلی معاملات ETF

دامنهٔ JSON: `https://cdn.tsetmc.com/api/`

| کاربرد | درخواست | دادهٔ مورد نیاز |
|---|---|---|
| دیده‌بان بازار | `GET /ClosingPrice/GetMarketWatch?...` | قیمت، حجم، ارزش، تعداد معامله و زمان بازار |
| حقیقی/حقوقی همه نمادها | `GET /ClientType/GetClientTypeAll` | خرید/فروش حقیقی و حقوقی و تعداد خریدار/فروشنده |
| تاریخچه قیمت روزانه | `GET /ClosingPrice/GetClosingPriceDailyList/{insCode}/0` | سری روزانه قیمت و معامله؛ `0` یعنی همهٔ رکوردها |
| اطلاعات نماد | `GET /Instrument/GetInstrumentInfo/{insCode}` | مشخصات جاری نماد |
| client type یک روز | `GET /ClientType/GetClientTypeHistory/{insCode}/{YYYYMMDD}` | حقیقی/حقوقی تاریخی |

نمونه URLهای مستقیم روی منبع:

- <https://cdn.tsetmc.com/api/StaticData/GetTime>
- <https://cdn.tsetmc.com/api/ClientType/GetClientTypeAll>
- <https://cdn.tsetmc.com/api/ClosingPrice/GetMarketWatch>

TSETMC صفحهٔ راهنمای اختصارات داده را روی دامنهٔ خود منتشر کرده است: <https://cdn.tsetmc.com/Site.aspx?ParTree=151713>. برای فهرست و معنای مسیرهای استفاده‌شده، یک مرجع جامعه‌محورِ آزمایش‌شده نیز وجود دارد: <https://github.com/solitraderbusiness/tsetmc-mcp/blob/main/docs/endpoints.md>. این مرجع تصریح می‌کند که پاسخ JSON از زیردامنهٔ `cdn` دریافت می‌شود، `insCode` کلید اصلی ابزار است و User-Agent مرورگر لازم است؛ این مخزن هم رسمی نیست و صرفاً مستند مکمل محسوب می‌شود.

## تعریف دقیق «دادهٔ واقعی» در محصول

هر فیلد باید provenance روشن داشته باشد و از منبع مناسب خودش بیاید:

| خانواده داده | منبع اصلی | منبع پشتیبان | قاعده |
|---|---|---|---|
| هویت، نوع، مدیر و وضعیت صندوق | FIPIRAN | ندارد | هرگز از نام نماد حدس زده نشود |
| NAV و خالص دارایی | FIPIRAN | ندارد | تاریخ انتشار FIPIRAN همراه مقدار ذخیره شود |
| قیمت، حجم، ارزش و تعداد معامله ETF | TSETMC | FIPIRAN instrument | fallback با برچسب منبع، نه ادغام بی‌صدا |
| حقیقی/حقوقی و قدرت خرید | TSETMC | FIPIRAN instrument detail | نسبت‌های مشتق‌شده همراه اجزای خام نگهداری شوند |
| بازده اعلامی صندوق | FIPIRAN | محاسبه از NAV | اختلاف بیش از آستانه به‌عنوان هشدار کیفیت ثبت شود |

در snapshot هر ردیف این metadata لازم است:

- `capturedAt`: زمان دریافت به ISO-8601 با offset تهران؛
- `sourceDate`: تاریخی که خود منبع برای داده اعلام کرده؛
- `source`: نام منبع هر خانواده داده؛
- `qualityFlags`: مانند `stale_nav`, `missing_market`, `source_mismatch`؛
- `schemaVersion`: برای مهاجرت فایل‌های تاریخی در آینده.

عبارت مناسب رابط کاربری «آخرین دادهٔ دریافت‌شده از منبع رسمی‌دامنه» است، نه «لحظه‌ای». نبود SLA عمومی و احتمال تأخیر انتشار NAV اجازه نمی‌دهد real-time بودن به کاربر وعده داده شود.

## معماری تاریخچه بدون دیتابیس

### فایل‌های پیشنهادی

```text
data/
  latest/
    funds.json                 # snapshot نرمال‌شده فعلی برای اپ
    funds.csv                  # خروجی قابل دانلود
    manifest.json              # زمان، وضعیت منابع، تعداد رکورد و checksum
  history/
    2026.csv                   # یک ردیف برای هر صندوق/روز
    2027.csv
  raw/
    2026/
      09/
        2026-09-25.json.gz     # پاسخ‌های خام آخرین اجرای معتبر روز
```

کلید یکتای تاریخچه `date + regNo` است. اجرای ساعتی باید ردیف همان روز را **upsert در فایل** کند؛ در پایان روز آخرین دادهٔ معتبر می‌ماند. قیمت/NAV تاریخیِ موجود نیز یک بار با endpointهای تاریخچه backfill می‌شود. برای ETFها اتصال با `insCode` و برای صندوق‌ها اتصال با `regNo` انجام می‌شود.

CSV سالانه برای رندر و تحلیل ساده است، diff متنی قابل بررسی دارد و به سرویس دیگری وابسته نیست. فایل خام فشرده برای ممیزی است و اپ نباید مستقیماً از آن بخواند. `manifest.json` باید SHA-256 فایل‌های خروجی و status هر منبع را ثبت کند تا snapshot ناقص جایگزین دادهٔ سالم نشود.

### گردش GitHub Actions

1. checkout آخرین `main`؛
2. دریافت موازی با concurrency محدود و backoff؛
3. validate کردن schema، تازگی، تعداد ردیف و دامنهٔ مقادیر؛
4. merge مبتنی بر `regNo`/`insCode`؛
5. upsert در `history/<year>.csv` و نوشتن اتمیک `latest`؛
6. commit فقط در صورت تغییر معنی‌دار؛
7. اجرای تست و سپس push با retry برای تعارض احتمالی.

GitHub اعلام می‌کند workflow زمان‌بندی‌شده فقط روی default branch و آخرین commit آن اجرا می‌شود، ممکن است در زمان بار زیاد تأخیر بخورد یا حتی drop شود، و حداقل فاصلهٔ cron پنج دقیقه است. انتخاب دقیقهٔ ۷ به‌جای ابتدای ساعت تصمیم خوبی است: <https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule>.

در مخزن عمومی، workflow زمان‌بندی‌شده پس از ۶۰ روز بی‌فعالیتی خودکار غیرفعال می‌شود؛ commitهای داده معمولاً فعالیت ایجاد می‌کنند، ولی مانیتور شکست همچنان لازم است: <https://docs.github.com/actions/managing-workflow-runs/disabling-and-enabling-a-workflow>.

Artifact جای مناسبی برای تاریخچهٔ دائمی نیست؛ GitHub به‌طور پیش‌فرض artifact و log را ۹۰ روز نگه می‌دارد: <https://docs.github.com/en/actions/tutorials/store-and-share-data>. بنابراین تاریخچهٔ اصلی باید فایل versioned مخزن باشد و artifact فقط برای debug کوتاه‌مدت استفاده شود.

## محدودیت رشد Git و راهکار

GitHub پیشنهاد می‌کند مخزن ideally زیر ۱ گیگابایت و قویاً زیر ۵ گیگابایت بماند: <https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github>. همچنین سقف سخت هر فایل عادی ۱۰۰ MiB است: <https://docs.github.com/en/repositories/working-with-files/managing-files/adding-a-file-to-a-repository>.

به همین دلیل:

- snapshot ساعتی جداگانه برای همیشه نگهداری نشود؛ یک snapshot نهایی در روز کافی است؛
- فایل تاریخچه بر اساس سال partition شود؛
- raw روزانه gzip شود و پس از ۳۰ تا ۹۰ روز در یک job دوره‌ای حذف یا به GitHub Release منتقل شود؛
- نمودار بلندمدت از CSV سالانه بخواند، نه از تاریخ commitهای Git؛
- ماهانه اندازهٔ مخزن و بزرگ‌ترین blobها کنترل شود.

## کنترل کیفیت و شرایط پذیرش snapshot

snapshot جدید فقط وقتی publish شود که تمام guardrailهای زیر عبور کنند:

1. پاسخ HTTP موفق، JSON قابل parse و نه صفحه HTML/WAF؛
2. تعداد صندوق فعال از کف تنظیم‌پذیر کمتر نباشد؛
3. حداقل درصد مشخصی از ETFها `insCode` و معاملهٔ قابل اتصال داشته باشند؛
4. تاریخ TSETMC در روز معاملاتی جاری/اخیر باشد و NAV از آستانهٔ مجاز قدیمی‌تر نباشد؛
5. مقادیر ناممکن رد شوند: NAV منفی، حجم منفی، درصد خارج از دامنه یا timestamp آینده؛
6. تغییر ناگهانی تعداد ردیف یا schema باعث failure شود، نه انتشار silent؛
7. اگر یک منبع افت کرد، latest سالم قبلی حفظ و وضعیت `degraded` ثبت شود؛
8. خروجی deterministic باشد: sort با `regNo`، اعداد canonical و بدون timestampهای غیرضروری در فایل تاریخی.

## ملاحظات استفاده مسئولانه

برای FIPIRAN و TSETMC سقف درخواست و SLA عمومیِ قابل استناد پیدا نشد. نبود محدودیت منتشرشده به معنای اجازهٔ درخواست نامحدود نیست. کرالر باید User-Agent معرفی‌کننده، timeout، exponential backoff، cache درون اجرا، concurrency پایین و فاصله بین درخواست‌های per-fund داشته باشد. endpointهای batch باید بر درخواست جداگانه برای هر نماد ترجیح داده شوند.

همچنین لازم است attribution منبع در رابط و README حفظ شود، دادهٔ خام بدون نیاز تکثیر نشود و در صورت انتشار شرایط استفادهٔ رسمی جدید، workflow با آن تطبیق داده شود.

## تصمیم پیشنهادی برای این ریپو

- **اکنون اجرا شود:** جایگزینی persistence دیتابیسی با file store اتمیک، backfill از تاریخچه‌های FIPIRAN/TSETMC، فایل سالانه، raw روزانهٔ فشرده، manifest و quality gate.
- **تناوب:** هر ساعت در روزهای بازار؛ فقط آخرین مشاهدهٔ معتبر هر روز در تاریخچه ماندگار شود.
- **حقیقت منبع:** NAV/Fund metadata از FIPIRAN، Market/Client type از TSETMC.
- **رفتار در خطا:** دادهٔ قبلی حفظ شود؛ demo یا مقدار ساختگی هرگز به‌عنوان دادهٔ واقعی publish نشود.
- **شفافیت محصول:** زمان منبع، زمان دریافت، وضعیت تازگی و کیفیت کنار داده نمایش داده شود.

این طرح بدون PostgreSQL/Supabase کار می‌کند و در عین حال audit trail، backfill و نمودار تاریخی واقعی فراهم می‌آورد.
