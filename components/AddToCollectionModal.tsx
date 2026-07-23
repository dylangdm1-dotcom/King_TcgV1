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
      <div className="w-full max-w-md rounded-xl border border-zinc-900 bg-neutral-950 p-5 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
        
        {/* Bouton Fermer */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-neutral-900 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-400">
          Allocation d'actif
        </h2>

        {/* Aperçu Miniature de la Carte */}
        <div className="mt-4 flex gap-3 rounded-lg border border-zinc-900 bg-neutral-900/20 p-3">
          <div className="h-16 w-12 flex-shrink-0 overflow-hidden rounded bg-neutral-950 border border-zinc-900/50">
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
              <span className="inline-block rounded bg-cyan-500/10 border border-cyan-500/20 px-1.5 py-0.5 text-[9px] font-black tracking-wider uppercase text-cyan-400">
                {card.rarity || "Standard"}
              </span>
            </div>
          </div>
        </div>

        {/* Champs de Configuration */}
        <div className="mt-5 space-y-4">
          
          {/* Prix d'achat */}
          <div>
            <label className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-zinc-500">
              Prix d'acquisition unitaire (€)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={buyPrice}
              onChange={(e) => setBuyPrice(e.target.value)}
              placeholder="0.00"
              className="h-10 w-full rounded-xl border border-zinc-900 bg-neutral-950 px-3 text-xs font-bold text-white outline-none transition focus:border-cyan-500/30 tabular-nums"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Quantité */}
            <div>
              <label className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-zinc-500">
                Volume (Qté)
              </label>
              <select
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="h-10 w-full rounded-xl border border-zinc-900 bg-neutral-950 px-3 text-xs font-bold text-zinc-300 outline-none transition focus:border-cyan-500/30 cursor-pointer"
              >
                {Array.from({ length: 20 }).map((_, i) => (
                  <option key={i} value={i + 1}>{i + 1}</option>
                ))}
              </select>
            </div>

            {/* État */}
            <div>
              <label className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-zinc-500">
                Certification état
              </label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                className="h-10 w-full rounded-xl border border-zinc-900 bg-neutral-950 px-3 text-xs font-bold text-zinc-300 outline-none transition focus:border-cyan-500/30 cursor-pointer"
              >
                {CONDITIONS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Résumé Technique Mat */}
          <div className="rounded-xl border border-zinc-900 bg-neutral-950/40 p-3 text-xs font-medium text-zinc-400 space-y-1.5 border-dashed">
            <div className="flex justify-between items-center">
              <span>Lots d'actifs :</span> 
              <span className="font-bold text-zinc-200">x{quantity}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>État retenu :</span> 
              <span className="font-bold text-cyan-400">{condition}</span>
            </div>
            <div className="flex justify-between items-center pt-1.5 border-t border-zinc-900">
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
              className="h-9 px-4 rounded-xl border border-zinc-900 text-xs font-bold text-zinc-400 transition hover:bg-neutral-900 hover:text-white active:scale-95 cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={quantity <= 0}
              className="h-9 px-4 rounded-xl bg-white text-xs font-black text-black transition hover:bg-zinc-200 disabled:opacity-30 active:scale-95 cursor-pointer"
            >
              Confirmer l'allocation
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}