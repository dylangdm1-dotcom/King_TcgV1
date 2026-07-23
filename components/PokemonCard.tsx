// components/pokemonCard.tsx

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  isFavorite,
  toggleFavorite,
  getCardQuantity,
  addToCollection,
} from "../lib/storage";

type Props = {
  id: string;
  image: string;
  name: string;
  set: string;
  rarity: string;
  price?: number;
};

export default function PokemonCard({
  id,
  image,
  name,
  set,
  rarity,
  price = 0,
}: Props) {
  const [favorite, setFavorite] = useState(false);
  const [quantity, setQuantity] = useState(0);

  useEffect(() => {
    setFavorite(isFavorite(id));
    setQuantity(getCardQuantity(id));
  }, [id]);

  const handleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Évite de déclencher le lien de la carte
    toggleFavorite(id);
    setFavorite(isFavorite(id));
  };

  const handleCollection = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Évite de déclencher le lien de la carte
    addToCollection(id);
    setQuantity(getCardQuantity(id));
  };

  return (
    <Link href={`/card/${id}`} className="group block">
      <div className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-gradient-to-br from-zinc-900 to-zinc-950 p-4 transition-all duration-300 hover:-translate-y-1 hover:border-zinc-700 hover:shadow-2xl hover:shadow-cyan-500/5">
        
        {/* Conteneur Image avec effet Zoom au survol */}
        <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl bg-zinc-950">
          <img
            src={image}
            alt={name}
            loading="lazy"
            referrerPolicy="no-referrer"
            className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
          />
        </div>

        {/* Contenu textuel */}
        <div className="mt-4 flex flex-col gap-2">
          <h3 className="truncate text-lg font-black text-white group-hover:text-cyan-400 transition-colors">
            {name}
          </h3>

          <div className="text-xs text-zinc-400">
            <p className="truncate">
              <span className="font-bold text-zinc-500">Extension :</span> {set}
            </p>
            <p className="truncate mt-0.5">
              <span className="font-bold text-zinc-500">Rareté :</span> {rarity}
            </p>
          </div>

          <div className="mt-1 text-xl font-black text-white">
            {price.toFixed(2)} €
          </div>

          {/* Grille d'actions */}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleFavorite}
              className={`flex items-center justify-center gap-1 rounded-xl py-2.5 text-xs font-bold transition-all duration-200 ${
                favorite
                  ? "bg-red-500/10 border border-red-500/30 text-red-400"
                  : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-white"
              }`}
            >
              {favorite ? "❤️ Favori" : "🤍 Ajouter"}
            </button>

            <button
              type="button"
              onClick={handleCollection}
              className="flex items-center justify-center gap-1 rounded-xl border border-cyan-500/30 bg-cyan-500/10 py-2.5 text-xs font-bold text-cyan-400 transition-all duration-200 hover:bg-cyan-500/20"
            >
              ➕ Stock ({quantity})
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
}