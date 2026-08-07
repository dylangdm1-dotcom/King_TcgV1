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
    const entry = updated[card.id] as any;
    const qty = typeof entry === "number" ? entry : (entry?.quantity || 0);
    setQuantity(qty);
  };

  const remove = () => {
    const updated = removeFromCollection(card.id);
    const entry = updated[card.id] as any;
    const qty = typeof entry === "number" ? entry : (entry?.quantity || 0);
    setQuantity(qty);
  };

  const updateBuyPrice = (value: number) => {
    const val = Math.max(0, value);
    setBuyPriceState(val);
    saveBuyPrice(card.id, val);
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
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-cyan-400" /> Suivi du Portefeuille
        </h2>
      </div>

      <div className="grid gap-2 grid-cols-2 sm:grid-cols-4">
        {/* Quantité */}
        <div className="glass-card bg-[#111821]/85 rounded-xl p-3 flex flex-col justify-between min-h-[76px]">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Quantité</span>
          <div className="mt-2 flex items-center justify-between gap-2">
            <button
              onClick={remove}
              disabled={quantity <= 0}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-800 bg-[#171e28]/85 text-zinc-400 hover:text-white transition active:scale-95 disabled:opacity-30 disabled:pointer-events-none"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="text-base font-black text-white tabular-nums">{quantity}</span>
            <button
              onClick={add}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-800 bg-[#171e28]/85 text-zinc-400 hover:text-white transition active:scale-95"
            >
              <Plus className="w-3.5 h-3.5 text-cyan-400" />
            </button>
          </div>
        </div>

        {/* Investissement */}
        <div className="glass-card bg-[#111821]/85 rounded-xl p-3 flex flex-col justify-between min-h-[76px]">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Investi</span>
          <span className="text-base font-black text-white mt-3 tabular-nums">{totalInvested.toFixed(2)} €</span>
        </div>

        {/* Valeur Actuelle */}
        <div className="glass-card bg-[#111821]/85 rounded-xl p-3 flex flex-col justify-between min-h-[76px]">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Valeur totale</span>
          <span className="text-base font-black text-white mt-3 tabular-nums">{totalValue.toFixed(2)} €</span>
        </div>

        {/* ROI / Performance */}
        <div className="glass-card bg-[#111821]/85 rounded-xl p-3 flex flex-col justify-between min-h-[76px]">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Performance</span>
          <div className="mt-2 text-right sm:text-left">
            <span className={`text-base font-black block tabular-nums ${roi >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
              {roi >= 0 ? "+" : ""}{roi.toFixed(2)} %
            </span>
            <span className={`text-[10px] font-bold tabular-nums ${profit >= 0 ? "text-emerald-500/70" : "text-rose-500/70"}`}>
              {profit >= 0 ? "+" : ""}{profit.toFixed(2)} €
            </span>
          </div>
        </div>
      </div>

      {/* Édition caractéristiques à plat */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 pt-2 border-t border-white/[0.08]">
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 block mb-2">
            Prix d'achat unitaire (€)
          </label>
          <input
            type="number"
            step="0.10"
            min="0"
            value={buyPrice || ""}
            placeholder="0.00"
            onChange={(e) => updateBuyPrice(Number(e.target.value))}
            className="kt-portfolio-field w-full rounded-xl border px-3 py-2.5 text-xs placeholder-zinc-600 transition focus:outline-none tabular-nums"
          />
        </div>

        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 block mb-2">
            État de la carte
          </label>
          <select
            value={condition}
            onChange={(e) => updateCondition(e.target.value)}
            className="kt-portfolio-field w-full rounded-xl border px-3 py-2.5 text-xs transition focus:outline-none appearance-none cursor-pointer"
          >
            <option value="Mint">Mint</option>
            <option value="Near Mint">Near Mint</option>
            <option value="Excellent">Excellent</option>
            <option value="Good">Good</option>
            <option value="Light Played">Light Played</option>
            <option value="Played">Played</option>
            <option value="Poor">Poor</option>
          </select>
        </div>
      </div>
    </div>
  );
}