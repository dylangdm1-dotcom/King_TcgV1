"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import type { PokemonCard } from "../lib/types";

type Props = {
  open: boolean;
  card: PokemonCard;
  onClose: () => void;
  onConfirm: (
    quantity: number,
    buyPrice: number,
    condition: string
  ) => void;
};

const CONDITIONS = [
  "Mint",
  "Near Mint",
  "Excellent",
  "Good",
  "Light Played",
  "Played",
  "Poor",
];

export default function AddToCollectionModal({
  open,
  card,
  onClose,
  onConfirm,
}: Props) {
  const [quantity, setQuantity] = useState(1);
  const [buyPrice, setBuyPrice] = useState("");
  const [condition, setCondition] = useState("Near Mint");

  useEffect(() => {
    if (!open) return;

    setQuantity(1);
    setBuyPrice("");
    setCondition("Near Mint");
  }, [open]);

  if (!open) return null;

  const numericBuyPrice = Math.max(0, Number(buyPrice || 0));
  const totalInvested = numericBuyPrice * quantity;

  const submit = () => {
    onConfirm(quantity, numericBuyPrice, condition);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-xl border border-zinc-900 bg-neutral-950 p-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Fermeture */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          className="absolute right-4 top-4 rounded-md p-1 text-zinc-500 transition-colors hover:bg-neutral-900 hover:text-zinc-300"
        >
          <X className="h-4 w-4" />
        </button>

        {/* En-tête */}
        <div>
          <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-400">
            Ajouter à la collection
          </h2>

          <p className="mt-1 text-[11px] font-medium text-zinc-600">
            Gestion V5.0 de votre exemplaire
          </p>
        </div>

        {/* Carte */}
        <div className="mt-4 flex gap-3 rounded-lg border border-zinc-900 bg-neutral-900/20 p-3">
          <div className="h-16 w-12 flex-shrink-0 overflow-hidden rounded border border-zinc-900/50 bg-neutral-950">
            <img
              src={card.images.small}
              alt={card.name}
              className="h-full w-full object-contain"
            />
          </div>

          <div className="flex min-w-0 flex-1 flex-col justify-center">
            <h3 className="truncate text-xs font-bold text-white">
              {card.name}
            </h3>

            <p className="truncate text-[11px] text-zinc-500">
              {card.set.name}
            </p>

            <div className="mt-1">
              <span className="inline-block rounded border border-cyan-500/20 bg-cyan-500/10 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-cyan-400">
                {card.rarity || "Standard"}
              </span>
            </div>
          </div>
        </div>

        {/* Configuration */}
        <div className="mt-5 space-y-4">
          {/* Prix d'acquisition */}
          <div>
            <label className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-zinc-500">
              Prix d'acquisition unitaire (€)
            </label>

            <input
              type="number"
              step="0.01"
              min="0"
              value={buyPrice}
              onChange={(event) => setBuyPrice(event.target.value)}
              placeholder="0.00"
              inputMode="decimal"
              className="h-10 w-full rounded-xl border border-zinc-900 bg-neutral-950 px-3 text-xs font-bold text-white outline-none transition focus:border-cyan-500/30 tabular-nums"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Quantité */}
            <div>
              <label className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-zinc-500">
                Quantité
              </label>

              <select
                value={quantity}
                onChange={(event) =>
                  setQuantity(Number(event.target.value))
                }
                className="h-10 w-full cursor-pointer rounded-xl border border-zinc-900 bg-neutral-950 px-3 text-xs font-bold text-zinc-300 outline-none transition focus:border-cyan-500/30"
              >
                {Array.from({ length: 20 }, (_, index) => index + 1).map(
                  (value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  )
                )}
              </select>
            </div>

            {/* Condition */}
            <div>
              <label className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-zinc-500">
                État
              </label>

              <select
                value={condition}
                onChange={(event) => setCondition(event.target.value)}
                className="h-10 w-full cursor-pointer rounded-xl border border-zinc-900 bg-neutral-950 px-3 text-xs font-bold text-zinc-300 outline-none transition focus:border-cyan-500/30"
              >
                {CONDITIONS.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Résumé */}
          <div className="space-y-1.5 rounded-xl border border-dashed border-zinc-900 bg-neutral-950/40 p-3 text-xs font-medium text-zinc-400">
            <div className="flex items-center justify-between">
              <span>Quantité :</span>
              <span className="font-bold text-zinc-200">
                x{quantity}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span>État :</span>
              <span className="font-bold text-cyan-400">
                {condition}
              </span>
            </div>

            <div className="flex items-center justify-between border-t border-zinc-900 pt-1.5">
              <span className="font-bold text-zinc-300">
                Total d'acquisition :
              </span>

              <span className="font-black text-white tabular-nums">
                {totalInvested.toFixed(2)} €
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="h-9 cursor-pointer rounded-xl border border-zinc-900 px-4 text-xs font-bold text-zinc-400 transition hover:bg-neutral-900 hover:text-white active:scale-95"
            >
              Annuler
            </button>

            <button
              type="button"
              onClick={submit}
              disabled={quantity <= 0}
              className="h-9 cursor-pointer rounded-xl bg-white px-4 text-xs font-black text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-30 active:scale-95"
            >
              Ajouter à la collection
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}