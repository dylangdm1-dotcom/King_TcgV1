// lib/pricing.ts

import type { PokemonCard } from "./types";

import {
  getCardMarketPrice,
  getTCGPlayerPrice,
  getEbayPrice,
  getAverageMarketPrice,
  getMarketSpread,
} from "./marketEngine";

export {
  getCardMarketPrice,
  getTCGPlayerPrice,
  getEbayPrice,
  getAverageMarketPrice,
  getMarketSpread,
};

/**
 * Calcule la valeur maximale enregistrée parmi toutes les places de marché actives.
 * Idéal pour mettre en avant le potentiel d'une carte rare.
 */
export function getBestMarketPrice(card?: PokemonCard | null): number {
  if (!card) return 0;

  const prices = [
    getCardMarketPrice(card),
    getTCGPlayerPrice(card),
    getEbayPrice(card),
  ].filter((price) => typeof price === "number" && price > 0);

  if (prices.length === 0) return 0;

  const maxPrice = Math.max(...prices);
  return Math.round(maxPrice * 100) / 100;
}