// lib/marketEngine.ts

import type { PokemonCard } from "./types";

export type MarketPrices = {
  cardmarket: number;
  tcgplayer: number;
  justtcg: number;
  ebay: number;
  average: number;
  validSourceCount: number;
  excludedSources: string[];
  priceTrend7d: number;
  priceTrend30d: number;
  minimum?: number;
  maximum?: number;
};

export const CONDITION_COEFFICIENTS: Record<string, number> = {
  Mint: 1,
  "Near Mint": 1,
  Excellent: 1,
  Good: 1,
  "Light Played": 1,
  Played: 1,
  Poor: 1,
};

function safeNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export function getAdjustedPriceByCondition(
  basePrice: number,
  _condition: string = "Near Mint"
): number {
  return basePrice > 0 && Number.isFinite(basePrice)
    ? Number(basePrice.toFixed(2))
    : 0;
}

export function getCardMarketPrice(card?: PokemonCard | null): number {
  const prices = card?.cardmarket?.prices;
  if (!prices) return 0;

  const value =
    safeNumber(prices.trendPrice) ||
    safeNumber(prices.averageSellPrice) ||
    safeNumber(prices.avg7) ||
    safeNumber(prices.avg30) ||
    safeNumber(prices.lowPrice);

  return value ? Number(value.toFixed(2)) : 0;
}

export function getCardMarketLowPrice(card?: PokemonCard | null): number {
  return Number(safeNumber(card?.cardmarket?.prices?.lowPrice).toFixed(2));
}

export function getTCGPlayerPrice(card?: PokemonCard | null): number {
  const prices = card?.tcgplayer?.prices;
  if (!prices) return 0;

  const extract = (target: any) =>
    safeNumber(target?.market) ||
    safeNumber(target?.low) ||
    safeNumber(target?.mid);

  const value =
    extract(prices.normal) ||
    extract(prices.holofoil) ||
    extract(prices.reverseHolofoil) ||
    extract(prices.firstEditionHolofoil) ||
    extract(prices.firstEditionNormal);

  return value ? Number(value.toFixed(2)) : 0;
}

export function getJustTcgPrice(card?: PokemonCard | null): number {
  return Number(safeNumber(card?.justtcg?.medianNearMint).toFixed(2));
}

export function getEbayPrice(card?: PokemonCard | null): number {
  return Number(safeNumber(card?.ebayListings?.median).toFixed(2));
}

type SourceValue = { name: string; value: number };

function removeObviousOutliers(values: SourceValue[]): {
  valid: SourceValue[];
  excluded: SourceValue[];
} {
  const positive = values.filter((item) => item.value > 0);
  if (positive.length < 3) return { valid: positive, excluded: [] };

  const sorted = [...positive].sort((a, b) => a.value - b.value);
  const middle =
    sorted.length % 2
      ? sorted[Math.floor(sorted.length / 2)].value
      : (sorted[sorted.length / 2 - 1].value +
          sorted[sorted.length / 2].value) /
        2;

  if (middle <= 0) return { valid: positive, excluded: [] };

  const valid = positive.filter((item) => {
    const ratio = item.value / middle;
    return ratio >= 0.2 && ratio <= 5;
  });

  // Ne jamais éliminer toutes les sources.
  if (valid.length < 2) return { valid: positive, excluded: [] };

  const validNames = new Set(valid.map((item) => item.name));
  return {
    valid,
    excluded: positive.filter((item) => !validNames.has(item.name)),
  };
}

function sourceValues(card?: PokemonCard | null): SourceValue[] {
  if (!card) return [];
  return [
    { name: "Cardmarket", value: getCardMarketPrice(card) },
    { name: "TCGPlayer", value: getTCGPlayerPrice(card) },
    { name: "JustTCG", value: getJustTcgPrice(card) },
    { name: "eBay", value: getEbayPrice(card) },
  ].filter((item) => item.value > 0);
}

export function getAverageMarketPrice(card?: PokemonCard | null): number {
  const { valid } = removeObviousOutliers(sourceValues(card));
  if (!valid.length) return 0;

  return Number(
    (
      valid.reduce((sum, item) => sum + item.value, 0) / valid.length
    ).toFixed(2)
  );
}

export function getMinimumMarketPrice(card?: PokemonCard | null): number {
  const { valid } = removeObviousOutliers(sourceValues(card));
  return valid.length
    ? Number(Math.min(...valid.map((item) => item.value)).toFixed(2))
    : 0;
}

export function getMaximumMarketPrice(card?: PokemonCard | null): number {
  const { valid } = removeObviousOutliers(sourceValues(card));
  return valid.length
    ? Number(Math.max(...valid.map((item) => item.value)).toFixed(2))
    : 0;
}

export function getPriceTrend7d(card?: PokemonCard | null): number {
  const current = getCardMarketPrice(card);
  const avg7 = safeNumber(card?.cardmarket?.prices?.avg7);
  if (!current || !avg7) return 0;
  return Number((((current - avg7) / avg7) * 100).toFixed(1));
}

export function getPriceTrend30d(card?: PokemonCard | null): number {
  const current = getCardMarketPrice(card);
  const avg30 = safeNumber(card?.cardmarket?.prices?.avg30);
  if (!current || !avg30) return 0;
  return Number((((current - avg30) / avg30) * 100).toFixed(1));
}

export function getMarketSpread(card?: PokemonCard | null): number {
  const { valid } = removeObviousOutliers(sourceValues(card));
  if (valid.length < 2) return 0;

  const values = valid.map((item) => item.value);
  return Number((Math.max(...values) - Math.min(...values)).toFixed(2));
}

export function getMarketData(card?: PokemonCard | null): MarketPrices {
  const values = sourceValues(card);
  const { valid, excluded } = removeObviousOutliers(values);

  return {
    cardmarket: getCardMarketPrice(card),
    tcgplayer: getTCGPlayerPrice(card),
    justtcg: getJustTcgPrice(card),
    ebay: getEbayPrice(card),
    average: getAverageMarketPrice(card),
    validSourceCount: valid.length,
    excludedSources: excluded.map((item) => item.name),
    priceTrend7d: getPriceTrend7d(card),
    priceTrend30d: getPriceTrend30d(card),
    minimum: getMinimumMarketPrice(card),
    maximum: getMaximumMarketPrice(card),
  };
}

export function getMarketGrowth(
  card?: PokemonCard | null,
  buyPrice = 0,
  condition = "Near Mint"
): number {
  const current = getAdjustedPriceByCondition(
    getAverageMarketPrice(card),
    condition
  );
  if (buyPrice <= 0 || current <= 0) return 0;
  return Number((((current - buyPrice) / buyPrice) * 100).toFixed(1));
}
