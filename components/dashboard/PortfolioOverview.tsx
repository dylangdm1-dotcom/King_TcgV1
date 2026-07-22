"use client";

import { useEffect, useState } from "react";
import { BarChart3 } from "lucide-react";
import { getCollection, getBuyPrice } from "../../lib/storage";
import { getMarketData } from "../../lib/marketEngine";
import type { PokemonCard } from "../../lib/types";

type Props = {
  cards: PokemonCard[];
};

export default function PortfolioOverview({ cards }: Props) {
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    const update = () => setRefresh(v => v + 1);
    window.addEventListener("king_tcg_update", update);
    return () => window.removeEventListener("king_tcg_update", update);
  }, []);

  const collection = getCollection();
  const ownedCards = cards.filter((card) => collection[card.id]);

  const totalCards = Object.values(collection).reduce((sum, qty) => sum + qty, 0);
  const uniqueCards = ownedCards.length;

  let invested = 0;
  let value = 0;

  ownedCards.forEach((card) => {
    const qty = collection[card.id];
    const buy = getBuyPrice(card.id);
    const market = getMarketData(card);

    invested += buy * qty;
    value += market.average * qty;
  });

  const profit = value - invested;
  const roi = invested > 0 ? (profit / invested) * 100 : 0;
  const isPositive = profit >= 0;

  let bestCard: PokemonCard | null = null;
  let bestProfit = -Infinity;

  ownedCards.forEach((card) => {
    const qty = collection[card.id];
    const buy = getBuyPrice(card.id);
    const market = getMarketData(card);
    const cardProfit = (market.average - buy) * qty;

    if (cardProfit > bestProfit) {
      bestProfit = cardProfit;
      bestCard = card;
    }
  });

  return (
    <section className="rounded-xl border border-zinc-900 bg-neutral-950/40 p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-5">
        <BarChart3 className="w-4 h-4 text-cyan-400" />
        <h2 className="text-xs font-black uppercase tracking-widest text-zinc-400">
          Index Allocation King_TCG
        </h2>
      </div>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-6">
        <div className="rounded-lg border border-zinc-900 bg-neutral-950/60 p-3">
          <p className="text-[10px] font-black uppercase tracking-wider text-zinc-500">Volume global</p>
          <p className="mt-1 text-base font-black text-white tabular-nums">{totalCards}</p>
        </div>

        <div className="rounded-lg border border-zinc-900 bg-neutral-950/60 p-3">
          <p className="text-[10px] font-black uppercase tracking-wider text-zinc-500">Réf. uniques</p>
          <p className="mt-1 text-base font-black text-white tabular-nums">{uniqueCards}</p>
        </div>

        <div className="rounded-lg border border-zinc-900 bg-neutral-950/60 p-3">
          <p className="text-[10px] font-black uppercase tracking-wider text-zinc-500">Cap. engagé</p>
          <p className="mt-1 text-base font-black text-zinc-300 tabular-nums">{invested.toFixed(2)} €</p>
        </div>

        <div className="rounded-lg border border-zinc-900 bg-neutral-950/60 p-3">
          <p className="text-[10px] font-black uppercase tracking-wider text-zinc-500">Valeur Actuelle</p>
          <p className="mt-1 text-base font-black text-cyan-400 tabular-nums">{value.toFixed(2)} €</p>
        </div>

        <div className="rounded-lg border border-zinc-900 bg-neutral-950/60 p-3">
          <p className="text-[10px] font-black uppercase tracking-wider text-zinc-500">Rendement net</p>
          <p className={`mt-1 text-base font-black tabular-nums ${isPositive ? "text-emerald-400" : "text-rose-400"}`}>
            {isPositive ? "+" : ""}{profit.toFixed(2)} €
          </p>
        </div>

        <div className="rounded-lg border border-zinc-900 bg-neutral-950/60 p-3">
          <p className="text-[10px] font-black uppercase tracking-wider text-zinc-500">Performance</p>
          <p className={`mt-1 text-base font-black tabular-nums ${roi >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
            {roi >= 0 ? "+" : ""}{roi.toFixed(2)} %
          </p>
        </div>
      </div>

      {bestCard && (
        <div className="mt-4 rounded-lg border border-zinc-900 bg-neutral-950/60 p-3 flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-[9px] font-black uppercase tracking-wider text-zinc-500">
              Actif le plus performant
            </p>
            <p className="text-xs font-bold text-white tracking-tight truncate mt-0.5">
              {bestCard.name}
            </p>
          </div>
          <span className="ml-3 text-[10px] font-black px-2 py-0.5 bg-cyan-500/5 text-cyan-400 border border-cyan-500/10 rounded tabular-nums">
            +{bestProfit.toFixed(2)} € net
          </span>
        </div>
      )}
    </section>
  );
}