'use client';

import Link from 'next/link';
import { AlertTriangle, ArrowRight, Clock3, Hash, ImageOff, Loader2, TrendingUp } from 'lucide-react';
import { useMemo, useState } from 'react';
import { PokemonCard, getCardPrice, hasMarketPrice } from '@/lib/types';

interface Props {
  card: PokemonCard;
  isPriceLoading?: boolean;
}

export default function CardResult({ card, isPriceLoading = false }: Props) {
  const price = getCardPrice(card);
  const priceAvailable = hasMarketPrice(card) || price > 0;
  const imageCandidates = useMemo(
    () => Array.from(new Set([card.images?.large, card.images?.small, ...(card.imageCandidates ?? [])].filter(Boolean))) as string[],
    [card.images?.large, card.images?.small, card.imageCandidates]
  );
  const [imageIndex, setImageIndex] = useState(0);
  const imageSrc = imageCandidates[imageIndex] || '';
  const imageFailed = imageIndex >= imageCandidates.length || !imageSrc;
  const marketStatus = isPriceLoading ? 'syncing' : card.marketStatus;

  return (
    <article className="kt-search-card group flex h-full flex-col overflow-hidden border-white/[0.10] bg-[#18212b] shadow-[0_18px_44px_rgba(0,0,0,.22)]">
      <Link href={`/card/${card.id}`} className="block">
        <div className="relative aspect-[0.72] overflow-hidden rounded-[15px] border border-white/[0.1] bg-[#17202a]">
          <div className="pointer-events-none absolute inset-x-8 top-3 h-16 rounded-full bg-violet-400/[0.08] blur-2xl" />
          {!imageFailed && imageSrc ? (
            <img
              src={imageSrc}
              alt={card.name}
              loading="lazy"
              onError={() => setImageIndex((current) => current + 1)}
              className="relative z-10 h-full w-full object-contain p-2.5 drop-shadow-[0_18px_20px_rgba(0,0,0,.42)] transition duration-300 group-hover:scale-[1.025]"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-4 text-center text-zinc-500">
              <ImageOff className="h-7 w-7" />
              <span className="text-[10px] font-bold leading-4">Visuel indisponible</span>
            </div>
          )}
        </div>
      </Link>

      <div className="flex min-h-[166px] flex-1 flex-col px-1 pt-3">
        <div>
          <h2 className="line-clamp-1 text-[13px] font-extrabold tracking-[-0.015em] text-white transition-colors group-hover:text-cyan-100">{card.name}</h2>
          <p className="mt-1 line-clamp-1 text-[10px] font-medium text-zinc-400">{card.set.name}</p>
        </div>

        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="inline-flex min-w-0 items-center gap-1 rounded-full border border-amber-300/15 bg-amber-400/[0.08] px-2 py-1 text-[8px] font-black uppercase tracking-[0.1em] text-amber-200">
            <Hash className="h-2.5 w-2.5" /> {card.number}
          </span>
          <span className="max-w-[65%] truncate rounded-full border border-violet-300/15 bg-violet-400/[0.08] px-2 py-1 text-[8px] font-black uppercase tracking-[0.1em] text-violet-200">{card.rarity || 'Standard'}</span>
        </div>

        <div className="mt-3 rounded-2xl border border-emerald-300/10 bg-emerald-300/[0.045] p-2.5">
          <div className="flex items-end justify-between gap-2">
            <div>
              <div className="flex items-center gap-1.5">
                <p className="text-[8px] font-black uppercase tracking-[0.15em] text-zinc-500">Cote actuelle</p>
                <span className="inline-flex rounded-full border border-emerald-300/25 bg-emerald-400/[0.10] px-1.5 py-0.5 text-[7px] font-black uppercase tracking-[0.1em] text-emerald-200">Marché</span>
              </div>
              {priceAvailable && price > 0 ? (
                <p className="mt-1 text-[16px] font-black tracking-tight text-emerald-200 tabular-nums">{price.toFixed(2)} €</p>
              ) : marketStatus === "syncing" ? (
                <div className="mt-1 flex items-center gap-1.5 text-[10px] font-bold text-cyan-200"><Loader2 className="h-3 w-3 animate-spin" /> Synchronisation</div>
              ) : marketStatus === "rate_limited" ? (
                <div className="mt-1 flex items-center gap-1.5 text-[10px] font-bold text-amber-200"><Clock3 className="h-3 w-3" /> Limite temporaire</div>
              ) : marketStatus === "source_unavailable" ? (
                <div className="mt-1 flex items-center gap-1.5 text-[10px] font-bold text-rose-200"><AlertTriangle className="h-3 w-3" /> Source indisponible</div>
              ) : (
                <p className="mt-1 text-[10px] font-bold text-zinc-400">Non cotée actuellement</p>
              )}
            </div>
          </div>
        </div>

        <Link href={`/card/${card.id}`} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-white/[0.11] bg-[#202936] px-3 py-2.5 text-[9px] font-black uppercase tracking-[0.12em] text-white transition hover:border-cyan-200/30 hover:bg-[#25313f]">
          Afficher la fiche <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </article>
  );
}
