// lib/services/market/analysis.ts

import type { PokemonCard } from "../../types";

import {
  getMarketData,
  getMarketSpread,
} from "../../marketEngine";

import {
  getTrend,
  getInvestmentScore,
  getRecommendation,
} from "../../investment";

import { predictPrice } from "../../predictionEngine";

import {
  getCurrentPrice,
  getLowestPrice,
  getHighestPrice,
  getVariationPercent,
  getPriceOpportunity,
} from "../../priceIntelligence";

import {
  getMarketHistory,
  type PricePoint,
} from "../../priceHistory";

/**
 * 📊 Construit l'analyse complète du marché pour une carte.
 *
 * V5 :
 * - Near Mint par défaut
 * - Historique local réel
 * - Prix ajustés selon l'état
 * - Score investissement centralisé
 * - Prédiction 30 jours
 */
export function buildMarketAnalysis(
  card: PokemonCard,
  condition: string = "Near Mint"
) {
  if (!card?.id) {
    return {
      market: null,
      spread: 0,
      history: [],
      trend: "stable" as const,
      score: 0,
      recommendation: "Données insuffisantes",
      prediction: {
        predictedPrice30d: 0,
        roi30d: 0,
        confidence: 0,
      },
      priceInfo: {
        current: 0,
        lowest: 0,
        highest: 0,
        variation: 0,
        opportunity: "Données de marché insuffisantes",
      },
    };
  }

  //
  // 📈 HISTORIQUE
  //

  const history: PricePoint[] = getMarketHistory(card.id);

  //
  // 💰 DONNÉES MARCHÉ
  //

  const market = getMarketData(card);

  const spread = getMarketSpread(card);

  //
  // 📊 TENDANCE
  //

  const trend = getTrend(history);

  //
  // 🧠 SCORE INVESTISSEMENT
  //

  const score = getInvestmentScore(
    card,
    history,
    condition
  );

  const recommendation = getRecommendation(score);

  //
  // 🔮 PRÉDICTION 30 JOURS
  //

  const prediction = predictPrice(
    history,
    score,
    card,
    condition
  );

  //
  // 💶 INTELLIGENCE PRIX
  //

  const current = getCurrentPrice(
    history,
    card,
    condition
  );

  const lowest = getLowestPrice(history);
  const highest = getHighestPrice(history);

  const variation = getVariationPercent(history);

  const opportunity = getPriceOpportunity(
    history,
    card,
    condition
  );

  return {
    market,
    spread,

    history,

    trend,
    score,
    recommendation,

    prediction,

    priceInfo: {
      current,
      lowest,
      highest,
      variation,

      opportunity: opportunity.text,
      opportunityLevel: opportunity.level,
    },

    condition,
  };
}