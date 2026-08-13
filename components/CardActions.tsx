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
    const entry = updated[cardId] as any;
    const qty = typeof entry === "number" ? entry : (entry?.quantity || 0);
    setQuantity(qty);
  };

  const removeCard = () => {
    const updated = removeFromCollection(cardId);
    const entry = updated[cardId] as any;
    const qty = typeof entry === "number" ? entry : (entry?.quantity || 0);
    setQuantity(qty);
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Ajouter au Stock */}
      <button
        onClick={addCard}
        className="kt-primary-button cursor-pointer px-4 py-2 text-xs font-bold transition-all duration-200 flex items-center gap-2 active:scale-95"
      >
        <Plus className="w-3.5 h-3.5 text-cyan-400" /> Ajouter au stock
      </button>

      {/* Retirer du Stock */}
      {quantity > 0 && (
        <button
          onClick={removeCard}
          className="kt-secondary-button cursor-pointer px-4 py-2 text-xs font-bold hover:text-rose-300 transition-all duration-200 flex items-center gap-2 active:scale-95"
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
            : "border border-cyan-400/12 bg-cyan-400/[0.025] text-zinc-400 hover:border-cyan-400/25 hover:text-zinc-200"
        }`}
      >
        {favorite ? (
          <>
            <Check className="w-3.5 h-3.5 text-cyan-400" /> Suivi activé
          </>
        ) : (
          <>
            <Heart className="w-3.5 h-3.5" /> Suivre l&apos;actif
          </>
        )}
      </button>
    </div>
  );
}
