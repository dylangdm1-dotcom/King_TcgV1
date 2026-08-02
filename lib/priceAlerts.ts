// lib/priceAlerts.ts

import type { PokemonCard } from "./types";
import {
  getMarketHistory,
  type PricePoint,
} from "./priceHistory";
import {
  DEFAULT_CONDITION,
  getLowestMarketPrice,
} from "./marketEngine";

export type PriceAlert = {
  cardId: string;
  cardName: string;
  type: "DROP" | "RISE" | "OPPORTUNITY";
  message: string;
  changePercent: number;
};

/**
 * =====================================================
 * 🚨 KING_TCG PRICE ALERTS V5
 * =====================================================
 *
 * Analyse les variations réelles de prix.
 *
 * PRINCIPES :
 * - Near Mint par défaut
 * - prix actuel = minimum réel disponible
 * - historique = données réellement enregistrées
 * - aucune adaptation artificielle de condition
 * - aucune estimation de prix
 *
 * =====================================================
 */

/**
 * 🧠 Calcule la variation en pourcentage
 * à partir de l'historique réel.
 */
function getPriceChangePercent(
  history: PricePoint[]
): number {
  if (
    !history ||
    history.length < 2
  ) {
    return 0;
  }

  const first =
    history[0]?.average ?? 0;

  const last =
    history[history.length - 1]?.average ?? 0;

  if (
    first <= 0 ||
    last <= 0
  ) {
    return 0;
  }

  return (
    ((last - first) / first) *
    100
  );
}

/**
 * 🚨 Analyse l'historique et le prix actuel
 * d'une carte pour générer une alerte.
 *
 * Near Mint est utilisé par défaut.
 */
export function analyzeCardAlerts(
  card: PokemonCard,
  condition: string = DEFAULT_CONDITION
): PriceAlert | null {
  if (!card?.id) {
    return null;
  }

  // =====================================================
  // 📜 HISTORIQUE RÉEL
  // =====================================================

  const history =
    getMarketHistory(card.id);

  if (
    !history ||
    history.length < 2
  ) {
    return null;
  }

  // =====================================================
  // 📊 VARIATION
  // =====================================================

  const change =
    getPriceChangePercent(history);

  const roundedChange =
    Number(change.toFixed(2));

  // =====================================================
  // 💰 PRIX ACTUEL RÉEL
  // =====================================================
  //
  // Minimum réellement disponible parmi
  // les sources de marché pour la condition.
  //

  const currentPrice =
    getLowestMarketPrice(
      card,
      condition
    );

  // =====================================================
  // 📉 CHUTE IMPORTANTE
  // =====================================================

  if (change <= -10) {
    return {
      cardId: card.id,
      cardName: card.name,
      type: "DROP",
      changePercent: roundedChange,
      message:
        `📉 ${card.name} a chuté de ${Math.abs(
          roundedChange
        )}%`,
    };
  }

  // =====================================================
  // 📈 HAUSSE FORTE
  // =====================================================

  if (change >= 10) {
    return {
      cardId: card.id,
      cardName: card.name,
      type: "RISE",
      changePercent: roundedChange,
      message:
        `📈 ${card.name} a augmenté de ${roundedChange}%`,
    };
  }

  // =====================================================
  // 💰 OPPORTUNITÉ D'ACHAT
  // =====================================================

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
      message:
        `💰 ${card.name} est stable en bas de canal (${roundedChange}%) → opportunité potentielle`,
    };
  }

  return null;
}

/**
 * 🔥 Analyse une collection ou un lot de cartes
 * pour générer la liste des alertes actives.
 *
 * Near Mint est utilisé par défaut.
 */
export function generateAlerts(
  cards: PokemonCard[],
  condition: string = DEFAULT_CONDITION
): PriceAlert[] {
  if (!Array.isArray(cards)) {
    return [];
  }

  const alerts: PriceAlert[] = [];

  cards.forEach((card) => {
    const alert =
      analyzeCardAlerts(
        card,
        condition
      );

    if (alert) {
      alerts.push(alert);
    }
  });

  return alerts;
}
