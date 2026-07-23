"use client";

import { BarChart3, TrendingUp, ArrowDownRight, ArrowUpRight } from "lucide-react";

type Props = {
  current: number;
  lowest: number;
  highest: number;
  variation: number;
  opportunity: string;
};

export default function PriceStats({
  current,
  lowest,
  highest,
  variation,
  opportunity,
}: Props) {
  // Détermination de l'icône et couleur de la variation
  const isPositive = variation > 0;
  const isNegative = variation < 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-cyan-400" /> Intelligence du marché
        </h2>
      </div>

      <div className="grid gap-4 grid-cols-2">
        {/* Prix Actuel */}
        <div className="glass-card bg-neutral-950/40 rounded-xl p-4 flex flex-col justify-between min-h-[90px]">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Prix actuel</span>
          <span className="text-xl font-black text-white mt-2 tabular-nums">
            {current > 0 ? `${current.toFixed(2)} €` : "Calcul..."}
          </span>
        </div>

        {/* Variation */}
        <div className="glass-card bg-neutral-950/40 rounded-xl p-4 flex flex-col justify-between min-h-[90px]">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Variation</span>
            {isPositive ? (
              <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
            ) : isNegative ? (
              <ArrowDownRight className="w-3.5 h-3.5 text-rose-400" />
            ) : (
              <TrendingUp className="w-3.5 h-3.5 text-zinc-500" />
            )}
          </div>
          <span className={`text-xl font-black mt-2 tabular-nums ${
            isPositive ? "text-emerald-400" : isNegative ? "text-rose-400" : "text-white"
          }`}>
            {variation > 0 ? "+" : ""}{variation.toFixed(2)} %
          </span>
        </div>

        {/* Plus Bas */}
        <div className="glass-card bg-neutral-950/40 rounded-xl p-4 flex flex-col justify-between min-h-[90px]">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Plus bas historique</span>
          <span className="text-sm font-bold text-zinc-300 mt-2 tabular-nums">
            {lowest > 0 ? `${lowest.toFixed(2)} €` : "--"}
          </span>
        </div>

        {/* Plus Haut */}
        <div className="glass-card bg-neutral-950/40 rounded-xl p-4 flex flex-col justify-between min-h-[90px]">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Plus haut historique</span>
          <span className="text-sm font-bold text-zinc-300 mt-2 tabular-nums">
            {highest > 0 ? `${highest.toFixed(2)} €` : "--"}
          </span>
        </div>
      </div>

      {/* Encadré d'opportunité King_TCG */}
      <div className="glass-card border-cyan-500/10 bg-cyan-500/5 rounded-xl p-4">
        <span className="text-[10px] font-black uppercase tracking-wider text-cyan-400 block">
          Opportunité King_TCG
        </span>
        <p className="text-xs font-medium text-zinc-200 mt-1.5 leading-relaxed">
          💡 {opportunity || "Analyse des volumes et spreads en cours..."}
        </p>
      </div>
    </div>
  );
}