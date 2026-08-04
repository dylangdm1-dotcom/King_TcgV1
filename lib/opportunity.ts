import type { PokemonCard } from "./types";
import type { PricePoint } from "./priceHistory";
import { getInvestmentScore } from "./investment";
import { getMarketData } from "./marketEngine";

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
 * son potentiel d'opportunité.
 *
 * SOURCE DU PRIX ACTUEL :
 * marketEngine = source officielle du prix actuel.
 *
 * HISTORIQUE :
 * utilisé uniquement pour calculer la tendance.
 */
export function getOpportunity(
  card: PokemonCard,
  history: PricePoint[]
): Opportunity {
  const score = getInvestmentScore(card, history);

  /*
   * IMPORTANT :
   * Le prix actuel doit toujours venir du marketEngine.
   * On évite ainsi d'afficher un ancien point local
   * comme s'il s'agissait du prix actuel.
   */
  const market = getMarketData(card);

  const currentPrice =
    Number.isFinite(market.average) &&
    market.average > 0
      ? market.average
      : 0;

  /*
   * Calcul de la tendance à partir de l'historique.
   */
  let trend = 0;

  if (history.length >= 2) {
    const first = history[0]?.average || 0;
    const last =
      history[history.length - 1]?.average || 0;

    if (first > 0 && last > 0) {
      trend = Number(
        (((last - first) / first) * 100).toFixed(2)
      );
    }
  }

  /*
   * Potentiel :
   * score d'investissement converti sur 100
   * + tendance limitée pour éviter les aberrations.
   */
  const potential = Number(
    (
      score * 10 +
      Math.max(-50, Math.min(50, trend))
    ).toFixed(2)
  );

  let risk: "LOW" | "MEDIUM" | "HIGH" = "MEDIUM";

  if (score >= 8 && trend >= 0) {
    risk = "LOW";
  }

  if (trend < -10 || score <= 3) {
    risk = "HIGH";
  }

  let recommendation:
    | "BUY"
    | "HOLD"
    | "SELL" = "HOLD";

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
 * Classe le portefeuille complet selon le potentiel.
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
      getOpportunity(
        item.card,
        item.history
      )
    )
    .sort(
      (a, b) =>
        b.potential - a.potential
    );
}
