// lib/pricing.ts

import type { PokemonCard } from "./types";

import {
  getMarketData,
  getCardMarketPrice,
  getTCGPlayerPrice,
  getEbayPrice,
  getAverageMarketPrice,
  getMarketSpread,
  getAdjustedPriceByCondition,
} from "./marketEngine";

/**
 * Multiplicateur de prix selon l'état de la carte
 */
export function getConditionMultiplier(condition: string): number {
  switch (condition?.toLowerCase()) {
    case "mint": return 1.0;
    case "near mint": return 0.9;
    case "excellent": return 0.75;
    case "good": return 0.6;
    case "light played": return 0.5;
    case "played": return 0.4;
    case "poor": return 0.25;
    default: return 0.9;
  }
}

export {
  getMarketData,
  getCardMarketPrice,
  getTCGPlayerPrice,
  getEbayPrice,
  getAverageMarketPrice,
  getMarketSpread,
  getAdjustedPriceByCondition,
};

export { getConditionMultiplier };

/**
 * Calcule la valeur maximale enregistrée parmi toutes les places de marché actives.
 * Idéal pour mettre en avant le potentiel maximum/haute fourchette d'une carte rare.
 */
export function getBestMarketPrice(
  card?: PokemonCard | null,
  condition: string = "Near Mint"
): number {
  if (!card) return 0;

  const market = getMarketData(card);

  const prices = [
    market.cardmarket,
    market.tcgplayer,
    market.ebay,
  ].filter((price): price is number => typeof price === "number" && price > 0);

  if (prices.length === 0) return 0;

  const maxPrice = Math.max(...prices);
  const adjustedMax = getAdjustedPriceByCondition(maxPrice, condition);

  return Math.round(adjustedMax * 100) / 100;
}

/**
 * Calcule la valeur plancher/minimale constatée sur le marché.
 * Idéal pour repérer la cote d'entrée minimale.
 */
export function getMinMarketPrice(
  card?: PokemonCard | null,
  condition: string = "Near Mint"
): number {
  if (!card) return 0;

  const market = getMarketData(card);

  const prices = [
    market.cardmarket,
    market.tcgplayer,
    market.ebay,
  ].filter((price): price is number => typeof price === "number" && price > 0);

  if (prices.length === 0) return 0;

  const minPrice = Math.min(...prices);
  const adjustedMin = getAdjustedPriceByCondition(minPrice, condition);

  return Math.round(adjustedMin * 100) / 100;
}
