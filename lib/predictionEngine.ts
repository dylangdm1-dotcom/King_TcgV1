// lib/predictionEngine.ts

import type { PricePoint } from "./priceHistory";
import type { PokemonCard, PredictionResult } from "./types";
import { getMarketData, getAdjustedPriceByCondition } from "./marketEngine";
import { assessAnalysisQuality, observedHistory } from "./analysisQuality";

/**
 * Projection algorithmique à 30 jours. Ce n'est pas un modèle prédictif entraîné :
 * le scénario amortit les tendances disponibles et expose sa couverture réelle.
 */
export function predictPrice(
  history: PricePoint[] = [],
  score: number = 5,
  card?: PokemonCard | null,
  condition: string = "Near Mint"
): PredictionResult {
  let currentPrice = 0;
  let evolution30d = 0;
  const quality = assessAnalysisQuality(card, history);
  const observed = observedHistory(history);

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
  if (!forceFreshMarket && observed.length > 0) {
    const validPrices = observed
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
      rangeLow: 0,
      rangeHigh: 0,
      quality: "insufficient",
      qualityLabel: "Insuffisante",
      evidence: quality.evidence,
    };
  }

  // On amortit fortement la tendance : un repère 30 j ne devient jamais une promesse 30 j.
  const dampedTrend = Math.max(-12, Math.min(12, evolution30d * 0.35));

  // 3. Modificateur lié au score d'investissement IA (médiane = 5)
  const normalizedScore = typeof score === "number" ? score : 5;
  const scoreAdjustment = Math.max(-1.5, Math.min(1.5, (normalizedScore - 5) * 0.3));

  // 4. Calcul du prix prédit à 30 jours
  const scenarioRate = Math.max(-15, Math.min(15, dampedTrend + scoreAdjustment));
  const predictedPrice30d = currentPrice * (1 + scenarioRate / 100);

  // 5. Calcul du Retour Sur Investissement (ROI) attendu (%)
  const roi30d = ((predictedPrice30d - currentPrice) / currentPrice) * 100;

  const uncertainty = currentPrice * quality.uncertaintyRate;

  return {
    predictedPrice30d: Number(predictedPrice30d.toFixed(2)),
    roi30d: Number(roi30d.toFixed(2)),
    confidence: quality.coverage,
    rangeLow: Number(Math.max(0, predictedPrice30d - uncertainty).toFixed(2)),
    rangeHigh: Number((predictedPrice30d + uncertainty).toFixed(2)),
    quality: quality.quality,
    qualityLabel: quality.label,
    evidence: quality.evidence,
  };
}
