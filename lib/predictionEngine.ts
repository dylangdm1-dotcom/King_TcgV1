// lib/predictionEngine.ts

import type { PricePoint } from "./priceHistory";
import type {
  PokemonCard,
  PredictionResult,
} from "./types";

import {
  DEFAULT_CONDITION,
  getLowestMarketPrice,
  getPriceTrend30d,
} from "./marketEngine";

/**
 * =====================================================
 * 🔮 KING_TCG PREDICTION ENGINE V5
 * =====================================================
 *
 * Moteur de prédiction à 30 jours.
 *
 * PRINCIPES :
 * - Near Mint par défaut
 * - prix de départ = vrai prix minimum disponible
 * - aucune conversion artificielle selon la condition
 * - historique réel prioritaire
 * - tendance réelle du marché en fallback
 *
 * IMPORTANT :
 * La prédiction elle-même reste une estimation.
 * Elle ne doit jamais être utilisée comme prix de marché
 * réel.
 *
 * =====================================================
 */

/**
 * 🔮 Prévision du prix à 30 jours.
 *
 * Combine :
 * - le prix actuel réel
 * - la tendance historique
 * - le score d'investissement
 *
 * La condition est transmise au Market Engine.
 */
export function predictPrice(
  history: PricePoint[] = [],
  score: number = 5,
  card?: PokemonCard | null,
  condition: string = DEFAULT_CONDITION
): PredictionResult {
  let currentPrice = 0;
  let evolution30d = 0;

  // =====================================================
  // 1. PRIX ACTUEL RÉEL
  // =====================================================
  //
  // Priorité au marché actuel.
  // Le prix utilisé est le minimum réellement disponible
  // pour la condition demandée.
  //

  if (card) {
    currentPrice =
      getLowestMarketPrice(
        card,
        condition
      );
  }

  // =====================================================
  // 2. FALLBACK SUR L'HISTORIQUE RÉEL
  // =====================================================

  if (
    currentPrice <= 0 &&
    history &&
    history.length > 0
  ) {
    const validPrices = history
      .map((point) => point?.average)
      .filter(
        (price): price is number =>
          typeof price === "number" &&
          price > 0
      );

    if (validPrices.length > 0) {
      currentPrice =
        validPrices[validPrices.length - 1];
    }
  }

  // =====================================================
  // 3. CALCUL DE L'ÉVOLUTION 30 JOURS
  // =====================================================

  if (
    history &&
    history.length >= 2
  ) {
    const validPrices = history
      .map((point) => point?.average)
      .filter(
        (price): price is number =>
          typeof price === "number" &&
          price > 0
      );

    if (validPrices.length >= 2) {
      const oldPrice =
        validPrices[0];

      const latestPrice =
        validPrices[validPrices.length - 1];

      if (oldPrice > 0) {
        evolution30d =
          ((latestPrice - oldPrice) /
            oldPrice) *
          100;
      }
    }
  }

  // =====================================================
  // 4. FALLBACK SUR LA TENDANCE DU MARCHÉ
  // =====================================================

  if (
    history.length < 2 &&
    card
  ) {
    evolution30d =
      getPriceTrend30d(card);
  }

  // =====================================================
  // 5. AUCUN PRIX VALIDE
  // =====================================================

  if (currentPrice <= 0) {
    return {
      predictedPrice30d: 0,
      roi30d: 0,
      confidence: 0,
    };
  }

  // =====================================================
  // 6. MULTIPLICATEUR DE TENDANCE
  // =====================================================
  //
  // Cette partie reste volontairement une estimation.
  // Elle ne modifie jamais le prix de marché réel.
  //

  let trendMultiplier = 1;

  if (evolution30d > 8) {
    trendMultiplier = 1.04;
  } else if (evolution30d > 2) {
    trendMultiplier = 1.02;
  } else if (evolution30d < -8) {
    trendMultiplier = 0.96;
  } else if (evolution30d < -2) {
    trendMultiplier = 0.98;
  }

  // =====================================================
  // 7. SCORE D'INVESTISSEMENT
  // =====================================================

  const normalizedScore =
    typeof score === "number"
      ? Math.min(
          10,
          Math.max(0, score)
        )
      : 5;

  const scoreBoost =
    1 +
    (normalizedScore - 5) /
      120;

  // =====================================================
  // 8. PRIX PRÉDIT À 30 JOURS
  // =====================================================

  const predictedPrice30d =
    currentPrice *
    trendMultiplier *
    scoreBoost;

  // =====================================================
  // 9. ROI PRÉVISIONNEL
  // =====================================================

  const roi30d =
    ((predictedPrice30d -
      currentPrice) /
      currentPrice) *
    100;

  // =====================================================
  // 10. CONFIANCE
  // =====================================================

  let confidence = 50;

  // Historique d'au moins 7 points
  if (history.length >= 7) {
    confidence += 15;
  }

  // Historique d'au moins 30 points
  if (history.length >= 30) {
    confidence += 15;
  }

  // Données Cardmarket 30 jours disponibles
  if (
    card?.cardmarket?.prices?.avg30
  ) {
    confidence += 10;
  }

  // Score IA fortement orienté
  if (
    normalizedScore >= 7.5 ||
    normalizedScore <= 2.5
  ) {
    confidence += 5;
  }

  return {
    predictedPrice30d:
      Number(
        predictedPrice30d.toFixed(2)
      ),

    roi30d:
      Number(
        roi30d.toFixed(2)
      ),

    confidence:
      Math.min(
        95,
        Math.max(
          15,
          confidence
        )
      ),
  };
}
