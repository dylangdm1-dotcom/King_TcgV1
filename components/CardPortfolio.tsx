"use client";

import { useCallback, useEffect, useState } from "react";
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

type Condition =
  | "Mint"
  | "Near Mint"
  | "Excellent"
  | "Good"
  | "Light Played"
  | "Played"
  | "Poor";

type CollectionEntry =
  | number
  | {
      quantity?: number;
    }
  | undefined;

type Props = {
  card: PokemonCard;
  /**
   * Prix actuel V5 déjà calculé par le moteur de prix
   * pour la condition sélectionnée.
   */
  currentValue: number;
};

const CONDITIONS: Condition[] = [
  "Mint",
  "Near Mint",
  "Excellent",
  "Good",
  "Light Played",
  "Played",
  "Poor",
];

function getEntryQuantity(entry: CollectionEntry): number {
  if (typeof entry === "number") {
    return Math.max(0, entry);
  }

  if (entry && typeof entry.quantity === "number") {
    return Math.max(0, entry.quantity);
  }

  return 0;
}

function normalizeCondition(value: string): Condition {
  return CONDITIONS.includes(value as Condition)
    ? (value as Condition)
    : "Near Mint";
}

export default function CardPortfolio({
  card,
  currentValue,
}: Props) {
  const [quantity, setQuantity] = useState(0);
  const [buyPrice, setBuyPriceState] = useState(0);
  const [condition, setConditionState] =
    useState<Condition>("Near Mint");

  const refresh = useCallback(() => {
    const storedQuantity = getCardQuantity(card.id);
    const storedBuyPrice = getBuyPrice(card.id);
    const storedCondition = getCondition(card.id);

    setQuantity(
      Number.isFinite(storedQuantity)
        ? Math.max(0, storedQuantity)
        : 0
    );

    setBuyPriceState(
      Number.isFinite(storedBuyPrice)
        ? Math.max(0, storedBuyPrice)
        : 0
    );

    setConditionState(
      normalizeCondition(storedCondition)
    );
  }, [card.id]);

  useEffect(() => {
    refresh();

    const sync = () => {
      refresh();
    };

    window.addEventListener("king_tcg_update", sync);

    return () => {
      window.removeEventListener("king_tcg_update", sync);
    };
  }, [refresh]);

  const notifyUpdate = () => {
    window.dispatchEvent(new Event("king_tcg_update"));
  };

  const add = () => {
    const updated = addToCollection(card.id);
    const entry = updated[card.id] as CollectionEntry;

    setQuantity(getEntryQuantity(entry));
    notifyUpdate();
  };

  const remove = () => {
    const updated = removeFromCollection(card.id);
    const entry = updated[card.id] as CollectionEntry;

    setQuantity(getEntryQuantity(entry));
    notifyUpdate();
  };

  const updateBuyPrice = (value: number) => {
    const safeValue =
      Number.isFinite(value) && value >= 0
        ? value
        : 0;

    setBuyPriceState(safeValue);
    saveBuyPrice(card.id, safeValue);
    notifyUpdate();
  };

  const updateCondition = (value: string) => {
    const safeCondition = normalizeCondition(value);

    setConditionState(safeCondition);
    saveCondition(card.id, safeCondition);
    notifyUpdate();
  };

  /*
   * V5.0 :
   * currentValue est fourni par le moteur de prix.
   *
   * Aucun coefficient de condition n'est appliqué ici.
   * La condition doit être utilisée en amont pour récupérer
   * le véritable prix correspondant.
   */
  const safeCurrentValue =
    Number.isFinite(currentValue) && currentValue > 0
      ? currentValue
      : 0;

  const safeBuyPrice =
    Number.isFinite(buyPrice) && buyPrice > 0
      ? buyPrice
      : 0;

  const totalInvested = safeBuyPrice * quantity;
  const totalValue = safeCurrentValue * quantity;
  const profit = totalValue - totalInvested;

  const roi =
    totalInvested > 0
      ? (profit / totalInvested) * 100
      : 0;

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div>
        <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-zinc-400">
          <Briefcase className="h-4 w-4 text-cyan-400" />
          Suivi du Portefeuille
        </h2>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {/* Quantité */}
        <div className="glass-card flex min-h-[95px] flex-col justify-between rounded-xl bg-neutral-950/40 p-4">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
            Quantité
          </span>

          <div className="mt-2 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={remove}
              disabled={quantity <= 0}
              aria-label="Retirer une carte"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-800 bg-neutral-900/50 text-zinc-400 transition hover:text-white active:scale-95 disabled:pointer-events-none disabled:opacity-30"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>

            <span className="text-lg font-black tabular-nums text-white">
              {quantity}
            </span>

            <button
              type="button"
              onClick={add}
              aria-label="Ajouter une carte"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-800 bg-neutral-900/50 text-zinc-400 transition hover:text-white active:scale-95"
            >
              <Plus className="h-3.5 w-3.5 text-cyan-400" />
            </button>
          </div>
        </div>

        {/* Investissement */}
        <div className="glass-card flex min-h-[95px] flex-col justify-between rounded-xl bg-neutral-950/40 p-4">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
            Investi
          </span>

          <span className="mt-3 text-lg font-black tabular-nums text-white">
            {totalInvested.toFixed(2)} €
          </span>
        </div>

        {/* Valeur actuelle */}
        <div className="glass-card flex min-h-[95px] flex-col justify-between rounded-xl bg-neutral-950/40 p-4">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
            Valeur totale
          </span>

          <span className="mt-3 text-lg font-black tabular-nums text-white">
            {totalValue.toFixed(2)} €
          </span>
        </div>

        {/* Performance */}
        <div className="glass-card flex min-h-[95px] flex-col justify-between rounded-xl bg-neutral-950/40 p-4">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
            Performance
          </span>

          <div className="mt-2 text-right sm:text-left">
            <span
              className={`block text-lg font-black tabular-nums ${
                roi >= 0
                  ? "text-emerald-400"
                  : "text-rose-400"
              }`}
            >
              {roi >= 0 ? "+" : ""}
              {roi.toFixed(2)} %
            </span>

            <span
              className={`text-[10px] font-bold tabular-nums ${
                profit >= 0
                  ? "text-emerald-500/70"
                  : "text-rose-500/70"
              }`}
            >
              {profit >= 0 ? "+" : ""}
              {profit.toFixed(2)} €
            </span>
          </div>
        </div>
      </div>

      {/* Paramètres portefeuille */}
      <div className="grid grid-cols-1 gap-4 border-t border-zinc-900 pt-2 sm:grid-cols-2">
        {/* Prix d'achat */}
        <div>
          <label
            htmlFor={`buy-price-${card.id}`}
            className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-zinc-500"
          >
            Prix d'achat unitaire (€)
          </label>

          <input
            id={`buy-price-${card.id}`}
            type="number"
            inputMode="decimal"
            step="0.10"
            min="0"
            value={buyPrice || ""}
            placeholder="0.00"
            onChange={(event) =>
              updateBuyPrice(
                Number(event.target.value)
              )
            }
            className="w-full rounded-xl border border-zinc-900 bg-neutral-950/40 px-3 py-2.5 text-xs tabular-nums text-white placeholder-zinc-700 transition focus:border-cyan-500/50 focus:bg-neutral-950 focus:outline-none"
          />
        </div>

        {/* Condition */}
        <div>
          <label
            htmlFor={`condition-${card.id}`}
            className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-zinc-500"
          >
            État de la carte
          </label>

          <select
            id={`condition-${card.id}`}
            value={condition}
            onChange={(event) =>
              updateCondition(event.target.value)
            }
            className="w-full cursor-pointer appearance-none rounded-xl border border-zinc-900 bg-neutral-950/40 px-3 py-2.5 text-xs text-white transition focus:border-cyan-500/50 focus:bg-neutral-950 focus:outline-none"
          >
            <option value="Mint">Mint</option>
            <option value="Near Mint">Near Mint</option>
            <option value="Excellent">Excellent</option>
            <option value="Good">Good</option>
            <option value="Light Played">
              Light Played
            </option>
            <option value="Played">Played</option>
            <option value="Poor">Poor</option>
          </select>
        </div>
      </div>
    </div>
  );
}