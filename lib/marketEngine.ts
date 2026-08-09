import type { PokemonCard } from "./types";

export type MarketPrices = {
  cardmarket: number;
  cardmarketEurope: number;
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
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

function compatibleQuote(
  card: PokemonCard | undefined | null,
  predicate: (source: string, label: string) => boolean
): number {
  const quote = card?.marketQuotes?.find((item) =>
    item.compatible && predicate(item.source, String(item.label || ""))
  );
  return n(quote?.price);
}

function legacyCardmarketEurope(card?: PokemonCard | null): number {
  const prices = card?.cardmarket?.prices;
  return n(
    prices?.trendPrice ??
      prices?.averageSellPrice ??
      prices?.avg7 ??
      prices?.avg30 ??
      prices?.lowPrice
  );
}

function legacyTcgplayer(card?: PokemonCard | null): number {
  const prices = card?.tcgplayer?.prices;
  if (!prices) return 0;

  const variants = [
    prices.normal,
    prices.holofoil,
    prices.reverseHolofoil,
    prices.firstEditionHolofoil,
    prices.firstEditionNormal,
  ];

  for (const variant of variants) {
    const value = n(variant?.market ?? variant?.low ?? variant?.mid);
    if (value > 0) return value;
  }
  return 0;
}

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

export function getCardMarketPrice(card?: PokemonCard | null): number {
  const value = compatibleQuote(
    card,
    (source, label) =>
      source === "cardmarket" ||
      (source === "pokewallet" && /cardmarket/i.test(label))
  );

  return Number(value.toFixed(2));
}

export function getCardmarketEuropePrice(
  card?: PokemonCard | null
): number {
  const preferred =
    card?.marketQuotes?.find(
      (item) =>
        item.language === "multi" &&
        item.metric === "trend_europe" &&
        n(item.price) > 0
    ) ??
    card?.marketQuotes?.find(
      (item) =>
        item.language === "multi" &&
        /cardmarket/i.test(item.label) &&
        n(item.price) > 0
    );

  return Number((n(preferred?.price) || legacyCardmarketEurope(card)).toFixed(2));
}

export function getCardMarketLowPrice(card?: PokemonCard | null): number {
  return getCardMarketPrice(card);
}

export function getTCGPlayerPrice(card?: PokemonCard | null): number {
  const value =
    compatibleQuote(
      card,
      (source, label) =>
        source === "tcgplayer" ||
        (source === "pokewallet" && /tcgplayer/i.test(label))
    ) || legacyTcgplayer(card);

  return Number(value.toFixed(2));
}

export function getJustTcgPrice(card?: PokemonCard | null): number {
  const value =
    compatibleQuote(card, (source) => source === "justtcg") ||
    n(card?.justtcg?.medianNearMint);
  return Number(value.toFixed(2));
}

export function getEbayPrice(card?: PokemonCard | null): number {
  const value =
    compatibleQuote(card, (source) => source === "ebay") ||
    n(card?.ebayListings?.median);
  return Number(value.toFixed(2));
}

function values(card?: PokemonCard | null): number[] {
  if (!card) return [];

  const quoteValues =
    card.marketQuotes
      ?.filter(
        (item) =>
          item.compatible &&
          item.language === card.dataLanguage &&
          n(item.price) > 0
      )
      .map((item) => n(item.price)) ?? [];

  // Dès que le nouveau moteur a renvoyé des cotations, ne jamais retomber
  // sur les anciens champs bruts : cela réinjecterait des prix EN/EU dans
  // une cote FR/JP/CN. Seules les cotations explicitement compatibles comptent.
  if (card.marketQuotes && card.marketQuotes.length > 0) return quoteValues;

  // Compatibilité avec les anciennes cartes sauvegardées avant pricing-engine-v27.
  return [
    getCardMarketPrice(card),
    getTCGPlayerPrice(card),
    getJustTcgPrice(card),
    getEbayPrice(card),
  ].filter((value) => value > 0);
}

export function getAverageMarketPrice(card?: PokemonCard | null): number {
  const estimate = n(card?.marketEstimate?.price);
  if (estimate > 0) return Number(estimate.toFixed(2));

  const available = values(card);
  if (!available.length) {
    // Référence réelle de secours, jamais mélangée aux sources exactes :
    // Cardmarket Europe reste affiché comme indicatif dans MarketPanel.
    return getCardmarketEuropePrice(card);
  }
  return Number(
    (available.reduce((sum, value) => sum + value, 0) / available.length).toFixed(2)
  );
}

export function getMinimumMarketPrice(card?: PokemonCard | null): number {
  const available = values(card);
  return available.length ? Number(Math.min(...available).toFixed(2)) : 0;
}

export function getMaximumMarketPrice(card?: PokemonCard | null): number {
  const available = values(card);
  return available.length ? Number(Math.max(...available).toFixed(2)) : 0;
}

export function getPriceTrend7d(_card?: PokemonCard | null): number {
  return 0;
}

export function getPriceTrend30d(_card?: PokemonCard | null): number {
  return 0;
}

export function getMarketSpread(card?: PokemonCard | null): number {
  const available = values(card);
  if (available.length < 2) return 0;
  return Number((Math.max(...available) - Math.min(...available)).toFixed(2));
}

export function getMarketData(card?: PokemonCard | null): MarketPrices {
  const available = values(card);
  return {
    cardmarket: getCardMarketPrice(card),
    cardmarketEurope: getCardmarketEuropePrice(card),
    tcgplayer: getTCGPlayerPrice(card),
    justtcg: getJustTcgPrice(card),
    ebay: getEbayPrice(card),
    average: getAverageMarketPrice(card),
    priceTrend7d: getPriceTrend7d(card),
    priceTrend30d: getPriceTrend30d(card),
    minimum: getMinimumMarketPrice(card),
    maximum: getMaximumMarketPrice(card),
    validSourceCount: available.length,
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
  return buy > 0 && current > 0
    ? Number((((current - buy) / buy) * 100).toFixed(1))
    : 0;
}
