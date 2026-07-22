"use client";

import { useEffect, useState } from "react";
import { Briefcase, Plus, Minus } from "lucide-react";
import {
  getCardQuantity,
  addToCollection,
  removeFromCollection,
  getBuyPrice,
  setBuyPrice as saveBuyPrice,
  getCondition,
  setCondition as saveCondition,
} from "../lib/storage";
import type { PokemonCard } from "../lib/types";

type Props = {
  card: PokemonCard;
  currentValue: number;
};

export default function CardPortfolio({ card, currentValue }: Props) {
  const [quantity, setQuantity] = useState(0);
  const [buyPrice, setBuyPriceState] = useState(0);
  const [condition, setConditionState] = useState("Near Mint");

  const refresh = () => {
    setQuantity(getCardQuantity(card.id));
    setBuyPriceState(getBuyPrice(card.id));
    setConditionState(getCondition(card.id));
  };

  useEffect(() => {
    refresh();

    const sync = () => refresh();
    window.addEventListener("king_tcg_update", sync);

    return () => {
      window.removeEventListener("king_tcg_update", sync);
    };
  }, [card.id]);

  const add = () => {
    const updated = addToCollection(card.id);
    setQuantity(updated[card.id] || 0);
  };

  const remove = () => {
    const updated = removeFromCollection(card.id);
    setQuantity(updated[card.id] || 0);
  };

  const updateBuyPrice = (value: number) => {
    setBuyPriceState(value);
    saveBuyPrice(card.id, value);
  };

  const updateCondition = (value: string) => {
    setConditionState(value);
    saveCondition(card.id, value);
  };

  const totalInvested = buyPrice * quantity;
  const totalValue = currentValue * quantity;
  const profit = totalValue - totalInvested;
  const roi = totalInvested > 0 ? (profit / totalInvested) * 100 : 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-cyan-400" /> Suivi du Portefeuille
        </h2>
      </div>

      <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
        {/* Quantité */}
        <div className="glass-card bg-neutral-950/40 rounded-xl p-4 flex flex-col justify-between min-h-[95px]">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Quantité</span>
          <div className="mt-2 flex items-center justify-between gap-2">
            <button
              onClick={remove}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-800 bg-neutral-900/50 text-zinc-400 hover:text-white transition active:scale-95"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="text-lg font-black text-white tabular-nums">{quantity}</span>
            <button
              onClick={add}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-800 bg-neutral-900/50 text-zinc-400 hover:text-white transition active:scale-95"
            >
              <Plus className="w-3.5 h-3.5 text-cyan-400" />
            </button>
          </div>
        </div>

        {/* Investissement */}
        <div className="glass-card bg-neutral-950/40 rounded-xl p-4 flex flex-col justify-between min-h-[95px]">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Investi</span>
          <span className="text-lg font-black text-white mt-3 tabular-nums">{totalInvested.toFixed(2)} €</span>
        </div>

        {/* Valeur Actuelle */}
        <div className="glass-card bg-neutral-950/40 rounded-xl p-4 flex flex-col justify-between min-h-[95px]">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Valeur totale</span>
          <span className="text-lg font-black text-white mt-3 tabular-nums">{totalValue.toFixed(2)} €</span>
        </div>

        {/* ROI / Performance */}
        <div className="glass-card bg-neutral-950/40 rounded-xl p-4 flex flex-col justify-between min-h-[95px]">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Performance</span>
          <div className="mt-2 text-right sm:text-left">
            <span className={`text-lg font-black block tabular-nums ${roi >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
              {roi >= 0 ? "+" : ""}{roi.toFixed(2)} %
            </span>
            <span className={`text-[10px] font-bold tabular-nums ${profit >= 0 ? "text-emerald-500/70" : "text-rose-500/70"}`}>
              {profit >= 0 ? "+" : ""}{profit.toFixed(2)} €
            </span>
          </div>
        </div>
      </div>

      {/* Édition caractéristiques à plat */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 pt-2 border-t border-zinc-900">
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 block mb-2">Prix d'achat unitaire</label>
          <input
            type="number"
            value={buyPrice || ""}
            placeholder="0.00"
            onChange={(e) => updateBuyPrice(Number(e.target.value))}
            className="w-full rounded-xl border border-zinc-900 bg-neutral-950/40 px-3 py-2.5 text-xs text-white placeholder-zinc-700 transition focus:border-zinc-800 focus:outline-none focus:bg-neutral-950"
          />
        </div>

        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 block mb-2">État de la carte</label>
          <select
            value={condition}
            onChange={(e) => updateCondition(e.target.value)}
            className="w-full rounded-xl border border-zinc-900 bg-neutral-950/40 px-3 py-2.5 text-xs text-white transition focus:border-zinc-800 focus:outline-none focus:bg-neutral-950 appearance-none cursor-pointer"
          >
            <option value="Mint">Mint</option>
            <option value="Near Mint">Near Mint</option>
            <option value="Excellent">Excellent</option>
            <option value="Good">Good</option>
            <option value="Played">Played</option>
          </select>
        </div>
      </div>
    </div>
  );
}