"use client";

import React, { useEffect, useState } from "react";
import type { PokemonCard } from "@/lib/types";
import {
  getCollection,
  addToCollection,
  removeFromCollection,
  getFavorites,
  toggleFavorite,
} from "@/lib/storage";
import { Heart, Plus, Minus, Layers } from "lucide-react";
import Link from "next/link";

interface CardGridProps {
  cards: PokemonCard[];
}

export default function CardGrid({ cards }: CardGridProps) {
  const [collection, setCollection] = useState<Record<string, number>>({});
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    const syncStorage = () => {
      const rawCollection = getCollection();
      const cleanCollection: Record<string, number> = {};
      Object.keys(rawCollection).forEach((id) => {
        const entry = rawCollection[id] as any;
        cleanCollection[id] = typeof entry === "number" ? entry : (entry?.quantity || 1);
      });
      setCollection(cleanCollection);
      setFavorites(getFavorites());
    };

    syncStorage();

    window.addEventListener("king_tcg_update", syncStorage);

    return () => {
      window.removeEventListener("king_tcg_update", syncStorage);
    };
  }, []);

  const handleQuantityChange = (
    cardId: string,
    currentQty: number,
    delta: number
  ) => {
    let rawUpdated: any;
    if (delta > 0) {
      rawUpdated = addToCollection(cardId);
    } else if (currentQty > 0) {
      rawUpdated = removeFromCollection(cardId);
    } else {
      return;
    }

    const cleanCollection: Record<string, number> = {};
    Object.keys(rawUpdated).forEach((id) => {
      const entry = rawUpdated[id] as any;
      cleanCollection[id] = typeof entry === "number" ? entry : (entry?.quantity || 1);
    });

    setCollection(cleanCollection);
    setFavorites(getFavorites());
  };

  const handleFavorite = (cardId: string) => {
    toggleFavorite(cardId);
    setFavorites(getFavorites());
  };

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {cards.map((card) => {
        const qty = collection[card.id] || 0;
        const isFav = favorites.includes(card.id);

        const price =
          card.cardmarket?.prices?.trendPrice ??
          card.tcgplayer?.prices?.holofoil?.market ??
          0;

        return (
          <div
            key={card.id}
            className="kt-premium-panel kt-premium-card-lift group relative flex flex-col justify-between overflow-hidden rounded-[20px] p-2.5 sm:p-3"
          >
            {/* Bouton Favori */}
            <button
              onClick={() => handleFavorite(card.id)}
              className="absolute right-4 top-4 z-10 rounded-xl border border-white/10 bg-black/70 p-2 text-zinc-400 backdrop-blur-xl transition-all duration-200 hover:border-cyan-400/30 hover:text-cyan-300 active:scale-95 cursor-pointer shadow-lg"
            >
              <Heart
                className={`h-3.5 w-3.5 transition-colors ${
                  isFav ? "fill-cyan-400 text-cyan-400" : ""
                }`}
              />
            </button>

            <Link href={`/card/${card.id}`} className="block space-y-2.5">
              <div className="relative flex aspect-[3/4] items-center justify-center overflow-hidden rounded-2xl border border-white/[0.06] bg-black/35 shadow-inner">
                <img
                  src={card.images.small}
                  alt={card.name}
                  className="h-full w-full object-contain p-1 transition-transform duration-500 group-hover:scale-[1.035]"
                  loading="lazy"
                />

                {qty > 0 && (
                  <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1 rounded-lg border border-cyan-500/20 bg-cyan-500/10 px-2 py-1 text-[10px] font-black text-cyan-400 backdrop-blur-md shadow-md">
                    <Layers className="h-3 w-3" />
                    x{qty}
                  </div>
                )}
              </div>

              <div>
                <h3 className="line-clamp-2 min-h-[34px] text-xs font-black leading-4 text-white transition-colors group-hover:text-cyan-300">
                  {card.name}
                </h3>

                <p className="truncate text-[11px] font-medium text-zinc-500">
                  {card.set.name} • {card.number}
                </p>
              </div>
            </Link>

            <div className="mt-3 space-y-2.5 border-t border-white/[0.06] pt-2.5">
              <div className="flex items-center justify-between px-0.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                  Marché
                </span>

                <span className="tabular-nums text-xs font-black text-white">
                  {price > 0 ? `${price.toFixed(2)} €` : "—"}
                </span>
              </div>

              <div className="flex items-center gap-1 rounded-xl border border-zinc-900 bg-neutral-950/40 p-1 shadow-inner">
                <button
                  onClick={() =>
                    handleQuantityChange(card.id, qty, -1)
                  }
                  disabled={qty === 0}
                  className="flex flex-1 justify-center rounded-lg bg-neutral-900/40 p-1.5 text-zinc-500 transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-20 cursor-pointer"
                >
                  <Minus className="h-3 w-3" />
                </button>

                <span className="min-w-[20px] text-center text-xs font-bold tabular-nums text-zinc-300">
                  {qty}
                </span>

                <button
                  onClick={() =>
                    handleQuantityChange(card.id, qty, 1)
                  }
                  className="flex flex-1 justify-center rounded-lg bg-neutral-900/40 p-1.5 text-zinc-500 transition-colors hover:text-cyan-400 cursor-pointer"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}