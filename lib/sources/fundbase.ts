import puppeteer, { type Browser, type Page } from "puppeteer-core";
import type { FundCategory, FundRow } from "@/lib/types";

const BASE = "https://app.fundbase.ir";

export type FundbaseFlowPoint = { regNo: string; date: string; realMoneyFlow: number };

const digits = (value: string) => value
  .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
  .replace(/[٬,]/g, "").replace(/٫/g, ".").replace(/[−–]/g, "-");

const numberIn = (value?: string | null) => {
  if (!value) return null;
  const match = digits(value).match(/[-+]?\d+(?:\.\d+)?/);
  const parsed = match ? Number(match[0]) : NaN;
  return Number.isFinite(parsed) ? parsed : null;
};

function categoryFrom(value: string): FundCategory {
  if (/طلا|نقره|کالایی/.test(value)) return "طلا";
  if (/درآمد/.test(value)) return "درآمد ثابت";
  if (/اهرم/.test(value)) return "اهرمی";
  if (/مختلط|فراصندوق/.test(value)) return "مختلط";
  if (/شاخص/.test(value)) return "شاخصی";
  if (/بخشی/.test(value)) return "بخشی";
  if (/املاک|ساختمان/.test(value)) return "املاک";
  if (/جسور|خصوصی/.test(value)) return "جسورانه";
  if (/سهام/.test(value)) return "سهامی";
  return "سایر";
}

async function settle(page: Page, condition: () => boolean) {
  await page.waitForFunction(condition, { timeout: 30_000 }).catch(() => undefined);
  await new Promise((resolve) => setTimeout(resolve, 700));
}

export async function launchFundbaseBrowser(): Promise<Browser> {
  const executablePath = process.env.CHROME_PATH || "/usr/bin/google-chrome";
  return puppeteer.launch({
    executablePath,
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
    defaultViewport: { width: 1280, height: 900 }
  });
}

export async function discoverFundbaseSlugs(browser: Browser) {
  const page = await browser.newPage();
  await page.goto(`${BASE}/categories`, { waitUntil: "domcontentloaded", timeout: 45_000 });
  await settle(page, () => document.querySelectorAll('a[href^="/categories/"]').length > 8);
  const categories = await page.$$eval('a[href^="/categories/"]', (links) =>
    [...new Set(links.map((link) => link.getAttribute("href")).filter((href): href is string => Boolean(href)))]
  );
  const slugs = new Set<string>();
  for (const category of categories) {
    await page.goto(`${BASE}${category}`, { waitUntil: "domcontentloaded", timeout: 45_000 });
    await settle(page, () => document.querySelectorAll('a[href^="/funds/"]').length > 0);
    const found = await page.$$eval('a[href^="/funds/"]', (links) => links
      .map((link) => link.getAttribute("href")?.split("/funds/")[1] || "")
      .filter(Boolean));
    found.forEach((slug) => slugs.add(decodeURIComponent(slug)));
  }
  await page.close();
  return [...slugs].sort((a, b) => a.localeCompare(b, "fa"));
}

export async function crawlFundbaseFund(page: Page, slug: string, capturedAt: string) {
  const url = `${BASE}/funds/${encodeURIComponent(slug)}`;
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45_000 });
  await settle(page, () => [...document.querySelectorAll('script[type="application/ld+json"]')]
    .some((script) => script.textContent?.includes('"offers"')));
  const payload = await page.evaluate(() => ({
    text: document.body.innerText,
    ld: [...document.querySelectorAll('script[type="application/ld+json"]')].map((script) => script.textContent || "")
  }));
  const products = payload.ld.flatMap((raw) => {
    try {
      const json = JSON.parse(raw);
      return json["@graph"] || [json];
    } catch { return []; }
  });
  const product = products.find((item) => item?.["@type"] === "FinancialProduct" && item?.offers?.price);
  if (!product) throw new Error(`Fundbase page has no live FinancialProduct data: ${slug}`);

  const lines = payload.text.split("\n").map((line) => line.trim()).filter(Boolean);
  const indexOf = (label: string) => lines.findIndex((line) => line === label);
  const after = (label: string, distance = 4) => {
    const index = indexOf(label);
    return index < 0 ? null : lines.slice(index + 1, index + 1 + distance).map(numberIn).find((value) => value !== null) ?? null;
  };
  const before = (label: string, distance = 4) => {
    const index = indexOf(label);
    return index < 0 ? null : lines.slice(Math.max(0, index - distance), index).reverse().map(numberIn).find((value) => value !== null) ?? null;
  };
  const symbol = String(product.tickerSymbol || product.name || slug).replace(/^صندوق\s+/, "").trim();
  const regNo = `fundbase:${symbol}`;
  const categoryName = String(product.category || lines[1] || "سایر");
  const lastPrice = numberIn(String(product.offers?.price));
  const navCancel = numberIn(String(product.value?.value));
  const dailyReturn = before("آخرین قیمت معامله (لحظه‌ای)");
  const tradeValueBillionsToman = after("ارزش معاملات");
  const aumHemat = after("دارایی تحت مدیریت");

  const row: FundRow = {
    regNo, insCode: null, symbol, name: `صندوق ${symbol}`,
    fundTypeId: null, fundTypeName: categoryName, category: categoryFrom(categoryName),
    typeOfInvest: payload.text.includes("ETF") ? "ETF" : null,
    manager: product.provider?.name || null, website: url,
    isEtf: payload.text.includes("ETF") || payload.text.includes("قابل معامله"), market: "نامشخص",
    initiatedAt: null, sourceUpdatedAt: null, capturedAt,
    lastPrice, closingPrice: lastPrice, previousPrice: dailyReturn !== null && lastPrice !== null ? lastPrice / (1 + dailyReturn / 100) : null,
    priceMin: null, priceMax: null, tradeCount: null,
    volume: after("حجم معاملات"), tradeValue: tradeValueBillionsToman === null ? null : tradeValueBillionsToman * 10_000_000_000,
    navCancel, navIssue: null, navStatistical: null,
    navPremiumPct: lastPrice !== null && navCancel ? (lastPrice / navCancel - 1) * 100 : null,
    netAsset: aumHemat === null ? null : aumHemat * 10_000_000_000_000, fundSize: null,
    dailyReturn, weeklyReturn: null, monthlyReturn: null, quarterlyReturn: null,
    sixMonthReturn: null, annualReturn: null, lifetimeReturn: null,
    stockPct: null, bondPct: null, cashPct: null, depositPct: null, otherPct: null, commodityPct: null,
    unitsSubDay: null, unitsRedDay: null, netUnitsFlow: null,
    individualBuyCount: null, individualSellCount: null, individualBuyVolume: null, individualSellVolume: null,
    realMoneyFlow: null, individualBuyPerCapita: null, individualSellPerCapita: null, buyPowerRatio: null
  };

  const flowBlock = payload.text.match(/نمودار سرانه خرید و فروش[\s\S]*?داده‌های نمودار:\s*([\s\S]*?)تحلیل‌ها و نکات مهم:/)?.[1] || "";
  const flows: FundbaseFlowPoint[] = [];
  for (const match of flowBlock.matchAll(/(20\d{2}-\d{2}-\d{2}):\s*([-−]?\d+(?:[٫.]\d+)?)/g)) {
    const value = numberIn(match[2]);
    if (value !== null) flows.push({ regNo, date: match[1], realMoneyFlow: value * 10_000_000 });
  }
  return { row, flows };
}
