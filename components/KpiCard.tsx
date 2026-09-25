import type { LucideIcon } from "lucide-react";

export function KpiCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = "default"
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  hint: string;
  tone?: "default" | "positive" | "negative";
}) {
  return (
    <div className="glass card relative overflow-hidden p-5 min-h-[150px]">
      <div className="absolute -left-8 -top-8 h-28 w-28 rounded-full bg-white/[0.025]" />
      <div className="flex items-start justify-between gap-3">
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-2.5">
          <Icon size={18} strokeWidth={1.8} />
        </div>
        <span className="micro">داده ساعتی</span>
      </div>
      <div className="mt-5">
        <p className="micro mb-1">{label}</p>
        <p className={`metric-value text-2xl font-semibold ${tone === "positive" ? "positive" : tone === "negative" ? "negative" : ""}`}>
          {value}
        </p>
        <p className="micro mt-2">{hint}</p>
      </div>
    </div>
  );
}
