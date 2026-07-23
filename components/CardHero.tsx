"use client";

import { Award, Layers, Flame, TrendingUp, TrendingDown, Minus } from "lucide-react";

type Props = {
  image: string;
  name: string;
  set: string;
  rarity?: string;
  price?: number;
  score?: number;
  trend?: "up" | "down" | "stable";
  recommendation?: string;
};

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
  return (
    <div className="relative flex flex-col md:flex-row items-center gap-8 lg:gap-12 p-2">
      
      {/* Conteneur Image Pokémon épuré */}
      <div className="relative flex-shrink-0 group">
        <div className="rounded-2xl border border-zinc-900 bg-neutral-950 p-3 shadow-2xl transition-all duration-300 hover:border-zinc-800">
          <img
            src={image}
            alt={name}
            className="w-[240px] sm:w-[280px] md:w-[300px] rounded-xl object-cover transition-transform duration-500 group-hover:scale-[1.01]"
          />
        </div>
      </div>

      {/* Métadonnées et statistiques de la carte */}
      <div className="flex-1 min-w-[300px] w-full space-y-6">
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.25em] text-cyan-400 block mb-1">
            King_TCG Assets Intelligence
          </span>
          <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl md:text-5xl">
            {name}
          </h1>
          
          {/* Badges d'identification */}
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-lg border border-zinc-900 bg-neutral-900/40 px-2.5 py-1 text-[11px] font-bold text-zinc-300 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-cyan-400" /> {set}
            </span>
            <span className="rounded-lg border border-zinc-900 bg-neutral-900/40 px-2.5 py-1 text-[11px] font-bold text-zinc-300 flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-cyan-400" /> {rarity || "Série Standard"}
            </span>
          </div>
        </div>

        {/* Métriques Clés optionnelles (rendu uniquement si utilisées) */}
        {price > 0 || score > 0 ? (
          <div className="grid gap-4 grid-cols-3 pt-2 border-t border-zinc-900">
            <div className="glass-card bg-neutral-950/40 rounded-xl p-3 flex flex-col justify-between min-h-[75px]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Valeur</span>
              <span className="text-base font-black text-white tabular-nums">{price.toFixed(2)} €</span>
            </div>

            <div className="glass-card bg-neutral-950/40 rounded-xl p-3 flex flex-col justify-between min-h-[75px]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Score IA</span>
              <span className="text-base font-black text-white">{score}/10</span>
            </div>

            <div className="glass-card bg-neutral-950/40 rounded-xl p-3 flex flex-col justify-between min-h-[75px]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Tendance</span>
              <div className="mt-1">
                {trend === "up" ? (
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5" /> Hausse</span>
                ) : trend === "down" ? (
                  <span className="text-xs font-bold text-rose-400 flex items-center gap-1"><TrendingDown className="w-3.5 h-3.5" /> Baisse</span>
                ) : (
                  <span className="text-xs font-bold text-zinc-400 flex items-center gap-1"><Minus className="w-3.5 h-3.5" /> Stable</span>
                )}
              </div>
            </div>
          </div>
        ) : null}

        {/* Bloc Recommandation Algorithmique King_TCG */}
        {recommendation && (
          <div className="glass-card border-zinc-900 bg-neutral-950/20 rounded-xl p-4 space-y-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5" /> Analyse de cotation
            </span>
            <p className="text-xs font-medium text-zinc-300 leading-relaxed">
              {recommendation}
            </p>
          </div>
        )}

      </div>
    </div>
  );
}