"use client";

import { Cpu, ShieldCheck, TrendingUp } from "lucide-react";

type Props = {
  predictedPrice30d: number;
  roi30d: number;
  confidence: number;
};

export default function PredictionPanel({
  predictedPrice30d = 0,
  roi30d = 0,
  confidence = 0,
}: Props) {
  const confidenceColor =
    confidence >= 75
      ? "text-cyan-300"
      : confidence >= 45
      ? "text-zinc-200"
      : "text-zinc-500";

  return (
    <div className="space-y-5">
      <div>
        <div className="kt-section-label">
          <Cpu className="h-4 w-4 text-cyan-400" />
          Projection algorithmique à 30 jours
        </div>
        <p className="mt-2 text-[11px] font-medium leading-5 text-zinc-500">
          Estimation indicative calculée à partir des données actuellement disponibles. Elle ne constitue pas une garantie de prix futur.
        </p>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1.35fr_.65fr]">
        <div className="relative overflow-hidden rounded-3xl border border-cyan-400/14 bg-cyan-400/[0.035] p-6 text-center">
          <div className="pointer-events-none absolute inset-x-8 top-0 h-24 rounded-full bg-cyan-400/[0.08] blur-3xl" />
          <span className="relative text-[9px] font-black uppercase tracking-[0.18em] text-zinc-500">
            Estimation centrale
          </span>
          <div className="relative mt-3 flex items-baseline justify-center gap-1.5">
            <span className="text-4xl font-black tracking-[-0.045em] text-white tabular-nums sm:text-5xl">
              {predictedPrice30d.toFixed(2)}
            </span>
            <span className="text-lg font-black text-cyan-300">€</span>
          </div>
          <p className="relative mt-2 text-[10px] font-medium text-zinc-500">
            Projection King_TCG sur 30 jours
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
          <div className="kt-market-metric text-center lg:text-left">
            <div className="flex items-center justify-center gap-2 lg:justify-start">
              <TrendingUp className="h-4 w-4 text-cyan-400" />
              <span className="text-[9px] font-black uppercase tracking-[0.15em] text-zinc-500">ROI potentiel</span>
            </div>
            <span className={`mt-4 block text-2xl font-black tabular-nums ${roi30d >= 0 ? "text-cyan-300" : "text-rose-400"}`}>
              {roi30d >= 0 ? "+" : ""}{roi30d.toFixed(2)} %
            </span>
          </div>

          <div className="kt-market-metric text-center lg:text-left">
            <div className="flex items-center justify-center gap-2 lg:justify-start">
              <ShieldCheck className="h-4 w-4 text-cyan-400" />
              <span className="text-[9px] font-black uppercase tracking-[0.15em] text-zinc-500">Confiance</span>
            </div>
            <span className={`mt-4 block text-2xl font-black tabular-nums ${confidenceColor}`}>
              {confidence} %
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
