import { writeSnapshotFiles, mergeFundbaseFlowPoints } from "../lib/file-store";
import { crawlFundbaseFund, discoverFundbaseSlugs, launchFundbaseBrowser, type FundbaseFlowPoint } from "../lib/sources/fundbase";
import type { FundRow } from "../lib/types";

async function main() {
  const capturedAt = new Date().toISOString();
  const browser = await launchFundbaseBrowser();
  try {
    const slugs = await discoverFundbaseSlugs(browser);
    if (slugs.length < 20) throw new Error(`Fundbase discovery returned only ${slugs.length} funds`);
    const rows: FundRow[] = [];
    const flows: FundbaseFlowPoint[] = [];
    let cursor = 0;
    const workers = Array.from({ length: 3 }, async () => {
      const page = await browser.newPage();
      while (cursor < slugs.length) {
        const index = cursor++;
        try {
          const result = await crawlFundbaseFund(page, slugs[index], capturedAt);
          rows.push(result.row);
          flows.push(...result.flows);
        } catch (error) {
          console.warn(`${slugs[index]}: ${error instanceof Error ? error.message : "crawl failed"}`);
        }
        if ((index + 1) % 25 === 0) console.log(`Fundbase progress ${index + 1}/${slugs.length}`);
      }
      await page.close();
    });
    await Promise.all(workers);
    const result = {
      capturedAt, rowCount: rows.length, etfCount: rows.filter((row) => row.isEtf).length,
      sourceStatus: { fipiran: "degraded" as const, tsetmc: "degraded" as const, fundbase: "ok" as const },
      warnings: ["Direct FIPIRAN/TSETMC access is unavailable on GitHub-hosted runners; public Fundbase pages are the active source."]
    };
    const stored = await writeSnapshotFiles(rows, result);
    await mergeFundbaseFlowPoints(flows);
    console.log(JSON.stringify({ ok: true, discovered: slugs.length, flows: flows.length, ...result, ...stored }, null, 2));
  } finally {
    await browser.close();
  }
}

main().catch((error) => { console.error(error); process.exit(1); });
