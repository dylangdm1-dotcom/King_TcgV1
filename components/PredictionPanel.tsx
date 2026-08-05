"use client";

import { Cpu } from "lucide-react";

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
  // Adaptation de la confiance pour rester discret sans couleurs agressives
  const confidenceColor = 
    confidence >= 75 
      ? "text-cyan-400" 
      : confidence >= 45 
        ? "text-zinc-300" 
        : "text-zinc-500";

  return (
    <div className="space-y-6">
      {/* En-tête épuré */}
      <div>
        <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-2">
          <Cpu className="w-4 h-4 text-cyan-400" /> Projections algorithmiques à 30 jours
        </h2>
      </div>

      {/* Métriques */}
      <div className="space-y-3">
        {/* Prix estimé — valeur principale centrée */}
        <div className="glass-card rounded-2xl border border-cyan-400/10 bg-cyan-400/[0.035] p-5 text-center">
          <span className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">
            Prix estimé à 30 jours
          </span>
          <div className="mt-2 flex items-baseline justify-center gap-1">
            <span className="text-3xl font-black tracking-tight text-white tabular-nums sm:text-4xl">
              {predictedPrice30d.toFixed(2)}
            </span>
            <span className="text-base font-bold text-cyan-400">€</span>
          </div>
          <p className="mt-1 text-[10px] font-medium text-zinc-600">
            Projection algorithmique
          </p>
        </div>

        {/* ROI + confiance */}
        <div className="grid grid-cols-2 gap-3">
          <div className="glass-card rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4 text-center">
            <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500">
              ROI potentiel
            </span>
            <span className={`mt-2 block text-xl font-black tabular-nums ${roi30d >= 0 ? "text-cyan-400" : "text-zinc-300"}`}>
              {roi30d >= 0 ? "+" : ""}
              {roi30d.toFixed(2)} %
            </span>
          </div>

          <div className="glass-card rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4 text-center">
            <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500">
              Confiance
            </span>
            <span className={`mt-2 block text-xl font-black tabular-nums ${confidenceColor}`}>
              {confidence} %
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}