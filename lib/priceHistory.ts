// lib/priceHistory.ts

import type { PokemonCard } from "./types";

export type PricePoint = {
  date: number;
  cardmarket: number;
  ebay: number;
  tcgplayer: number;
  average: number;
};

type HistoryStore = Record<string, PricePoint[]>;

const STORAGE_KEY = "king_tcg_price_history";

// Rétention locale maximale : 6 mois
const MAX_HISTORY_DAYS = 180;

/**
 * 📦 Récupère l'intégralité du store d'historique
 * depuis le localStorage.
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
 * avec gestion du quota.
 */
function saveStore(store: HistoryStore) {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(store)
    );
  } catch (error) {
    console.error(
      "[PriceHistory] Échec de la sauvegarde dans le localStorage:",
      error
    );

    try {
      Object.keys(store).forEach((key) => {
        if (store[key].length > 30) {
          store[key] = store[key].slice(-30);
        }
      });

      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(store)
      );
    } catch {
      // Ignoré si le localStorage reste bloqué
    }
  }
}

/**
 * ➕ Enregistre ou met à jour le point de prix du jour
 * pour une carte donnée.
 *
 * Les prix doivent provenir du Market Engine.
 *
 * Une source absente reste à 0.
 * Elle n'est jamais remplacée artificiellement par la moyenne.
 */
export function saveMarketPrice(
  cardId: string,
  cardmarket: number,
  ebay: number,
  tcgplayer: number
) {
  if (!cardId) return;

  const validPrices = [
    cardmarket,
    ebay,
    tcgplayer,
  ].filter(
    (price): price is number =>
      typeof price === "number" && price > 0
  );

  if (!validPrices.length) return;

  // Moyenne uniquement des sources réellement disponibles
  const average = Number(
    (
      validPrices.reduce(
        (sum, price) => sum + price,
        0
      ) / validPrices.length
    ).toFixed(2)
  );

  const store = getStore();

  if (!store[cardId]) {
    store[cardId] = [];
  }

  const history = store[cardId];

  const now = Date.now();
  const todayStr = new Date(now)
    .toISOString()
    .slice(0, 10);

  const lastIndex = history.length - 1;

  const lastPoint =
    lastIndex >= 0
      ? history[lastIndex]
      : null;

  const lastDateStr = lastPoint
    ? new Date(lastPoint.date)
        .toISOString()
        .slice(0, 10)
    : "";

  const newPoint: PricePoint = {
    date: now,
    cardmarket:
      typeof cardmarket === "number" && cardmarket > 0
        ? cardmarket
        : 0,
    ebay:
      typeof ebay === "number" && ebay > 0
        ? ebay
        : 0,
    tcgplayer:
      typeof tcgplayer === "number" && tcgplayer > 0
        ? tcgplayer
        : 0,
    average,
  };

  // =====================================================
  // 📅 UN POINT MAXIMUM PAR JOUR
  // =====================================================

  if (
    lastPoint &&
    lastDateStr === todayStr
  ) {
    history[lastIndex] = newPoint;
  } else {
    history.push(newPoint);
  }

  // =====================================================
  // 🧹 RÉTENTION LOCALE : 6 MOIS
  // =====================================================

  const retentionLimit =
    now -
    MAX_HISTORY_DAYS *
      24 *
      60 *
      60 *
      1000;

  store[cardId] = history.filter(
    (point) =>
      point &&
      typeof point.date === "number" &&
      point.date >= retentionLimit
  );

  saveStore(store);
}

/**
 * 🔍 Récupère tout l'historique réel enregistré en local.
 */
export function getMarketHistory(
  cardId: string
): PricePoint[] {
  if (!cardId) return [];

  const store = getStore();

  return Array.isArray(store[cardId])
    ? store[cardId]
    : [];
}

/**
 * ⏳ Récupère l'historique réel filtré sur les X derniers jours.
 *
 * Exemples :
 * - 7 jours
 * - 30 jours
 * - 90 jours
 *
 * IMPORTANT :
 * aucune donnée historique n'est inventée.
 *
 * Si seulement 5 jours réels sont disponibles,
 * la fonction retourne ces 5 jours.
 */
export function getMarketHistoryDays(
  cardOrId: string | PokemonCard,
  days: number = 30
): PricePoint[] {
  const cardId =
    typeof cardOrId === "string"
      ? cardOrId
      : cardOrId.id;

  if (!cardId) return [];

  const history = getMarketHistory(cardId);

  if (!history.length) return [];

  const safeDays = Math.max(
    1,
    Math.min(days, MAX_HISTORY_DAYS)
  );

  const limit =
    Date.now() -
    safeDays *
      24 *
      60 *
      60 *
      1000;

  return history.filter(
    (point) =>
      point &&
      typeof point.date === "number" &&
      point.date >= limit
  );
}

/**
 * 📊 Formate l'historique pour l'affichage
 * graphique Recharts.
 */
export function formatHistoryForGraph(
  history?: PricePoint[] | null
) {
  if (
    !history ||
    !Array.isArray(history)
  ) {
    return [];
  }

  return history.map((point) => ({
    day: new Date(
      point.date
    ).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
    }),

    cardmarket:
      point.cardmarket || 0,

    ebay:
      point.ebay || 0,

    tcgplayer:
      point.tcgplayer || 0,

    average:
      point.average || 0,
  }));
}

/**
 * 🕒 Récupère le dernier point de prix réel.
 */
export function getLastPrice(
  cardId: string
): PricePoint | null {
  const history =
    getMarketHistory(cardId);

  return history.length > 0
    ? history[history.length - 1]
    : null;
}

/**
 * 📉 Calcule la variation globale (%).
 */
export function getVariation(
  history?: PricePoint[] | null
): number {
  if (
    !history ||
    !Array.isArray(history) ||
    history.length < 2
  ) {
    return 0;
  }

  const first =
    history[0]?.average || 0;

  const last =
    history[history.length - 1]?.average || 0;

  if (first <= 0) return 0;

  return Number(
    (
      ((last - first) / first) *
      100
    ).toFixed(2)
  );
}

/**
 * 🎯 Analyse la tendance globale.
 *
 * Zone tampon de 3 % :
 * > +3 %  → hausse
 * < -3 %  → baisse
 * sinon   → stable
 */
export function getTrend(
  history?: PricePoint[] | null
): "up" | "down" | "stable" {
  if (
    !history ||
    !Array.isArray(history) ||
    history.length < 2
  ) {
    return "stable";
  }

  const variation =
    getVariation(history);

  if (variation > 3) {
    return "up";
  }

  if (variation < -3) {
    return "down";
  }

  return "stable";
}
