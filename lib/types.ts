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

  const cm = card.cardmarket?.prices;
  const cmMarket = positivePrice(
    cm?.trendPrice ??
      cm?.averageSellPrice ??
      cm?.avg7 ??
      cm?.avg30 ??
      cm?.lowPrice
  );

  const tcg = card.tcgplayer?.prices;
  const variant = String(card.variant ?? "").toLowerCase();
  const preferredTcg =
    variant.includes("alt") ||
    variant.includes("full art") ||
    variant.includes("rainbow") ||
    variant.includes("gold") ||
    variant.includes("shiny")
      ? tcg?.holofoil?.market
      : variant.includes("normal")
        ? tcg?.normal?.market
        : variant.includes("reverse")
          ? tcg?.reverseHolofoil?.market
          : undefined;

  const tcgMarket = positivePrice(
    preferredTcg ??
      tcg?.normal?.market ??
      tcg?.holofoil?.market ??
      tcg?.reverseHolofoil?.market ??
      tcg?.firstEditionHolofoil?.market ??
      tcg?.firstEditionNormal?.market
  );

  const values = [cmMarket, tcgMarket].filter(
    (value): value is number => value !== undefined
  );

  if (!values.length) return 0;

  return Number(
    (values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2)
  );
}