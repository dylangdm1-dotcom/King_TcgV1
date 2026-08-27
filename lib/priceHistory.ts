// lib/priceHistory.ts

import type { MarketHistoryPoint, PokemonCard } from "./types";
import { getMarketData } from "./marketEngine";

export type PricePoint = MarketHistoryPoint;

/** Priorité à l'historique serveur de l'identité marché active, puis au stockage local historique. */
export function getEffectiveMarketHistory(card: PokemonCard): PricePoint[] {
  if (Array.isArray(card.marketHistory) && card.marketHistory.length > 0) {
    return card.marketHistory;
  }
  return getMarketHistory(card.id);
}

type HistoryStore = Record<string, PricePoint[]>;
const STORAGE_KEY = "king_tcg_price_history";

/**
 * 📦 Récupère l'intégralité du store d'historique depuis le localStorage
 */
function getStore(): HistoryStore {
  if (typeof window === "undefined") return {};
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

/**
 * 💾 Sauvegarde le store d'historique dans le localStorage avec gestion du quota
 */
function saveStore(store: HistoryStore) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch (error) {
    console.error("[PriceHistory] Échec de la sauvegarde dans le localStorage:", error);
    try {
      Object.keys(store).forEach((key) => {
        if (store[key].length > 30) {
          store[key] = store[key].slice(-30);
        }
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    } catch {
      // Ignoré si bloqué
    }
  }
}

/**
 * ➕ Enregistre ou met à jour le point de prix du jour pour une carte donnée
 */
export function saveMarketPrice(
  cardId: string,
  cardmarket: number,
  ebay: number,
  tcgplayer: number
) {
  if (!cardId) return;

  const validPrices = [cardmarket, ebay, tcgplayer].filter(
    (p) => typeof p === "number" && p > 0
  );
  if (!validPrices.length) return;

  const average = Number(
    (validPrices.reduce((a, b) => a + b, 0) / validPrices.length).toFixed(2)
  );

  const store = getStore();

  if (!store[cardId]) {
    store[cardId] = [];
  }

  const history = store[cardId];
  const now = Date.now();
  const todayStr = new Date(now).toISOString().slice(0, 10);

  const lastIndex = history.length - 1;
  const lastPoint = lastIndex >= 0 ? history[lastIndex] : null;
  const lastDateStr = lastPoint ? new Date(lastPoint.date).toISOString().slice(0, 10) : "";

  const newPoint: PricePoint = {
    date: now,
    cardmarket: cardmarket || 0,
    ebay: ebay || 0,
    tcgplayer: tcgplayer || 0,
    average,
    origin: "observed",
  };

  // Mettre à jour l'entrée existante d'aujourd'hui au lieu de dupliquer
  if (lastPoint && lastDateStr === todayStr) {
    history[lastIndex] = newPoint;
  } else {
    history.push(newPoint);
  }

  // Rétention max 365 jours
  if (history.length > 365) {
    history.shift();
  }

  saveStore(store);
}

/**
 * 🔍 Récupère tout l'historique enregistré en local
 */
export function getMarketHistory(cardId: string): PricePoint[] {
  if (!cardId) return [];
  const store = getStore();
  return Array.isArray(store[cardId]) ? store[cardId] : [];
}

/**
 * 🛠️ Reconstruit une courbe indicative sur X jours (30j min).
 * Ces points ne sont ni des ventes ni des relevés historiques. Ils ne doivent
 * jamais augmenter la confiance d'une analyse.
 */
export function generateSyntheticHistory(card: PokemonCard, days: number = 30): PricePoint[] {
  const market = getMarketData(card);
  const currentAvg = market.average > 0 ? market.average : 10;
  const trend30 = market.priceTrend30d || 0;

  // Calcul du prix estimé à J-30
  const startAvg = currentAvg / (1 + trend30 / 100);
  const points: PricePoint[] = [];

  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  for (let i = days - 1; i >= 0; i--) {
    const timestamp = now - i * dayMs;
    const progress = (days - 1 - i) / Math.max(1, days - 1);
    
    // Bruit/Volatilité réaliste de ±1.5%
    const noise = 1 + (Math.sin(i * 0.8) * 0.015);
    const interpPrice = Number(((startAvg + (currentAvg - startAvg) * progress) * noise).toFixed(2));

    const cmPrice = market.cardmarket > 0 ? Number((market.cardmarket * (interpPrice / currentAvg)).toFixed(2)) : interpPrice;
    const tcgPrice = market.tcgplayer > 0 ? Number((market.tcgplayer * (interpPrice / currentAvg)).toFixed(2)) : interpPrice;
    const ebayPrice = market.ebay > 0 ? Number((market.ebay * (interpPrice / currentAvg)).toFixed(2)) : interpPrice;

    points.push({
      date: timestamp,
      cardmarket: cmPrice,
      tcgplayer: tcgPrice,
      ebay: ebayPrice,
      average: interpPrice,
      origin: "reconstructed",
    });
  }

  return points;
}

/**
 * ⏳ Récupère l'historique filtré sur les X derniers jours (ex: 7, 30, 90 jours).
 * Si l'historique local est vide ou incomplet, reconstitue uniquement une
 * courbe d'affichage à partir des repères de tendance disponibles.
 */
export function getMarketHistoryDays(
  cardOrId: string | PokemonCard,
  days: number = 30
): PricePoint[] {
  const cardId = typeof cardOrId === "string" ? cardOrId : cardOrId.id;
  let history = typeof cardOrId === "string"
    ? getMarketHistory(cardId)
    : getEffectiveMarketHistory(cardOrId);

  // Moins de 3 relevés : courbe indicative explicitement marquée comme reconstruite.
  if (history.length < 3 && typeof cardOrId !== "string") {
    history = generateSyntheticHistory(cardOrId, Math.max(days, 30));
  }

  if (!history.length) return [];

  const limit = Date.now() - days * 24 * 60 * 60 * 1000;
  const filtered = history.filter((p) => p && typeof p.date === "number" && p.date >= limit);

  return filtered.length > 0 ? filtered : history;
}

/**
 * 📊 Formate l'historique pour l'affichage graphique Recharts
 */
export function formatHistoryForGraph(history?: PricePoint[] | null) {
  if (!history || !Array.isArray(history)) return [];
  return history.map((p) => ({
    day: new Date(p.date).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
    }),
    cardmarket: p.cardmarket || 0,
    ebay: p.ebay || 0,
    tcgplayer: p.tcgplayer || 0,
    average: p.average || 0,
    origin: p.origin || "observed",
  }));
}

/**
 * 🕒 Récupère le dernier point de prix
 */
export function getLastPrice(cardOrId: string | PokemonCard): PricePoint | null {
  const history = typeof cardOrId === "string"
    ? getMarketHistory(cardOrId)
    : getEffectiveMarketHistory(cardOrId);
  return history.length > 0 ? history[history.length - 1] : null;
}

/**
 * 📉 Calcule la variation globale (%)
 */
export function getVariation(history?: PricePoint[] | null): number {
  if (!history || !Array.isArray(history)) return 0;
  const observed = history.filter((point) => point?.origin !== "reconstructed");
  if (observed.length < 2) return 0;

  const first = observed[0]?.average || 0;
  const last = observed[observed.length - 1]?.average || 0;

  if (first <= 0) return 0;
  return Number((((last - first) / first) * 100).toFixed(2));
}

/**
 * 🎯 Analyse la tendance globale (Hausse, Baisse, Stable) avec zone tampon de 3%
 */
export function getTrend(history?: PricePoint[] | null): "up" | "down" | "stable" {
  if (!history || !Array.isArray(history)) return "stable";
  const observed = history.filter((point) => point?.origin !== "reconstructed");
  if (observed.length < 2) return "stable";

  const variation = getVariation(observed);
  if (variation > 3) return "up";
  if (variation < -3) return "down";
  return "stable";
}
