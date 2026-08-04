"use client";

import Link from "next/link";
import { getMarketData } from "../../lib/marketEngine";
import { getInvestmentScore, getTrend } from "../../lib/investment";
import type { PokemonCard } from "../../lib/types";
import type { PricePoint } from "../../lib/priceHistory";

type Props = {
  card: PokemonCard & {
    qty: number;
    history: PricePoint[];
  };
};

export default function CollectionCard({ card }: Props) {
  const market = getMarketData(card);
  const trend = getTrend(card.history);
  const score = getInvestmentScore(card, card.history);

  return (
    <Link href={`/card/${card.id}`} className="group block">
      <div className="relative overflow-hidden rounded-xl border border-zinc-900 bg-neutral-950/40 p-4 transition-all duration-200 hover:border-cyan-500/20 hover:bg-neutral-950/60">
        
        {/* Conteneur Image Épuré avec Badge de Volume */}
        <div className="relative overflow-hidden rounded-lg bg-neutral-950 border border-zinc-900/50 aspect-[4/3] flex items-center justify-center p-3">
          <img
            src={card.images.small}
            alt={card.name}
            loading="lazy"
            className="h-full object-contain transition-transform duration-300 ease-out group-hover:scale-[1.02]"
          />
          <span className="absolute bottom-2 right-2 rounded bg-neutral-950/90 border border-zinc-900 px-2 py-0.5 text-[11px] font-black tracking-tight text-zinc-300 tabular-nums">
            x{card.qty}
          </span>
        </div>

        {/* Titre & Set */}
        <div className="mt-3">
          <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">{card.set.name}</span>
          <h3 className="line-clamp-1 text-xs font-bold text-white tracking-tight group-hover:text-cyan-400 transition-colors mt-0.5">
            {card.name}
          </h3>
        </div>

        {/* Indicateurs financiers & Index TCG */}
        <div className="mt-3 space-y-2 border-t border-zinc-900/80 pt-2.5 text-[11px]">
          <div className="flex justify-between items-center">
            <span className="font-medium text-zinc-500">Valeur Unitaire</span>
            <span className="font-bold text-zinc-300 tabular-nums">{market.average.toFixed(2)} €</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="font-medium text-zinc-500">Tendance</span>
            <span className={`font-black uppercase text-[9px] tracking-wider ${
              trend === "up" ? "text-emerald-400" : trend === "down" ? "text-rose-400" : "text-zinc-400"
            }`}>
              {trend === "up" ? "Hausse" : trend === "down" ? "Baisse" : "Stable"}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="font-medium text-zinc-500">Score Stratégique</span>
            <span className="font-black text-cyan-400 bg-cyan-500/5 px-1.5 py-0.5 rounded border border-cyan-500/10 text-[10px] tabular-nums">
              {score}/10
            </span>
          </div>

          <div className="flex justify-between items-center border-t border-zinc-900 pt-2 mt-1">
            <span className="text-[9px] font-black uppercase tracking-wider text-zinc-600">Allocation totale</span>
            <span className="font-black text-white tabular-nums">
              {(market.average * card.qty).toFixed(2)} €
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}