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

      {/* Grille de métriques */}
      <div className="grid gap-4 grid-cols-3">
        {/* Prix Estimé */}
        <div className="glass-card bg-neutral-950/40 rounded-xl p-4 flex flex-col justify-between min-h-[95px]">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Prix estimé</span>
          <span className="text-lg font-black text-white mt-3 tabular-nums">
            {predictedPrice30d.toFixed(2)} €
          </span>
        </div>

        {/* ROI Potentiel */}
        <div className="glass-card bg-neutral-950/40 rounded-xl p-4 flex flex-col justify-between min-h-[95px]">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">ROI potentiel</span>
          <span className={`text-lg font-black mt-3 tabular-nums ${roi30d >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
            {roi30d >= 0 ? "+" : ""}
            {roi30d.toFixed(2)} %
          </span>
        </div>

        {/* Indice de Confiance */}
        <div className="glass-card bg-neutral-950/40 rounded-xl p-4 flex flex-col justify-between min-h-[95px]">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Indice de confiance</span>
          <span className={`text-lg font-black mt-3 tabular-nums ${confidenceColor}`}>
            {confidence} %
          </span>
        </div>
      </div>
    </div>
  );
}