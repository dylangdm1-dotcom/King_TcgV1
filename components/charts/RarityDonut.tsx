"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

export type RarityDatum = {
  name: string;
  value: number;
  color: string;
};

function DonutTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const entry = payload[0]?.payload as RarityDatum;

  return (
    <div className="rounded-xl border border-white/[0.1] bg-[#11161d]/95 px-3 py-2 shadow-2xl backdrop-blur-xl">
      <p className="text-[10px] font-black uppercase tracking-wider text-white">{entry.name}</p>
      <p className="mt-0.5 text-xs font-black tabular-nums" style={{ color: entry.color }}>
        {entry.value} carte{entry.value > 1 ? "s" : ""}
      </p>
    </div>
  );
}

export default function RarityDonut({ data }: { data: RarityDatum[] }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const filtered = data.filter((item) => item.value > 0);

  if (!total) {
    return (
      <div className="flex min-h-[240px] items-center justify-center rounded-2xl border border-white/[0.07] bg-[#171d25] px-6 text-center text-[11px] font-semibold text-zinc-500">
        La répartition apparaîtra dès que votre collection contiendra des cartes enrichies.
      </div>
    );
  }

  return (
    <div className="grid items-center gap-4 sm:grid-cols-[220px_1fr]">
      <div className="relative h-[220px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={filtered}
              dataKey="value"
              nameKey="name"
              innerRadius={66}
              outerRadius={92}
              paddingAngle={3}
              stroke="rgba(255,255,255,.06)"
              strokeWidth={1}
              isAnimationActive
              animationDuration={800}
            >
              {filtered.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<DonutTooltip />} />
          </PieChart>
        </ResponsiveContainer>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-black tabular-nums text-white">{total}</span>
          <span className="mt-0.5 text-[9px] font-black uppercase tracking-[0.18em] text-zinc-500">cartes</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {filtered.map((item) => (
          <div key={item.name} className="rounded-xl border border-white/[0.07] bg-[#171d25] p-3">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
              <p className="truncate text-[9px] font-black uppercase tracking-wider text-zinc-400">{item.name}</p>
            </div>
            <p className="mt-2 text-base font-black tabular-nums text-white">{item.value}</p>
            <p className="text-[9px] font-semibold text-zinc-500">{Math.round((item.value / total) * 100)} %</p>
          </div>
        ))}
      </div>
    </div>
  );
}
