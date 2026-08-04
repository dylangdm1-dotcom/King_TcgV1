// lib/priceAlerts.ts

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
 * Calcule la variation en pourcentage
 * à partir de l'historique réel.
 */
function getPriceChangePercent(
  history: PricePoint[]
): number {
  if (!history || history.length < 2) {
    return 0;
  }

  const first = history[0].average;
  const last =
    history[history.length - 1].average;

  if (
    !Number.isFinite(first) ||
    !Number.isFinite(last) ||
    first <= 0
  ) {
    return 0;
  }

  return ((last - first) / first) * 100;
}

/**
 * Analyse l'historique et le prix actuel
 * d'une carte pour générer une alerte.
 *
 * IMPORTANT :
 * Le prix actuel utilise exactement le même
 * moteur que le Dashboard V5 :
 *
 * getMarketData(card).average
 */
export function analyzeCardAlerts(
  card: PokemonCard
): PriceAlert | null {
  if (!card?.id) {
    return null;
  }

  // Historique de marché
  const history =
    getMarketHistory(card.id);

  if (
    !history ||
    history.length < 2
  ) {
    return null;
  }

  const change =
    getPriceChangePercent(history);

  /*
   * IMPORTANT :
   * Même chemin de prix que Dashboard.
   *
   * Dashboard :
   * getMarketData(card).average
   *
   * On utilise exactement la même source ici.
   */
  const market =
    getMarketData(card);

  const currentPrice =
    Number.isFinite(market.average) &&
    market.average > 0
      ? market.average
      : 0;

  const roundedChange =
    Number(change.toFixed(2));

  // 📉 Baisse importante
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

  // 📈 Hausse importante
  if (change >= 10) {
    return {
      cardId: card.id,
      cardName: card.name,
      type: "RISE",
      changePercent: roundedChange,
      message: `📈 ${card.name} a augmenté de ${roundedChange}%`,
    };
  }

  // 💰 Opportunité
  if (
    currentPrice > 0 &&
    change > -5 &&
    change < 0
  ) {
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
 * Analyse une collection de cartes
 * pour générer les alertes actives.
 */
export function generateAlerts(
  cards: PokemonCard[]
): PriceAlert[] {
  if (!Array.isArray(cards)) {
    return [];
  }

  const alerts: PriceAlert[] = [];

  for (const card of cards) {
    const alert =
      analyzeCardAlerts(card);

    if (alert) {
      alerts.push(alert);
    }
  }

  return alerts;
}
