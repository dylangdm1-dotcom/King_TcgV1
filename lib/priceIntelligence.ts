// lib/priceIntelligence.ts

import type { PricePoint } from "./priceHistory";
import type { PokemonCard } from "./types";
import { 
  getAverageMarketPrice, 
  getAdjustedPriceByCondition,
  getPriceTrend7d,
  getPriceTrend30d 
} from "./marketEngine";

function observed(history?: PricePoint[] | null): PricePoint[] {
  return (history ?? []).filter((point) => point?.origin !== "reconstructed");
}

/**
 * 💰 Extrait le dernier prix valide enregistré dans l'historique ou du marché, ajusté selon l'état
 */
export function getCurrentPrice(
  history?: PricePoint[] | null,
  card?: PokemonCard | null,
  condition: string = "Near Mint"
): number {
  let basePrice = 0;

  const observedHistory = observed(history);
  if (observedHistory.length > 0) {
    // Parcourt depuis la fin pour trouver le dernier prix valide > 0
    for (let i = observedHistory.length - 1; i >= 0; i--) {
      const val = observedHistory[i]?.average;
      if (typeof val === "number" && val > 0) {
        basePrice = val;
        break;
      }
    }
  }

  // Fallback sur le marketEngine si l'historique ne renvoie rien
  if (basePrice <= 0 && card) {
    basePrice = getAverageMarketPrice(card);
  }

  return getAdjustedPriceByCondition(basePrice, condition);
}

/**
 * 📉 Détermine le prix le plus bas valide (> 0) ajusté selon l'état
 */
export function getLowestPrice(
  history?: PricePoint[] | null,
  condition: string = "Near Mint"
): number {
  const observedHistory = observed(history);
  if (observedHistory.length === 0) return 0;

  const validPrices = observedHistory
    .map((p) => p?.average)
    .filter((p): p is number => typeof p === "number" && p > 0);

  if (validPrices.length === 0) return 0;

  const minBase = Math.min(...validPrices);
  return getAdjustedPriceByCondition(minBase, condition);
}

/**
 * 📈 Détermine le prix le plus haut jamais atteint dans l'historique, ajusté selon l'état
 */
export function getHighestPrice(
  history?: PricePoint[] | null,
  condition: string = "Near Mint"
): number {
  const observedHistory = observed(history);
  if (observedHistory.length === 0) return 0;

  const validPrices = observedHistory
    .map((p) => p?.average)
    .filter((p): p is number => typeof p === "number" && p > 0);

  if (validPrices.length === 0) return 0;

  const maxBase = Math.max(...validPrices);
  return getAdjustedPriceByCondition(maxBase, condition);
}

/**
 * 📊 Calcule la variation globale en pourcentage sur toute la période de l'historique
 */
export function getVariationPercent(history?: PricePoint[] | null): number {
  const observedHistory = observed(history);
  if (observedHistory.length < 2) return 0;

  const validPoints = observedHistory.filter(
    (p) => typeof p?.average === "number" && p.average > 0
  );

  if (validPoints.length < 2) return 0;

  const first = validPoints[0].average;
  const last = validPoints[validPoints.length - 1].average;

  if (first <= 0) return 0;

  return Number((((last - first) / first) * 100).toFixed(2));
}

/**
 * 📈 Extrait la tendance d'évolution à 7 jours (%)
 */
export function getTrend7d(
  history?: PricePoint[] | null,
  card?: PokemonCard | null
): number {
  const observedHistory = observed(history);
  if (observedHistory.length >= 7) {
    const valid = observedHistory.filter((p) => typeof p?.average === "number" && p.average > 0);
    if (valid.length >= 7) {
      const recent = valid[valid.length - 1].average;
      const days7Ago = valid[valid.length - 7].average;
      if (days7Ago > 0) {
        return Number((((recent - days7Ago) / days7Ago) * 100).toFixed(1));
      }
    }
  }

  // Fallback sur le marketEngine
  return getPriceTrend7d(card);
}

/**
 * 📈 Extrait la tendance d'évolution à 30 jours (%)
 */
export function getTrend30d(
  history?: PricePoint[] | null,
  card?: PokemonCard | null
): number {
  const observedHistory = observed(history);
  if (observedHistory.length >= 30) {
    const valid = observedHistory.filter((p) => typeof p?.average === "number" && p.average > 0);
    if (valid.length >= 30) {
      const recent = valid[valid.length - 1].average;
      const days30Ago = valid[0].average;
      if (days30Ago > 0) {
        return Number((((recent - days30Ago) / days30Ago) * 100).toFixed(1));
      }
    }
  }

  // Fallback sur le marketEngine
  return getPriceTrend30d(card);
}

/**
 * 🎯 Analyse l'opportunité d'achat (Indicateur technique King_TCG ajusté selon l'état)
 */
export function getPriceOpportunity(
  history?: PricePoint[] | null,
  card?: PokemonCard | null,
  condition: string = "Near Mint"
) {
  const current = getCurrentPrice(history, card, condition);
  const lowest = getLowestPrice(history, condition);
  const highest = getHighestPrice(history, condition);

  if (current <= 0 || lowest <= 0 || highest <= 0) {
    return {
      level: "none",
      text: "Données de marché insuffisantes",
    };
  }

  const delta = highest - lowest;
  if (delta === 0) {
    return {
      level: "normal",
      text: "🟡 Prix stable",
    };
  }

  // Positionnement relatif (%) dans la fourchette (bas <-> haut)
  const position = ((current - lowest) / delta) * 100;

  if (position <= 25) {
    return {
      level: "good",
      text: "🟢 Prix proche du bas de la fourchette observée",
    };
  }

  if (position >= 75) {
    return {
      level: "high",
      text: "🔴 Prix en sommet de fourchette",
    };
  }

  return {
    level: "normal",
    text: "🟡 Prix dans la moyenne du marché",
  };
}
