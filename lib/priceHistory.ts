// lib/priceHistory.ts

export type PricePoint = {
  date: number;
  cardmarket: number;
  ebay: number;
  tcgplayer: number;
  average: number;
};

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
 * 💾 Sauvegarde le store d'historique dans le localStorage
 */
function saveStore(store: HistoryStore) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch (error) {
    console.error("[PriceHistory] Échec de la sauvegarde dans le localStorage:", error);
  }
}

/**
 * ➕ Enregistre un nouveau point de prix pour une carte donnée
 */
export function saveMarketPrice(cardId: string, cardmarket: number, ebay: number, tcgplayer: number) {
  if (!cardId) return;
  
  const validPrices = [cardmarket, ebay, tcgplayer].filter((p) => p > 0);
  if (!validPrices.length) return;

  const average = Number((validPrices.reduce((a, b) => a + b, 0) / validPrices.length).toFixed(2));
  const store = getStore();

  if (!store[cardId]) {
    store[cardId] = [];
  }
  
  const history = store[cardId];
  const last = history.length > 0 ? history[history.length - 1] : null;

  // On évite d'empiler des doublons si le prix moyen n'a absolument pas bougé
  if (last && last.average === average) return;

  history.push({
    date: Date.now(),
    cardmarket: cardmarket || 0,
    ebay: ebay || 0,
    tcgplayer: tcgplayer || 0,
    average,
  });

  // Rétention historique : on garde au maximum 1 an de points (365 jours)
  if (history.length > 365) {
    history.shift();
  }
  
  saveStore(store);
}

/**
 * 🔍 Récupère tout l'historique d'une carte spécifique
 */
export function getMarketHistory(cardId: string): PricePoint[] {
  if (!cardId) return [];
  return getStore()[cardId] || [];
}

/**
 * ⏳ Récupère l'historique filtré sur les X derniers jours (ex: 7, 30, 90 jours)
 */
export function getMarketHistoryDays(cardId: string, days: number): PricePoint[] {
  const history = getMarketHistory(cardId);
  if (!history.length) return [];
  
  const limit = Date.now() - days * 24 * 60 * 60 * 1000;
  return history.filter((p) => p.date >= limit);
}

/**
 * 📊 Formate l'historique pour le rendre directement digeste par Recharts ou ton outil de graphiques
 */
export function formatHistoryForGraph(history: PricePoint[]) {
  if (!history) return [];
  return history.map((p) => ({
    day: new Date(p.date).toLocaleDateString("fr-FR", { day: '2-digit', month: '2-digit' }),
    cardmarket: p.cardmarket,
    ebay: p.ebay,
    tcgplayer: p.tcgplayer,
    average: p.average,
  }));
}

/**
 * 🕒 Récupère le tout dernier point de prix enregistré
 */
export function getLastPrice(cardId: string): PricePoint | null {
  const history = getMarketHistory(cardId);
  return history.length > 0 ? history[history.length - 1] : null;
}

/**
 * 📉 Calcule la variation en pourcentage sur la période fournie
 */
export function getVariation(history: PricePoint[]): number {
  if (!history || history.length < 2) return 0;
  
  const first = history[0].average;
  const last = history[history.length - 1].average;
  
  if (first <= 0) return 0;
  return Number((((last - first) / first) * 100).toFixed(2));
}

/**
 * 🎯 Analyse la tendance globale (Hausse, Baisse, Stable) avec une zone tampon de 5%
 */
export function getTrend(history: PricePoint[]): "up" | "down" | "stable" {
  if (!history || history.length < 2) return "stable";
  
  const variation = getVariation(history);
  if (variation > 5) return "up";
  if (variation < -5) return "down";
  return "stable";
}