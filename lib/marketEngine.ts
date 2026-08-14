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

function cardmarketReferenceValues(
  card?: PokemonCard | null
): number[] {
  const prices = card?.cardmarket?.prices;

  const directValues = [
    n(prices?.trendPrice),
    n(prices?.averageSellPrice),
    n(prices?.avg30),
    n(prices?.avg7),
    n(prices?.avg1),
  ];

  const quoteValues =
    card?.marketQuotes
      ?.filter((item) => {
        const metric = String(item.metric || "");
        return (
          item.source === "cardmarket" &&
          !metric.includes("lowest") &&
          !metric.includes("low") &&
          n(item.price) > 0
        );
      })
      .map((item) => n(item.price)) ?? [];

  return Array.from(
    new Set(
      [...directValues, ...quoteValues]
        .filter((value) => value > 0)
        .map((value) => Number(value.toFixed(2)))
    )
  ).sort((a, b) => b - a);
}

function estimatedFrenchMarketPrice(
  card?: PokemonCard | null
): number {
  return cardmarketReferenceValues(card)[0] ?? 0;
}

function secondHighestEuropeanReference(
  card?: PokemonCard | null
): number {
  const values = cardmarketReferenceValues(card);

  // Quand une seule statistique existe, on la conserve comme référence
  // plutôt que d'afficher artificiellement zéro.
  return values[1] ?? values[0] ?? 0;
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
  Mint: 1.15,
  "Near Mint": 1,
  Excellent: 0.85,
  Good: 0.70,
  "Light Played": 0.60,
  Played: 0.45,
  Poor: 0.25,
};

export function getAdjustedPriceByCondition(
  value: number,
  condition = "Near Mint"
): number {
  const coefficient = CONDITION_COEFFICIENTS[condition] ?? 1;
  return Number((n(value) * coefficient).toFixed(2));
}

export function getCardMarketPrice(card?: PokemonCard | null): number {
  // FR: the Cardmarket price displayed by King_TCG is the cheapest exact
  // French Near Mint offer when available. Europe trend/averages stay separate.
  if (card?.dataLanguage === "fr") {
    const exactFrenchNm = card?.marketQuotes?.find(
      (item) =>
        item.source === "cardmarket" &&
        item.language === "fr" &&
        item.condition === "Near Mint" &&
        item.metric === "lowest_listing" &&
        item.classification === "exact" &&
        n(item.price) > 0
    );
    return Number(
      (
        n(exactFrenchNm?.price) ||
        n(card?.cardmarket?.prices?.lowPrice) ||
        estimatedFrenchMarketPrice(card)
      ).toFixed(2)
    );
  }

  if (card?.dataLanguage === "ja" || card?.dataLanguage === "zh-tw") {
    // V51: never present a generic TCGdex/PokéWallet Cardmarket mapping as the
    // exact Asian printing. TCGdex documents that marketplace IDs can still be
    // wrong until variants_detailed is fully deployed. Only our verified exact
    // impression route may populate this Cardmarket slot.
    const exactTrend = card?.marketQuotes?.find(
      (item) =>
        item.source === "cardmarket" &&
        item.metric === "trend_europe" &&
        /impression (?:japonaise|chinoise)/i.test(String(item.label || "")) &&
        n(item.price) > 0
    );
    return Number(
      (
        n(exactTrend?.price) ||
        n(card?.cardmarket?.prices?.trendPrice) ||
        n(card?.cardmarket?.prices?.averageSellPrice) ||
        n(card?.cardmarket?.prices?.avg7) ||
        n(card?.cardmarket?.prices?.avg30) ||
        n(card?.cardmarket?.prices?.avg1) ||
        n(card?.cardmarket?.prices?.lowPrice)
      ).toFixed(2)
    );
  }

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
  // Pour le FR, la référence Europe devient la deuxième statistique
  // Cardmarket la plus élevée disponible, jamais le prix le plus bas.
  if (card?.dataLanguage === "fr") {
    return Number(secondHighestEuropeanReference(card).toFixed(2));
  }

  if (card?.dataLanguage === "ja" || card?.dataLanguage === "zh-tw") {
    const exactAverage7d = card?.marketQuotes?.find(
      (item) =>
        item.language === "multi" &&
        item.metric === "average_7d_europe" &&
        /impression (?:japonaise|chinoise)/i.test(String(item.label || "")) &&
        n(item.price) > 0
    );
    return Number(n(exactAverage7d?.price).toFixed(2));
  }

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
        !String(item.metric || "").includes("low") &&
        n(item.price) > 0
    );

  return Number(
    (
      n(preferred?.price) ||
      secondHighestEuropeanReference(card)
    ).toFixed(2)
  );
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
    n(card?.ebayListings?.average) ||
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

  if (quoteValues.length) return quoteValues;

  return [
    getCardMarketPrice(card),
    getTCGPlayerPrice(card),
    getJustTcgPrice(card),
    getEbayPrice(card),
  ].filter((value) => value > 0);
}

function validSourceCount(card?: PokemonCard | null): number {
  if (!card) return 0;
  const sources = new Set<string>();
  for (const quote of card.marketQuotes ?? []) {
    if (!quote.compatible || !(n(quote.price) > 0)) continue;
    if (quote.language !== card.dataLanguage && quote.language !== "multi") continue;
    sources.add(quote.source);
  }
  for (const source of card.marketEstimate?.includedSources ?? []) {
    if (source) sources.add(String(source).toLowerCase());
  }
  if (getCardMarketPrice(card) > 0) sources.add("cardmarket");
  if (getTCGPlayerPrice(card) > 0) sources.add("tcgplayer");
  if (getJustTcgPrice(card) > 0) sources.add("justtcg");
  if (getEbayPrice(card) > 0) sources.add("ebay");
  return sources.size;
}


function frenchKingTcgPrice(card?: PokemonCard | null): number {
  const cardmarket = getCardMarketPrice(card);
  const ebayQuote = card?.marketQuotes?.find(
    (quote) =>
      quote.source === "ebay" &&
      quote.language === "fr" &&
      quote.compatible &&
      quote.price > 0
  );
  const ebay = n(ebayQuote?.price) || getEbayPrice(card);

  if (cardmarket > 0 && ebay > 0) {
    // eBay represents active listings, not completed sales. It enriches the
    // French King_TCG quote without being allowed to overwhelm Cardmarket.
    // The eBay contribution grows with the number of exact compatible listings
    // and is capped to ±35% around the Cardmarket anchor to reject outliers.
    const sample = Number(ebayQuote?.sampleSize || 0);
    // V43: eBay Production is now a major FR signal. Exact listings carry
    // 50–70% of the King_TCG quote depending on sample depth.
    const weight = sample >= 5 ? 0.75 : sample >= 3 ? 0.68 : 0.60;
    // Keep a broad safety rail only for obvious mapping accidents. Real gaps
    // between Cardmarket and current eBay asks are allowed to influence the quote.
    const boundedEbay = Math.min(cardmarket * 2.5, Math.max(cardmarket * 0.4, ebay));
    return Number((cardmarket * (1 - weight) + boundedEbay * weight).toFixed(2));
  }

  if (cardmarket > 0) return Number(cardmarket.toFixed(2));
  if (ebay > 0) return Number(ebay.toFixed(2));
  return 0;
}
export function getAverageMarketPrice(card?: PokemonCard | null): number {
  const estimate = n(card?.marketEstimate?.price);

  // V43 FR: Cardmarket remains the anchor but exact compatible eBay listings
  // now contribute to the King_TCG quote with bounded, sample-aware weighting.
  if (card?.dataLanguage === "fr") {
    const frenchEstimate = frenchKingTcgPrice(card);
    if (frenchEstimate > 0) return frenchEstimate;
    if (estimate > 0) return Number(estimate.toFixed(2));
  }

  // JP/CN/EN: the unified server estimate is language-specific and can be
  // formed from exact JustTCG/eBay quotes. A high-confidence estimate remains
  // the preferred market value.
  if (estimate > 0 && card?.marketEstimate?.confidence === "high") {
    return Number(estimate.toFixed(2));
  }

  if (estimate > 0) return Number(estimate.toFixed(2));

  // V44: for JP/CN, an exact TCGdex Cardmarket product is a useful western
  // reference when no local estimate survived filtering.
  if (card?.dataLanguage === "ja" || card?.dataLanguage === "zh-tw") {
    const western = getCardMarketPrice(card);
    if (western > 0) return Number(western.toFixed(2));
  }

  const available = values(card);
  if (!available.length) return 0;
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

function quoteMetric(card: PokemonCard | null | undefined, metric: string): number {
  const quote = card?.marketQuotes?.find(
    (item) => item.metric === metric && n(item.price) > 0
  );
  return n(quote?.price);
}

export function getPriceTrend7d(card?: PokemonCard | null): number {
  const current =
    quoteMetric(card, "average_1d_europe") ||
    quoteMetric(card, "trend_europe") ||
    getAverageMarketPrice(card);
  const previous = quoteMetric(card, "average_7d_europe");
  if (current <= 0 || previous <= 0) return 0;
  return Number((((current - previous) / previous) * 100).toFixed(2));
}

export function getPriceTrend30d(card?: PokemonCard | null): number {
  const current =
    quoteMetric(card, "average_7d_europe") ||
    quoteMetric(card, "trend_europe") ||
    getAverageMarketPrice(card);
  const previous = quoteMetric(card, "average_30d_europe");
  if (current <= 0 || previous <= 0) return 0;
  return Number((((current - previous) / previous) * 100).toFixed(2));
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
    validSourceCount: validSourceCount(card),
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
