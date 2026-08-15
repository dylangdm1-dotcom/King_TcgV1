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
import { assessAnalysisQuality } from "./analysisQuality";

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
 * Compatibilité historique : génère des repères plats et déterministes.
 * Aucune variation passée ne peut être déduite du seul prix actuel.
 */
export function generatePriceHistory(currentPrice: number): { history30Days: PriceHistoryPoint[]; history1Year: PriceHistoryPoint[] } {
  const history30Days: PriceHistoryPoint[] = [];
  const history1Year: PriceHistoryPoint[] = [];
  
  const now = new Date();

  // Génération sur 30 jours (pas journalier)
  for (let i = 30; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    
    history30Days.push({
      date: d.toISOString().split("T")[0],
      price: currentPrice,
    });
  }

  // Génération sur 1 an (pas mensuel)
  for (let i = 12; i >= 0; i--) {
    const d = new Date(now);
    d.setMonth(d.getMonth() - i);

    history1Year.push({
      date: d.toISOString().split("T")[0],
      price: currentPrice,
    });
  }

  return { history30Days, history1Year };
}

/**
 * Indice de liquidité estimatif (sur 100), fondé sur les échantillons et
 * sources réellement présents. Il ne mesure pas un volume de ventes.
 */
export function calculateLiquidityScore(card: PokemonCard): LiquidityScore {
  const price = getAverageMarketPrice(card);
  const rarity = (card.rarity || "").toLowerCase();
  const name = (card.name || "").toLowerCase();

  const exactListings = Math.max(
    Number(card.ebayListings?.exactSampleSize || 0),
    Number(card.ebayListings?.sampleSize || 0),
    Number(card.justtcg?.sampleSize || 0)
  );
  const compatibleSources = new Set(
    (card.marketQuotes ?? [])
      .filter((quote) => quote.compatible && quote.price > 0)
      .map((quote) => quote.source)
  ).size;
  let score = 20 + Math.min(35, exactListings * 5) + Math.min(24, compatibleSources * 8);

  if (rarity.includes("illustration rare") || rarity.includes("secret") || rarity.includes("alt art") || rarity.includes("alternative")) {
    score += 10;
  } else if (rarity.includes("common") || rarity.includes("commune")) {
    score -= 15;
  }

  if (price > 250) score -= 8;

  score = Math.max(5, Math.min(100, score));

  if (score >= 80) {
    return { label: "Très Élevée", score, description: "Nombreux signaux de cotation ou annonces compatibles ; délai de vente non garanti." };
  } else if (score >= 60) {
    return { label: "Élevée", score, description: "Plusieurs signaux disponibles ; liquidité à confirmer au moment de la vente." };
  } else if (score >= 40) {
    return { label: "Moyenne", score, description: "Couverture de marché moyenne ou échantillon encore limité." };
  } else {
    return { label: "Faible", score, description: "Trop peu de signaux compatibles pour estimer correctement la liquidité." };
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
  const quality = assessAnalysisQuality(card, history);
  const currentMarketPrice = getAverageMarketPrice(card);
  if (currentMarketPrice <= 0) return 0;

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
      .filter((h) => h.origin !== "reconstructed")
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
  const basePrice = currentMarketPrice;
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

  // Une rareté ne suffit pas à produire un score élevé quand la couverture
  // marché est faible. Le plafond rend l'incertitude visible dans la note.
  const coverageCap =
    quality.quality === "insufficient"
      ? 5
      : quality.quality === "limited"
        ? 7
        : quality.quality === "moderate"
          ? 8.5
          : 10;

  return Math.max(0, Math.min(coverageCap, Number(score.toFixed(1))));
}

//
// 🧠 Conseil & Recommandation d'Arbitrage (V5)
//
export function getRecommendation(score: number): string {
  if (score >= 8.5) {
    return "🟢 Signal stratégique très favorable, à confirmer avec la qualité des données et votre prix d’achat.";
  }

  if (score >= 6.5) {
    return "🟡 Signal favorable : dynamique et profil collectionneur intéressants, sans garantie de hausse.";
  }

  if (score >= 4.5) {
    return "🟠 Observation : indicateurs partagés ou données encore insuffisantes pour une décision ferme.";
  }

  return "🔴 Signal prudent : tendance, volatilité ou couverture des données nécessitent une vérification.";
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
