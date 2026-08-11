"use client";

import type { CardCondition } from "@/lib/types";

export type ConditionValueDatum = { condition: CardCondition; value: number; count: number };

const styles: Record<string, { bar: string; dot: string; text: string; label: string }> = {
  Mint: { bar: "from-white to-emerald-100", dot: "bg-white", text: "text-white", label: "Mint" },
  "Near Mint": { bar: "from-emerald-50 to-emerald-200", dot: "bg-emerald-50", text: "text-emerald-100", label: "Near Mint" },
  Excellent: { bar: "from-lime-200 to-lime-400", dot: "bg-lime-300", text: "text-lime-200", label: "Excellent" },
  Good: { bar: "from-amber-200 to-amber-400", dot: "bg-amber-300", text: "text-amber-200", label: "Good" },
  "Light Played": { bar: "from-orange-300 to-orange-500", dot: "bg-orange-400", text: "text-orange-300", label: "Light Played" },
  Played: { bar: "from-rose-300 to-rose-500", dot: "bg-rose-400", text: "text-rose-300", label: "Played" },
  Poor: { bar: "from-red-400 to-red-600", dot: "bg-red-500", text: "text-red-300", label: "Poor" },
};

const euro = (value: number) => value.toLocaleString("fr-FR", { maximumFractionDigits: 0 });

export default function ConditionValueBars({ data }: { data: ConditionValueDatum[] }) {
  const visible = data.filter((item) => item.count > 0);
  const maxValue = Math.max(1, ...visible.map((item) => item.value));

  if (!visible.length) {
    return <div className="flex min-h-[96px] items-center justify-center rounded-2xl border border-white/[0.08] bg-[#1a212b] px-5 text-center text-[10px] font-semibold text-zinc-500">Ajoutez l’état de vos cartes pour afficher cette répartition.</div>;
  }

  return (
    <div className="grid gap-x-5 gap-y-3 sm:grid-cols-2">
      {visible.map((item) => {
        const style = styles[item.condition] ?? styles.Good;
        const width = item.value > 0 ? Math.max(6, (item.value / maxValue) * 100) : 0;
        return (
          <div key={item.condition} className="rounded-xl border border-white/[0.06] bg-black/15 px-3 py-2.5">
            <div className="flex items-center justify-between gap-3">
              <p className="flex min-w-0 items-center gap-2 truncate text-[9px] font-black uppercase tracking-[0.08em] text-zinc-300">
                <span className={`h-2 w-2 shrink-0 rounded-full ${style.dot}`} />{style.label}
              </p>
              <p className={`shrink-0 text-[10px] font-black tabular-nums ${style.text}`}>{euro(item.value)} €</p>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/35 ring-1 ring-white/[0.04]">
              <div className={`h-full rounded-full bg-gradient-to-r ${style.bar} transition-[width] duration-700`} style={{ width: `${width}%` }} />
            </div>
            <p className="mt-1.5 text-[8px] font-semibold text-zinc-600">{item.count} carte{item.count > 1 ? "s" : ""}</p>
          </div>
        );
      })}
    </div>
  );
}
