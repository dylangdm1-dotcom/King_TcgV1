import type { PokemonCard } from "./types";
import type { PricePoint } from "./priceHistory";
import {
  getEffectiveCurrentPrice,
  getEffectiveTrend7d,
  getEffectiveTrend30d,
  hasUsableMarketSignal,
} from "./portfolioSignals";
import { getInvestmentScore } from "./investment";
import { assessAnalysisQuality, type AnalysisQuality } from "./analysisQuality";

export type Opportunity = {
  id: string;
  name: string;
  number?: string;
  score: number;
  trend: number;
  currentPrice: number;
  potential: number;
  risk: "LOW" | "MEDIUM" | "HIGH";
  recommendation: "BUY" | "HOLD" | "SELL";
  reason: string;
  trend7d: number;
  trend30d: number;
  hasMarketSignal: boolean;
  isActionable: boolean;
  dataCoverage: number;
  dataQuality: AnalysisQuality;
  dataQualityLabel: string;
  scenarioLow: number;
  scenarioHigh: number;
  evidence: string[];
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
  const currentPrice = getEffectiveCurrentPrice(card);

  /**
   * 📈 Tendances réelles du Market Engine
   */
  const trend7d = getEffectiveTrend7d(card);
  const trend30d = getEffectiveTrend30d(card);

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
  const potential = Number(Math.max(0, Math.min(100, score * 10 + Math.max(-25, Math.min(25, trend)))).toFixed(2));
  const quality = assessAnalysisQuality(card, history);
  const scenarioCentral = Math.max(-15, Math.min(15, trend * 0.35 + (score - 5) * 0.3));
  const uncertainty = quality.uncertaintyRate * 100;
  const scenarioLow = Number(Math.max(-30, scenarioCentral - uncertainty).toFixed(1));
  const scenarioHigh = Number(Math.min(30, scenarioCentral + uncertainty).toFixed(1));

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
      "Score stratégique élevé et signal marché mesurable ; scénario à confirmer avec la couverture des données.";
  } else if (score < 4 || trend < -20) {
    recommendation = "SELL";
    reason =
      "Signal baissier ou score stratégique faible ; aucune vente n’est déduite automatiquement.";
  } else if (trend > 25) {
    recommendation = "HOLD";
    reason =
      "Hausse récente marquée : volatilité accrue et risque de correction à surveiller.";
  }

  const hasMarketSignal = hasUsableMarketSignal(card);
  const isActionable =
    currentPrice > 0 &&
    hasMarketSignal &&
    (recommendation !== "HOLD" || Math.abs(trend) >= 2 || score >= 7);

  return {
    id: card.id,
    name: card.name,
    number: card.number,
    score,
    trend,
    currentPrice,
    potential,
    risk,
    recommendation,
    reason,
    trend7d,
    trend30d,
    hasMarketSignal,
    isActionable,
    dataCoverage: quality.coverage,
    dataQuality: quality.quality,
    dataQualityLabel: quality.label,
    scenarioLow,
    scenarioHigh,
    evidence: quality.evidence,
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
