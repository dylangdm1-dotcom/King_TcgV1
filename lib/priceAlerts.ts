// lib/priceAlerts.ts

import type { PokemonCard } from "./types";
import { getMarketData } from "./marketEngine";

export type PriceAlert = {
  cardId: string;
  cardName: string;
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
    /**
     * SOURCE UNIQUE DU MARCHÉ V5
     *
     * Même chemin que Dashboard :
     * getMarketData(card)
     */
    const market = getMarketData(card);

    if (!market) {
      return null;
    }

    const currentPrice =
      Number.isFinite(market.average) && market.average > 0
        ? market.average
        : 0;

    /**
     * Tendance réelle 7 jours fournie par le moteur V5.
     *
     * C'est exactement la valeur utilisée
     * dans le Dashboard.
     */
    const change =
      Number.isFinite(market.priceTrend7d)
        ? market.priceTrend7d
        : 0;

    const roundedChange = Number(change.toFixed(2));

    if (currentPrice <= 0) {
      return null;
    }

    // 📉 BAISSE FORTE
    if (change <= -10) {
      return {
        cardId: card.id,
        cardName: card.name,
        type: "DROP",
        changePercent: roundedChange,
        message: `📉 ${card.name} a chuté de ${Math.abs(
          roundedChange
        )}% sur les 7 derniers jours.`,
      };
    }

    // 📈 HAUSSE FORTE
    if (change >= 10) {
      return {
        cardId: card.id,
        cardName: card.name,
        type: "RISE",
        changePercent: roundedChange,
        message: `📈 ${card.name} a augmenté de ${roundedChange}% sur les 7 derniers jours.`,
      };
    }

    // 💰 OPPORTUNITÉ
    //
    // On conserve la logique :
    // petite baisse comprise entre 0 et -5%.
    if (change > -5 && change < 0) {
      return {
        cardId: card.id,
        cardName: card.name,
        type: "OPPORTUNITY",
        changePercent: roundedChange,
        message: `💰 ${card.name} est en légère baisse de ${Math.abs(
          roundedChange
        )}% → opportunité potentielle.`,
      };
    }

    return null;
  } catch (error) {
    console.error(
      `[King_TCG V5] Erreur analyse alerte ${card.id}:`,
      error
    );

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
