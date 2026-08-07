"use client";

import { Cpu, ShieldCheck, TrendingUp } from "lucide-react";

type Props = { predictedPrice30d: number; roi30d: number; confidence: number };

export default function PredictionPanel({ predictedPrice30d = 0, roi30d = 0, confidence = 0 }: Props) {
  const confidenceTone = confidence >= 75 ? "text-emerald-200" : confidence >= 45 ? "text-amber-200" : "text-zinc-400";
  const confidenceWidth = Math.max(0, Math.min(100, confidence));

  return (
    <div className="space-y-5">
      <div>
        <div className="kt-section-label">
          <Cpu className="h-4 w-4 text-violet-300" />
          Projection à 30 jours
        </div>
        <p className="mt-2 text-[11px] font-medium leading-5 text-zinc-400">
          Estimation indicative issue des données disponibles. Elle ne garantit pas une valeur future.
        </p>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1.35fr_.65fr]">
        <div className="relative overflow-hidden rounded-[22px] border border-violet-300/15 bg-[linear-gradient(135deg,rgba(139,92,246,.13),rgba(21,29,39,.97)_52%)] p-6">
          <div className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-violet-300/10 blur-3xl" />
          <p className="relative text-[9px] font-black uppercase tracking-[0.18em] text-violet-200/70">Estimation centrale</p>
          <div className="relative mt-3 flex items-end gap-2">
            <span className="text-4xl font-black tracking-[-0.05em] text-white tabular-nums sm:text-5xl">{predictedPrice30d.toFixed(2)}</span>
            <span className="pb-1 text-lg font-black text-violet-200">€</span>
          </div>
          <div className="relative mt-5 flex items-center justify-between gap-4 border-t border-white/[0.07] pt-4">
            <span className="text-[10px] font-medium text-zinc-400">Potentiel estimé</span>
            <span className={`text-lg font-black tabular-nums ${roi30d >= 0 ? "text-emerald-200" : "text-rose-300"}`}>{roi30d >= 0 ? "+" : ""}{roi30d.toFixed(2)} %</span>
          </div>
        </div>

        <div className="rounded-[22px] border border-white/[0.09] bg-[#1a222c] p-5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-200" />
            <span className="text-[9px] font-black uppercase tracking-[0.15em] text-zinc-500">Confiance du modèle</span>
          </div>
          <p className={`mt-4 text-3xl font-black tabular-nums ${confidenceTone}`}>{confidence.toFixed(0)} %</p>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-black/30 ring-1 ring-white/[0.04]">
            <div className="h-full rounded-full bg-gradient-to-r from-violet-300 via-cyan-200 to-emerald-200 transition-[width] duration-700" style={{ width: `${confidenceWidth}%` }} />
          </div>
          <div className="mt-4 flex items-center gap-2 text-[10px] text-zinc-500">
            <TrendingUp className="h-3.5 w-3.5" />
            Données, tendance et score stratégique combinés.
          </div>
        </div>
      </div>
    </div>
  );
}
