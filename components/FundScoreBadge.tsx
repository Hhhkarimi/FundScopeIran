import type { FundScore } from "@/lib/fund-score";

export default function FundScoreBadge({ score, compact = false }: { score: FundScore | undefined; compact?: boolean }) {
  if (!score || score.total === null) {
    return <span className="inline-flex items-center rounded-lg border border-white/[0.08] px-2 py-1 text-[10px] text-white/35" title={score?.summary}>داده ناکافی</span>;
  }
  return (
    <span className="score-badge" title={`${score.label} · پوشش داده ${score.coverage}٪ · ${score.peerLabel}`}>
      <strong className={compact ? "text-xs" : "text-sm"}>{score.total}</strong>
      {!compact && <span>از ۱۰۰</span>}
    </span>
  );
}
