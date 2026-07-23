"use client";

import { useEffect, useState } from "react";
import { Plus, Minus, Heart, Check } from "lucide-react";
import {
  getCardQuantity,
  isFavorite,
  toggleFavorite,
  addToCollection,
  removeFromCollection,
} from "../lib/storage";

type Props = {
  cardId: string;
};

export default function CardActions({ cardId }: Props) {
  const [favorite, setFavorite] = useState(false);
  const [quantity, setQuantity] = useState(0);

  useEffect(() => {
    const refresh = () => {
      setFavorite(isFavorite(cardId));
      setQuantity(getCardQuantity(cardId));
    };

    refresh();
    window.addEventListener("king_tcg_update", refresh);

    return () => {
      window.removeEventListener("king_tcg_update", refresh);
    };
  }, [cardId]);

  const handleFavorite = () => {
    toggleFavorite(cardId);
  };

  const addCard = () => {
    const updated = addToCollection(cardId);
    setQuantity(updated[cardId] || 0);
  };

  const removeCard = () => {
    const updated = removeFromCollection(cardId);
    setQuantity(updated[cardId] || 0);
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Ajouter au Stock */}
      <button
        onClick={addCard}
        className="rounded-xl border border-zinc-800 bg-neutral-900/50 hover:bg-neutral-900 px-4 py-2 text-xs font-bold text-white transition-all duration-200 flex items-center gap-2 active:scale-95 cursor-pointer"
      >
        <Plus className="w-3.5 h-3.5 text-cyan-400" /> Ajouter au stock
      </button>

      {/* Retirer du Stock */}
      {quantity > 0 && (
        <button
          onClick={removeCard}
          className="rounded-xl border border-zinc-900 bg-neutral-950/40 hover:bg-neutral-950 px-4 py-2 text-xs font-bold text-zinc-400 hover:text-rose-400 transition-all duration-200 flex items-center gap-2 active:scale-95 cursor-pointer"
        >
          <Minus className="w-3.5 h-3.5 text-rose-500/70" /> Retirer ({quantity})
        </button>
      )}

      {/* Bouton Suivi / Favori */}
      <button
        onClick={handleFavorite}
        className={`rounded-xl px-4 py-2 text-xs font-bold transition-all duration-200 flex items-center gap-2 active:scale-95 cursor-pointer ${
          favorite
            ? "border border-cyan-500/20 bg-cyan-500/5 text-cyan-400"
            : "border border-zinc-900 bg-neutral-950/20 text-zinc-500 hover:border-zinc-800 hover:text-zinc-300"
        }`}
      >
        {favorite ? (
          <>
            <Check className="w-3.5 h-3.5 text-cyan-400" /> Suivi activé
          </>
        ) : (
          <>
            <Heart className="w-3.5 h-3.5" /> Suivre l'actif
          </>
        )}
      </button>
    </div>
  );
}