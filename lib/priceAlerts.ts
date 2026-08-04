import type { PokemonCard } from "./types";
import { getMarketHistory, type PricePoint } from "./priceHistory";
import { getMarketData } from "./marketEngine";

export type PriceAlert = {
  cardId: string;
  cardName: string;
  type: "DROP" | "RISE" | "OPPORTUNITY";
  message: string;
  changePercent: number;
};

/**
 * 🧠 Calcule la variation en pourcentage à partir de l'historique réel
 */
function getPriceChangePercent(history: PricePoint[]): number {
  if (!history || history.length < 2) return 0;

  const first = history[0]?.average ?? 0;
  const last = history[history.length - 1]?.average ?? 0;

  if (first <= 0) return 0;

  return ((last - first) / first) * 100;
}

/**
 * 🚨 Analyse l'historique et le prix actuel d'une carte
 *
 * IMPORTANT :
 * Le prix actuel utilise maintenant exactement la même source
 * que le Dashboard : getMarketData(card).
 *
 * On ne passe plus par getCardMarketPrice().
 */
export function analyzeCardAlerts(card: PokemonCard): PriceAlert | null {
  if (!card?.id) return null;

  /*
   * Historique utilisé pour calculer la variation.
   */
  const history = getMarketHistory(card.id);

  if (!history || history.length < 2) return null;

  const change = getPriceChangePercent(history);
  const roundedChange = Number(change.toFixed(2));

  /*
   * 💰 NOUVEAU CHEMIN PRIX
   *
   * Même moteur que le Dashboard.
   */
  let currentPrice = 0;

  try {
    const market = getMarketData(card);

    /*
     * On privilégie la moyenne marché, exactement comme
     * le Dashboard pour la valeur actuelle de la carte.
     */
    currentPrice = Number(market?.average ?? 0);

    if (!Number.isFinite(currentPrice) || currentPrice < 0) {
      currentPrice = 0;
    }
  } catch (error) {
    console.warn(
      `[King_TCG V5] Impossible de récupérer le prix marché pour ${card.id}:`,
      error
    );

    currentPrice = 0;
  }

  // 📉 Chute importante
  if (change <= -10) {
    return {
      cardId: card.id,
      cardName: card.name,
      type: "DROP",
      changePercent: roundedChange,
      message: `📉 ${card.name} a chuté de ${Math.abs(
        roundedChange
      )}%`,
    };
  }

  // 📈 Hausse forte
  if (change >= 10) {
    return {
      cardId: card.id,
      cardName: card.name,
      type: "RISE",
      changePercent: roundedChange,
      message: `📈 ${card.name} a augmenté de ${roundedChange}%`,
    };
  }

  // 💰 Opportunité d'achat
  if (currentPrice > 0 && change > -5 && change < 0) {
    return {
      cardId: card.id,
      cardName: card.name,
      type: "OPPORTUNITY",
      changePercent: roundedChange,
      message: `💰 ${card.name} est stable en bas de canal (${roundedChange}%) → opportunité potentielle`,
    };
  }

  return null;
}

/**
 * 🔥 Analyse une collection ou un lot de cartes
 */
export function generateAlerts(cards: PokemonCard[]): PriceAlert[] {
  if (!Array.isArray(cards)) return [];

  const alerts: PriceAlert[] = [];

  cards.forEach((card) => {
    const alert = analyzeCardAlerts(card);

    if (alert) {
      alerts.push(alert);
    }
  });

  return alerts;
}
