import type { PokemonCard } from "./types";
import type { PricePoint } from "./priceHistory";
import {
  getAverageMarketPrice,
  getPriceTrend7d,
  getPriceTrend30d,
} from "./marketEngine";
import { getInvestmentScore } from "./investment";

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
 * Analyse une carte et son historique pour déterminer
 * son potentiel d'investissement.
 *
 * IMPORTANT :
 * Le Market Engine est la source de vérité pour :
 * - le prix actuel
 * - la tendance 7 jours
 * - la tendance 30 jours
 *
 * L'historique local reste utilisé uniquement comme
 * donnée complémentaire pour le score de volatilité.
 */
export function getOpportunity(
  card: PokemonCard,
  history: PricePoint[]
): Opportunity {
  /**
   * 💰 Prix actuel réel
   *
   * On ne prend plus le dernier point de localStorage.
   * Le prix actuel doit toujours venir du Market Engine.
   */
  const currentPrice = getAverageMarketPrice(card);

  /**
   * 📈 Tendances réelles du Market Engine
   */
  const trend7d = getPriceTrend7d(card);
  const trend30d = getPriceTrend30d(card);

  /**
   * Tendance globale pondérée.
   *
   * Le 30 jours a davantage de poids afin d'éviter
   * qu'une variation ponctuelle de 7 jours fausse
   * complètement l'analyse.
   */
  const trend = Number(
    (trend7d * 0.4 + trend30d * 0.6).toFixed(2)
  );

  /**
   * 🧠 Score investissement
   *
   * On conserve le moteur d'investissement existant.
   * Celui-ci utilise maintenant les données réelles du
   * Market Engine pour ses tendances.
   */
  const score = getInvestmentScore(card, history);

  /**
   * 🎯 Potentiel
   *
   * Score converti sur 100 + tendance limitée
   * pour éviter les aberrations.
   */
  const potential = Number(
    (
      score * 10 +
      Math.max(-50, Math.min(50, trend))
    ).toFixed(2)
  );

  /**
   * ⚠️ Niveau de risque
   */
  let risk: "LOW" | "MEDIUM" | "HIGH" = "MEDIUM";

  if (score >= 8 && trend >= 0) {
    risk = "LOW";
  }

  if (trend < -10 || score <= 3) {
    risk = "HIGH";
  }

  /**
   * 🧭 Recommandation
   */
  let recommendation: "BUY" | "HOLD" | "SELL" = "HOLD";
  let reason =
    "Carte stable, à conserver et surveiller.";

  if (score >= 8 && trend >= -5) {
    recommendation = "BUY";
    reason =
      "Excellent score d'investissement et marché sain ou en consolidation.";
  } else if (score < 4 || trend < -20) {
    recommendation = "SELL";
    reason =
      "Risque de dépréciation élevé ou indicateurs d'intérêt trop faibles.";
  } else if (trend > 25) {
    recommendation = "HOLD";
    reason =
      "Forte hausse récente, attention au sommet du canal. Conserver sans racheter.";
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
 * 🔥 Classe le portefeuille complet selon
 * le potentiel d'opportunité.
 */
export function rankPortfolio(
  portfolio: {
    card: PokemonCard;
    history: PricePoint[];
  }[]
): Opportunity[] {
  if (!portfolio || !Array.isArray(portfolio)) {
    return [];
  }

  return portfolio
    .map((item) =>
      getOpportunity(item.card, item.history)
    )
    .sort((a, b) => b.potential - a.potential);
}