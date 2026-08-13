import type { PokemonCard } from "../../types";

import { getMarketData, getMarketSpread } from "../../marketEngine";

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

export function buildMarketAnalysis(card: PokemonCard) {
  const history: PricePoint[] = getMarketHistory(card.id);

  const market = getMarketData(card);

  const spread = getMarketSpread(card);

  const trend = getTrend(history);

  const score = getInvestmentScore(card, history);

  const recommendation = getRecommendation(score);

  const prediction = predictPrice(history, score);

  return {
    market,
    spread,

    history,

    trend,
    score,
    recommendation,

    prediction,

    priceInfo: {
      current: getCurrentPrice(history),
      lowest: getLowestPrice(history),
      highest: getHighestPrice(history),
      variation: getVariationPercent(history),
      opportunity: getPriceOpportunity (history).text,
    },
  };
}