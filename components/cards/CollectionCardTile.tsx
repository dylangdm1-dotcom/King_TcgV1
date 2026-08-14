"use client";

import Link from "next/link";
import { Hash } from "lucide-react";
import type { PokemonCard } from "@/lib/types";
import { calculateRealMarketPrices } from "@/lib/priceTracker";
import { getAdjustedPriceByCondition } from "@/lib/marketEngine";
import { getCondition } from "@/lib/storage";

export default function CollectionCardTile({
  card,
  quantity,
}: {
  card: PokemonCard;
  quantity?: number;
}) {
  const market = calculateRealMarketPrices(card);
  const price = getAdjustedPriceByCondition(
    market.average ?? 0,
    getCondition(card.id)
  );

  return (
    <Link
      href={`/card/${card.id}`}
      className="kt-card-frame group relative min-w-0 overflow-hidden rounded-[18px] bg-[#0a1118] p-2 transition duration-200 hover:-translate-y-1 hover:shadow-[0_20px_46px_rgba(0,0,0,.28),0_0_22px_rgba(34,211,238,.045)] sm:p-2.5"
    >
      <div className="pointer-events-none absolute inset-x-8 top-2 h-16 rounded-full bg-cyan-400/[0.035] blur-2xl" />

      <div className="kt-card-frame relative aspect-[0.72] overflow-hidden rounded-[14px] bg-[#0c151e]">
        <img
          src={card.images?.small || card.images?.large}
          alt={card.name}
          className="h-full w-full object-contain p-1.5 drop-shadow-[0_14px_18px_rgba(0,0,0,.35)] transition duration-300 group-hover:scale-[1.03]"
          loading="lazy"
          onError={(event) => {
            event.currentTarget.style.opacity = "0";
          }}
        />

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-[#061016]/55 to-transparent" />

        {quantity && quantity > 1 ? (
          <span className="absolute right-1.5 top-1.5 rounded-full border border-cyan-300/30 bg-[#061016]/90 px-1.5 py-0.5 text-[8px] font-black text-cyan-300 backdrop-blur-md">
            x{quantity}
          </span>
        ) : null}
      </div>

      <div className="relative min-w-0 px-0.5 pb-0.5 pt-2.5">
        <div className="flex items-start justify-between gap-1.5">
          <p className="line-clamp-1 min-w-0 flex-1 text-[9px] font-black text-white sm:text-[11px]">
            {card.name}
          </p>
          <span className="shrink-0 rounded-md border border-white/[0.07] bg-white/[0.025] px-1.5 py-0.5 text-[6px] font-black uppercase tracking-wide text-zinc-400">
            {card.set?.id?.toUpperCase() || "SET"}
          </span>
        </div>

        <p className="mt-0.5 truncate text-[7px] font-bold uppercase tracking-wide text-zinc-400 sm:text-[8px]">
          {card.set?.name || "Extension inconnue"}
        </p>

        <div className="mt-2 flex items-center justify-between gap-2 border-t border-white/[0.06] pt-2">
          <span className="flex items-center gap-1 text-[7px] font-black text-zinc-400">
            <Hash className="h-2.5 w-2.5 text-cyan-300" />
            {card.number}
          </span>
          <span className="text-[10px] font-black tabular-nums text-cyan-300 sm:text-xs">
            {price > 0 ? `${price.toFixed(2)} €` : "—"}
          </span>
        </div>
      </div>
    </Link>
  );
}
