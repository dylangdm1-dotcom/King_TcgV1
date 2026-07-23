// lib/predictionEngine.ts

import type { PricePoint } from "./priceHistory";
import type { PredictionResult } from "./types";

/**
 * 🔮 Moteur de prédiction de prix à 30 jours
 * Combine l'inertie historique des prix et le score d'intérêt de la carte
 */
export function predictPrice(
  history: PricePoint[],
  score: number
): PredictionResult {
  // S'il n'y a aucun historique, impossible de prédire quoi que ce soit
  if (!history || !history.length) {
    return {
      predictedPrice30d: 0,
      roi30d: 0,
      confidence: 0,
    };
  }

  const currentPrice = history[history.length - 1].average;
  const oldPrice = history[0].average;

  // Calcul de la tendance d'évolution passée
  const evolution = oldPrice > 0 ? ((currentPrice - oldPrice) / oldPrice) * 100 : 0;

  // 1. Détermination du multiplicateur de tendance marché
  let trendMultiplier = 1.0;
  if (evolution > 5) {
    trendMultiplier = 1.05; // Tendance haussière : +5% d'inertie
  } else if (evolution < -5) {
    trendMultiplier = 0.95; // Tendance baissière : -5% d'inertie
  }

  // 2. Modificateur lié au score de la carte (base médiane de 5/10)
  // Un score supérieur à 5 applique un boost, inférieur à 5 applique un malus
  const normalizedScore = score ?? 5;
  const scoreBoost = 1 + (normalizedScore - 5) / 100;

  // 3. Calcul du prix prédit à 30 jours
  const predictedPrice30d = currentPrice * trendMultiplier * scoreBoost;

  // 4. Calcul du Retour Sur Investissement (ROI) attendu
  const roi30d = currentPrice > 0 ? ((predictedPrice30d - currentPrice) / currentPrice) * 100 : 0;

  // 5. Indice de confiance algorithmique (%)
  let confidence = 50;

  // Plus on a de points historiques, plus la prédiction est fiable
  if (history.length >= 5) confidence += 15;
  if (history.length >= 15) confidence += 15;
  // Si le score montre un intérêt fort (>= 8), la volatilité est mieux maîtrisée
  if (normalizedScore >= 8) confidence += 10;

  return {
    predictedPrice30d: Number(predictedPrice30d.toFixed(2)),
    roi30d: Number(roi30d.toFixed(2)),
    confidence: Math.min(95, Math.max(10, confidence)), // Borné entre 10% et 95% maximum
  };
}