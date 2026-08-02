// components/PriceStats.tsx

"use client";

import {
  BarChart3,
  TrendingUp,
  ArrowDownRight,
  ArrowUpRight,
} from "lucide-react";

type Props = {
  current?: number;
  lowest?: number;
  highest?: number;
  variation?: number;
  opportunity?: string;
};

function formatEuro(value?: number): string {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value <= 0
  ) {
    return "--";
  }

  return `${value.toFixed(2)} €`;
}

function getSafeNumber(value?: number): number {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : 0;
}

export default function PriceStats({
  current = 0,
  lowest = 0,
  highest = 0,
  variation = 0,
  opportunity = "",
}: Props) {
  const safeCurrent = getSafeNumber(current);
  const safeLowest = getSafeNumber(lowest);
  const safeHighest = getSafeNumber(highest);
  const safeVariation = getSafeNumber(variation);

  const isPositive = safeVariation > 0;
  const isNegative = safeVariation < 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-zinc-400">
          <BarChart3 className="h-4 w-4 text-cyan-400" />
          Intelligence du marché
        </h2>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-2 gap-4">
        {/* Prix actuel */}
        <div className="glass-card flex min-h-[90px] flex-col justify-between rounded-xl bg-neutral-950/40 p-4">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
            Prix actuel
          </span>

          <span className="mt-2 text-xl font-black text-white tabular-nums">
            {formatEuro(safeCurrent)}
          </span>
        </div>

        {/* Variation */}
        <div className="glass-card flex min-h-[90px] flex-col justify-between rounded-xl bg-neutral-950/40 p-4">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
              Variation
            </span>

            {isPositive ? (
              <ArrowUpRight className="h-3.5 w-3.5 text-emerald-400" />
            ) : isNegative ? (
              <ArrowDownRight className="h-3.5 w-3.5 text-rose-400" />
            ) : (
              <TrendingUp className="h-3.5 w-3.5 text-zinc-500" />
            )}
          </div>

          <span
            className={`mt-2 text-xl font-black tabular-nums ${
              isPositive
                ? "text-emerald-400"
                : isNegative
                ? "text-rose-400"
                : "text-white"
            }`}
          >
            {isPositive ? "+" : ""}
            {safeVariation.toFixed(2)} %
          </span>
        </div>

        {/* Plus bas */}
        <div className="glass-card flex min-h-[90px] flex-col justify-between rounded-xl bg-neutral-950/40 p-4">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
            Plus bas historique
          </span>

          <span className="mt-2 text-sm font-bold text-zinc-300 tabular-nums">
            {formatEuro(safeLowest)}
          </span>
        </div>

        {/* Plus haut */}
        <div className="glass-card flex min-h-[90px] flex-col justify-between rounded-xl bg-neutral-950/40 p-4">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
            Plus haut historique
          </span>

          <span className="mt-2 text-sm font-bold text-zinc-300 tabular-nums">
            {formatEuro(safeHighest)}
          </span>
        </div>
      </div>

      {/* Opportunité */}
      <div className="glass-card rounded-xl border border-cyan-500/10 bg-cyan-500/5 p-4">
        <span className="block text-[10px] font-black uppercase tracking-wider text-cyan-400">
          Opportunité King_TCG
        </span>

        <p className="mt-1.5 text-xs font-medium leading-relaxed text-zinc-200">
          💡{" "}
          {opportunity.trim() ||
            "Analyse des volumes et spreads en cours..."}
        </p>
      </div>
    </div>
  );
}