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
    return <div className="kt-empty-state-rich min-h-[140px]"><p className="text-[11px] font-black text-white">Répartition indisponible</p><p className="max-w-sm text-[10px]">La rareté, le volume et les pourcentages apparaîtront dès que la collection contiendra des cartes enrichies.</p></div>;
  }

  return (
    <div className="grid grid-cols-[118px_1fr] items-center gap-3 sm:grid-cols-[154px_1fr] sm:gap-5">
      <div className="relative h-[118px] rounded-full bg-[radial-gradient(circle,rgba(34,211,238,.08),transparent_67%)] sm:h-[154px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={filtered} dataKey="value" nameKey="name" innerRadius="54%" outerRadius="88%" paddingAngle={3} cornerRadius={4} stroke="rgba(7,12,18,.7)" strokeWidth={2} animationDuration={750}>
              {filtered.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
            </Pie>
            <Tooltip content={<DonutTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-black tabular-nums text-white">{total}</span>
          <span className="text-[8px] font-black uppercase tracking-[0.15em] text-zinc-400">cartes</span>
        </div>
      </div>
      <div className="max-h-[180px] space-y-2 overflow-y-auto pr-1">
        {filtered.map((item) => (
          <div key={item.name} className="rounded-xl bg-[#111b26]/78 px-2.5 py-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full shadow-[0_0_10px_currentColor]" style={{ backgroundColor: item.color, color: item.color }} />
                <p className="truncate text-[9px] font-black text-zinc-200 sm:text-[10px]">{item.name}</p>
              </div>
              <p className="shrink-0 text-[9px] font-black tabular-nums text-white">{item.value} · {Math.round((item.value / total) * 100)}%</p>
            </div>
            <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-black/35">
              <div className="h-full rounded-full" style={{ width: `${Math.max(4, (item.value / total) * 100)}%`, backgroundColor: item.color, boxShadow: `0 0 10px ${item.color}66` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
