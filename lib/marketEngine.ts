// lib/marketEngine.ts

import type { PokemonCard } from "./types";
import { getCardPrice } from "./types";

//
// 🧠 MARKET ENGINE v4.00
// Source unique des prix réels, prix planchers (Near Mint) et statistiques de tendances
//

export type MarketPrices = {
  cardmarket: number;   // Premier prix Near Mint Cardmarket (lowPrice prioritaire)
  ebay: number;         // Premier prix Near Mint estimé eBay
  tcgplayer: number;    // Premier prix Near Mint TCGPlayer (converti EUR)
  average: number;      // Moyenne des premiers prix planchers Near Mint
  priceTrend7d: number;  // Statistique réelle d'évolution à 7 jours (%)
  priceTrend30d: number; // Statistique réelle d'évolution à 30 jours (%)
};

// Taux de conversion USD -> EUR pour TCGPlayer
const USD_TO_EUR = 0.92;

//
// 📉 Grille de coefficients d'ajustement selon l'état de la carte (Base = Near Mint 1.00)
//
export const CONDITION_COEFFICIENTS: Record<string, number> = {
  "Mint": 1.15,
  "Near Mint": 1.00,
  "Excellent": 0.85,
  "Good": 0.70,
  "Light Played": 0.60,
  "Played": 0.45,
  "Poor": 0.25,
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
export function getAdjustedPriceByCondition(basePrice: number, condition: string = "Near Mint"): number {
  if (!basePrice || basePrice <= 0) return 0;
  const coeff = CONDITION_COEFFICIENTS[condition] ?? 1.00;
  return Number((basePrice * coeff).toFixed(2));
}

//
// 💰 Premier prix CardMarket (Priorité absolue au Vrai Plancher Near Mint : lowPrice)
//
export function getCardMarketPrice(card?: PokemonCard | null): number {
  if (!card?.cardmarket?.prices) return 0;

  const prices = card.cardmarket.prices;
  
  // Priorité absolue au prix plancher (lowPrice) pour refléter l'entrée de marché NM
  const price =
    safeNumber(prices.lowPrice) ||
    safeNumber(prices.reverseHoloLow) ||
    safeNumber(prices.trendPrice) ||
    safeNumber(prices.averageSellPrice) ||
    safeNumber(prices.avg1);

  return price > 0 ? Number(price.toFixed(2)) : 0;
}

//
// 🧾 Premier prix TCGPlayer (Plancher Near Mint converti en EUR)
//
export function getTCGPlayerPrice(card?: PokemonCard | null): number {
  if (!card?.tcgplayer?.prices) return 0;

  const p = card.tcgplayer.prices;

  // Extrait la finition disponible en ciblant les prix bas (low / directLow)
  const extractLow = (target: any) => {
    if (!target) return 0;
    return (
      safeNumber(target.low) ||
      safeNumber(target.directLow) ||
      safeNumber(target.market) ||
      safeNumber(target.mid)
    );
  };
  
  const price =
    extractLow(p.normal) ||
    extractLow(p.holofoil) ||
    extractLow(p.reverseHolofoil) ||
    extractLow(p.firstEditionHolofoil) ||
    extractLow(p.firstEditionNormal);

  if (price > 0) {
    // Conversion USD -> EUR pour harmoniser
    return Number((price * USD_TO_EUR).toFixed(2));
  }

  return 0;
}

//
// 📦 Premier prix eBay estimé (Plancher Near Mint)
//
export function getEbayPrice(card?: PokemonCard | null): number {
  if (!card) return 0;

  const cmPrice = getCardMarketPrice(card);
  const tcgPrice = getTCGPlayerPrice(card);

  if (cmPrice > 0 && tcgPrice > 0) {
    return Number((Math.min(cmPrice, tcgPrice)).toFixed(2));
  }
  
  const basePrice = cmPrice > 0 ? cmPrice : tcgPrice;
  return basePrice > 0 ? Number(basePrice.toFixed(2)) : 0;
}

//
// 📊 Moyenne des premiers prix planchers des plateformes (Near Mint) avec Fallback anti-0€
//
export function getAverageMarketPrice(card?: PokemonCard | null): number {
  if (!card) return 0;

  const cm = getCardMarketPrice(card);
  const tcg = getTCGPlayerPrice(card);
  const ebay = getEbayPrice(card);

  const prices = [cm, tcg, ebay].filter((p) => p > 0);

  if (prices.length > 0) {
    const minValidPrice = Math.min(...prices);
    return Number(minValidPrice.toFixed(2));
  }

  // 🛡️ SÉCURITÉ ANTI-0€ POUR DRACAUFEU ET CARTES RÉCENTES/PROMOS :
  const rarity = (card.rarity || "").toLowerCase();
  
  if (rarity.includes("secret") || rarity.includes("illustration rare")) return 15.00;
  if (rarity.includes("ultra") || rarity.includes("holo") || rarity.includes("vmax") || rarity.includes("vstar")) return 3.50;
  if (rarity.includes("rare")) return 1.50;
  
  return 0.50;
}

//
// 📈 Vraie Tendance 7 Jours
//
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