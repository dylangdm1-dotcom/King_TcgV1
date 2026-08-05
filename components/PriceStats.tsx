// components/PriceStats.tsx

"use client";

import { BarChart3, TrendingUp, ArrowDownRight, ArrowUpRight } from "lucide-react";

type Props = {
  current?: number;
  lowest?: number;
  highest?: number;
  variation?: number;
  opportunity?: string;
};

export default function PriceStats({
  current = 0,
  lowest = 0,
  highest = 0,
  variation = 0,
  opportunity = "",
}: Props) {
  // Détermination de l'icône et couleur de la variation avec garde NaN
  const safeVariation = Number.isNaN(variation) ? 0 : variation;
  const isPositive = safeVariation > 0;
  const isNegative = safeVariation < 0;

  const formatEuro = (value: number) => {
    if (!value || value <= 0 || Number.isNaN(value)) return "--";
    return `${value.toFixed(2)} €`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-zinc-400">
          <BarChart3 className="h-4 w-4 text-cyan-400" /> Intelligence du marché
        </h2>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Prix Actuel */}
        <div className="glass-card flex min-h-[90px] flex-col justify-between rounded-xl bg-neutral-950/40 p-4">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
            Prix actuel
          </span>
          <span className="mt-2 text-xl font-black text-white tabular-nums">
            {current > 0 ? formatEuro(current) : "Calcul..."}
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

        {/* Plus Bas */}
        <div className="glass-card flex min-h-[90px] flex-col justify-between rounded-xl bg-neutral-950/40 p-4">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
            Plus bas historique
          </span>
          <span className="mt-2 text-sm font-bold text-zinc-300 tabular-nums">
            {formatEuro(lowest)}
          </span>
        </div>

        {/* Plus Haut */}
        <div className="glass-card flex min-h-[90px] flex-col justify-between rounded-xl bg-neutral-950/40 p-4">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
            Plus haut historique
          </span>
          <span className="mt-2 text-sm font-bold text-zinc-300 tabular-nums">
            {formatEuro(highest)}
          </span>
        </div>
      </div>

      {/* Encadré d'opportunité King_TCG */}
      <div className="glass-card rounded-xl border-cyan-500/10 bg-cyan-500/5 p-4">
        <span className="block text-[10px] font-black uppercase tracking-wider text-cyan-400">
          Opportunité King_TCG
        </span>
        <p className="mt-1.5 text-xs font-medium leading-relaxed text-zinc-200">
          💡 {opportunity || "Analyse des volumes et spreads en cours..."}
        </p>
      </div>
    </div>
  );
}