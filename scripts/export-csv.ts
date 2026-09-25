import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { scrapeFundRows } from "../lib/etl";
import { fundsToCsv } from "../lib/csv";

async function main() {
  const { rows, result } = await scrapeFundRows();
  const dataDir = path.join(process.cwd(), "data");
  const csvOut = path.join(dataDir, "funds-latest.csv");
  const jsonOut = path.join(dataDir, "funds-latest.json");
  await mkdir(dataDir, { recursive: true });
  await Promise.all([
    writeFile(csvOut, fundsToCsv(rows), "utf8"),
    writeFile(jsonOut, JSON.stringify({
      generatedAt: result.capturedAt,
      sourceStatus: result.sourceStatus,
      rows
    }), "utf8")
  ]);
  console.log(`Wrote ${rows.length} rows to ${csvOut} and ${jsonOut}`);
  if (result.warnings.length) console.warn(result.warnings.join("\n"));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
