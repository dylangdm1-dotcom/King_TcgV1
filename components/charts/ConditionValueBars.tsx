"use client";

import type { CardCondition } from "@/lib/types";

export type ConditionValueDatum = {
  condition: CardCondition;
  value: number;
  count: number;
};

const conditionStyles: Record<string, { bar: string; text: string; label: string }> = {
  Mint: { bar: "bg-emerald-300", text: "text-emerald-300", label: "Mint" },
  "Near Mint": { bar: "bg-emerald-400", text: "text-emerald-300", label: "Near Mint" },
  Excellent: { bar: "bg-cyan-400", text: "text-cyan-300", label: "Excellent" },
  Good: { bar: "bg-amber-400", text: "text-amber-300", label: "Good" },
  "Light Played": { bar: "bg-orange-400", text: "text-orange-300", label: "Light Played" },
  Played: { bar: "bg-rose-400", text: "text-rose-300", label: "Played" },
  Poor: { bar: "bg-red-500", text: "text-red-300", label: "Poor" },
};

function euro(value: number) {
  return value.toLocaleString("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export default function ConditionValueBars({ data }: { data: ConditionValueDatum[] }) {
  const maxValue = Math.max(1, ...data.map((item) => item.value));

  if (!data.some((item) => item.count > 0)) {
    return (
      <div className="flex min-h-[180px] items-center justify-center rounded-2xl border border-white/[0.07] bg-[#171d25] px-6 text-center text-[11px] font-semibold text-zinc-500">
        Ajoutez des cartes et leur état pour visualiser la valeur du portefeuille par condition.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {data.map((item) => {
        const style = conditionStyles[item.condition] ?? conditionStyles.Good;
        const width = item.value > 0 ? Math.max(4, (item.value / maxValue) * 100) : 0;

        return (
          <div key={item.condition} className="rounded-2xl border border-white/[0.07] bg-[#171d25] p-3.5">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-[10px] font-black uppercase tracking-[0.12em] text-zinc-300">
                  {style.label}
                </p>
                <p className="mt-0.5 text-[9px] font-medium text-zinc-500">
                  {item.count} carte{item.count > 1 ? "s" : ""}
                </p>
              </div>
              <p className={`shrink-0 text-xs font-black tabular-nums ${style.text}`}>
                {euro(item.value)} €
              </p>
            </div>

            <div className="h-2.5 overflow-hidden rounded-full bg-black/30">
              <div
                className={`h-full rounded-full ${style.bar} shadow-[0_0_18px_rgba(255,255,255,.08)] transition-[width] duration-700 ease-out`}
                style={{ width: `${width}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
