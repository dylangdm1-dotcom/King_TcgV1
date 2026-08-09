// lib/types.ts

export interface CardPrice {
  low?: number;
  mid?: number;
  high?: number;
  market?: number;
}

export interface PokemonCard {
  id: string;
  name: string;
  number: string;

  images: {
    small: string;
    large: string;
  };

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

  condition?:
    | "Mint"
    | "Near Mint"
    | "Excellent"
    | "Good"
    | "Played";
}


// 🧠 Résultat brut du scanner Gemini
// Utilisé entre scan → résolution → recherche carte

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

  query?: string;
  minPrice?: number;
  maxPrice?: number;
};


// 📈 HISTORIQUE

export interface PriceHistoryPoint {
  date: number;
  price: number;
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
  createdAt: string;
}

export type CollectionMap = Record<string, number>;


// 💰 PRIX PRINCIPAL (Sécurisé)

export function getCardPrice(card?: PokemonCard | null): number {
  if (!card) return 0;

  // 1. Essai via TCGPlayer
  const tcgPrices = card.tcgplayer?.prices;
  if (tcgPrices) {
    const tcg =
      tcgPrices.holofoil?.market ??
      tcgPrices.normal?.market ??
      tcgPrices.reverseHolofoil?.market ??
      tcgPrices.firstEditionHolofoil?.market ??
      tcgPrices.firstEditionNormal?.market;

    if (typeof tcg === "number" && tcg > 0) {
      return tcg;
    }
  }

  // 2. Fallback via CardMarket
  const cmPrices = card.cardmarket?.prices;
  if (cmPrices) {
    const cm =
      cmPrices.averageSellPrice ??
      cmPrices.trendPrice ??
      cmPrices.lowPrice;

    if (typeof cm === "number" && cm > 0) {
      return cm;
    }
  }

  return 0;
}