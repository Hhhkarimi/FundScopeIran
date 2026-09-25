import { writeSnapshotFiles, mergeFundbaseFlowPoints, readFileSnapshot } from "../lib/file-store";
import { crawlFundbaseFund, discoverFundbaseSlugs, launchFundbaseBrowser, type FundbaseFlowPoint } from "../lib/sources/fundbase";
import type { FundRow } from "../lib/types";

async function main() {
  const capturedAt = new Date().toISOString();
  const browser = await launchFundbaseBrowser();
  try {
    const slugs = await discoverFundbaseSlugs(browser);
    if (slugs.length < 20) throw new Error(`Fundbase discovery returned only ${slugs.length} funds`);
    const maxFunds = Math.max(20, Number(process.env.FUNDBASE_MAX_FUNDS || "120"));
    const batches = Math.ceil(slugs.length / maxFunds);
    const batchIndex = Math.floor(Date.now() / 86_400_000) % batches;
    const selected = slugs.slice(batchIndex * maxFunds, (batchIndex + 1) * maxFunds);
    const rows: FundRow[] = [];
    const flows: FundbaseFlowPoint[] = [];
    let cursor = 0;
    const workers = Array.from({ length: 3 }, async () => {
      const page = await browser.newPage();
      while (cursor < selected.length) {
        const index = cursor++;
        try {
          const result = await crawlFundbaseFund(page, selected[index], capturedAt);
          rows.push(result.row);
          flows.push(...result.flows);
        } catch (error) {
          console.warn(`${selected[index]}: ${error instanceof Error ? error.message : "crawl failed"}`);
        }
        if ((index + 1) % 25 === 0) console.log(`Fundbase progress ${index + 1}/${selected.length}`);
      }
      await page.close();
    });
    await Promise.all(workers);
    const previous = await readFileSnapshot();
    const merged = new Map((previous?.rows || []).map((row) => [row.regNo, { ...row, capturedAt }]));
    for (const row of rows) merged.set(row.regNo, row);
    const allRows = [...merged.values()];
    const result = {
      capturedAt, rowCount: allRows.length, etfCount: allRows.filter((row) => row.isEtf).length,
      sourceStatus: { fipiran: "degraded" as const, tsetmc: "degraded" as const, fundbase: "ok" as const },
      warnings: ["Direct FIPIRAN/TSETMC access is unavailable on GitHub-hosted runners; public Fundbase pages are the active source."]
    };
    const stored = await writeSnapshotFiles(allRows, result);
    await mergeFundbaseFlowPoints(flows);
    console.log(JSON.stringify({ ok: true, discovered: slugs.length, selected: selected.length, batch: `${batchIndex + 1}/${batches}`, crawled: rows.length, flows: flows.length, ...result, ...stored }, null, 2));
  } finally {
    await browser.close();
  }
}

main().catch((error) => { console.error(error); process.exit(1); });
