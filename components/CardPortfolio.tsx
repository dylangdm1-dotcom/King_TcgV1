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
  getPrintingVariant,
  setPrintingVariant as savePrintingVariant,
} from "../lib/storage";
import { getAdjustedPriceByCondition } from "../lib/marketEngine";
import type { CardPrintVariantKey, PokemonCard } from "../lib/types";

type Props = {
  card: PokemonCard;
  currentValue: number;
  onPrintingVariantChange?: (variant: CardPrintVariantKey) => void | Promise<void>;
};

export default function CardPortfolio({ card, currentValue, onPrintingVariantChange }: Props) {
  currentValue = Number.isFinite(Number(currentValue)) ? Number(currentValue) : 0;
  const [quantity, setQuantity] = useState(0);
  const [buyPrice, setBuyPriceState] = useState(0);
  const [condition, setConditionState] = useState("Near Mint");
  const availableVariants = card.availablePrintVariants?.length
    ? card.availablePrintVariants
    : [{ key: "Normal" as CardPrintVariantKey, label: "Normal" }];
  const [printingVariant, setPrintingVariantState] = useState<CardPrintVariantKey>(
    card.selectedPrintVariant || availableVariants[0].key
  );

  const refresh = () => {
    setQuantity(getCardQuantity(card.id));
    setBuyPriceState(getBuyPrice(card.id));
    setConditionState(getCondition(card.id));
    const stored = getPrintingVariant(card.id) as CardPrintVariantKey;
    const nextVariant = availableVariants.some((variant) => variant.key === stored)
      ? stored
      : (card.selectedPrintVariant || availableVariants[0].key);
    setPrintingVariantState(nextVariant);
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

  const updatePrintingVariant = (value: CardPrintVariantKey) => {
    setPrintingVariantState(value);
    savePrintingVariant(card.id, value);
    void onPrintingVariantChange?.(value);
  };

  const adjustedCurrentValue = getAdjustedPriceByCondition(currentValue, condition);
  const totalInvested = buyPrice * quantity;
  const totalValue = adjustedCurrentValue * quantity;
  const profit = totalValue - totalInvested;
  const roi = totalInvested > 0 ? (profit / totalInvested) * 100 : 0;

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-cyan-400" /> Suivi du Portefeuille
        </h2>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {/* Quantité */}
        <div className="kt-metric-cell rounded-xl px-2.5 py-2 flex flex-col justify-between min-h-[62px]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Quantité</span>
          <div className="mt-2 flex items-center justify-between gap-2">
            <button
              onClick={remove}
              disabled={quantity <= 0}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-800 bg-[#171e28]/85 text-zinc-400 hover:text-white transition active:scale-95 disabled:opacity-30 disabled:pointer-events-none"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="text-sm font-black text-white tabular-nums">{quantity}</span>
            <button
              onClick={add}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-800 bg-[#171e28]/85 text-zinc-400 hover:text-white transition active:scale-95"
            >
              <Plus className="w-3.5 h-3.5 text-cyan-400" />
            </button>
          </div>
        </div>

        {/* Investissement */}
        <div className="kt-metric-cell rounded-xl px-2.5 py-2 flex flex-col justify-between min-h-[62px]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Investi</span>
          <span className="text-sm font-black text-white mt-3 tabular-nums">{totalInvested.toFixed(2)} €</span>
        </div>

        {/* Valeur Actuelle */}
        <div className="kt-metric-cell rounded-xl px-2.5 py-2 flex flex-col justify-between min-h-[62px]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Valeur totale</span>
          <span className="text-sm font-black text-white mt-3 tabular-nums">{totalValue.toFixed(2)} €</span>
        </div>

        {/* ROI / Performance */}
        <div className="kt-metric-cell rounded-xl px-2.5 py-2 flex flex-col justify-between min-h-[62px]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Performance</span>
          <div className="mt-2 text-right sm:text-left">
            <span className={`text-sm font-black block tabular-nums ${roi >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
              {roi >= 0 ? "+" : ""}{roi.toFixed(2)} %
            </span>
            <span className={`text-[10px] font-bold tabular-nums ${profit >= 0 ? "text-emerald-500/70" : "text-rose-500/70"}`}>
              {profit >= 0 ? "+" : ""}{profit.toFixed(2)} €
            </span>
          </div>
        </div>
      </div>

      {/* Édition caractéristiques à plat */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-3 pt-2 border-t border-white/[0.08]">
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-white block mb-1.5">
            Prix d&apos;achat unitaire (€)
          </label>
          <input
            type="number"
            step="0.10"
            min="0"
            value={buyPrice || ""}
            placeholder="0.00"
            onChange={(e) => updateBuyPrice(Number(e.target.value))}
            className="kt-portfolio-field w-full rounded-xl border border-white/15 bg-white/[0.06] px-3 py-2 text-xs text-white placeholder-zinc-600 transition focus:outline-none tabular-nums"
          />
        </div>

        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-white block mb-1.5">
            État de la carte
          </label>
          <select
            value={condition}
            onChange={(e) => updateCondition(e.target.value)}
            className="kt-portfolio-field w-full rounded-xl border border-white/15 bg-white/[0.06] px-3 py-2 text-xs text-white transition focus:outline-none appearance-none cursor-pointer"
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

        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-white block mb-1.5">
            Version
          </label>
          <select
            value={printingVariant}
            onChange={(e) => updatePrintingVariant(e.target.value as CardPrintVariantKey)}
            className="kt-portfolio-field w-full rounded-xl border border-white/15 bg-white/[0.06] px-3 py-2 text-xs text-white transition focus:outline-none appearance-none cursor-pointer"
          >
            {availableVariants.map((variant) => (
              <option key={variant.key} value={variant.key}>{variant.label}</option>
            ))}
          </select>
          <p className="mt-1 text-[10px] font-bold text-cyan-300">
            Valeur selon état : {adjustedCurrentValue.toFixed(2)} €
          </p>
        </div>
      </div>
    </div>
  );
}
