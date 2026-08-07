// lib/marketEngine.ts

import type { PokemonCard } from "./types";

//
// 🧠 MARKET ENGINE v4.00
// Source unique des prix réels, prix planchers (Near Mint) et statistiques de tendances
//

export type MarketPrices = {
  cardmarket: number;   // Valeur de marché Cardmarket (trend/average)
  ebay: number;         // 0 tant qu'une source eBay réelle n'est pas branchée
  tcgplayer: number;    // Valeur de marché TCGPlayer/JustTCG en EUR
  average: number;      // Moyenne des sources réellement disponibles
  priceTrend7d: number;
  priceTrend30d: number;
  minimum?: number;
  maximum?: number;
};

// Taux de conversion USD -> EUR pour TCGPlayer
// Les conditions réelles doivent venir d'une source qui expose des prix par état.
// Tant que ce flux n'est pas disponible, aucun coefficient synthétique n'est appliqué.
export const CONDITION_COEFFICIENTS: Record<string, number> = {
  "Mint": 1,
  "Near Mint": 1,
  "Excellent": 1,
  "Good": 1,
  "Light Played": 1,
  "Played": 1,
  "Poor": 1,
};

/**
 * Helper sécurisé pour parser les nombres
 */
function safeNumber(val: unknown): number {
  const num = Number(val);
  return !isNaN(num) && isFinite(num) && num > 0 ? num : 0;
}

/**
 * Recalcule le prix d'une carte selon son état de conservation.
 * @param basePrice Prix Near Mint de référence (€)
 * @param condition État ("Mint", "Near Mint", "Excellent", "Good", etc.)
 */
export function getAdjustedPriceByCondition(
  basePrice: number,
  _condition: string = "Near Mint"
): number {
  return basePrice > 0 && Number.isFinite(basePrice)
    ? Number(basePrice.toFixed(2))
    : 0;
}

export function getCardMarketPrice(card?: PokemonCard | null): number {
  if (!card?.cardmarket?.prices) return 0;

  const prices = card.cardmarket.prices;

  // "trendPrice" / average = valeur de marché.
  // lowPrice reste une information de plancher, pas la cote principale.
  const price =
    safeNumber(prices.trendPrice) ||
    safeNumber(prices.averageSellPrice) ||
    safeNumber(prices.avg7) ||
    safeNumber(prices.avg30) ||
    safeNumber(prices.lowPrice);

  return price > 0 ? Number(price.toFixed(2)) : 0;
}

/**
 * Plancher Cardmarket réellement disponible.
 * N'est jamais utilisé comme valeur de marché principale.
 */
export function getCardMarketLowPrice(card?: PokemonCard | null): number {
  if (!card?.cardmarket?.prices) return 0;

  const prices = card.cardmarket.prices;
  return Number(safeNumber(prices.lowPrice).toFixed(2));
}

//
// 🧾 Prix TCGPlayer = market price prioritaire, puis low/mid
// La donnée source est USD et est convertie en EUR une seule fois.
//
export function getTCGPlayerPrice(card?: PokemonCard | null): number {
  if (!card?.tcgplayer?.prices) return 0;

  const p = card.tcgplayer.prices;

  const extractMarket = (target: any) => {
    if (!target) return 0;
    return (
      safeNumber(target.market) ||
      safeNumber(target.low) ||
      safeNumber(target.mid)
    );
  };

  const price =
    extractMarket(p.normal) ||
    extractMarket(p.holofoil) ||
    extractMarket(p.reverseHolofoil) ||
    extractMarket(p.firstEditionHolofoil) ||
    extractMarket(p.firstEditionNormal);

  return price > 0 ? Number(price.toFixed(2)) : 0;
}

//
// eBay : aucune estimation artificielle.
// Tant qu'une source eBay réelle n'est pas branchée, la valeur reste indisponible.
//
export function getEbayPrice(card?: PokemonCard | null): number {
  void card;
  return 0;
}

/**
 * Moyenne des valeurs de marché réellement disponibles.
 * Aucun prix de rareté, aucun fallback inventé, aucun min déguisé en moyenne.
 */
export function getAverageMarketPrice(card?: PokemonCard | null): number {
  if (!card) return 0;

  const prices = [
    getCardMarketPrice(card),
    getTCGPlayerPrice(card),
    getEbayPrice(card),
  ].filter((p): p is number => p > 0);

  if (!prices.length) return 0;

  return Number(
    (prices.reduce((sum, price) => sum + price, 0) / prices.length).toFixed(2)
  );
}

/**
 * Minimum des valeurs de marché réellement disponibles.
 */
export function getMinimumMarketPrice(card?: PokemonCard | null): number {
  if (!card) return 0;

  const prices = [
    getCardMarketPrice(card),
    getTCGPlayerPrice(card),
    getEbayPrice(card),
  ].filter((p): p is number => p > 0);

  return prices.length ? Number(Math.min(...prices).toFixed(2)) : 0;
}

/**
 * Maximum des valeurs de marché réellement disponibles.
 */
export function getMaximumMarketPrice(card?: PokemonCard | null): number {
  if (!card) return 0;

  const prices = [
    getCardMarketPrice(card),
    getTCGPlayerPrice(card),
    getEbayPrice(card),
  ].filter((p): p is number => p > 0);

  return prices.length ? Number(Math.max(...prices).toFixed(2)) : 0;
}

export function getPriceTrend7d(card?: PokemonCard | null): number {
  if (!card?.cardmarket?.prices) return 0;
  
  const current = getCardMarketPrice(card);
  const avg7 = safeNumber(card.cardmarket.prices.avg7);

  if (avg7 <= 0 || current <= 0) return 0;
  
  const diff = ((current - avg7) / avg7) * 100;
  return isFinite(diff) ? Number(diff.toFixed(1)) : 0;
}

//
// 📈 Vraie Tendance 30 Jours
//
export function getPriceTrend30d(card?: PokemonCard | null): number {
  if (!card?.cardmarket?.prices) return 0;
  
  const current = getCardMarketPrice(card);
  const avg30 = safeNumber(card.cardmarket.prices.avg30);

  if (avg30 <= 0 || current <= 0) return 0;
  
  const diff = ((current - avg30) / avg30) * 100;
  return isFinite(diff) ? Number(diff.toFixed(1)) : 0;
}

//
// 📈 Écart de marché réel
//
export function getMarketSpread(card?: PokemonCard | null): number {
  if (!card) return 0;

  const prices = [
    getCardMarketPrice(card),
    getTCGPlayerPrice(card),
    getEbayPrice(card),
  ].filter((p): p is number => p > 0);

  if (prices.length < 2) return 0;

  return Number((Math.max(...prices) - Math.min(...prices)).toFixed(2));
}

//
// 🔥 Données marché complètes et agrégées
//
export function getMarketData(card?: PokemonCard | null): MarketPrices {
  if (!card) {
    return {
      cardmarket: 0,
      ebay: 0,
      tcgplayer: 0,
      average: 0,
      priceTrend7d: 0,
      priceTrend30d: 0,
    };
  }

  const cm = getCardMarketPrice(card);
  const tcg = getTCGPlayerPrice(card);
  const ebay = getEbayPrice(card);
  const average = getAverageMarketPrice(card);

  return {
    cardmarket: cm,
    ebay: ebay,
    tcgplayer: tcg,
    average: average,
    priceTrend7d: getPriceTrend7d(card),
    priceTrend30d: getPriceTrend30d(card),
    minimum: getMinimumMarketPrice(card),
    maximum: getMaximumMarketPrice(card),
  };
}

//
// 🚀 Calcul de performance du Portefeuille
//
export function getMarketGrowth(
  card?: PokemonCard | null,
  buyPrice: number = 0,
  condition: string = "Near Mint"
): number {
  if (!card) return 0;

  const basePrice = getAverageMarketPrice(card);
  const currentAdjustedPrice = getAdjustedPriceByCondition(basePrice, condition);
  
  if (buyPrice <= 0 || currentAdjustedPrice <= 0) return 0;

  const growth = ((currentAdjustedPrice - buyPrice) / buyPrice) * 100;
  
  return isFinite(growth) ? Number(growth.toFixed(1)) : 0;
}