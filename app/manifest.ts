import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FundScope Iran",
    short_name: "FundScope",
    description: "داشبورد تحلیلی صندوق‌های سرمایه‌گذاری ایران",
    start_url: "/",
    display: "standalone",
    background_color: "#07100e",
    theme_color: "#07100e",
    lang: "fa",
    dir: "rtl"
  };
}
