import type { PokemonCard } from "./types";
import { getCardPrice } from "./types";
import { getTrend, type PricePoint } from "./priceHistory";

export {
  getTrend,
} from "./priceHistory";

//
// 💰 Score investissement
//

export function getInvestmentScore(
  card: PokemonCard,
  history: PricePoint[]
): number {
  let score = 5;

  // 📈 Tendance

  const trend = getTrend(history);

  if (trend === "up") score += 2;
  if (trend === "down") score -= 2;

  // ⭐ Rareté

  const rarity = card.rarity?.toLowerCase() ?? "";

  if (rarity.includes("rare")) score += 0.5;
  if (rarity.includes("ultra")) score += 1;
  if (rarity.includes("secret")) score += 1;
  if (rarity.includes("hyper")) score += 1;

  // 📊 Volatilité

  if (history.length >= 5) {
    const prices = history
      .map((h) => h.average)
      .filter((p) => p > 0);

    if (prices.length >= 2) {
      const max = Math.max(...prices);
      const min = Math.min(...prices);

      if (min > 0) {
        const volatility = ((max - min) / min) * 100;

        if (volatility > 40) score -= 1;
        if (volatility < 10) score += 0.5;
      }
    }
  }

  // 💰 Prix actuel

  const price = getCardPrice(card) ?? 0;

  if (price > 100) score -= 0.5;
  if (price > 0 && price < 20) score += 0.5;

  return Math.max(
    0,
    Math.min(10, Number(score.toFixed(1)))
  );
}

//
// 🧠 Recommandation
//

export function getRecommendation(score: number): string {
  if (score >= 8) {
    return "🟢 Très bonne opportunité : carte intéressante pour investissement.";
  }

  if (score >= 6) {
    return "🟡 Opportunité correcte : surveiller l'évolution du prix.";
  }

  if (score >= 4) {
    return "🟠 Carte moyenne : attendre une meilleure opportunité.";
  }

  return "🔴 Risque élevé : éviter ou analyser davantage.";
}