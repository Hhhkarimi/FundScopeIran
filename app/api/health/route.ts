import { NextResponse } from "next/server";
import { hasDatabase } from "@/lib/db";
import { getDashboardData } from "@/lib/dashboard";

export const runtime = "nodejs";

export async function GET() {
  const database = hasDatabase();
  const dashboard = await getDashboardData();
  const rows = dashboard.funds;
  const latest = dashboard.generatedAt || null;
  const ageMinutes = latest ? Math.round((Date.now() - new Date(latest).getTime()) / 60_000) : null;
  const healthy = rows.length > 0;
  return NextResponse.json(
    { ok: healthy, mode: dashboard.mode, database, rows: rows.length, latest, ageMinutes },
    { status: healthy ? 200 : 503 }
  );
}
