'use client';

import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { PokemonCard, getCardPrice } from '@/lib/types';

interface Props {
  card: PokemonCard;
}

export default function CardResult({ card }: Props) {
  const price = getCardPrice(card);

  return (
    <Link href={`/card/${card.id}`}>
      <article className="group relative overflow-hidden rounded-xl border border-zinc-900 bg-neutral-950/40 p-3 transition-all duration-200 hover:border-cyan-500/30 hover:bg-neutral-950/60">
        
        {/* Conteneur Image Ultra-Épuré */}
        <div className="relative aspect-[0.72] overflow-hidden rounded-lg bg-neutral-950 border border-zinc-900/50">
          <img
            src={card.images.large || card.images.small}
            alt={card.name}
            loading="lazy"
            className="h-full w-full object-contain p-2 transition duration-300 group-hover:scale-[1.02]"
          />

          {/* Index Numéro */}
          <div className="absolute left-2 top-2 rounded bg-neutral-950/80 border border-zinc-900/80 px-1.5 py-0.5 text-[9px] font-black text-zinc-400 tracking-wider tabular-nums">
            #{card.number}
          </div>
        </div>

        {/* Informations & Métriques de la carte */}
        <div className="mt-3 space-y-2.5">
          <div>
            <h2 className="line-clamp-1 text-xs font-bold text-white transition-colors group-hover:text-cyan-400">
              {card.name}
            </h2>
            <p className="mt-0.5 line-clamp-1 text-[11px] text-zinc-500 font-medium">
              {card.set.name}
            </p>
          </div>

          {/* Rareté Badge technique */}
          <div className="flex gap-1.5">
            {card.rarity ? (
              <span className="rounded bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-zinc-400">
                {card.rarity}
              </span>
            ) : (
              <span className="rounded bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-zinc-600">
                Standard
              </span>
            )}
          </div>

          {/* Section Cotation de marché */}
          <div className="flex items-center justify-between border-t border-zinc-900 pt-2.5">
            <div>
              <p className="text-[9px] font-black uppercase tracking-wider text-zinc-600">
                Index prix
              </p>
              {price !== null ? (
                <p className="mt-0.5 text-sm font-black tracking-tight text-white tabular-nums">
                  {price.toFixed(2)} €
                </p>
              ) : (
                <p className="mt-0.5 text-[11px] font-bold text-zinc-500 italic">
                  Non indexé
                </p>
              )}
            </div>

            {/* Micro-CTA d'ouverture */}
            <div className="flex h-6 w-6 items-center justify-center rounded-md border border-zinc-900 bg-neutral-950 text-zinc-500 transition-all duration-200 group-hover:border-cyan-500/20 group-hover:bg-cyan-500/10 group-hover:text-cyan-400 cursor-pointer">
              <ArrowUpRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>

      </article>
    </Link>
  );
}