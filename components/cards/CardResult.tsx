'use client';

import Link from 'next/link';
import { ArrowRight, Hash, ImageOff } from 'lucide-react';
import { useMemo, useState } from 'react';
import { PokemonCard } from '@/lib/types';

interface Props {
  card: PokemonCard;
}

export default function CardResult({ card }: Props) {
  const imageCandidates = useMemo(
    () => Array.from(new Set([card.images?.large, card.images?.small, ...(card.imageCandidates ?? [])].filter(Boolean))) as string[],
    [card.images?.large, card.images?.small, card.imageCandidates]
  );
  const [imageIndex, setImageIndex] = useState(0);
  const imageSrc = imageCandidates[imageIndex] || '';
  const imageFailed = imageIndex >= imageCandidates.length || !imageSrc;

  return (
    <article className="kt-search-card group flex h-full flex-col overflow-hidden border-white/[0.10] bg-[#18212b] shadow-[0_18px_44px_rgba(0,0,0,.22)]">
      <Link href={`/card/${card.id}`} className="block">
        <div className="relative aspect-[0.72] overflow-hidden rounded-[15px] border border-white/[0.1] bg-[#17202a]">
          <div className="pointer-events-none absolute inset-x-8 top-3 h-16 rounded-full bg-violet-400/[0.08] blur-2xl" />
          {(card.availablePrintVariants?.length || 0) > 1 ? (
            <span className="absolute left-2 top-2 z-20 rounded-full border border-cyan-300/20 bg-black/75 px-2 py-1 text-[8px] font-black text-cyan-200 backdrop-blur-md">
              {card.availablePrintVariants?.length} versions
            </span>
          ) : null}
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

        <div className="mt-3 rounded-2xl border border-cyan-300/10 bg-cyan-300/[0.04] p-2.5">
          <p className="text-[8px] font-black uppercase tracking-[0.15em] text-zinc-500">Marché</p>
          <p className="mt-1 text-[10px] font-bold text-cyan-100">Cote dans la fiche</p>
        </div>

        <Link href={`/card/${card.id}`} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-white/[0.11] bg-[#202936] px-3 py-2.5 text-[9px] font-black uppercase tracking-[0.12em] text-white transition hover:border-cyan-200/30 hover:bg-[#25313f]">
          Afficher la fiche <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </article>
  );
}
