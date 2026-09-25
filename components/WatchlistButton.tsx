"use client";

import { Star } from "lucide-react";
import { useWatchlist } from "@/lib/watchlist";

export default function WatchlistButton({
  regNo,
  fundName,
  variant = "icon"
}: {
  regNo: string;
  fundName: string;
  variant?: "icon" | "label";
}) {
  const watchlist = useWatchlist();
  const active = watchlist.has(regNo);
  const label = active ? `حذف ${fundName} از دیده‌بان` : `افزودن ${fundName} به دیده‌بان`;

  return (
    <button
      type="button"
      onClick={() => watchlist.toggle(regNo)}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={variant === "label"
        ? `watchlist-action inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-bold transition ${active ? "border-lime-200/30 bg-lime-200/10 text-lime-200" : "border-white/10 text-white/65 hover:border-white/20 hover:bg-white/5"}`
        : `watchlist-action grid h-9 w-9 shrink-0 place-items-center rounded-xl border transition ${active ? "border-lime-200/30 bg-lime-200/10 text-lime-200" : "border-white/10 text-white/35 hover:border-white/20 hover:text-white"}`}
    >
      <Star size={variant === "label" ? 15 : 14} fill={active ? "currentColor" : "none"} />
      {variant === "label" && <span>{active ? "در دیده‌بان" : "افزودن به دیده‌بان"}</span>}
    </button>
  );
}
