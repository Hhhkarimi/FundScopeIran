import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { scrapeFundRows } from "../lib/etl";
import { fundsToCsv } from "../lib/csv";

async function main() {
  const { rows, result } = await scrapeFundRows();
  const out = path.join(process.cwd(), "data", "funds-latest.csv");
  await mkdir(path.dirname(out), { recursive: true });
  await writeFile(out, fundsToCsv(rows), "utf8");
  console.log(`Wrote ${rows.length} rows to ${out}`);
  if (result.warnings.length) console.warn(result.warnings.join("\n"));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
