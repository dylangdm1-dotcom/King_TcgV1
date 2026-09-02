"use client";

import { useEffect, useState } from "react";
import { Check, Heart, Minus, Plus } from "lucide-react";
import { addItemToCollection, getItemQuantity, isItemFavorite, removeItemFromCollection, toggleItemFavorite } from "@/lib/items/storage";

export default function ItemActions({ itemId, compact = false }: { itemId: string; compact?: boolean }) {
  const [quantity, setQuantity] = useState(0);
  const [favorite, setFavorite] = useState(false);

  useEffect(() => {
    const sync = () => {
      setQuantity(getItemQuantity(itemId));
      setFavorite(isItemFavorite(itemId));
    };
    sync();
    window.addEventListener("king_tcg_items_update", sync);
    return () => window.removeEventListener("king_tcg_items_update", sync);
  }, [itemId]);

  return (
    <div className={`flex items-center ${compact ? "gap-1" : "gap-2"}`}>
      <button
        type="button"
        onClick={() => setFavorite(toggleItemFavorite(itemId).includes(itemId))}
        aria-label={favorite ? "Retirer des favoris Items" : "Ajouter aux favoris Items"}
        className={`flex items-center justify-center rounded-xl border transition ${compact ? "h-8 w-8" : "h-10 w-10"} ${favorite ? "border-rose-300/35 bg-rose-300/[0.1] text-rose-300" : "border-white/[0.08] bg-white/[0.035] text-zinc-300 hover:text-rose-300"}`}
      >
        <Heart className={`h-4 w-4 ${favorite ? "fill-current" : ""}`} />
      </button>

      {quantity > 0 ? (
        <div className={`flex items-center rounded-xl border border-cyan-300/20 bg-cyan-300/[0.06] ${compact ? "h-8" : "h-10"}`}>
          <button type="button" onClick={() => { const next = removeItemFromCollection(itemId); setQuantity(next[itemId]?.quantity || 0); }} aria-label="Retirer une unité" className="flex h-full w-8 items-center justify-center text-zinc-300 hover:text-white"><Minus className="h-3.5 w-3.5" /></button>
          <span className="min-w-6 text-center text-[10px] font-black tabular-nums text-cyan-200">{quantity}</span>
          <button type="button" onClick={() => { const next = addItemToCollection(itemId); setQuantity(next[itemId]?.quantity || 0); }} aria-label="Ajouter une unité" className="flex h-full w-8 items-center justify-center text-cyan-300 hover:text-white"><Plus className="h-3.5 w-3.5" /></button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => { const next = addItemToCollection(itemId); setQuantity(next[itemId]?.quantity || 0); }}
          className={`inline-flex items-center justify-center gap-1.5 rounded-xl border border-cyan-300/25 bg-cyan-300/[0.07] px-3 text-[9px] font-black uppercase tracking-[0.06em] text-cyan-200 transition hover:bg-cyan-300/[0.12] ${compact ? "h-8" : "h-10"}`}
        >
          <Check className="h-3.5 w-3.5" /> Collection
        </button>
      )}
    </div>
  );
}
