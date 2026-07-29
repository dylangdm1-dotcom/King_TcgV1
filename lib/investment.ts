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
    score += 1.5; // Très prisé sur le marché secondaire
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

        if (volatility > 45) score -= 1.0;  // Forte instabilité / Bulle spéculative
        if (volatility < 12) score += 0.5;  // Grande stabilité du cours
      }
    }
  }

  // 💰 4. Évaluation du Niveau de Prix Ajusté selon l'État
  const basePrice = getAverageMarketPrice(card);
  const adjustedPrice = getAdjustedPriceByCondition(basePrice, condition);

  if (adjustedPrice > 250) {
    score -= 0.5; // Ticket d'entrée élevé, liquidité plus faible
  } else if (adjustedPrice > 0 && adjustedPrice < 25) {
    score += 0.5; // Fort potentiel de multiplication à petit budget
  }

  // 🌐 5. Opportunité d'Arbitrage Inter-continental (Spread USA / Europe)
  const spread = getMarketSpread(card);
  if (spread > 5 && adjustedPrice > 0) {
    const spreadPercent = (spread / adjustedPrice) * 100;
    if (spreadPercent > 20) {
      score += 0.5; // Écart de marché exploitable
    }
  }

  return Math.max(0, Math.min(10, Number(score.toFixed(1))));
}

//
// 🧠 Conseil & Recommandation d'Arbitrage
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