// lib/priceIntelligence.ts

import type { PricePoint } from "./priceHistory";

/**
 * 💰 Extrait le dernier prix moyen valide enregistré dans l'historique
 */
export function getCurrentPrice(history?: PricePoint[] | null): number {
  if (!history || !Array.isArray(history) || history.length === 0) return 0;

  // Parcourt depuis la fin pour trouver le dernier prix valide > 0
  for (let i = history.length - 1; i >= 0; i--) {
    const val = history[i]?.average;
    if (typeof val === "number" && val > 0) {
      return Number(val.toFixed(2));
    }
  }

  return 0;
}

/**
 * 📉 Détermine le prix le plus bas valide (> 0) jamais atteint dans l'historique
 */
export function getLowestPrice(history?: PricePoint[] | null): number {
  if (!history || !Array.isArray(history) || history.length === 0) return 0;

  const validPrices = history
    .map((p) => p?.average)
    .filter((p): p is number => typeof p === "number" && p > 0);

  if (validPrices.length === 0) return 0;

  return Number(Math.min(...validPrices).toFixed(2));
}

/**
 * 📈 Détermine le prix le plus haut jamais atteint dans l'historique
 */
export function getHighestPrice(history?: PricePoint[] | null): number {
  if (!history || !Array.isArray(history) || history.length === 0) return 0;

  const validPrices = history
    .map((p) => p?.average)
    .filter((p): p is number => typeof p === "number" && p > 0);

  if (validPrices.length === 0) return 0;

  return Number(Math.max(...validPrices).toFixed(2));
}

/**
 * 📊 Calcule la variation globale en pourcentage sur toute la période de l'historique
 */
export function getVariationPercent(history?: PricePoint[] | null): number {
  if (!history || !Array.isArray(history) || history.length < 2) return 0;

  const validPoints = history.filter(
    (p) => typeof p?.average === "number" && p.average > 0
  );

  if (validPoints.length < 2) return 0;

  const first = validPoints[0].average;
  const last = validPoints[validPoints.length - 1].average;

  if (first <= 0) return 0;

  return Number((((last - first) / first) * 100).toFixed(2));
}

/**
 * 🎯 Analyse l'opportunité d'achat (Indicateur technique King_TCG)
 */
export function getPriceOpportunity(history?: PricePoint[] | null) {
  if (!history || !Array.isArray(history) || history.length === 0) {
    return {
      level: "none",
      text: "Pas assez de données",
    };
  }

  const current = getCurrentPrice(history);
  const lowest = getLowestPrice(history);
  const highest = getHighestPrice(history);

  if (current <= 0 || lowest <= 0 || highest <= 0) {
    return {
      level: "none",
      text: "Données de marché insuffisantes",
    };
  }

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