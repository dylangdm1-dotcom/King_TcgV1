"use client";

import { History } from "lucide-react";
import { getCollection, getPurchaseDate } from "../../lib/storage";
import type { PokemonCard } from "../../lib/types";

type Props = {
  cards: PokemonCard[];
};

export default function RecentAcquisitions({ cards }: Props) {
  const collection = getCollection();

  const recent = cards
    .filter((card) => collection[card.id])
    .sort((a, b) => new Date(getPurchaseDate(b.id)).getTime() - new Date(getPurchaseDate(a.id)).getTime())
    .slice(0, 5);

  return (
    <section className="rounded-xl border border-zinc-900 bg-neutral-950/40 p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-4">
        <History className="w-4 h-4 text-zinc-400" />
        <h2 className="text-xs font-black uppercase tracking-widest text-zinc-400">
          Historique d'acquisition
        </h2>
      </div>

      <div className="space-y-2">
        {recent.length === 0 ? (
          <p className="text-[11px] font-bold text-zinc-600 py-1 italic">Aucune entrée récente enregistrée.</p>
        ) : (
          recent.map((card) => (
            <div
              key={card.id}
              className="flex items-center gap-3 rounded-lg border border-zinc-900/60 bg-neutral-950/50 p-2.5 transition-colors duration-200 hover:border-zinc-800"
            >
              <div className="h-10 w-7 shrink-0 overflow-hidden rounded bg-black border border-zinc-900/60 p-0.5 flex items-center justify-center">
                <img
                  src={card.images.small}
                  alt={card.name}
                  loading="lazy"
                  className="h-full object-contain"
                />
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-bold text-white text-xs truncate">
                  {card.name}
                </p>
                <p className="text-[10px] text-zinc-500 font-medium mt-0.5 tabular-nums">
                  Indexé le {new Date(getPurchaseDate(card.id)).toLocaleDateString("fr-FR")}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}