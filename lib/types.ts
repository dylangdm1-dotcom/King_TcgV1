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

export type SearchFilters = {
  category: string;
  rarity: string;
  set: string;
  sort: string;

  query?: string;
  minPrice?: number;
  maxPrice?: number;
};

//
// 📈 HISTORIQUE
//

export interface PriceHistoryPoint {
  date: number;
  price: number;
}

//
// 💰 MARCHÉ
//

export interface MarketSnapshot {
  cardmarket: number;
  tcgplayer: number;
  ebay: number;
  average: number;
  priceTrend7d?: number;  // Ajouté pour accueillir la vraie stat d'évolution 7j
  priceTrend30d?: number; // Ajouté pour accueillir la vraie stat d'évolution 30j
}

//
// 🧠 INVESTISSEMENT
//

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

//
// 📚 COLLECTION
// (devient la seule source de vérité)
//

export interface CollectionEntry {
  quantity: number;
  buyPrice: number;
  createdAt: string;
}

export type CollectionMap = Record<string, number>;

//
// 💰 PRIX PRINCIPAL (Sécurisé pour les calculs de somme et cohérent avec l'API)
//

export function getCardPrice(card: PokemonCard): number {
  if (!card) return 0;

  const tcg =
    card.tcgplayer?.prices?.holofoil?.market ??
    card.tcgplayer?.prices?.normal?.market ??
    card.tcgplayer?.prices?.reverseHolofoil?.market ??
    card.tcgplayer?.prices?.firstEditionHolofoil?.market ??
    card.tcgplayer?.prices?.firstEditionNormal?.market;

  if (typeof tcg === "number" && tcg > 0) {
    return tcg;
  }

  const cm =
    card.cardmarket?.prices?.averageSellPrice ??
    card.cardmarket?.prices?.trendPrice ??
    card.cardmarket?.prices?.lowPrice;

  if (typeof cm === "number" && cm > 0) {
    return cm;
  }

  return 0; // Retourne 0 au lieu de null pour éviter les crashs arithmétiques
}