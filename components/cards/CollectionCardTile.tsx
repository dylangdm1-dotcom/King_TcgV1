"use client";

import Link from "next/link";
import type { PokemonCard } from "@/lib/types";
import { calculateRealMarketPrices } from "@/lib/priceTracker";
import { getAdjustedPriceByCondition } from "@/lib/marketEngine";
import { getCondition } from "@/lib/storage";

export default function CollectionCardTile({ card, quantity }: { card: PokemonCard; quantity?: number }) {
  const market = calculateRealMarketPrices(card);
  const price = getAdjustedPriceByCondition(market.average ?? 0, getCondition(card.id));

  return (
    <Link href={`/card/${card.id}`} className="kt-premium-panel kt-premium-card-lift group min-w-0 overflow-hidden rounded-[18px] p-2 sm:p-3">
      <div className="relative aspect-[0.72] overflow-hidden rounded-[13px] border border-white/[0.08] bg-black/30">
        <img
          src={card.images?.small || card.images?.large}
          alt={card.name}
          className="h-full w-full object-contain transition duration-300 group-hover:scale-[1.025]"
          loading="lazy"
          onError={(event) => { event.currentTarget.style.opacity = "0"; }}
        />
        {quantity && quantity > 1 ? (
          <span className="absolute right-1.5 top-1.5 rounded-full border border-cyan-300/25 bg-black/80 px-1.5 py-0.5 text-[8px] font-black text-cyan-300 backdrop-blur-md">x{quantity}</span>
        ) : null}
      </div>
      <div className="min-w-0 px-0.5 pb-0.5 pt-2">
        <p className="truncate text-[9px] font-black text-white sm:text-[11px]">{card.name}</p>
        <p className="mt-0.5 truncate text-[7px] font-bold uppercase tracking-wide text-zinc-500 sm:text-[8px]">{card.set?.name || "Extension inconnue"}</p>
        <p className="mt-1 text-[10px] font-black tabular-nums text-cyan-300 sm:text-xs">{price > 0 ? `${price.toFixed(2)} €` : "—"}</p>
      </div>
    </Link>
  );
}
