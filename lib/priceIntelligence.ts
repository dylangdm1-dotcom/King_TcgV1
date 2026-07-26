// lib/priceIntelligence.ts

import type { PricePoint } from "./priceHistory";

/**
 * 💰 Extrait le dernier prix moyen enregistré dans l'historique
 */
export function getCurrentPrice(history: PricePoint[]): number {
  if (!history || !history.length) return 0;
  return history[history.length - 1].average;
}

/**
 * 📉 Détermine le prix le plus bas jamais atteint dans l'historique
 */
export function getLowestPrice(history: PricePoint[]): number {
  if (!history || !history.length) return 0;
  return Math.min(...history.map((p) => p.average));
}

/**
 * 📈 Détermine le prix le plus haut jamais atteint dans l'historique
 */
export function getHighestPrice(history: PricePoint[]): number {
  if (!history || !history.length) return 0;
  return Math.max(...history.map((p) => p.average));
}

/**
 * 📊 Calcule la variation globale en pourcentage sur toute la période de l'historique
 */
export function getVariationPercent(history: PricePoint[]): number {
  if (!history || history.length < 2) return 0;

  const first = history[0].average;
  const last = history[history.length - 1].average;

  if (first <= 0) return 0;

  return Number((((last - first) / first) * 100).toFixed(2));
}

/**
 * 🎯 Analyse l'opportunité d'achat (Indicateur technique King_TCG)
 */
 export function getPriceOpportunity(history: PricePoint[]) {
  if (!history || !history.length) {
    return {
      level: "none",
      text: "Pas assez de données",
    };
  }

  const current = getCurrentPrice(history);
  const lowest = getLowestPrice(history);
  const highest = getHighestPrice(history);

  // Sécurité : Évite la division par zéro si le prix n'a jamais varié dans l'historique
  const delta = highest - lowest;
  if (delta === 0) {
    return {
      level: "normal",
      text: "🟡 Prix stable",
    };
  }

  // Positionnement en pourcentage du prix actuel par rapport au tunnel bas/haut
  const position = ((current - lowest) / delta) * 100;

  if (position < 25) {
    return {
      level: "good",
      text: "🟢 Prix intéressant actuellement",
    };
  }
  
  if (position > 75) {
    return {
      level: "high",
      text: "🔴 Prix élevé actuellement",
    };
  }

  return {
    level: "normal",
    text: "🟡 Prix dans la moyenne",
  };
}