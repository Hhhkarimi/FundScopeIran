"use client";

import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { faNumber } from "@/lib/format";
import type { FundHistoryPoint } from "@/lib/types";

export default function FundHistoryChart({ data }: { data: FundHistoryPoint[] }) {
  if (!data.length) {
    return <div className="grid h-[280px] place-items-center rounded-3xl border border-dashed border-white/10 text-sm text-white/35">تاریخچه هنوز Backfill نشده است.</div>;
  }
  return (
    <div className="h-[320px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 12, right: 8, left: 8, bottom: 0 }}>
          <defs>
            <linearGradient id="fundPrice" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#78d6ff" stopOpacity={0.32}/><stop offset="100%" stopColor="#78d6ff" stopOpacity={0}/></linearGradient>
            <linearGradient id="fundNav" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#d7ff69" stopOpacity={0.18}/><stop offset="100%" stopColor="#d7ff69" stopOpacity={0}/></linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(255,255,255,.055)" vertical={false}/>
          <XAxis dataKey="date" tickFormatter={(v) => new Intl.DateTimeFormat("fa-IR", { month: "short", day: "numeric" }).format(new Date(v))} minTickGap={32} tick={{ fill: "rgba(255,255,255,.35)", fontSize: 10 }} axisLine={false} tickLine={false}/>
          <YAxis tickFormatter={(v) => faNumber(Number(v), 0)} width={65} tick={{ fill: "rgba(255,255,255,.35)", fontSize: 10 }} axisLine={false} tickLine={false}/>
          <Tooltip formatter={(v: any, name: any) => [`${faNumber(Number(v))} ریال`, name === "closePrice" ? "قیمت پایانی" : "NAV ابطال"]} labelFormatter={(v) => new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium" }).format(new Date(String(v)))}/>
          <Legend formatter={(value) => value === "closePrice" ? "قیمت پایانی" : "NAV ابطال"}/>
          <Area type="monotone" dataKey="closePrice" stroke="#78d6ff" fill="url(#fundPrice)" strokeWidth={1.8} connectNulls />
          <Area type="monotone" dataKey="navCancel" stroke="#d7ff69" fill="url(#fundNav)" strokeWidth={1.8} connectNulls />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
