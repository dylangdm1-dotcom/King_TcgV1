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

export function hasMarketPrice(card?: PokemonCard | null): boolean {
  if (!card) return false;

  const cm = card.cardmarket?.prices;
  const tcg = card.tcgplayer?.prices;

  const candidates: unknown[] = [
    cm?.trendPrice,
    cm?.averageSellPrice,
    cm?.avg1,
    cm?.avg7,
    cm?.avg30,
    cm?.lowPrice,
    tcg?.normal?.market,
    tcg?.holofoil?.market,
    tcg?.reverseHolofoil?.market,
    tcg?.firstEditionHolofoil?.market,
    tcg?.firstEditionNormal?.market,
  ];

  return candidates.some((value) => positivePrice(value) !== undefined);
}

export function getCardPrice(card?: PokemonCard | null): number {
  if (!card) return 0;

  const estimate = positivePrice(card.marketEstimate?.price);
  if (estimate !== undefined) return Number(estimate.toFixed(2));

  const language = card.dataLanguage ?? "en";
  const cm = card.cardmarket?.prices;

  // Pour une carte française, le prix bas Cardmarket est la référence la plus
  // proche de la première offre disponible. TCGplayer est un marché anglais et
  // ne doit jamais entrer dans la valorisation FR.
  if (language === "fr") {
    return Number((positivePrice(
      cm?.lowPrice ?? cm?.averageSellPrice ?? cm?.avg1 ?? cm?.avg7 ?? cm?.avg30 ?? cm?.trendPrice
    ) ?? 0).toFixed(2));
  }

  const cmMarket = positivePrice(
    cm?.lowPrice ?? cm?.trendPrice ?? cm?.averageSellPrice ?? cm?.avg7 ?? cm?.avg30
  );

  const tcg = card.tcgplayer?.prices;
  const variant = String(card.variant ?? "").toLowerCase();
  const preferredTcg =
    variant.includes("normal") ? tcg?.normal?.market
      : variant.includes("reverse") ? tcg?.reverseHolofoil?.market
      : tcg?.holofoil?.market;
  const tcgMarket = positivePrice(
    preferredTcg ?? tcg?.normal?.market ?? tcg?.holofoil?.market ?? tcg?.reverseHolofoil?.market
  );

  // TCGplayer/Cardmarket occidentaux ne sont pas utilisés pour JP/CN.
  if (language === "ja" || language === "zh-tw") return 0;

  const values = [cmMarket, tcgMarket].filter((value): value is number => value !== undefined);
  if (!values.length) return 0;
  values.sort((a, b) => a - b);
  const middle = Math.floor(values.length / 2);
  const result = values.length % 2 ? values[middle] : (values[middle - 1] + values[middle]) / 2;
  return Number(result.toFixed(2));
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

