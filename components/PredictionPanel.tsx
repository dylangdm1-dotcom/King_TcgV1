// components/PredictionPanel.tsx

"use client";

import { Cpu } from "lucide-react";

type Props = {
  predictedPrice30d?: number;
  roi30d?: number;
  confidence?: number;
};

export default function PredictionPanel({
  predictedPrice30d = 0,
  roi30d = 0,
  confidence = 0,
}: Props) {
  /**
   * V5.0
   * --------------------------------------------------
   * Les valeurs affichées proviennent du predictionEngine.
   * Le composant ne génère aucune estimation artificielle.
   */

  const safePrice =
    Number.isFinite(predictedPrice30d) && predictedPrice30d > 0
      ? predictedPrice30d
      : 0;

  const safeRoi =
    Number.isFinite(roi30d)
      ? roi30d
      : 0;

  const safeConfidence = Math.min(
    100,
    Math.max(
      0,
      Number.isFinite(confidence) ? confidence : 0
    )
  );

  const hasPrediction = safePrice > 0;

  const confidenceColor =
    safeConfidence >= 75
      ? "text-cyan-400"
      : safeConfidence >= 45
        ? "text-zinc-300"
        : "text-zinc-500";

  const formatPrice = (value: number) => {
    if (!Number.isFinite(value) || value <= 0) {
      return "--";
    }

    return `${value.toFixed(2)} €`;
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div>
        <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-zinc-400">
          <Cpu className="h-4 w-4 text-cyan-400" />
          Projections algorithmiques à 30 jours
        </h2>

        <p className="mt-1 text-[10px] font-medium text-zinc-600">
          Projection calculée à partir des données historiques disponibles.
        </p>
      </div>

      {/* Métriques */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Prix estimé */}
        <div className="glass-card flex min-h-[95px] flex-col justify-between rounded-xl bg-neutral-950/40 p-4">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
            Prix estimé
          </span>

          <span className="mt-3 text-lg font-black tabular-nums text-white">
            {formatPrice(safePrice)}
          </span>
        </div>

        {/* ROI potentiel */}
        <div className="glass-card flex min-h-[95px] flex-col justify-between rounded-xl bg-neutral-950/40 p-4">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
            ROI potentiel
          </span>

          <span
            className={`mt-3 text-lg font-black tabular-nums ${
              safeRoi > 0
                ? "text-emerald-400"
                : safeRoi < 0
                  ? "text-rose-400"
                  : "text-zinc-400"
            }`}
          >
            {safeRoi > 0 ? "+" : ""}
            {safeRoi.toFixed(2)} %
          </span>
        </div>

        {/* Confiance */}
        <div className="glass-card flex min-h-[95px] flex-col justify-between rounded-xl bg-neutral-950/40 p-4">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
            Indice de confiance
          </span>

          <span
            className={`mt-3 text-lg font-black tabular-nums ${confidenceColor}`}
          >
            {hasPrediction
              ? `${safeConfidence.toFixed(0)} %`
              : "--"}
          </span>
        </div>
      </div>

      {/* Information lorsque la prédiction n'est pas disponible */}
      {!hasPrediction && (
        <div className="rounded-xl border border-zinc-900 bg-neutral-950/30 p-3">
          <p className="text-[10px] font-medium leading-relaxed text-zinc-600">
            Projection indisponible : l'historique de prix actuel
            ne contient pas encore suffisamment de données exploitables.
          </p>
        </div>
      )}
    </div>
  );
}
