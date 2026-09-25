import { getDashboardData } from "@/lib/dashboard";
import { fundsToCsv } from "@/lib/csv";

export const runtime = "nodejs";
export const revalidate = 3600;

export async function GET() {
  const dashboard = await getDashboardData();
  const csv = fundsToCsv(dashboard.funds);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="iran-funds-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=300"
    }
  });
}
