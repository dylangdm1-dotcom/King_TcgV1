import type { PokemonCard } from "./types";
import { getMarketData } from "./marketEngine";
import { getEffectiveMarketHistory, getLastPrice } from "./priceHistory";

const DAY = 24 * 60 * 60 * 1000;

function trendFromHistory(card: PokemonCard, days: number): number {
  const history = getEffectiveMarketHistory(card)
    .filter((point) => point && Number(point.average) > 0 && Number.isFinite(point.date))
    .sort((a, b) => a.date - b.date);

  if (history.length < 2) return 0;

  const cutoff = Date.now() - days * DAY;
  const inWindow = history.filter((point) => point.date >= cutoff);
  const usable = inWindow.length >= 2 ? inWindow : history;
  if (usable.length < 2) return 0;

  const first = Number(usable[0]?.average || 0);
  const last = Number(usable[usable.length - 1]?.average || 0);
  if (first <= 0 || last <= 0) return 0;

  return Number((((last - first) / first) * 100).toFixed(2));
}

export function getEffectiveTrend7d(card: PokemonCard): number {
  const market = getMarketData(card);
  if (Number.isFinite(market.priceTrend7d) && Math.abs(market.priceTrend7d) > 0.001) {
    return Number(market.priceTrend7d.toFixed(2));
  }

  const historyTrend = trendFromHistory(card, 7);
  if (Math.abs(historyTrend) > 0.001) return historyTrend;

  if (Number.isFinite(market.priceTrend30d) && Math.abs(market.priceTrend30d) > 0.001) {
    const monthlyMultiplier = Math.max(0.05, 1 + market.priceTrend30d / 100);
    return Number(((Math.pow(monthlyMultiplier, 7 / 30) - 1) * 100).toFixed(2));
  }

  return 0;
}

export function getEffectiveTrend30d(card: PokemonCard): number {
  const market = getMarketData(card);
  if (Number.isFinite(market.priceTrend30d) && Math.abs(market.priceTrend30d) > 0.001) {
    return Number(market.priceTrend30d.toFixed(2));
  }

  return trendFromHistory(card, 30);
}

export function getEffectiveCurrentPrice(card: PokemonCard): number {
  const market = getMarketData(card);
  if (Number.isFinite(market.average) && market.average > 0) {
    return Number(market.average.toFixed(2));
  }

  const last = getLastPrice(card)?.average || 0;
  return Number.isFinite(last) && last > 0 ? Number(last.toFixed(2)) : 0;
}

export function hasUsableMarketSignal(card: PokemonCard): boolean {
  const current = getEffectiveCurrentPrice(card);
  if (current <= 0) return false;

  const trend7d = getEffectiveTrend7d(card);
  const trend30d = getEffectiveTrend30d(card);
  const history = getEffectiveMarketHistory(card).filter((point) => Number(point?.average) > 0);

  return Math.abs(trend7d) > 0.001 || Math.abs(trend30d) > 0.001 || history.length >= 2;
}
