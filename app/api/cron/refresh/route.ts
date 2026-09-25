import { NextResponse } from "next/server";
import { refreshSnapshot } from "@/lib/etl";
import { hasDatabase } from "@/lib/db";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ ok: false, error: "CRON_SECRET is not configured" }, { status: 500 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const database = hasDatabase();
    if (!database) {
      return NextResponse.json({
        ok: false,
        persisted: false,
        error: "File-backed refresh runs in GitHub Actions because Vercel Functions have no durable local filesystem."
      }, { status: 409 });
    }
    const result = await refreshSnapshot();
    return NextResponse.json({ ok: true, persisted: database, ...result });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Refresh failed" },
      { status: 500 }
    );
  }
}
