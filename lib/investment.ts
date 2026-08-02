// lib/investment.ts

import type { PokemonCard } from "./types";
import {
  getTrend,
  type PricePoint,
} from "./priceHistory";

import {
  DEFAULT_CONDITION,
  getLowestMarketPrice,
  getAverageMarketPrice,
  getMarketSpread,
  getPriceTrend7d,
  getPriceTrend30d,
} from "./marketEngine";

export { getTrend } from "./priceHistory";

// =====================================================
// 📊 TYPES
// =====================================================

export type PriceHistoryPoint = {
  date: string;
  price: number;
};

export type LiquidityScore = {
  label:
    | "Très Élevée"
    | "Élevée"
    | "Moyenne"
    | "Faible";

  score: number;
  description: string;
};

export type InvestmentAnalysis = {
  currentValue: number;
  estimatedGrowth30Days: number;
  liquidity: LiquidityScore;
  history30Days: PriceHistoryPoint[];
  history1Year: PriceHistoryPoint[];
  advice: string;
};

// =====================================================
// 📜 HISTORIQUE RÉEL
// =====================================================
//
// IMPORTANT :
// Aucun historique synthétique n'est généré.
//
// Les données affichées doivent provenir de
// priceHistory.ts ou du Market Engine.
//
// =====================================================

/**
 * Convertit les points réels PricePoint en format
 * compatible avec les composants d'investissement.
 */
export function formatInvestmentHistory(
  history: PricePoint[] = []
): PriceHistoryPoint[] {
  if (!Array.isArray(history)) {
    return [];
  }

  return history
    .filter(
      (point) =>
        point &&
        typeof point.date === "number" &&
        typeof point.average === "number" &&
        point.average > 0
    )
    .map((point) => ({
      date: new Date(
        point.date
      )
        .toISOString()
        .split("T")[0],

      price: Number(
        point.average.toFixed(2)
      ),
    }));
}

/**
 * Génère les historiques d'investissement
 * à partir des données réellement disponibles.
 *
 * Aucun prix fictif n'est créé.
 */
export function getInvestmentHistory(
  history: PricePoint[] = []
): {
  history30Days: PriceHistoryPoint[];
  history1Year: PriceHistoryPoint[];
} {
  if (!Array.isArray(history)) {
    return {
      history30Days: [],
      history1Year: [],
    };
  }

  const now = Date.now();

  const dayMs =
    24 *
    60 *
    60 *
    1000;

  const thirtyDaysAgo =
    now - 30 * dayMs;

  const oneYearAgo =
    now - 365 * dayMs;

  const history30Days =
    history.filter(
      (point) =>
        typeof point?.date === "number" &&
        point.date >= thirtyDaysAgo
    );

  const history1Year =
    history.filter(
      (point) =>
        typeof point?.date === "number" &&
        point.date >= oneYearAgo
    );

  return {
    history30Days:
      formatInvestmentHistory(
        history30Days
      ),

    history1Year:
      formatInvestmentHistory(
        history1Year
      ),
  };
}

// =====================================================
// 💧 LIQUIDITÉ
// =====================================================

/**
 * Calcule le score de liquidité de la carte.
 */
export function calculateLiquidityScore(
  card: PokemonCard
): LiquidityScore {
  const price =
    getAverageMarketPrice(card);

  const rarity =
    (
      card.rarity || ""
    ).toLowerCase();

  const name =
    (
      card.name || ""
    ).toLowerCase();

  let score = 50;

  // Forte demande de certaines cartes
  if (
    name.includes("dracaufeu") ||
    name.includes("charizard") ||
    name.includes("pikachu")
  ) {
    score += 30;
  }

  // Rareté
  if (
    rarity.includes(
      "illustration rare"
    ) ||
    rarity.includes("secret") ||
    rarity.includes("alt art") ||
    rarity.includes("alternative")
  ) {
    score += 20;
  } else if (
    rarity.includes("common") ||
    rarity.includes("commune")
  ) {
    score -= 15;
  }

  // Prix élevé = liquidité légèrement réduite
  if (price > 100) {
    score -= 10;
  }

  score = Math.max(
    5,
    Math.min(100, score)
  );

  if (score >= 80) {
    return {
      label: "Très Élevée",
      score,
      description:
        "Forte demande sur le marché. Revente très rapide.",
    };
  }

  if (score >= 60) {
    return {
      label: "Élevée",
      score,
      description:
        "Bonne liquidité. Trouve preneur facilement.",
    };
  }

  if (score >= 40) {
    return {
      label: "Moyenne",
      score,
      description:
        "Marché stable mais demande ciblée.",
    };
  }

  return {
    label: "Faible",
    score,
    description:
      "Volume d'échange restreint. Demande de patience pour la revente.",
  };
}

// =====================================================
// 💰 SCORE INVESTISSEMENT IA
// =====================================================

/**
 * Calcule le score d'investissement de 0 à 10.
 *
 * Near Mint est utilisé par défaut.
 */
export function getInvestmentScore(
  card: PokemonCard,
  history: PricePoint[] = [],
  condition: string = DEFAULT_CONDITION
): number {
  let score = 5;

  // =====================================================
  // 📈 1. TENDANCES RÉELLES
  // =====================================================

  const trend7d =
    getPriceTrend7d(card);

  const trend30d =
    getPriceTrend30d(card);

  const generalTrend =
    getTrend(history);

  if (
    trend7d > 5 ||
    trend30d > 10 ||
    generalTrend === "up"
  ) {
    score += 2;
  } else if (
    trend7d < -5 ||
    trend30d < -10 ||
    generalTrend === "down"
  ) {
    score -= 2;
  }

  // =====================================================
  // ⭐ 2. RARETÉ & ATTRACTIVITÉ
  // =====================================================

  const rarity =
    card.rarity
      ?.toLowerCase() ?? "";

  if (
    rarity.includes("illustration") ||
    rarity.includes("alt") ||
    rarity.includes("alternative")
  ) {
    score += 1.5;
  } else if (
    rarity.includes("secret") ||
    rarity.includes("hyper") ||
    rarity.includes("rainbow")
  ) {
    score += 1;
  } else if (
    rarity.includes("ultra") ||
    rarity.includes("vmax") ||
    rarity.includes("vstar") ||
    rarity.includes("ex")
  ) {
    score += 0.5;
  } else if (
    rarity.includes("rare")
  ) {
    score += 0.25;
  }

  // =====================================================
  // 📊 3. VOLATILITÉ HISTORIQUE
  // =====================================================

  if (
    Array.isArray(history) &&
    history.length >= 3
  ) {
    const prices =
      history
        .map(
          (point) =>
            point.average
        )
        .filter(
          (price): price is number =>
            typeof price ===
              "number" &&
            price > 0
        );

    if (prices.length >= 2) {
      const max =
        Math.max(...prices);

      const min =
        Math.min(...prices);

      if (min > 0) {
        const volatility =
          ((max - min) /
            min) *
          100;

        if (
          volatility > 45
        ) {
          score -= 1;
        }

        if (
          volatility < 12
        ) {
          score += 0.5;
        }
      }
    }
  }

  // =====================================================
  // 💰 4. NIVEAU DE PRIX RÉEL
  // =====================================================

  const currentPrice =
    getLowestMarketPrice(
      card,
      condition
    );

  if (currentPrice > 250) {
    score -= 0.5;
  } else if (
    currentPrice > 0 &&
    currentPrice < 25
  ) {
    score += 0.5;
  }

  // =====================================================
  // 🌐 5. SPREAD INTERNATIONAL
  // =====================================================

  const spread =
    getMarketSpread(card);

  if (
    spread > 5 &&
    currentPrice > 0
  ) {
    const spreadPercent =
      (
        spread /
        currentPrice
      ) * 100;

    if (
      spreadPercent > 20
    ) {
      score += 0.5;
    }
  }

  return Math.max(
    0,
    Math.min(
      10,
      Number(
        score.toFixed(1)
      )
    )
  );
}

// =====================================================
// 🧠 RECOMMANDATION
// =====================================================

export function getRecommendation(
  score: number
): string {
  if (score >= 8.5) {
    return "🟢 Forte Opportunité d'Achat : Signal d'investissement très favorable.";
  }

  if (score >= 6.5) {
    return "🟡 Opportunité Modérée : Carte stable, adaptée pour un achat progressif.";
  }

  if (score >= 4.5) {
    return "🟠 Conserver / Observer : Attendre une correction de prix avant d'investir.";
  }

  return "🔴 Risque Élevé : Volatilité importante ou tendance baissière marquée.";
}

// =====================================================
// 📊 ANALYSE COMPLÈTE
// =====================================================

/**
 * Analyse complète d'investissement V5.
 *
 * Utilise uniquement les prix et historiques réels
 * disponibles.
 */
export function getCardInvestmentAnalysis(
  card: PokemonCard,
  history: PricePoint[] = [],
  condition: string = DEFAULT_CONDITION
): InvestmentAnalysis {
  // Prix actuel réel
  const currentValue =
    getLowestMarketPrice(
      card,
      condition
    );

  // Historique réel
  const {
    history30Days,
    history1Year,
  } = getInvestmentHistory(
    history
  );

  // Liquidité
  const liquidity =
    calculateLiquidityScore(card);

  // Score investissement
  const score =
    getInvestmentScore(
      card,
      history,
      condition
    );

  // =====================================================
  // 📈 CROISSANCE 30 JOURS
  // =====================================================

  let estimatedGrowth30Days = 0;

  if (
    history30Days.length >= 2
  ) {
    const first =
      history30Days[0].price;

    const last =
      history30Days[
        history30Days.length - 1
      ].price;

    if (first > 0) {
      estimatedGrowth30Days =
        Number(
          (
            ((last - first) /
              first) *
            100
          ).toFixed(1)
        );
    }
  }

  const advice =
    getRecommendation(score);

  return {
    currentValue,
    estimatedGrowth30Days,
    liquidity,
    history30Days,
    history1Year,
    advice,
  };
}
