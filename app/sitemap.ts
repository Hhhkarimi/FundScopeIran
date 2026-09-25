import type { MetadataRoute } from "next";
import { readLatestRows } from "@/lib/repository";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://example.com";
  const funds = await readLatestRows();
  return [
    { url: base, changeFrequency: "hourly", priority: 1 },
    { url: `${base}/about-data`, changeFrequency: "monthly", priority: 0.5 },
    ...funds.map((fund) => ({
      url: `${base}/funds/${encodeURIComponent(fund.regNo)}`,
      lastModified: new Date(fund.capturedAt),
      changeFrequency: "daily" as const,
      priority: 0.7
    }))
  ];
}
