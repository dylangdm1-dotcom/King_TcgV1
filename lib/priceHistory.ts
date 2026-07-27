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
 * 💾 Sauvegarde le store d'historique dans le localStorage avec gestion du quota
 */
function saveStore(store: HistoryStore) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch (error) {
    console.error("[PriceHistory] Échec de la sauvegarde dans le localStorage:", error);
    // En cas de dépassement de quota, on réduit l'historique global de moitié
    try {
      Object.keys(store).forEach((key) => {
        if (store[key].length > 30) {
          store[key] = store[key].slice(-30);
        }
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    } catch {
      // Ignoré si le localStorage reste bloqué
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
  };

  // Si une entrée existe déjà pour aujourd'hui, on la met à jour au lieu d'empiler
  if (lastPoint && lastDateStr === todayStr) {
    history[lastIndex] = newPoint;
  } else {
    history.push(newPoint);
  }

  // Rétention historique : max 365 jours
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
  const store = getStore();
  return Array.isArray(store[cardId]) ? store[cardId] : [];
}

/**
 * ⏳ Récupère l'historique filtré sur les X derniers jours (ex: 7, 30, 90 jours)
 */
export function getMarketHistoryDays(cardId: string, days: number): PricePoint[] {
  const history = getMarketHistory(cardId);
  if (!history.length) return [];

  const limit = Date.now() - days * 24 * 60 * 60 * 1000;
  return history.filter((p) => p && typeof p.date === "number" && p.date >= limit);
}

/**
 * 📊 Formate l'historique pour le rendre directement digeste par Recharts
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
export function getVariation(history?: PricePoint[] | null): number {
  if (!history || !Array.isArray(history) || history.length < 2) return 0;

  const first = history[0]?.average || 0;
  const last = history[history.length - 1]?.average || 0;

  if (first <= 0) return 0;
  return Number((((last - first) / first) * 100).toFixed(2));
}

/**
 * 🎯 Analyse la tendance globale (Hausse, Baisse, Stable) avec une zone tampon de 5%
 */
export function getTrend(history?: PricePoint[] | null): "up" | "down" | "stable" {
  if (!history || !Array.isArray(history) || history.length < 2) return "stable";

  const variation = getVariation(history);
  if (variation > 5) return "up";
  if (variation < -5) return "down";
  return "stable";
}