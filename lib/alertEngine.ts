import type { Opportunity } from "./opportunity";

export type Alert = {
  type: "BUY" | "SELL" | "WATCH";
  message: string;
};

export function getAlerts(
  opportunities: Opportunity[]
): Alert[] {

  const alerts: Alert[] = [];

  opportunities.forEach((card) => {

    if (
      card.recommendation === "BUY" &&
      card.score >= 9
    ) {
      alerts.push({
        type: "BUY",
        message:
          `${card.name} pourrait être une excellente opportunité (${card.currentPrice.toFixed(2)} €)`
      });
    }

    if (
      card.recommendation === "SELL"
    ) {
      alerts.push({
        type: "SELL",
        message:
          `${card.name} montre un risque de baisse`
      });
    }

    if (
      Math.abs(card.trend) > 20
    ) {
      alerts.push({
        type: "WATCH",
        message:
          `${card.name} est très volatile (${card.trend.toFixed(1)}%)`
      });
    }

  });

  return alerts;

}