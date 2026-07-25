// lib/priceAlerts.ts

import type { PokemonCard } from "./types";
import { getMarketHistory, type PricePoint } from "./priceHistory";
import { getCardMarketPrice } from "./marketEngine";

export type PriceAlert = {
  cardId: string;
  cardName: string;
  type: "DROP" | "RISE" | "OPPORTUNITY";
  message: string;
  changePercent: number;
};

/**
 * 🧠 Calcule la variation en pourcentage à partir de l'historique réel (PricePoint)
 */
function getPriceChangePercent(history: PricePoint[]): number {
  if (!history || history.length < 2) return 0;

  const first = history[0].average;
  const last = history[history.length - 1].average;

  if (first <= 0) return 0;

  return ((last - first) / first) * 100;
}

/**
 * 🚨 Analyse l'historique et le prix actuel d'une carte pour générer une alerte
 */
export function analyzeCardAlerts(card: PokemonCard): PriceAlert | null {
  if (!card?.id) return null;

  // Récupération de l'historique avec le bon nom de fonction
  const history = getMarketHistory(card.id);

  if (!history || history.length < 2) return null;

  const change = getPriceChangePercent(history);
  const currentPrice = getCardMarketPrice(card);
  const roundedChange = Number(change.toFixed(2));

  // 📉 Chute importante (Alerte baisse > 10%)
  if (change <= -10) {
    return {
      cardId: card.id,
      cardName: card.name,
      type: "DROP",
      changePercent: roundedChange,
      message: `📉 ${card.name} a chuté de ${Math.abs(roundedChange)}%`,
    };
  }

  // 📈 Hausse forte (Alerte hausse > 10%)
  if (change >= 10) {
    return {
      cardId: card.id,
      cardName: card.name,
      type: "RISE",
      changePercent: roundedChange,
      message: `📈 ${card.name} a augmenté de ${roundedChange}%`,
    };
  }

  // 💰 Opportunité d'achat (Prix stable en baisse légère)
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
 * 🔥 Analyse une collection ou un lot de cartes pour générer la liste des alertes actives
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