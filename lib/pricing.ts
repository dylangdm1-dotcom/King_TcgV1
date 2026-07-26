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
export function getBestMarketPrice(card: PokemonCard): number {
  const prices = [
    getCardMarketPrice(card),
    getTCGPlayerPrice(card),
    getEbayPrice(card),
  ].filter((price) => price > 0);

  if (prices.length === 0) return 0;

  return Math.max(...prices);
}