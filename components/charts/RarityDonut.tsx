"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

export type RarityDatum = { name: string; value: number; color: string };

function DonutTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const entry = payload[0]?.payload as RarityDatum;
  return (
    <div className="rounded-xl border border-cyan-300/15 bg-[#0c131c] px-3 py-2 shadow-2xl">
      <p className="text-[9px] font-black uppercase tracking-wider text-white">{entry.name}</p>
      <p className="mt-0.5 text-xs font-black tabular-nums" style={{ color: entry.color }}>{entry.value} carte{entry.value > 1 ? "s" : ""}</p>
    </div>
  );
}

export default function RarityDonut({ data }: { data: RarityDatum[] }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const filtered = data.filter((item) => item.value > 0);

  if (!total) {
    return <div className="kt-empty-state flex min-h-[140px] items-center justify-center rounded-2xl px-5 text-center text-[10px] font-semibold">La répartition apparaîtra dès que la collection contiendra des cartes enrichies.</div>;
  }

  return (
    <div className="grid grid-cols-[128px_1fr] items-center gap-4 sm:grid-cols-[145px_1fr]">
      <div className="relative h-[128px] sm:h-[145px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={filtered} dataKey="value" nameKey="name" innerRadius="56%" outerRadius="82%" paddingAngle={2.5} stroke="rgba(255,255,255,.07)" strokeWidth={1} animationDuration={700}>
              {filtered.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
            </Pie>
            <Tooltip content={<DonutTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-black tabular-nums text-white">{total}</span>
          <span className="text-[8px] font-black uppercase tracking-[0.15em] text-zinc-600">cartes</span>
        </div>
      </div>
      <div className="space-y-1.5">
        {filtered.map((item) => (
          <div key={item.name} className="kt-legend-row flex items-center justify-between gap-2 rounded-xl border px-2.5 py-2">
            <div className="flex min-w-0 items-center gap-2">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
              <p className="truncate text-[9px] font-black text-zinc-300">{item.name}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-[10px] font-black tabular-nums text-white">{item.value}</p>
              <p className="text-[8px] font-semibold text-zinc-600">{Math.round((item.value / total) * 100)}%</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
