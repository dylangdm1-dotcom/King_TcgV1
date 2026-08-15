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
        className="flex cursor-pointer items-center gap-2 rounded-xl border border-cyan-300/38 bg-cyan-400/[0.09] px-4 py-2 text-xs font-black text-cyan-100 shadow-[0_8px_24px_rgba(34,211,238,.08)] transition-all duration-200 hover:border-cyan-200/60 hover:bg-cyan-400/[0.14] active:scale-95"
      >
        <Plus className="w-3.5 h-3.5 text-cyan-200" /> Ajouter au stock
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
            ? "border border-rose-400/45 bg-rose-400/[0.12] text-rose-200 shadow-[0_8px_24px_rgba(244,63,94,.10)]"
            : "border border-rose-400/25 bg-rose-400/[0.05] text-rose-300 hover:border-rose-300/45 hover:bg-rose-400/[0.09]"
        }`}
      >
        {favorite ? (
          <>
            <Check className="w-3.5 h-3.5 text-rose-300" /> Suivi actif
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
