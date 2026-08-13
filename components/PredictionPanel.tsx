"use client";

import { Cpu, ShieldCheck, TrendingUp } from "lucide-react";

type Props = { predictedPrice30d: number; roi30d: number; confidence: number };

export default function PredictionPanel({ predictedPrice30d = 0, roi30d = 0, confidence = 0 }: Props) {
  predictedPrice30d = Number.isFinite(Number(predictedPrice30d)) ? Number(predictedPrice30d) : 0;
  roi30d = Number.isFinite(Number(roi30d)) ? Number(roi30d) : 0;
  confidence = Number.isFinite(Number(confidence)) ? Number(confidence) : 0;
  const confidenceTone = confidence >= 75 ? "text-emerald-200" : confidence >= 45 ? "text-amber-200" : "text-zinc-100";
  const confidenceWidth = Math.max(0, Math.min(100, confidence));

  return (
    <div className="space-y-2.5">
      <div>
        <div className="kt-section-label">
          <Cpu className="h-4 w-4 text-violet-300" />
          Projection à 30 jours
        </div>
        <p className="mt-1 text-[10px] font-medium leading-4 text-zinc-100">
          Estimation indicative issue des données disponibles. Elle ne garantit pas une valeur future.
        </p>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1.35fr_.65fr]">
        <div className="relative overflow-hidden rounded-[17px] border border-violet-300/15 bg-[linear-gradient(135deg,rgba(139,92,246,.13),rgba(21,29,39,.97)_52%)] p-3.5">
          <div className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-violet-300/10 blur-3xl" />
          <p className="relative text-[10px] font-black uppercase tracking-[0.18em] text-violet-200/70">Estimation centrale</p>
          <div className="relative mt-1.5 flex items-end gap-2">
            <span className="text-2xl font-black tracking-[-0.05em] text-white tabular-nums sm:text-3xl">{predictedPrice30d.toFixed(2)}</span>
            <span className="pb-1 text-lg font-black text-violet-200">€</span>
          </div>
          <div className="relative mt-2.5 flex items-center justify-between gap-4 border-t border-white/[0.07] pt-2.5">
            <span className="text-[10px] font-medium text-zinc-100">Potentiel estimé</span>
            <span className={`text-lg font-black tabular-nums ${roi30d >= 0 ? "text-emerald-200" : "text-rose-300"}`}>{roi30d >= 0 ? "+" : ""}{roi30d.toFixed(2)} %</span>
          </div>
        </div>

        <div className="rounded-[17px] border border-white/[0.09] bg-[#1a222c] p-3.5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-200" />
            <span className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-200">Confiance du modèle</span>
          </div>
          <p className={`mt-2 text-2xl font-black tabular-nums ${confidenceTone}`}>{confidence.toFixed(0)} %</p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.045] ring-1 ring-white/[0.04]">
            <div className="h-full rounded-full bg-gradient-to-r from-violet-300 via-cyan-200 to-emerald-200 transition-[width] duration-700" style={{ width: `${confidenceWidth}%` }} />
          </div>
          <div className="mt-2 flex items-center gap-2 text-[10px] text-zinc-200">
            <TrendingUp className="h-3.5 w-3.5" />
            Données, tendance et score stratégique combinés.
          </div>
        </div>
      </div>
    </div>
  );
}
