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
      <article className="kt-search-card group flex h-full flex-col">
        <div className="relative aspect-[0.72] overflow-hidden rounded-[15px] border border-white/[0.08] bg-[#111821]">
          <div className="pointer-events-none absolute inset-x-8 top-3 h-16 rounded-full bg-violet-400/[0.07] blur-2xl" />
          {!imageFailed && imageSrc ? (
            <img
              src={imageSrc}
              alt={card.name}
              loading="lazy"
              onError={() => {
                if (fallbackImage && imageSrc !== fallbackImage) setImageSrc(fallbackImage);
                else setImageFailed(true);
              }}
              className="relative z-10 h-full w-full object-contain p-2.5 drop-shadow-[0_18px_20px_rgba(0,0,0,.42)] transition duration-300 group-hover:scale-[1.025]"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-4 text-center text-zinc-500">
              <ImageOff className="h-7 w-7" />
              <span className="text-[10px] font-bold leading-4">Visuel indisponible</span>
            </div>
          )}

          <div className="absolute left-2 top-2 z-20 rounded-lg border border-amber-300/15 bg-[#101720]/95 px-2 py-1 text-[9px] font-black tracking-wider text-amber-300 backdrop-blur-md">
            #{card.number}
          </div>
          <div className="absolute bottom-2 right-2 z-20 flex h-7 w-7 items-center justify-center rounded-lg border border-white/[0.1] bg-[#101720]/95 text-zinc-200 backdrop-blur-md transition group-hover:border-cyan-300/35 group-hover:text-cyan-300">
            <ArrowUpRight className="h-3.5 w-3.5" />
          </div>
        </div>

        <div className="flex min-h-[122px] flex-1 flex-col px-1 pt-3">
          <div>
            <h2 className="line-clamp-1 text-[13px] font-extrabold tracking-[-0.015em] text-white transition-colors group-hover:text-cyan-200">
              {card.name}
            </h2>
            <p className="mt-1 line-clamp-1 text-[10px] font-medium text-zinc-400">{card.set.name}</p>
          </div>

          <div className="mt-2 flex min-h-5 flex-wrap gap-1.5">
            <span className="rounded-full border border-violet-300/15 bg-violet-400/[0.08] px-2 py-1 text-[8px] font-black uppercase tracking-[0.11em] text-violet-200">
              {card.rarity || 'Standard'}
            </span>
          </div>

          <div className="mt-auto flex items-end justify-between border-t border-white/[0.08] pt-3">
            <div>
              <p className="text-[8px] font-black uppercase tracking-[0.15em] text-zinc-500">Cote actuelle</p>
              {priceAvailable && price > 0 ? (
                <p className="mt-1 text-[16px] font-black tracking-tight text-emerald-300 tabular-nums">{price.toFixed(2)} €</p>
              ) : isPriceLoading ? (
                <div className="mt-1 flex items-center gap-1.5 text-[10px] font-bold text-cyan-300">
                  <Loader2 className="h-3 w-3 animate-spin" /> Synchronisation
                </div>
              ) : (
                <p className="mt-1 text-[10px] font-bold text-zinc-400">Non indexé</p>
              )}
            </div>
            {priceAvailable && price > 0 && (
              <div className="flex items-center gap-1 rounded-full border border-emerald-300/15 bg-emerald-400/[0.08] px-2 py-1 text-[8px] font-black text-emerald-300">
                <TrendingUp className="h-3 w-3" /> Marché
              </div>
            )}
          </div>
        </div>
      </article>
    </Link>
  );
}
