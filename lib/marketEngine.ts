import type { PokemonCard } from "./types";

export type MarketPrices = {
  cardmarket: number;
  tcgplayer: number;
  justtcg: number;
  ebay: number;
  average: number;
  priceTrend7d: number;
  priceTrend30d: number;
  minimum?: number;
  maximum?: number;
  validSourceCount: number;
};

const n = (value: unknown): number => {
  const parsed = Number(value);

  return Number.isFinite(parsed) && parsed > 0
    ? parsed
    : 0;
};

const quote = (
  card: PokemonCard | undefined | null,
  source: string
): number => {
  const value = card?.marketQuotes?.find(
    (item) =>
      item.source === source &&
      item.compatible
  )?.price;

  return n(value);
};

export const CONDITION_COEFFICIENTS: Record<string, number> = {
  Mint: 1,
  "Near Mint": 1,
  Excellent: 1,
  Good: 1,
  "Light Played": 1,
  Played: 1,
  Poor: 1,
};

export function getAdjustedPriceByCondition(
  value: number,
  _condition = "Near Mint"
): number {
  return Number(n(value).toFixed(2));
}

export function getCardMarketPrice(
  card?: PokemonCard | null
): number {
  const value =
    quote(card, "pokewallet") ||
    quote(card, "cardmarket");

  return Number(value.toFixed(2));
}

export function getCardMarketLowPrice(
  card?: PokemonCard | null
): number {
  return getCardMarketPrice(card);
}

export function getTCGPlayerPrice(
  card?: PokemonCard | null
): number {
  return Number(
    quote(card, "tcgplayer").toFixed(2)
  );
}

export function getJustTcgPrice(
  card?: PokemonCard | null
): number {
  return Number(
    quote(card, "justtcg").toFixed(2)
  );
}

export function getEbayPrice(
  card?: PokemonCard | null
): number {
  return Number(
    quote(card, "ebay").toFixed(2)
  );
}

export function getAverageMarketPrice(
  card?: PokemonCard | null
): number {
  return Number(
    n(card?.marketEstimate?.price).toFixed(2)
  );
}

const vals = (
  card?: PokemonCard | null
): number[] => {
  if (!card) {
    return [];
  }

  return (
    card.marketQuotes
      ?.filter(
        (item) =>
          item.compatible &&
          item.language === card.dataLanguage
      )
      .map((item) => n(item.price))
      .filter((value) => value > 0) ?? []
  );
};

export function getMinimumMarketPrice(
  card?: PokemonCard | null
): number {
  const values = vals(card);

  return values.length
    ? Number(Math.min(...values).toFixed(2))
    : 0;
}

export function getMaximumMarketPrice(
  card?: PokemonCard | null
): number {
  const values = vals(card);

  return values.length
    ? Number(Math.max(...values).toFixed(2))
    : 0;
}

export function getPriceTrend7d(
  _card?: PokemonCard | null
): number {
  return 0;
}

export function getPriceTrend30d(
  _card?: PokemonCard | null
): number {
  return 0;
}

export function getMarketSpread(
  card?: PokemonCard | null
): number {
  const values = vals(card);

  if (values.length < 2) {
    return 0;
  }

  return Number(
    (
      Math.max(...values) -
      Math.min(...values)
    ).toFixed(2)
  );
}

export function getMarketData(
  card?: PokemonCard | null
): MarketPrices {
  return {
    cardmarket: getCardMarketPrice(card),
    tcgplayer: getTCGPlayerPrice(card),
    justtcg: getJustTcgPrice(card),
    ebay: getEbayPrice(card),
    average: getAverageMarketPrice(card),
    priceTrend7d: getPriceTrend7d(card),
    priceTrend30d: getPriceTrend30d(card),
    minimum: getMinimumMarketPrice(card),
    maximum: getMaximumMarketPrice(card),
    validSourceCount: vals(card).length,
  };
}

export function getMarketGrowth(
  card?: PokemonCard | null,
  buy = 0,
  condition = "Near Mint"
): number {
  const current = getAdjustedPriceByCondition(
    getAverageMarketPrice(card),
    condition
  );

  if (buy <= 0 || current <= 0) {
    return 0;
  }

  return Number(
    (((current - buy) / buy) * 100).toFixed(1)
  );
}
