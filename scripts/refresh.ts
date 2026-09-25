import { scrapeFundRows } from "../lib/etl";
import { writeSnapshotFiles } from "../lib/file-store";

async function main() {
  const { rows, result } = await scrapeFundRows();
  const stored = await writeSnapshotFiles(rows, result);
  console.log(JSON.stringify({ ok: true, ...result, ...stored }, null, 2));
  if (result.warnings.length) console.warn("Warnings:\n" + result.warnings.map((w) => `- ${w}`).join("\n"));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
