// lib/opportunity.ts

import type { PokemonCard } from "./types";
import type { PricePoint } from "./priceHistory";
import { getInvestmentScore } from "./investment";
import { getCardMarketPrice } from "./marketEngine";

export type Opportunity = {
  id: string;
  name: string;
  score: number;
  trend: number;
  currentPrice: number;
  potential: number;
  risk: "LOW" | "MEDIUM" | "HIGH";
  recommendation: "BUY" | "HOLD" | "SELL";
  reason: string;
};

/**
 * 📊 Analyse une carte et son historique pour en déduire une opportunité d'investissement
 */
export function getOpportunity(card: PokemonCard, history: PricePoint[]): Opportunity {
  const score = getInvestmentScore(card, history);
  
  // Alignement avec getCardMarketPrice de ton marketEngine
  const fallbackPrice = getCardMarketPrice(card);
  const currentPrice = history.length > 0 ? history[history.length - 1].average : fallbackPrice;

  let trend = 0;
  if (history.length >= 2) {
    const first = history[0].average;
    const last = history[history.length - 1].average;
    if (first > 0) {
      trend = Number((((last - first) / first) * 100).toFixed(2));
    }
  }

  // Calcul du potentiel (Score sur 100 + Tendance lissée pour éviter les aberrations)
  const potential = Number((score * 10 + Math.max(-50, Math.min(50, trend))).toFixed(2));

  let risk: "LOW" | "MEDIUM" | "HIGH" = "MEDIUM";
  if (score >= 8 && trend >= 0) risk = "LOW";
  if (trend < -10 || score <= 3) risk = "HIGH";

  let recommendation: "BUY" | "HOLD" | "SELL" = "HOLD";
  let reason = "Carte stable, à conserver et surveiller.";

  if (score >= 8 && trend >= -5) {
    recommendation = "BUY";
    reason = "Excellent score d'investissement et marché sain ou en consolidation.";
  } else if (score < 4 || trend < -20) {
    recommendation = "SELL";
    reason = "Risque de dépréciation élevé ou indicateurs d'intérêt trop faibles.";
  } else if (trend > 25) {
    recommendation = "HOLD";
    reason = "Forte hausse récente, attention au sommet du canal. Conserver sans racheter.";
  }

  return {
    id: card.id,
    name: card.name,
    score,
    trend,
    currentPrice,
    potential,
    risk,
    recommendation,
    reason,
  };
}

/**
 * 🔥 Classe et tri un portefeuille complet selon le potentiel des opportunités
 */
export function rankPortfolio(
  portfolio: { card: PokemonCard; history: PricePoint[] }[]
): Opportunity[] {
  if (!portfolio || !Array.isArray(portfolio)) return [];

  return portfolio
    .map((item) => getOpportunity(item.card, item.history))
    .sort((a, b) => b.potential - a.potential);
}