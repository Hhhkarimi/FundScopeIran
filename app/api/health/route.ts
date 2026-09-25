import { NextResponse } from "next/server";
import { hasDatabase } from "@/lib/db";
import { readLatestRows } from "@/lib/repository";

export const runtime = "nodejs";

export async function GET() {
  const database = hasDatabase();
  const rows = database ? await readLatestRows() : [];
  const latest = rows[0]?.capturedAt || null;
  const ageMinutes = latest ? Math.round((Date.now() - new Date(latest).getTime()) / 60_000) : null;
  const healthy = database && rows.length > 0 && ageMinutes !== null && ageMinutes < 180;
  return NextResponse.json(
    { ok: healthy, database, rows: rows.length, latest, ageMinutes },
    { status: healthy ? 200 : 503 }
  );
}
