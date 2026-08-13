// lib/priceAlerts.ts

import type { PokemonCard } from "./types";
import {
  getEffectiveCurrentPrice,
  getEffectiveTrend7d,
  hasUsableMarketSignal,
} from "./portfolioSignals";

export type PriceAlert = {
  cardId: string;
  cardName: string;
  cardNumber?: string;
  type: "DROP" | "RISE" | "OPPORTUNITY";
  message: string;
  changePercent: number;
};

/**
 * 🚨 Analyse le marché V5 avec le même moteur que le Dashboard.
 *
 * IMPORTANT :
 * On n'utilise plus :
 * - getMarketHistory()
 * - getCardMarketPrice()
 *
 * Le Dashboard utilise getMarketData(), donc Alert Center
 * doit utiliser exactement la même source.
 */
export function analyzeCardAlerts(
  card: PokemonCard
): PriceAlert | null {
  if (!card?.id) return null;

  try {
    const currentPrice = getEffectiveCurrentPrice(card);
    const change = getEffectiveTrend7d(card);

    if (currentPrice <= 0 || !hasUsableMarketSignal(card)) {
      return null;
    }

    const roundedChange = Number(change.toFixed(2));

    // 📉 BAISSE FORTE
    if (change <= -8) {
      return {
        cardId: card.id,
        cardName: card.name,
        cardNumber: card.number,
        type: "DROP",
        changePercent: roundedChange,
        message: `📉 ${card.name} a chuté de ${Math.abs(roundedChange)}% sur les 7 derniers jours.`,
      };
    }

    // 📈 HAUSSE FORTE
    if (change >= 8) {
      return {
        cardId: card.id,
        cardName: card.name,
        cardNumber: card.number,
        type: "RISE",
        changePercent: roundedChange,
        message: `📈 ${card.name} a augmenté de ${roundedChange}% sur les 7 derniers jours.`,
      };
    }

    // 💰 OPPORTUNITÉ : vraie baisse mesurable mais pas encore chute forte
    if (change <= -2 && change > -8) {
      return {
        cardId: card.id,
        cardName: card.name,
        cardNumber: card.number,
        type: "OPPORTUNITY",
        changePercent: roundedChange,
        message: `💰 ${card.name} recule de ${Math.abs(roundedChange)}% → zone d'achat potentielle.`,
      };
    }

    return null;
  } catch (error) {
    console.error(`[King_TCG] Erreur analyse alerte ${card.id}:`, error);
    return null;
  }
}

/**
 * 🔥 Analyse toute la collection.
 *
 * Toutes les cartes passent maintenant par le même
 * marketEngine que le Dashboard.
 */
export function generateAlerts(
  cards: PokemonCard[]
): PriceAlert[] {
  if (!Array.isArray(cards)) {
    return [];
  }

  const alerts: PriceAlert[] = [];

  for (const card of cards) {
    const alert = analyzeCardAlerts(card);

    if (alert) {
      alerts.push(alert);
    }
  }

  return alerts;
}
