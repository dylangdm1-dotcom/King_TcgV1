"use client";

import {
  Award,
  Layers,
  Flame,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";

type Trend = "up" | "down" | "stable";

type Props = {
  image: string;
  name: string;
  set: string;
  rarity?: string;
  /**
   * Prix V5 déjà calculé par le moteur de prix.
   * Aucun coefficient n'est appliqué ici.
   */
  price?: number;
  score?: number;
  trend?: Trend;
  recommendation?: string;
};

function getSafeNumber(
  value: number | undefined,
  fallback = 0
): number {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : fallback;
}

export default function CardHero({
  image,
  name,
  set,
  rarity,
  price = 0,
  score = 0,
  trend = "stable",
  recommendation = "",
}: Props) {
  const safePrice = getSafeNumber(price);
  const safeScore = getSafeNumber(score);

  const hasMetrics =
    safePrice > 0 || safeScore > 0;

  const displayRarity =
    rarity?.trim() || "Série Standard";

  const displayTrend =
    trend === "up"
      ? {
          label: "Hausse",
          icon: TrendingUp,
          className: "text-emerald-400",
        }
      : trend === "down"
        ? {
            label: "Baisse",
            icon: TrendingDown,
            className: "text-rose-400",
          }
        : {
            label: "Stable",
            icon: Minus,
            className: "text-zinc-400",
          };

  const TrendIcon = displayTrend.icon;

  return (
    <div className="relative flex flex-col items-center gap-6 p-2 md:flex-row lg:gap-10">
      {/* Image Pokémon */}
      <div className="group relative shrink-0">
        <div className="rounded-2xl border border-zinc-900 bg-neutral-900/40 p-3 shadow-xl transition-all duration-300 hover:border-zinc-800">
          <img
            src={image}
            alt={name}
            loading="eager"
            decoding="async"
            className="w-[220px] rounded-xl object-cover transition-transform duration-500 group-hover:scale-[1.01] sm:w-[260px] md:w-[280px]"
          />
        </div>
      </div>

      {/* Informations carte */}
      <div className="min-w-[280px] w-full flex-1 space-y-5">
        <div>
          <span className="mb-2.5 inline-flex items-center gap-1.5 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.25em] text-cyan-400">
            King_TCG Assets Intelligence
          </span>

          <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl md:text-4xl">
            {name}
          </h1>

          {/* Identification */}
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="flex items-center gap-1.5 rounded-xl border border-zinc-900 bg-neutral-900/40 px-3 py-1.5 text-xs font-bold text-zinc-300 shadow-md">
              <Layers className="h-3.5 w-3.5 text-cyan-400" />
              {set}
            </span>

            <span className="flex items-center gap-1.5 rounded-xl border border-zinc-900 bg-neutral-900/40 px-3 py-1.5 text-xs font-bold text-zinc-300 shadow-md">
              <Award className="h-3.5 w-3.5 text-cyan-400" />
              {displayRarity}
            </span>
          </div>
        </div>

        {/* Métriques V5 */}
        {hasMetrics && (
          <div className="grid grid-cols-3 gap-3 border-t border-zinc-900 pt-3">
            {/* Prix actuel */}
            <div className="flex min-h-[85px] flex-col justify-between rounded-2xl border border-zinc-900 bg-neutral-900/40 p-3.5 shadow-xl">
              <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500">
                Valeur
              </span>

              <span className="text-base font-black tabular-nums text-white">
                {safePrice > 0
                  ? `${safePrice.toFixed(2)} €`
                  : "—"}
              </span>
            </div>

            {/* Score */}
            <div className="flex min-h-[85px] flex-col justify-between rounded-2xl border border-zinc-900 bg-neutral-900/40 p-3.5 shadow-xl">
              <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500">
                Score IA
              </span>

              <div className="flex items-baseline gap-1">
                <span className="text-base font-black tabular-nums text-white">
                  {safeScore}
                </span>

                <span className="text-[10px] font-bold text-zinc-500">
                  /10
                </span>
              </div>
            </div>

            {/* Tendance */}
            <div className="flex min-h-[85px] flex-col justify-between rounded-2xl border border-zinc-900 bg-neutral-900/40 p-3.5 shadow-xl">
              <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500">
                Tendance
              </span>

              <div>
                <span
                  className={`flex items-center gap-1 text-xs font-bold ${displayTrend.className}`}
                >
                  <TrendIcon className="h-3.5 w-3.5" />
                  {displayTrend.label}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Recommandation */}
        {recommendation.trim() && (
          <div className="space-y-1.5 rounded-2xl border border-zinc-900 bg-neutral-900/40 p-4 shadow-xl">
            <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-cyan-400">
              <Flame className="h-3.5 w-3.5" />
              Analyse de cotation
            </span>

            <p className="text-xs font-medium leading-relaxed text-zinc-300">
              {recommendation}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}