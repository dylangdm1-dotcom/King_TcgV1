// lib/types.ts

export type CardCondition =
  | "Mint"
  | "Near Mint"
  | "Excellent"
  | "Good"
  | "Light Played"
  | "Played"
  | "Poor";


export type CardPrintVariantKey =
  | "Normal"
  | "Holofoil"
  | "Reverse Holofoil"
  | "Poké Ball"
  | "Master Ball"
  | "First Edition"
  | `PokéWallet:${string}`;

export interface CardPrintVariant {
  key: CardPrintVariantKey;
  label: string;
  foil?: string;
  tcgplayerId?: number;
  cardmarketId?: number;
  /** Identité exacte de l'impression chez le fournisseur régional. */
  providerId?: string;
  /** Type physique transmis aux fournisseurs marché, distinct de la clé de sélection. */
  marketPrinting?: "Normal" | "Holofoil" | "Reverse Holofoil" | "Poké Ball" | "Master Ball" | "First Edition";
  /** Visuels propres à cette impression, sans dupliquer l'identité catalogue. */
  images?: { small: string; large: string };
  imageCandidates?: string[];
  /** Cotations attachées précisément à cette impression lorsque le fournisseur les expose. */
  pricing?: {
    cardmarket?: Record<string, unknown>;
    tcgplayer?: Record<string, unknown>;
  };
}

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

export interface MarketCacheMetadata {
  key: string;
  state: "fresh" | "network" | "stale-fallback";
  backend?: "memory" | "redis-rest";
  scope?: "instance" | "multi-instance";
  cachedAt: string;
  freshUntil: string;
  staleUntil: string;
}

/** Relevé King_TCG observé pour un produit marché canonique précis. */
export interface MarketHistoryPoint {
  date: number;
  day?: string;
  cardmarket: number;
  ebay: number;
  tcgplayer: number;
  justtcg?: number;
  average: number;
  origin?: "observed" | "reconstructed";
  language?: "fr" | "en" | "ja" | "zh-tw";
  condition?: string;
  printingVariant?: string;
  confidence?: MarketConfidence;
  sourceCount?: number;
  sourceClassifications?: Partial<
    Record<"cardmarket" | "ebay" | "tcgplayer" | "justtcg", "exact" | "comparable" | "indicative">
  >;
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
    | "active_listing_average"
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
  /** Identifiant serveur du fournisseur, utilisé sans exposer sa clé API. */
  providerId?: string;
  name: string;
  number: string;

  images: {
    small: string;
    large: string;
  };

  /** URLs de secours testées dans l’ordre lorsque le visuel principal échoue. */
  imageCandidates?: string[];

  /** Versions physiques connues pour cette carte, sans dupliquer le résultat catalogue. */
  availablePrintVariants?: CardPrintVariant[];
  /** Version sélectionnée pour la cotation/collection sur la fiche. */
  selectedPrintVariant?: CardPrintVariantKey;

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
    /** Nombre de cartes uniques affichées dans la grille. */
    identityCount?: number;
    /** Nombre d'impressions physiques couvertes par le fournisseur. */
    providerPrintCount?: number;
    coverageBasis?: "canonical_identities" | "provider_prints";
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
      /** Première offre réelle dans la liste vendeurs, filtrée langue FR + NM. */
      frenchNmLow?: number;
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
    currentPrice?: number;
    language?: string;
    condition?: string;
    printing?: string;
    sampleSize?: number;
    cardUuid?: string;
    cardId?: string;
    variantUuid?: string;
    variantId?: string;
    tcgplayerSkuId?: string;
    priceChange24hr?: number;
    priceChange7d?: number;
    avgPrice7d?: number;
    minPrice7d?: number;
    maxPrice7d?: number;
    url?: string;
    updatedAt?: string;
  };

  ebayListings?: {
    median?: number;
    average?: number;
    sampleSize?: number;
    rawSampleSize?: number;
    exactSampleSize?: number;
    language?: "fr" | "en" | "ja" | "zh-tw" | "unknown";
    condition?: "Near Mint" | "Unknown";
    query?: string;
    url?: string;
    updatedAt?: string;
  };

  marketQuotes?: MarketQuote[];
  /** Diagnostic temporaire Cardmarket FR reçu côté serveur Vercel. */
  debugCardmarketFr?: {
    url?: string;
    fetchStatus?: string;
    articleRows: number;
    frNmPrices: number[];
    htmlHas210: boolean;
    htmlHas27899: boolean;
    stage?: string;
    searchQueries?: string[];
    identitySource?: string;
    cardmarketProductId?: string;
    cardmarketVariant?: string;
    cardmarketFoil?: string;
  };
  /** Diagnostic temporaire JustTCG sans exposer la clé API. */
  debugJustTcg?: {
    keyConfigured: boolean;
    stage: string;
    status?: "ok" | "not_found" | "rate_limited" | "unavailable";
    lookup?: string;
    candidateCount?: number;
    matchingVariantCount?: number;
    tcgplayerId?: string;
    selectedPriceUsd?: number;
    selectedPriceEur?: number;
    language?: string;
    printing?: string;
    availablePrintings?: string[];
    availableLanguages?: string[];
    availableConditions?: string[];
    selectedPrinting?: string;
    totalVariantCount?: number;
    positivePriceVariantCount?: number;
    selectedLanguage?: string;
    languageComparable?: boolean;
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
    pokewallet?: boolean;
  };
  /** Fraîcheur de la cotation partagée, indépendante des métadonnées catalogue. */
  marketCache?: MarketCacheMetadata;
  /** Historique serveur du produit marché actif, séparé des métadonnées catalogue. */
  marketHistory?: MarketHistoryPoint[];
  marketHistoryBackend?: "memory" | "redis-rest";
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
  rangeLow: number;
  rangeHigh: number;
  quality: "insufficient" | "limited" | "moderate" | "strong";
  qualityLabel: string;
  evidence: string[];
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
  if (card.marketQuotes?.some((quote) => positivePrice(quote.price) !== undefined)) return true;
  return positivePrice(card.marketEstimate?.price) !== undefined;
}

export function getCardPrice(card?: PokemonCard | null): number {
  if (!card) return 0;
  const estimate = positivePrice(card.marketEstimate?.price);
  return estimate !== undefined ? Number(estimate.toFixed(2)) : 0;
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
