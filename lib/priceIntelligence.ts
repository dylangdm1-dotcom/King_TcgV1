// lib/priceIntelligence.ts

import type { PricePoint } from "./priceHistory";
import type { PokemonCard } from "./types";

import {
  DEFAULT_CONDITION,
  getLowestMarketPrice,
  getAverageMarketPrice,
  getPriceTrend7d,
  getPriceTrend30d,
} from "./marketEngine";

/**
 * =====================================================
 * 💰 KING_TCG PRICE INTELLIGENCE V5
 * =====================================================
 *
 * Analyse des prix et des tendances.
 *
 * PRINCIPES :
 * - Near Mint par défaut
 * - aucune conversion artificielle selon la condition
 * - prix actuel = vrai prix minimum disponible
 * - historique = données réellement enregistrées
 * - aucune donnée synthétique
 *
 * =====================================================
 */

/**
 * 💰 Récupère le prix actuel réel.
 *
 * Priorité :
 * 1. Prix minimum réel du marché pour la condition
 * 2. Dernier prix historique réel si le marché n'est
 *    pas disponible
 *
 * Aucune adaptation artificielle de condition.
 */
export function getCurrentPrice(
  history?: PricePoint[] | null,
  card?: PokemonCard | null,
  condition: string = DEFAULT_CONDITION
): number {
  // =====================================================
  // 💰 PRIORITÉ AU PRIX ACTUEL DU MARCHÉ
  // =====================================================

  if (card) {
    const marketPrice = getLowestMarketPrice(
      card,
      condition
    );

    if (
      typeof marketPrice === "number" &&
      marketPrice > 0
    ) {
      return marketPrice;
    }
  }

  // =====================================================
  // 📜 FALLBACK SUR LE DERNIER PRIX HISTORIQUE RÉEL
  // =====================================================

  if (
    history &&
    Array.isArray(history) &&
    history.length > 0
  ) {
    for (
      let i = history.length - 1;
      i >= 0;
      i--
    ) {
      const value = history[i]?.average;

      if (
        typeof value === "number" &&
        value > 0
      ) {
        return value;
      }
    }
  }

  return 0;
}

/**
 * 📉 Détermine le prix le plus bas enregistré
 * dans l'historique réel.
 */
export function getLowestPrice(
  history?: PricePoint[] | null
): number {
  if (
    !history ||
    !Array.isArray(history) ||
    history.length === 0
  ) {
    return 0;
  }

  const validPrices = history
    .map((point) => point?.average)
    .filter(
      (price): price is number =>
        typeof price === "number" &&
        price > 0
    );

  if (validPrices.length === 0) {
    return 0;
  }

  return Math.min(...validPrices);
}

/**
 * 📈 Détermine le prix le plus haut jamais atteint
 * dans l'historique réel.
 */
export function getHighestPrice(
  history?: PricePoint[] | null
): number {
  if (
    !history ||
    !Array.isArray(history) ||
    history.length === 0
  ) {
    return 0;
  }

  const validPrices = history
    .map((point) => point?.average)
    .filter(
      (price): price is number =>
        typeof price === "number" &&
        price > 0
    );

  if (validPrices.length === 0) {
    return 0;
  }

  return Math.max(...validPrices);
}

/**
 * 📊 Calcule la variation globale en pourcentage
 * sur toute la période de l'historique disponible.
 */
export function getVariationPercent(
  history?: PricePoint[] | null
): number {
  if (
    !history ||
    !Array.isArray(history) ||
    history.length < 2
  ) {
    return 0;
  }

  const validPoints = history.filter(
    (point) =>
      typeof point?.average === "number" &&
      point.average > 0
  );

  if (validPoints.length < 2) {
    return 0;
  }

  const first =
    validPoints[0].average;

  const last =
    validPoints[validPoints.length - 1]
      .average;

  if (first <= 0) {
    return 0;
  }

  return Number(
    (
      ((last - first) / first) *
      100
    ).toFixed(2)
  );
}

/**
 * 📈 Extrait la tendance d'évolution à 7 jours (%).
 *
 * Utilise l'historique réel lorsqu'il contient
 * suffisamment de points.
 *
 * Sinon, utilise la tendance fournie par
 * le Market Engine si disponible.
 */
export function getTrend7d(
  history?: PricePoint[] | null,
  card?: PokemonCard | null
): number {
  if (
    history &&
    Array.isArray(history)
  ) {
    const valid = history.filter(
      (point) =>
        typeof point?.average === "number" &&
        point.average > 0
    );

    if (valid.length >= 7) {
      const recent =
        valid[valid.length - 1].average;

      const previous =
        valid[valid.length - 7].average;

      if (previous > 0) {
        return Number(
          (
            ((recent - previous) /
              previous) *
            100
          ).toFixed(1)
        );
      }
    }
  }

  // Fallback vers les données réelles
  // du Market Engine.
  return card
    ? getPriceTrend7d(card)
    : 0;
}

/**
 * 📈 Extrait la tendance d'évolution à 30 jours (%).
 *
 * Utilise l'historique réel lorsqu'il contient
 * suffisamment de points.
 *
 * Sinon, utilise la tendance fournie par
 * le Market Engine si disponible.
 */
export function getTrend30d(
  history?: PricePoint[] | null,
  card?: PokemonCard | null
): number {
  if (
    history &&
    Array.isArray(history)
  ) {
    const valid = history.filter(
      (point) =>
        typeof point?.average === "number" &&
        point.average > 0
    );

    if (valid.length >= 30) {
      const recent =
        valid[valid.length - 1].average;

      const previous =
        valid[valid.length - 30].average;

      if (previous > 0) {
        return Number(
          (
            ((recent - previous) /
              previous) *
            100
          ).toFixed(1)
        );
      }
    }
  }

  // Fallback vers les données réelles
  // du Market Engine.
  return card
    ? getPriceTrend30d(card)
    : 0;
}

/**
 * 🎯 Analyse l'opportunité d'achat.
 *
 * Compare le prix actuel réel avec la
 * fourchette historique réellement disponible.
 */
export function getPriceOpportunity(
  history?: PricePoint[] | null,
  card?: PokemonCard | null,
  condition: string = DEFAULT_CONDITION
) {
  const current =
    getCurrentPrice(
      history,
      card,
      condition
    );

  const lowest =
    getLowestPrice(history);

  const highest =
    getHighestPrice(history);

  if (
    current <= 0 ||
    lowest <= 0 ||
    highest <= 0
  ) {
    return {
      level: "none",
      text: "Données de marché insuffisantes",
    };
  }

  const delta =
    highest - lowest;

  if (delta === 0) {
    return {
      level: "normal",
      text: "🟡 Prix stable",
    };
  }

  // Positionnement relatif du prix actuel
  // dans la fourchette historique.
  const position =
    ((current - lowest) /
      delta) *
    100;

  if (position <= 25) {
    return {
      level: "good",
      text: "🟢 Prix très avantageux (Opportunité)",
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