// lib/investment.ts

import type { PokemonCard } from "./types";
import { getTrend, type PricePoint } from "./priceHistory";
import { 
  getAverageMarketPrice, 
  getAdjustedPriceByCondition,
  getMarketSpread,
  getPriceTrend7d,
  getPriceTrend30d
} from "./marketEngine";

export { getTrend } from "./priceHistory";

export type PriceHistoryPoint = {
  date: string;
  price: number;
};

export type LiquidityScore = {
  label: "Très Élevée" | "Élevée" | "Moyenne" | "Faible";
  score: number; // de 0 à 100
  description: string;
};

export type InvestmentAnalysis = {
  currentValue: number;
  estimatedGrowth30Days: number; // en pourcentage (%)
  liquidity: LiquidityScore;
  history30Days: PriceHistoryPoint[];
  history1Year: PriceHistoryPoint[];
  advice: string;
};

/**
 * Génère un historique de prix simulé mais réaliste basé sur le prix actuel de la carte
 */
export function generatePriceHistory(currentPrice: number): { history30Days: PriceHistoryPoint[]; history1Year: PriceHistoryPoint[] } {
  const history30Days: PriceHistoryPoint[] = [];
  const history1Year: PriceHistoryPoint[] = [];
  
  const now = new Date();

  // Génération sur 30 jours (pas journalier)
  for (let i = 30; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    
    const variance = 1 + (Math.sin(i * 0.5) * 0.04) + ((Math.random() - 0.5) * 0.02);
    const historicalPrice = Math.max(0.10, Number((currentPrice * variance).toFixed(2)));
    
    history30Days.push({
      date: d.toISOString().split("T")[0],
      price: i === 0 ? currentPrice : historicalPrice,
    });
  }

  // Génération sur 1 an (pas mensuel)
  for (let i = 12; i >= 0; i--) {
    const d = new Date(now);
    d.setMonth(d.getMonth() - i);

    const variance = 1 + (Math.cos(i * 0.8) * 0.12) + ((Math.random() - 0.5) * 0.05);
    const historicalPrice = Math.max(0.10, Number((currentPrice * variance).toFixed(2)));

    history1Year.push({
      date: d.toISOString().split("T")[0],
      price: i === 0 ? currentPrice : historicalPrice,
    });
  }

  return { history30Days, history1Year };
}

/**
 * Calcule le score de liquidité IA d'une carte (sur 100)
 */
export function calculateLiquidityScore(card: PokemonCard): LiquidityScore {
  const price = getAverageMarketPrice(card);
  const rarity = (card.rarity || "").toLowerCase();
  const name = (card.name || "").toLowerCase();

  let score = 50;

  if (name.includes("dracaufeu") || name.includes("charizard") || name.includes("pikachu")) {
    score += 30;
  }

  if (rarity.includes("illustration rare") || rarity.includes("secret") || rarity.includes("alt art") || rarity.includes("alternative")) {
    score += 20;
  } else if (rarity.includes("common") || rarity.includes("commune")) {
    score -= 15;
  }

  if (price > 100) {
    score -= 10;
  }

  score = Math.max(5, Math.min(100, score));

  if (score >= 80) {
    return { label: "Très Élevée", score, description: "Forte demande sur le marché. Revente très rapide." };
  } else if (score >= 60) {
    return { label: "Élevée", score, description: "Bonne liquidité. Trouve preneur facilement." };
  } else if (score >= 40) {
    return { label: "Moyenne", score, description: "Marché stable mais demande ciblée." };
  } else {
    return { label: "Faible", score, description: "Volume d'échange restreint. Demande de patience pour la revente." };
  }
}

//
// 💰 Score investissement IA (sur 10)
//
export function getInvestmentScore(
  card: PokemonCard,
  history: PricePoint[] = [],
  condition: string = "Near Mint"
): number {
  let score = 5;

  // 📈 1. Analyse des Tendances Réelles (7j / 30j)
  const trend7d = getPriceTrend7d(card);
  const trend30d = getPriceTrend30d(card);
  const generalTrend = getTrend(history);

  if (trend7d > 5 || trend30d > 10 || generalTrend === "up") score += 2;
  else if (trend7d < -5 || trend30d < -10 || generalTrend === "down") score -= 2;

  // ⭐ 2. Facteur Rareté & Attractivité Collectionneur
  const rarity = card.rarity?.toLowerCase() ?? "";

  if (rarity.includes("illustration") || rarity.includes("alt") || rarity.includes("alternative")) {
    score += 1.5;
  } else if (rarity.includes("secret") || rarity.includes("hyper") || rarity.includes("rainbow")) {
    score += 1.0;
  } else if (rarity.includes("ultra") || rarity.includes("vmax") || rarity.includes("vstar") || rarity.includes("ex")) {
    score += 0.5;
  } else if (rarity.includes("rare")) {
    score += 0.25;
  }

  // 📊 3. Analyse de Volatilité dans l'Historique
  if (history && history.length >= 3) {
    const prices = history
      .map((h) => h.average)
      .filter((p): p is number => typeof p === "number" && p > 0);

    if (prices.length >= 2) {
      const max = Math.max(...prices);
      const min = Math.min(...prices);

      if (min > 0) {
        const volatility = ((max - min) / min) * 100;

        if (volatility > 45) score -= 1.0;
        if (volatility < 12) score += 0.5;
      }
    }
  }

  // 💰 4. Évaluation du Niveau de Prix Ajusté selon l'État
  const basePrice = getAverageMarketPrice(card);
  const adjustedPrice = getAdjustedPriceByCondition(basePrice, condition);

  if (adjustedPrice > 250) {
    score -= 0.5;
  } else if (adjustedPrice > 0 && adjustedPrice < 25) {
    score += 0.5;
  }

  // 🌐 5. Opportunité d'Arbitrage Inter-continental (Spread USA / Europe)
  const spread = getMarketSpread(card);
  if (spread > 5 && adjustedPrice > 0) {
    const spreadPercent = (spread / adjustedPrice) * 100;
    if (spreadPercent > 20) {
      score += 0.5;
    }
  }

  return Math.max(0, Math.min(10, Number(score.toFixed(1))));
}

//
// 🧠 Conseil & Recommandation d'Arbitrage (V5)
//
export function getRecommendation(score: number): string {
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

/**
 * Analyse complète d'investissement V5 combinant notation et graphiques d'historique
 */
export function getCardInvestmentAnalysis(card: PokemonCard, history: PricePoint[] = [], condition: string = "Near Mint"): InvestmentAnalysis {
  const currentValue = getAdjustedPriceByCondition(getAverageMarketPrice(card), condition);
  const { history30Days, history1Year } = generatePriceHistory(currentValue);
  const liquidity = calculateLiquidityScore(card);
  const score = getInvestmentScore(card, history, condition);

  const startMonthPrice = history30Days[0].price;
  const estimatedGrowth30Days = startMonthPrice > 0 
    ? Number((((currentValue - startMonthPrice) / startMonthPrice) * 100).toFixed(1))
    : 0;

  const advice = getRecommendation(score);

  return {
    currentValue,
    estimatedGrowth30Days,
    liquidity,
    history30Days,
    history1Year,
    advice,
  };
}
