import { CircleHelp } from "lucide-react";
import type { CSSProperties } from "react";
import type { FundScore } from "@/lib/fund-score";

export default function FundScoreCard({ score }: { score: FundScore }) {
  const total = score.total ?? 0;
  return (
    <section className="score-card mt-6 rounded-3xl border border-sky-300/15 bg-sky-300/[0.035] p-5 sm:p-6" aria-labelledby="fund-score-title">
      <div className="grid gap-6 lg:grid-cols-[240px_1fr] lg:items-center">
        <div className="flex items-center gap-4 lg:block">
          <div className="score-ring shrink-0" style={{ "--score": `${total}%` } as CSSProperties}>
            <div><strong>{score.total ?? "—"}</strong><span>از ۱۰۰</span></div>
          </div>
          <div className="lg:mt-4">
            <p id="fund-score-title" className="font-bold">امتیاز جامع صندوق</p>
            <p className="mt-1 text-sm text-sky-200">{score.label}</p>
            <p className="micro mt-1">{score.peerLabel} · پوشش {score.coverage}٪</p>
          </div>
        </div>
        <div>
          <p className="text-sm leading-7 text-white/70">{score.summary}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {score.dimensions.map((dimension) => (
              <div key={dimension.id} className="rounded-2xl border border-white/[0.06] bg-black/10 p-3">
                <div className="flex items-center justify-between gap-2 text-[11px]"><span className="text-white/55">{dimension.label}</span><span className="metric-value font-bold">{dimension.score === null ? "—" : Math.round(dimension.score)}</span></div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.06]"><div className="h-full rounded-full bg-sky-300/75" style={{ width: `${dimension.score ?? 0}%` }}/></div>
                <p className="mt-2 text-[10px] text-white/30">وزن {dimension.weight}٪{dimension.dataCoverage < 100 ? ` · پوشش ${dimension.dataCoverage}٪` : ""}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 flex items-start gap-2 text-[11px] leading-6 text-white/40"><CircleHelp size={14} className="mt-1 shrink-0"/>این امتیاز نسبی و توضیح‌پذیر است، نه پیش‌بینی بازده یا توصیه خرید. مؤلفه‌های بدون داده از محاسبه حذف و وزن بقیه بازتوزیع می‌شود.</p>
        </div>
      </div>
    </section>
  );
}
