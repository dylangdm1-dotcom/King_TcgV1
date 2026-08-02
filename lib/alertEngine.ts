// lib/alertEngine.ts

import type { Opportunity } from "./opportunity";

// =====================================================
// 🚨 KING_TCG ALERTS V5
// =====================================================

export type Alert = {
  type: "BUY" | "SELL" | "WATCH";
  message: string;
};

/**
 * =====================================================
 * 🚨 GÉNÉRATION DES ALERTES
 * =====================================================
 *
 * Les alertes utilisent uniquement les données calculées
 * par Opportunity.
 *
 * Aucun prix n'est calculé ici.
 * Aucun coefficient de condition n'est appliqué.
 * Aucun prix artificiel n'est généré.
 */
export function getAlerts(
  opportunities: Opportunity[] = []
): Alert[] {
  if (
    !Array.isArray(opportunities) ||
    opportunities.length === 0
  ) {
    return [];
  }

  const alerts: Alert[] = [];

  opportunities.forEach(
    (card) => {
      if (!card) {
        return;
      }

      const score =
        typeof card.score === "number"
          ? card.score
          : 0;

      const trend =
        typeof card.trend === "number"
          ? card.trend
          : 0;

      const currentPrice =
        typeof card.currentPrice ===
          "number" &&
        card.currentPrice > 0
          ? card.currentPrice
          : 0;

      // =================================================
      // 🟢 BUY
      // =================================================

      if (
        card.recommendation ===
          "BUY" &&
        score >= 9
      ) {
        const priceText =
          currentPrice > 0
            ? ` (${currentPrice.toFixed(2)} €)`
            : "";

        alerts.push({
          type: "BUY",
          message:
            `${card.name} pourrait être une excellente opportunité${priceText}`,
        });
      }

      // =================================================
      // 🔴 SELL
      // =================================================

      if (
        card.recommendation ===
        "SELL"
      ) {
        alerts.push({
          type: "SELL",
          message:
            `${card.name} montre un risque de baisse`,
        });
      }

      // =================================================
      // 🟡 WATCH
      // =================================================

      if (
        Math.abs(trend) > 20
      ) {
        alerts.push({
          type: "WATCH",
          message:
            `${card.name} est très volatile (${trend.toFixed(1)}%)`,
        });
      }
    }
  );

  return alerts;
}