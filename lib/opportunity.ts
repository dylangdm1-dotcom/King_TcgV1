// lib/opportunity.ts

import type { PokemonCard } from "./types";
import type { PricePoint } from "./priceHistory";
import { getInvestmentScore } from "./investment";
import {
  DEFAULT_CONDITION,
  getLowestMarketPrice,
} from "./marketEngine";

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
 * =====================================================
 * 📊 KING_TCG OPPORTUNITY V5
 * =====================================================
 *
 * Analyse une carte et son historique pour déterminer
 * son potentiel d'investissement.
 *
 * PRINCIPES :
 * - Near Mint par défaut
 * - prix actuel = vrai prix minimum disponible
 * - aucune condition ajustée artificiellement
 * - historique réel prioritaire
 * - aucune estimation utilisée comme prix de marché
 *
 * =====================================================
 */

/**
 * 📊 Analyse une carte et son historique
 * pour en déduire une opportunité d'investissement.
 */
export function getOpportunity(
  card: PokemonCard,
  history: PricePoint[],
  condition: string = DEFAULT_CONDITION
): Opportunity {
  const safeHistory =
    Array.isArray(history)
      ? history
      : [];

  // =====================================================
  // 🧠 SCORE D'INVESTISSEMENT
  // =====================================================

  const score =
    getInvestmentScore(
      card,
      safeHistory
    );

  // =====================================================
  // 💰 PRIX ACTUEL RÉEL
  // =====================================================
  //
  // Priorité au vrai prix minimum du marché.
  //

  let currentPrice =
    getLowestMarketPrice(
      card,
      condition
    );

  // =====================================================
  // 📜 FALLBACK SUR L'HISTORIQUE RÉEL
  // =====================================================

  if (
    currentPrice <= 0 &&
    safeHistory.length > 0
  ) {
    for (
      let i =
        safeHistory.length - 1;
      i >= 0;
      i--
    ) {
      const historicalPrice =
        safeHistory[i]?.average;

      if (
        typeof historicalPrice ===
          "number" &&
        historicalPrice > 0
      ) {
        currentPrice =
          historicalPrice;
        break;
      }
    }
  }

  // =====================================================
  // 📈 TENDANCE
  // =====================================================

  let trend = 0;

  if (safeHistory.length >= 2) {
    const validHistory =
      safeHistory.filter(
        (point) =>
          typeof point?.average ===
            "number" &&
          point.average > 0
      );

    if (validHistory.length >= 2) {
      const first =
        validHistory[0].average;

      const last =
        validHistory[
          validHistory.length - 1
        ].average;

      if (first > 0) {
        trend = Number(
          (
            ((last - first) /
              first) *
            100
          ).toFixed(2)
        );
      }
    }
  }

  // =====================================================
  // 🎯 POTENTIEL
  // =====================================================
  //
  // Score sur 100 + tendance limitée à ±50 %
  // afin d'éviter qu'une variation extrême
  // domine totalement le score.
  //

  const potential =
    Number(
      (
        score * 10 +
        Math.max(
          -50,
          Math.min(50, trend)
        )
      ).toFixed(2)
    );

  // =====================================================
  // ⚠️ RISQUE
  // =====================================================

  let risk:
    | "LOW"
    | "MEDIUM"
    | "HIGH" = "MEDIUM";

  if (
    score >= 8 &&
    trend >= 0
  ) {
    risk = "LOW";
  }

  if (
    trend < -10 ||
    score <= 3
  ) {
    risk = "HIGH";
  }

  // =====================================================
  // 🧭 RECOMMANDATION
  // =====================================================

  let recommendation:
    | "BUY"
    | "HOLD"
    | "SELL" = "HOLD";

  let reason =
    "Carte stable, à conserver et surveiller.";

  if (
    score >= 8 &&
    trend >= -5
  ) {
    recommendation = "BUY";

    reason =
      "Excellent score d'investissement et marché sain ou en consolidation.";
  } else if (
    score < 4 ||
    trend < -20
  ) {
    recommendation = "SELL";

    reason =
      "Risque de dépréciation élevé ou indicateurs d'intérêt trop faibles.";
  } else if (
    trend > 25
  ) {
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
 * 🔥 Classe et trie un portefeuille complet
 * selon le potentiel des opportunités.
 *
 * Near Mint est utilisé par défaut.
 */
export function rankPortfolio(
  portfolio: {
    card: PokemonCard;
    history: PricePoint[];
  }[],
  condition: string = DEFAULT_CONDITION
): Opportunity[] {
  if (
    !portfolio ||
    !Array.isArray(portfolio)
  ) {
    return [];
  }

  return portfolio
    .map((item) =>
      getOpportunity(
        item.card,
        item.history,
        condition
      )
    )
    .sort(
      (a, b) =>
        b.potential -
        a.potential
    );
}
