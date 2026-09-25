import DashboardClient from "@/components/DashboardClient";
import { getDashboardData } from "@/lib/dashboard";

export const revalidate = 3600;

export default async function HomePage() {
  const data = await getDashboardData();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://example.com";
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        name: "FundScope Iran",
        url: siteUrl,
        inLanguage: "fa-IR",
        description: "داشبورد تحلیلی صندوق‌های سرمایه‌گذاری ایران"
      },
      {
        "@type": "Dataset",
        name: "Iran Investment Funds Hourly Market Dataset",
        description: "Snapshot ساعتی صندوق‌های سرمایه‌گذاری ایران شامل NAV، بازده، معاملات و شاخص‌های مشتق‌شده.",
        url: `${siteUrl}/api/funds.csv`,
        temporalCoverage: "2026/..",
        spatialCoverage: "Iran",
        creator: { "@type": "Organization", name: "FundScope Iran" },
        variableMeasured: [
          "NAV",
          "Net Asset Value",
          "Daily Return",
          "Trading Value",
          "NAV Premium/Discount",
          "Estimated Individual Money Flow"
        ],
        isBasedOn: ["https://www.fipiran.com/", "https://tsetmc.com/"]
      }
    ]
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <DashboardClient data={data} />
    </>
  );
}
