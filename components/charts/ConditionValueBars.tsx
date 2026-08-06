"use client";

import type { CardCondition } from "@/lib/types";

export type ConditionValueDatum = {
  condition: CardCondition;
  value: number;
  count: number;
};

const conditionStyles: Record<string, { bar: string; dot: string; text: string; label: string }> = {
  Mint: { bar: "from-teal-100 to-emerald-300", dot: "bg-teal-100", text: "text-teal-100", label: "Mint" },
  "Near Mint": { bar: "from-emerald-100 to-emerald-300", dot: "bg-emerald-100", text: "text-emerald-100", label: "Near Mint" },
  Excellent: { bar: "from-lime-200 to-lime-400", dot: "bg-lime-300", text: "text-lime-300", label: "Excellent" },
  Good: { bar: "from-amber-200 to-amber-400", dot: "bg-amber-300", text: "text-amber-300", label: "Good" },
  "Light Played": { bar: "from-orange-300 to-orange-500", dot: "bg-orange-400", text: "text-orange-300", label: "Light Played" },
  Played: { bar: "from-rose-300 to-rose-500", dot: "bg-rose-400", text: "text-rose-300", label: "Played" },
  Poor: { bar: "from-red-400 to-red-600", dot: "bg-red-500", text: "text-red-300", label: "Poor" },
};

function euro(value: number) {
  return value.toLocaleString("fr-FR", { maximumFractionDigits: 0 });
}

export default function ConditionValueBars({ data }: { data: ConditionValueDatum[] }) {
  const visible = data.filter((item) => item.count > 0);
  const maxValue = Math.max(1, ...visible.map((item) => item.value));

  if (!visible.length) {
    return (
      <div className="flex min-h-[112px] items-center justify-center rounded-2xl border border-white/[0.08] bg-[#1a212b] px-5 text-center text-[10px] font-semibold text-zinc-500">
        Ajoutez l’état de vos cartes pour afficher cette répartition.
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {visible.map((item) => {
        const style = conditionStyles[item.condition] ?? conditionStyles.Good;
        const width = item.value > 0 ? Math.max(5, (item.value / maxValue) * 100) : 0;
        return (
          <div key={item.condition} className="grid grid-cols-[88px_1fr_auto] items-center gap-2.5">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 truncate text-[9px] font-black uppercase tracking-[0.08em] text-zinc-300">
                <span className={`h-2 w-2 shrink-0 rounded-full ${style.dot}`} />
                {style.label}
              </p>
              <p className="mt-0.5 pl-3.5 text-[8px] font-semibold text-zinc-600">{item.count} carte{item.count > 1 ? "s" : ""}</p>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-black/35 ring-1 ring-white/[0.04]">
              <div className={`h-full rounded-full bg-gradient-to-r ${style.bar} transition-[width] duration-700`} style={{ width: `${width}%` }} />
            </div>
            <p className={`w-[58px] text-right text-[10px] font-black tabular-nums ${style.text}`}>{euro(item.value)} €</p>
          </div>
        );
      })}
    </div>
  );
}
