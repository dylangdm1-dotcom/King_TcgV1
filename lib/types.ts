// lib/types.ts

export type CardCondition =
  | "Mint"
  | "Near Mint"
  | "Excellent"
  | "Good"
  | "Light Played"
  | "Played"
  | "Poor";

export interface CardPrice {
  low?: number;
  mid?: number;
  high?: number;
  market?: number;
  directLow?: number;
}

export type MarketSyncStatus =
  | "available"
  | "syncing"
  | "rate_limited"
  | "not_listed"
  | "source_unavailable";

export type MarketConfidence = "high" | "medium" | "limited" | "none";

export interface MarketEstimate {
  price: number;
  language: "fr" | "en" | "ja" | "zh-tw";
  currency: "EUR";
  condition: "Near Mint";
  confidence: MarketConfidence;
  includedSources: string[];
  excludedSources: Array<{ source: string; reason: string }>;
}

export type MarketQuoteSource = "pokewallet" | "cardmarket" | "tcgplayer" | "justtcg" | "ebay";

export interface MarketQuote {
  source: MarketQuoteSource;
  label: string;
  price: number;
  currency: "EUR";
  language: "fr" | "en" | "ja" | "zh-tw" | "multi";
  condition:
    | "Near Mint"
    | "Excellent"
    | "Good"
    | "Light Played"
    | "Played"
    | "Poor"
    | "Unknown";
  metric:
    | "lowest_listing"
    | "lowest_europe"
    | "trend_europe"
    | "average_europe"
    | "average_1d_europe"
    | "average_7d_europe"
    | "average_30d_europe"
    | "active_listing_median"
    | "market"
    | "median"
    | "sold_median";
  classification?: "exact" | "indicative" | "comparable" | "estimated";
  compatible: boolean;
  confidence: MarketConfidence;
  url?: string;
  updatedAt?: string;
  sampleSize?: number;
}

export interface PokemonCard {
  id: string;
  name: string;
  number: string;

  images: {
    small: string;
    large: string;
  };

  /** URLs de secours testées dans l’ordre lorsque le visuel principal échoue. */
  imageCandidates?: string[];

  rarity?: string;
  supertype?: string;
  subtypes?: string[];
  types?: string[];
  hp?: string;

  // 🆕 King TCG V3 - classification scanner
  cardType?:
    | "Pokemon"
    | "Trainer"
    | "Energy"
    | "Unknown";

  variant?:
    | "Normal"
    | "Full Art"
    | "Alt Art"
    | "Rainbow"
    | "Gold"
    | "Shiny"
    | "Unknown";

  isFullArt?: boolean;
  isSecretRare?: boolean;

  set: {
    id: string;
    name: string;
    series?: string;
    printedTotal?: number;
    total?: number;
    releaseDate?: string;

    images?: {
      symbol?: string;
      logo?: string;
    };
  };

  tcgplayer?: {
    url?: string;
    updatedAt?: string;
    currency?: "USD" | "EUR";

    prices?: {
      holofoil?: CardPrice;
      normal?: CardPrice;
      reverseHolofoil?: CardPrice;
      firstEditionHolofoil?: CardPrice;
      firstEditionNormal?: CardPrice;
    };
  };

  cardmarket?: {
    url?: string;
    updatedAt?: string;

    prices?: {
      averageSellPrice?: number;
      lowPrice?: number;
      trendPrice?: number;
      reverseHoloSell?: number;
      reverseHoloLow?: number;
      reverseHoloTrend?: number;
      avg1?: number;
      avg7?: number;
      avg30?: number;
    };
  };

  justtcg?: {
    medianNearMint?: number;
    language?: string;
    printing?: string;
    sampleSize?: number;
    url?: string;
    updatedAt?: string;
  };

  ebayListings?: {
    median?: number;
    sampleSize?: number;
    exactSampleSize?: number;
    language?: "fr" | "en" | "ja" | "zh-tw" | "unknown";
    condition?: "Near Mint" | "Unknown";
    query?: string;
    url?: string;
    updatedAt?: string;
  };

  marketQuotes?: MarketQuote[];

  favorite?: boolean;
  quantity?: number;
  buyPrice?: number;
  condition?: CardCondition;
  computedPrice?: number;
  dataLanguage?: "fr" | "en" | "ja" | "zh-tw";

  /** État de synchronisation des cotations. Ne modifie jamais les métadonnées carte. */
  marketStatus?: MarketSyncStatus;
  marketSources?: {
    cardmarket?: boolean;
    tcgplayer?: boolean;
    justtcg?: boolean;
    ebayListings?: boolean;
    pokewallet?: boolean;
  };
  /** Estimation calculée uniquement avec les sources compatibles avec la langue. */
  marketEstimate?: MarketEstimate;
}

// 🧠 Résultat brut du scanner Gemini
export interface CardScanResult {
  cardName: string | null;
  pokemonName: string | null;

  cardType:
    | "Pokemon"
    | "Trainer"
    | "Energy"
    | "Unknown"
    | null;

  language: string | null;

  cardNumber: string | null;

  setName: string | null;
  setSymbol: string | null;

  rarity: string | null;

  variant:
    | "Normal"
    | "Full Art"
    | "Alt Art"
    | "Rainbow"
    | "Gold"
    | "Shiny"
    | "Unknown"
    | null;

  isFullArt: boolean;
  isSecretRare: boolean;

  possibleNames?: string[];

  confidence: number;

  needsSecondPass: boolean;
}

export type SearchFilters = {
  category: string;
  rarity: string;
  set: string;
  sort: string;
  condition?: string;
  query?: string;
  minPrice?: number;
  maxPrice?: number;
};

// 📈 HISTORIQUE

export interface PriceHistoryPoint {
  date: number;
  cardmarket: number;
  ebay: number;
  tcgplayer: number;
  average: number;
}

// 💰 MARCHÉ

export interface MarketSnapshot {
  cardmarket: number;
  tcgplayer: number;
  ebay: number;
  average: number;

  priceTrend7d?: number;
  priceTrend30d?: number;
}

// 🧠 INVESTISSEMENT

export interface InvestmentResult {
  score: number;
  trend: "up" | "down" | "stable";
  recommendation: string;
}

export interface PredictionResult {
  predictedPrice30d: number;
  roi30d: number;
  confidence: number;
}

// 📚 COLLECTION

export interface CollectionEntry {
  quantity: number;
  buyPrice: number;
  condition?: CardCondition;
  createdAt: string;
}

export type CollectionMap = Record<string, CollectionEntry>;

// 💰 PRIX PRINCIPAL
//
// IMPORTANT : cette fonction ne fabrique jamais de prix.
// 0 signifie "aucune donnée de marché disponible".
function positivePrice(value: unknown): number | undefined {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}


function temporaryFrenchEstimate(card?: PokemonCard | null): number {
  if (!card || card.dataLanguage !== "fr") return 0;
  const prices = card.cardmarket?.prices;
  const values = [
    prices?.trendPrice,
    prices?.averageSellPrice,
    prices?.avg30,
    prices?.avg7,
    prices?.avg1,
  ]
    .map((value) => positivePrice(value))
    .filter((value): value is number => value !== undefined);

  return values.length ? Number(Math.max(...values).toFixed(2)) : 0;
}

export function hasMarketPrice(card?: PokemonCard | null): boolean {
  if (!card) return false;
  if (card.marketQuotes?.some((quote) => positivePrice(quote.price) !== undefined)) return true;
  return positivePrice(card.marketEstimate?.price) !== undefined;
}

export function getCardPrice(card?: PokemonCard | null): number {
  if (!card) return 0;

  const exactEstimate = positivePrice(card.marketEstimate?.price);
  if (exactEstimate !== undefined && card.marketEstimate?.confidence === "high") {
    return Number(exactEstimate.toFixed(2));
  }

  const frenchEstimate = temporaryFrenchEstimate(card);
  if (frenchEstimate > 0) return frenchEstimate;

  return exactEstimate !== undefined ? Number(exactEstimate.toFixed(2)) : 0;
}

export interface NormalizedMarketSummary {
  price: number;
  status: MarketSyncStatus;
  sources: string[];
}

/** Contrat unique utilisé par Recherche et fiche carte pour interpréter les prix. */
export function getNormalizedMarketSummary(card?: PokemonCard | null): NormalizedMarketSummary {
  if (!card) return { price: 0, status: "not_listed", sources: [] };

  const price = getCardPrice(card);
  const sources: string[] = [];
  if (card.marketSources?.cardmarket || card.cardmarket?.prices) sources.push("cardmarket");
  if (card.marketSources?.tcgplayer || card.tcgplayer?.prices) sources.push("tcgplayer");
  if (card.marketSources?.justtcg) sources.push("justtcg");
  if (card.marketSources?.ebayListings) sources.push("ebay_listings");

  const status: MarketSyncStatus =
    price > 0 || hasMarketPrice(card)
      ? "available"
      : card.marketStatus ?? "not_listed";

  return { price, status, sources: Array.from(new Set(sources)) };
}

