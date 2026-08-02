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
  const nextFavorites = toggleFavorite(cardId);
  setFavorite(nextFavorites.includes(cardId));
};

const addCard = () => {
addToCollection(cardId);
setQuantity(getCardQuantity(cardId));
};

const removeCard = () => {
if (quantity <= 0) return;


removeFromCollection(cardId);
setQuantity(getCardQuantity(cardId));

};

return ( <div className="flex flex-wrap items-center gap-3">
{/* Ajouter à la collection */} <button
     type="button"
     onClick={addCard}
     className="flex cursor-pointer items-center gap-2 rounded-xl border border-zinc-800 bg-neutral-900/50 px-4 py-2 text-xs font-bold text-white transition-all duration-200 hover:bg-neutral-900 active:scale-95"
   > <Plus className="h-3.5 w-3.5 text-cyan-400" />
Ajouter à la collection </button>

```
  {/* Retirer de la collection */}
  {quantity > 0 && (
    <button
      type="button"
      onClick={removeCard}
      className="flex cursor-pointer items-center gap-2 rounded-xl border border-zinc-900 bg-neutral-950/40 px-4 py-2 text-xs font-bold text-zinc-400 transition-all duration-200 hover:bg-neutral-950 hover:text-rose-400 active:scale-95"
    >
      <Minus className="h-3.5 w-3.5 text-rose-500/70" />
      Retirer ({quantity})
    </button>
  )}

  {/* Suivi / Favori */}
  <button
    type="button"
    onClick={handleFavorite}
    aria-pressed={favorite}
    className={`flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all duration-200 active:scale-95 ${
      favorite
        ? "border border-cyan-500/20 bg-cyan-500/5 text-cyan-400"
        : "border border-zinc-900 bg-neutral-950/20 text-zinc-500 hover:border-zinc-800 hover:text-zinc-300"
    }`}
  >
    {favorite ? (
      <>
        <Check className="h-3.5 w-3.5 text-cyan-400" />
        Suivi activé
      </>
    ) : (
      <>
        <Heart className="h-3.5 w-3.5" />
        Suivre la carte
      </>
    )}
  </button>
</div>

);
}
