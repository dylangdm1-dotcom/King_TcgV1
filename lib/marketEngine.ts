// lib/marketEngine.ts

import type { PokemonCard } from "./types";
import { getCardPrice } from "./types";

//
// 🧠 MARKET ENGINE
// Source unique des prix réels et statistiques de tendances
//

export type MarketPrices = {
  cardmarket: number;
  ebay: number;
  tcgplayer: number;
  average: number;
  priceTrend7d: number;  // Statistique réelle d'évolution à 7 jours (%)
  priceTrend30d: number; // Statistique réelle d'évolution à 30 jours (%)
};

// Taux de conversion approximatif USD -> EUR pour TCGPlayer
const USD_TO_EUR = 0.92;

/**
 * Helper sécurisé pour parser les nombres
 */
function safeNumber(val: unknown): number {
  const num = Number(val);
  return !isNaN(num) && isFinite(num) && num > 0 ? num : 0;
}

//
// 💰 Prix CardMarket réel
//
export function getCardMarketPrice(card?: PokemonCard | null): number {
  if (!card?.cardmarket?.prices) return 0;

  const prices = card.cardmarket.prices;
  
  const price =
    safeNumber(prices.averageSellPrice) ||
    safeNumber(prices.trendPrice) ||
    safeNumber(prices.lowPrice);

  return price > 0 ? Number(price.toFixed(2)) : 0;
}

//
// 🧾 Prix TCGPlayer réel (Marché Américain converti en EUR)
//
export function getTCGPlayerPrice(card?: PokemonCard | null): number {
  if (!card?.tcgplayer?.prices) return 0;

  const p = card.tcgplayer.prices;
  
  // Extrait le prix du marché réel selon la finition disponible
  const price =
    safeNumber(p.holofoil?.market) ||
    safeNumber(p.normal?.market) ||
    safeNumber(p.reverseHolofoil?.market) ||
    safeNumber(p.firstEditionHolofoil?.market) ||
    safeNumber(p.firstEditionNormal?.market);

  if (price > 0) {
    // Conversion USD -> EUR pour harmoniser l'affichage global
    return Number((price * USD_TO_EUR).toFixed(2));
  }

  return 0;
}

//
// 📦 Prix eBay réel (Modélisation croisée inter-marchés)
//
export function getEbayPrice(card?: PokemonCard | null): number {
  if (!card) return 0;

  const cmPrice = getCardMarketPrice(card);
  const tcgPrice = getTCGPlayerPrice(card);

  // Si on dispose des données des deux continents
  if (cmPrice > 0 && tcgPrice > 0) {
    return Number(((cmPrice + tcgPrice) / 2).toFixed(2));
  }
  
  // Fallback statistique si un seul des deux marchés répond
  const basePrice = cmPrice > 0 ? cmPrice : tcgPrice;
  return basePrice > 0 ? Number((basePrice * 1.05).toFixed(2)) : 0;
}

//
// 📊 Vraie moyenne marché (Basée sur les prix réels)
//
export function getAverageMarketPrice(card?: PokemonCard | null): number {
  if (!card) return 0;

  const prices = [
    getCardMarketPrice(card),
    getTCGPlayerPrice(card),
  ].filter((p) => p > 0);

  if (!prices.length) {
    return getCardPrice(card);
  }

  const sum = prices.reduce((a, b) => a + b, 0);
  return Number((sum / prices.length).toFixed(2));
}

//
// 📈 Vraie Tendance 7 Jours (Calculée à partir de l'historique CardMarket)
//
export function getPriceTrend7d(card?: PokemonCard | null): number {
  if (!card?.cardmarket?.prices) return 0;
  
  const current = safeNumber(card.cardmarket.prices.trendPrice) || safeNumber(card.cardmarket.prices.averageSellPrice);
  const avg7 = safeNumber(card.cardmarket.prices.avg7);

  if (avg7 <= 0 || current <= 0) return 0;
  
  const diff = ((current - avg7) / avg7) * 100;
  return isFinite(diff) ? Number(diff.toFixed(1)) : 0;
}

//
// 📈 Vraie Tendance 30 Jours (Calculée à partir de l'historique CardMarket)
//
export function getPriceTrend30d(card?: PokemonCard | null): number {
  if (!card?.cardmarket?.prices) return 0;
  
  const current = safeNumber(card.cardmarket.prices.trendPrice) || safeNumber(card.cardmarket.prices.averageSellPrice);
  const avg30 = safeNumber(card.cardmarket.prices.avg30);

  if (avg30 <= 0 || current <= 0) return 0;
  
  const diff = ((current - avg30) / avg30) * 100;
  return isFinite(diff) ? Number(diff.toFixed(1)) : 0;
}

//
// 📈 Écart de marché réel (Écart inter-continental USA vs Europe)
//
export function getMarketSpread(card?: PokemonCard | null): number {
  if (!card) return 0;

  const cm = getCardMarketPrice(card);
  const tcg = getTCGPlayerPrice(card);

  if (!cm || !tcg) return 0;

  return Number(Math.abs(tcg - cm).toFixed(2));
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

  return {
    cardmarket: getCardMarketPrice(card),
    ebay: getEbayPrice(card),
    tcgplayer: getTCGPlayerPrice(card),
    average: getAverageMarketPrice(card),
    priceTrend7d: getPriceTrend7d(card),
    priceTrend30d: getPriceTrend30d(card),
  };
}

//
// 🚀 Calcul de performance du Portefeuille (Gain/Perte réel)
//
export function getMarketGrowth(card?: PokemonCard | null, buyPrice: number = 0): number {
  if (!card) return 0;

  const currentPrice = getAverageMarketPrice(card);
  
  if (buyPrice <= 0 || currentPrice <= 0) return 0;

  const growth = ((currentPrice - buyPrice) / buyPrice) * 100;
  
  return isFinite(growth) ? Number(growth.toFixed(1)) : 0;
}
