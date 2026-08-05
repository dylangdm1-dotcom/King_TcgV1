'use client';

import Link from 'next/link';
import { ArrowUpRight, ImageOff, Loader2, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import { PokemonCard, getCardPrice, hasMarketPrice } from '@/lib/types';

interface Props {
  card: PokemonCard;
  isPriceLoading?: boolean;
}

export default function CardResult({ card, isPriceLoading = false }: Props) {
  const price = getCardPrice(card);
  const priceAvailable = hasMarketPrice(card) || price > 0;
  const primaryImage = card.images?.large || card.images?.small || '';
  const fallbackImage = card.images?.small || '';
  const [imageSrc, setImageSrc] = useState(primaryImage);
  const [imageFailed, setImageFailed] = useState(!primaryImage);

  return (
    <Link href={`/card/${card.id}`} className="block h-full">
      <article className="kt-search-card group h-full">
        <div className="relative aspect-[0.72] overflow-hidden rounded-[14px] border border-white/[0.06] bg-[#090c10]">
          <div className="pointer-events-none absolute inset-x-6 top-2 h-20 rounded-full bg-cyan-400/[0.08] blur-2xl" />
          {!imageFailed && imageSrc ? (
            <img
              src={imageSrc}
              alt={card.name}
              loading="lazy"
              onError={() => {
                if (fallbackImage && imageSrc !== fallbackImage) setImageSrc(fallbackImage);
                else setImageFailed(true);
              }}
              className="relative z-10 h-full w-full object-contain p-2.5 drop-shadow-[0_16px_18px_rgba(0,0,0,.45)] transition duration-300 group-hover:scale-[1.035]"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-4 text-center text-zinc-600">
              <ImageOff className="h-7 w-7" />
              <span className="text-[10px] font-bold leading-4">Visuel indisponible</span>
            </div>
          )}

          <div className="absolute left-2 top-2 z-20 rounded-lg border border-white/[0.08] bg-[#05070a]/88 px-2 py-1 text-[9px] font-black tracking-wider text-zinc-300 backdrop-blur-md">
            #{card.number}
          </div>
          <div className="absolute bottom-2 right-2 z-20 flex h-7 w-7 items-center justify-center rounded-lg border border-cyan-400/15 bg-[#05070a]/88 text-cyan-300 backdrop-blur-md transition group-hover:border-cyan-300/40 group-hover:bg-cyan-400/10">
            <ArrowUpRight className="h-3.5 w-3.5" />
          </div>
        </div>

        <div className="mt-3 flex min-h-[112px] flex-col">
          <div>
            <h2 className="line-clamp-1 text-[13px] font-black tracking-tight text-white transition-colors group-hover:text-cyan-300">
              {card.name}
            </h2>
            <p className="mt-1 line-clamp-1 text-[10px] font-medium text-zinc-500">{card.set.name}</p>
          </div>

          <div className="mt-2 flex min-h-5 flex-wrap gap-1.5">
            <span className="rounded-full border border-white/[0.07] bg-white/[0.025] px-2 py-1 text-[8px] font-black uppercase tracking-[0.12em] text-zinc-400">
              {card.rarity || 'Standard'}
            </span>
          </div>

          <div className="mt-auto flex items-end justify-between border-t border-white/[0.06] pt-3">
            <div>
              <p className="text-[8px] font-black uppercase tracking-[0.16em] text-zinc-600">Prix marché</p>
              {priceAvailable && price > 0 ? (
                <p className="mt-1 text-[15px] font-black tracking-tight text-white tabular-nums">{price.toFixed(2)} €</p>
              ) : isPriceLoading ? (
                <div className="mt-1 flex items-center gap-1.5 text-[10px] font-bold text-cyan-300">
                  <Loader2 className="h-3 w-3 animate-spin" /> Synchronisation
                </div>
              ) : (
                <p className="mt-1 text-[10px] font-bold text-zinc-500">Non indexé</p>
              )}
            </div>
            {priceAvailable && price > 0 && (
              <div className="flex items-center gap-1 rounded-full border border-emerald-400/10 bg-emerald-400/[0.06] px-2 py-1 text-[8px] font-black text-emerald-400">
                <TrendingUp className="h-3 w-3" /> Coté
              </div>
            )}
          </div>
        </div>
      </article>
    </Link>
  );
}