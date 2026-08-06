"use client";

import {
  BarChart3,
  TrendingUp,
  ArrowDownRight,
  ArrowUpRight,
  Gauge,
} from "lucide-react";

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
  const safeVariation = Number.isNaN(variation) ? 0 : variation;
  const isPositive = safeVariation > 0;
  const isNegative = safeVariation < 0;

  const formatEuro = (value: number) => {
    if (!value || value <= 0 || Number.isNaN(value)) return "—";
    return `${value.toFixed(2)} €`;
  };

  return (
    <div className="space-y-5">
      <div>
        <div className="kt-section-label">
          <BarChart3 className="h-4 w-4 text-cyan-400" />
          Intelligence du marché
        </div>
        <p className="mt-2 text-[11px] font-medium leading-5 text-zinc-500">
          Synthèse de la valeur suivie localement et de son amplitude observée.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Metric label="Prix actuel" value={current > 0 ? formatEuro(current) : "Calcul…"} prominent />
        <div className="kt-market-metric">
          <div className="flex items-start justify-between gap-2">
            <span className="text-[9px] font-black uppercase tracking-[0.15em] text-zinc-500">
              Variation
            </span>
            {isPositive ? (
              <ArrowUpRight className="h-4 w-4 text-emerald-400" />
            ) : isNegative ? (
              <ArrowDownRight className="h-4 w-4 text-rose-400" />
            ) : (
              <TrendingUp className="h-4 w-4 text-zinc-500" />
            )}
          </div>
          <span className={`mt-5 text-2xl font-black tabular-nums ${isPositive ? "text-emerald-400" : isNegative ? "text-rose-400" : "text-white"}`}>
            {isPositive ? "+" : ""}{safeVariation.toFixed(2)} %
          </span>
        </div>
        <Metric label="Plus bas suivi" value={formatEuro(lowest)} />
        <Metric label="Plus haut suivi" value={formatEuro(highest)} />
      </div>

      <div className="rounded-2xl border border-cyan-400/12 bg-cyan-400/[0.035] p-4">
        <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.16em] text-cyan-300">
          <Gauge className="h-4 w-4" />
          Lecture d’opportunité King_TCG
        </div>
        <p className="mt-2 text-xs font-medium leading-5 text-zinc-300">
          {opportunity || "Analyse des volumes et écarts de marché en cours…"}
        </p>
      </div>
    </div>
  );
}

function Metric({ label, value, prominent = false }: { label: string; value: string; prominent?: boolean }) {
  return (
    <div className={`kt-market-metric ${prominent ? "border-cyan-400/12 bg-cyan-400/[0.025]" : ""}`}>
      <span className="text-[9px] font-black uppercase tracking-[0.15em] text-zinc-500">
        {label}
      </span>
      <span className={`${prominent ? "text-2xl" : "text-lg"} mt-5 font-black text-white tabular-nums`}>
        {value}
      </span>
    </div>
  );
}
