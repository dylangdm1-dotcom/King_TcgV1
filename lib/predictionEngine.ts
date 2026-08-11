// lib/predictionEngine.ts

import type { PricePoint } from "./priceHistory";
import type { PokemonCard, PredictionResult } from "./types";
import { getMarketData, getAdjustedPriceByCondition } from "./marketEngine";

/**
 * 🔮 Moteur de prédiction de prix à 30 jours
 * Combine l'inertie historique des prix planchers, les données du marché et le score IA
 */
export function predictPrice(
  history: PricePoint[] = [],
  score: number = 5,
  card?: PokemonCard | null,
  condition: string = "Near Mint"
): PredictionResult {
  let currentPrice = 0;
  let evolution30d = 0;

  // V53: Asian cards previously accumulated polluted local histories while
  // their marketplace routes were incomplete. Once a fresh market quote exists,
  // JP/CN projections must start from that quote, not from the stale cache.
  const forceFreshMarket =
    card?.dataLanguage === "ja" || card?.dataLanguage === "zh-tw";

  if (forceFreshMarket && card) {
    const market = getMarketData(card);
    currentPrice = market.average;
    evolution30d = market.priceTrend30d || market.priceTrend7d || 0;
  }

  // 1. Détermination du prix actuel et de l'évolution sur 30j
  if (!forceFreshMarket && history && history.length > 0) {
    const validPrices = history
      .map((h) => h?.average)
      .filter((p): p is number => typeof p === "number" && p > 0);

    if (validPrices.length > 0) {
      currentPrice = validPrices[validPrices.length - 1];
      const oldPrice = validPrices[0];
      if (oldPrice > 0) {
        evolution30d = ((currentPrice - oldPrice) / oldPrice) * 100;
      }
    }
  }

  // Fallback direct sur le marketEngine si l'historique local est insuffisant
  if (currentPrice <= 0 && card) {
    const market = getMarketData(card);
    currentPrice = market.average;
    evolution30d = market.priceTrend30d || 0;
  }

  // Ajustement immédiat au niveau d'état sélectionné
  currentPrice = getAdjustedPriceByCondition(currentPrice, condition);

  // S'il n'y a toujours aucun prix valide
  if (currentPrice <= 0) {
    return {
      predictedPrice30d: 0,
      roi30d: 0,
      confidence: 0,
    };
  }

  // 2. Détermination du multiplicateur d'inertie de marché
  let trendMultiplier = 1.0;
  if (evolution30d > 8) {
    trendMultiplier = 1.04; // Tendance haussière soutenue (+4%)
  } else if (evolution30d > 2) {
    trendMultiplier = 1.02; // Tendance légèrement haussière (+2%)
  } else if (evolution30d < -8) {
    trendMultiplier = 0.96; // Tendance baissière (-4%)
  } else if (evolution30d < -2) {
    trendMultiplier = 0.98; // Tendance légèrement baissière (-2%)
  }

  // 3. Modificateur lié au score d'investissement IA (médiane = 5)
  const normalizedScore = typeof score === "number" ? score : 5;
  const scoreBoost = 1 + (normalizedScore - 5) / 120; // Ajustement lissé

  // 4. Calcul du prix prédit à 30 jours
  const predictedPrice30d = currentPrice * trendMultiplier * scoreBoost;

  // 5. Calcul du Retour Sur Investissement (ROI) attendu (%)
  const roi30d = ((predictedPrice30d - currentPrice) / currentPrice) * 100;

  // 6. Calcul de l'indice de confiance algorithmique (%)
  let confidence = 50;

  if (history && history.length >= 7) confidence += 15;
  if (history && history.length >= 30) confidence += 15;
  if (card?.cardmarket?.prices?.avg30) confidence += 10;
  if (normalizedScore >= 7.5 || normalizedScore <= 2.5) confidence += 5;

  return {
    predictedPrice30d: Number(predictedPrice30d.toFixed(2)),
    roi30d: Number(roi30d.toFixed(2)),
    confidence: Math.min(95, Math.max(15, confidence)), // Borné entre 15% et 95%
  };
}