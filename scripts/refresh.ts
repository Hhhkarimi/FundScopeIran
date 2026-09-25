import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { scrapeFundRows } from "../lib/etl";
import { replaceSnapshot } from "../lib/repository";
import { fundsToCsv } from "../lib/csv";

async function main() {
  const { rows, result } = await scrapeFundRows();
  await replaceSnapshot(rows, result.sourceStatus);
  await mkdir(path.join(process.cwd(), "data"), { recursive: true });
  await writeFile(path.join(process.cwd(), "data", "funds-latest.csv"), fundsToCsv(rows), "utf8");
  console.log(JSON.stringify({ ok: true, ...result }, null, 2));
  if (result.warnings.length) console.warn("Warnings:\n" + result.warnings.map((w) => `- ${w}`).join("\n"));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
