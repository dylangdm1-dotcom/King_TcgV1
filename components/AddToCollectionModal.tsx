"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import type { PokemonCard } from "../lib/types";

type Props = {
  open: boolean;
  card: PokemonCard;
  onClose: () => void;
  onConfirm: (quantity: number, buyPrice: number, condition: string) => void;
};

const CONDITIONS = ["Mint", "Near Mint", "Excellent", "Good", "Played"];

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

  const submit = () => {
    onConfirm(quantity, Number(buyPrice || 0), condition);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
      <div className="kt-panel relative w-full max-w-md p-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        
        {/* Bouton Fermer */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-neutral-900 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-400">
          Allocation d&apos;actif
        </h2>

        {/* Aperçu Miniature de la Carte */}
        <div className="kt-subpanel mt-4 flex gap-3 p-3">
          <div className="h-16 w-12 flex-shrink-0 overflow-hidden rounded bg-neutral-950 border border-white/[0.08]/50">
            <img
              src={card.images.small}
              alt={card.name}
              className="h-full w-full object-contain"
            />
          </div>
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <h3 className="truncate text-xs font-bold text-white">{card.name}</h3>
            <p className="truncate text-[11px] text-zinc-500">{card.set.name}</p>
            <div className="mt-1">
              <span className="inline-block rounded bg-cyan-500/10 border border-cyan-500/20 px-1.5 py-0.5 text-[10px] font-black tracking-wider uppercase text-cyan-400">
                {card.rarity || "Standard"}
              </span>
            </div>
          </div>
        </div>

        {/* Champs de Configuration */}
        <div className="mt-5 space-y-4">
          
          {/* Prix d&apos;achat */}
          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.11em] text-zinc-500">
              Prix d&apos;acquisition unitaire (€)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={buyPrice}
              onChange={(e) => setBuyPrice(e.target.value)}
              placeholder="0.00"
              className="kt-control h-10 w-full border px-3 text-xs font-bold outline-none transition tabular-nums"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Quantité */}
            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.11em] text-zinc-500">
                Volume (Qté)
              </label>
              <select
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="kt-control h-10 w-full cursor-pointer border px-3 text-xs font-bold outline-none transition"
              >
                {Array.from({ length: 20 }).map((_, i) => (
                  <option key={i} value={i + 1}>{i + 1}</option>
                ))}
              </select>
            </div>

            {/* État */}
            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.11em] text-zinc-500">
                Certification état
              </label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                className="kt-control h-10 w-full cursor-pointer border px-3 text-xs font-bold outline-none transition"
              >
                {CONDITIONS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Résumé Technique Mat */}
          <div className="kt-subpanel space-y-1.5 p-3 text-xs font-medium text-zinc-400">
            <div className="flex justify-between items-center">
              <span>Lots d&apos;actifs :</span> 
              <span className="font-bold text-zinc-200">x{quantity}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>État retenu :</span> 
              <span className="font-bold text-cyan-400">{condition}</span>
            </div>
            <div className="flex justify-between items-center pt-1.5 border-t border-white/[0.08]">
              <span className="font-bold text-zinc-300">Capital total investi :</span> 
              <span className="font-black text-white tabular-nums">
                {buyPrice === "" ? "0.00" : (Number(buyPrice) * quantity).toFixed(2)} €
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="kt-secondary-button h-9 cursor-pointer px-4 text-xs font-bold active:scale-95"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={quantity <= 0}
              className="kt-primary-button h-9 cursor-pointer px-4 text-xs font-black disabled:opacity-30 active:scale-95"
            >
              Confirmer l&apos;allocation
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
