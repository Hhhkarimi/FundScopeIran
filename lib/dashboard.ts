import { readHistory, readLatestRows, readLatestSourceStatus } from "@/lib/repository";
import type { DashboardData } from "@/lib/types";
import { summarize } from "@/lib/metrics";
import { demoDashboard } from "@/lib/demo";
import { hasDatabase } from "@/lib/db";

export async function getDashboardData(): Promise<DashboardData> {
  const rows = await readLatestRows();
  if (!rows.length) {
    if (!hasDatabase() || process.env.DEMO_MODE === "true") return demoDashboard();
    return {
      mode: "empty",
      generatedAt: new Date().toISOString(),
      summary: summarize([]),
      funds: [],
      history: [],
      sourceStatus: { fipiran: "unknown", tsetmc: "unknown" }
    };
  }

  const [history, sourceStatus] = await Promise.all([readHistory(), readLatestSourceStatus()]);
  return {
    mode: "live",
    generatedAt: rows[0].capturedAt,
    summary: summarize(rows),
    funds: rows,
    history,
    sourceStatus
  };
}
