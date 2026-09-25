import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://example.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "FundScope Iran | داشبورد صندوق‌های سرمایه‌گذاری ایران",
    template: "%s | FundScope Iran"
  },
  description:
    "داشبورد تحلیلی صندوق‌های سرمایه‌گذاری ایران با NAV، بازده، ارزش معاملات، جریان پول، حباب NAV و مقایسه صندوق‌های ETF و صدور/ابطالی.",
  keywords: [
    "صندوق سرمایه گذاری",
    "ETF ایران",
    "بورس تهران",
    "فرابورس",
    "NAV صندوق",
    "صندوق طلا",
    "صندوق درآمد ثابت",
    "صندوق اهرمی"
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "fa_IR",
    siteName: "FundScope Iran",
    title: "FundScope Iran | رادار صندوق‌های سرمایه‌گذاری ایران",
    description: "داده ساعتی، نمودارهای تحلیلی و مقایسه صندوق‌های سرمایه‌گذاری ایران.",
    url: "/"
  },
  twitter: {
    card: "summary_large_image",
    title: "FundScope Iran",
    description: "رادار تحلیلی صندوق‌های سرمایه‌گذاری ایران"
  },
  robots: { index: true, follow: true }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3f7f4" },
    { media: "(prefers-color-scheme: dark)", color: "#07100e" }
  ],
  colorScheme: "dark light"
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=localStorage.getItem('fundscope-theme');var t=(s==='light'||s==='dark')?s:(matchMedia('(prefers-color-scheme: light)').matches?'light':'dark');document.documentElement.dataset.theme=t;document.documentElement.style.colorScheme=t}catch(e){}})()`
          }}
        />
        {children}
      </body>
    </html>
  );
}
