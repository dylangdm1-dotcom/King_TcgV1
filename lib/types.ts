// lib/types.ts

// =====================================================
// 🧠 KING_TCG TYPES V5.0
// =====================================================
//
// Types centraux du projet.
//
// V5.0 :
// - Near Mint par défaut
// - prix réels uniquement
// - aucune estimation par rareté
// - aucune conversion artificielle par condition
// - sources de prix indépendantes
// - historique lié à la condition
// - minimum / moyenne / maximum réels
//
// =====================================================

// =====================================================
// 💰 CONDITIONS
// =====================================================

export type CardCondition =
  | "Mint"
  | "Near Mint"
  | "Excellent"
  | "Good"
  | "Light Played"
  | "Played"
  | "Poor";

export const DEFAULT_CONDITION: CardCondition =
  "Near Mint";

// =====================================================
// 💰 SOURCES DE MARCHÉ
// =====================================================

export type MarketSource =
  | "cardmarket"
  | "ebay"
  | "justtcg"
  | "tcgplayer";

// =====================================================
// 💰 PRIX SOURCE
// =====================================================

export interface CardPrice {
  low?: number;
  mid?: number;
  high?: number;
  market?: number;
  directLow?: number;
}

// =====================================================
// 💰 PRIX MARCHÉ V5
// =====================================================

export interface MarketSourcePrice {
  source: MarketSource;

  /**
   * Prix déjà normalisé en EUR.
   */
  price: number;

  currency: "EUR";

  /**
   * État correspondant exactement au prix.
   */
  condition: CardCondition;

  /**
   * Date de récupération.
   */
  timestamp: number;
}

export interface MarketSnapshot {
  /**
   * État correspondant au snapshot.
   */
  condition: CardCondition;

  /**
   * Prix minimum réellement disponible.
   */
  lowestPrice: number;

  /**
   * Moyenne réellement calculée à partir
   * des prix valides disponibles.
   */
  averagePrice: number;

  /**
   * Prix maximum réellement disponible.
   */
  highestPrice: number;

  /**
   * Nombre de sources réellement utilisées.
   */
  sourceCount: number;

  /**
   * Prix individuels par source.
   *
   * 0 = source indisponible.
   */
  cardmarket: number;
  ebay: number;
  justtcg: number;
  tcgplayer: number;

  /**
   * Compatibilité avec l'ancien code.
   *
   * Toujours égal à averagePrice.
   */
  average: number;

  /**
   * Tendances calculées à partir de l'historique réel.
   */
  priceTrend7d?: number;
  priceTrend30d?: number;
  priceTrend90d?: number;

  /**
   * Sources réellement utilisées.
   */
  sources?: MarketSourcePrice[];
}

// =====================================================
// 🃏 POKEMON CARD
// =====================================================

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

  // ===================================================
  // 💰 COMPUTED PRICE — COMPATIBILITÉ
  // ===================================================
  //
  // Conservé temporairement afin d'éviter de casser
  // les anciens composants.
  //
  // V5.0 :
  // ce champ NE DOIT PAS être utilisé pour inventer
  // un prix.
  //
  // Le Market Engine reste la source de vérité.
  //
  computedPrice?: number;

  // ===================================================
  // 💰 MARCHÉ V5
  // ===================================================

  market?: MarketSnapshot;

  // ===================================================
  // 🧠 CLASSIFICATION SCANNER
  // ===================================================

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

  // ===================================================
  // 📦 EXTENSION
  // ===================================================

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

  // ===================================================
  // 💰 TCGPLAYER
  // ===================================================

  tcgplayer?: {
    url?: string;
    updatedAt?: string;

    /**
     * Les données brutes du provider peuvent être
     * conservées ici.
     *
     * Le Market Engine doit les normaliser avant
     * comparaison avec les autres sources.
     */
    prices?: {
      holofoil?: CardPrice;
      normal?: CardPrice;
      reverseHolofoil?: CardPrice;
      firstEditionHolofoil?: CardPrice;
      firstEditionNormal?: CardPrice;
    };
  };

  // ===================================================
  // 💰 CARDMARKET
  // ===================================================

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

  // ===================================================
  // 💰 JUSTTCG
  // ===================================================

  justtcg?: {
    url?: string;
    updatedAt?: string;

    /**
     * Prix réel Near Mint / condition par défaut.
     */
    price?: number;

    /**
     * Prix réellement retournés par condition.
     *
     * Aucune valeur ne doit être calculée avec
     * un coefficient.
     */
    prices?: Partial<
      Record<CardCondition, number>
    >;
  };

  // ===================================================
  // 💰 EBAY
  // ===================================================

  ebay?: {
    url?: string;
    updatedAt?: string;

    /**
     * Prix réellement récupéré.
     */
    price?: number;

    /**
     * Prix réellement disponibles par condition.
     */
    prices?: Partial<
      Record<CardCondition, number>
    >;
  };

  // ===================================================
  // ❤️ COLLECTION
  // ===================================================

  favorite?: boolean;
  quantity?: number;

  /**
   * État de l'exemplaire possédé.
   *
   * Near Mint par défaut dans les nouveaux flux.
   */
  condition?: CardCondition;
}

// =====================================================
// 🧠 GEMINI SCAN RESULT V5.0
// =====================================================

export interface CardScanResult {
  cardName: string | null;
  pokemonName: string | null;

  cardType:
    | "Pokemon"
    | "Trainer"
    | "Energy"
    | "Unknown"
    | null;

  language:
    | "fr"
    | "en"
    | "ja"
    | "zh-cn"
    | "zh-tw"
    | "de"
    | "es"
    | "it"
    | string
    | null;

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

  possibleNames: string[];

  confidence: number;

  needsSecondPass: boolean;
}

// =====================================================
// 🔎 SEARCH FILTERS V5
// =====================================================

export type SearchFilters = {
  category: string;
  rarity: string;
  set: string;
  sort: string;

  /**
   * Near Mint par défaut.
   */
  condition: CardCondition;

  query?: string;

  minPrice?: number;
  maxPrice?: number;
};

// =====================================================
// 📈 HISTORIQUE V5
// =====================================================

export interface PriceHistoryPoint {
  /**
   * Timestamp du snapshot.
   */
  date: number;

  /**
   * Carte concernée.
   */
  cardId?: string;

  /**
   * État exact du snapshot.
   */
  condition?: CardCondition;

  /**
   * Minimum réel disponible.
   */
  lowestPrice?: number;

  /**
   * Moyenne réelle des sources disponibles.
   */
  averagePrice?: number;

  /**
   * Maximum réel disponible.
   */
  highestPrice?: number;

  /**
   * Nombre de sources utilisées.
   */
  sourceCount?: number;

  /**
   * Compatibilité graphique.
   *
   * Correspond normalement à averagePrice.
   */
  price?: number;
}

// =====================================================
// 📈 HISTORIQUE PAR CONDITION
// =====================================================

export type PriceHistoryMap = Record<
  string,
  PriceHistoryPoint[]
>;

/**
 * Sépare complètement l'historique de chaque état.
 *
 * Exemple :
 *
 * charizard-123::Near Mint
 * charizard-123::Played
 */
export function getPriceHistoryKey(
  cardId: string,
  condition: CardCondition =
    DEFAULT_CONDITION
): string {
  return `${cardId}::${condition}`;
}

// =====================================================
// 🧠 INVESTISSEMENT
// =====================================================

export interface InvestmentResult {
  score: number;
  trend:
    | "up"
    | "down"
    | "stable";
  recommendation: string;
}

export interface PredictionResult {
  predictedPrice30d: number;
  roi30d: number;
  confidence: number;
}

// =====================================================
// 📚 COLLECTION
// =====================================================

export interface CollectionEntry {
  quantity: number;
  buyPrice: number;
  createdAt: string;
}

export type CollectionMap =
  Record<string, number>;

// =====================================================
// 💰 PRIX PRINCIPAL V5
// =====================================================
//
// IMPORTANT
// ---------
//
// Le Market Engine est la source de vérité.
//
// getCardPrice() est conservé uniquement pour
// compatibilité avec les anciens appels.
//
// Il ne doit plus avoir son propre système de priorité.
// Il ne doit créer aucun prix.
// Il ne doit appliquer aucun coefficient.
// Il ne doit utiliser aucun fallback par rareté.
//
// =====================================================

/**
 * Compatibilité historique.
 *
 * Cette fonction lit uniquement le snapshot de marché
 * déjà normalisé sur la carte.
 *
 * Les nouveaux appels doivent utiliser :
 *
 * getMarketData()
 * getMinMarketPrice()
 * getAverageMarketPrice()
 * etc.
 */
export function getCardPrice(
  card?: PokemonCard | null,
  condition: CardCondition =
    DEFAULT_CONDITION
): number {
  if (!card) {
    return 0;
  }

  /**
   * Si un snapshot correspondant exactement
   * à l'état demandé existe, il est prioritaire.
   */
  if (
    card.market &&
    card.market.condition === condition
  ) {
    return Number(
      (
        card.market.lowestPrice || 0
      ).toFixed(2)
    );
  }

  /**
   * Compatibilité avec les anciennes cartes
   * possédant uniquement des données Cardmarket.
   *
   * IMPORTANT :
   * uniquement pour Near Mint.
   *
   * Aucun coefficient n'est appliqué.
   */
  if (
    condition === DEFAULT_CONDITION
  ) {
    const cmPrice =
      card.cardmarket?.prices?.lowPrice;

    if (
      typeof cmPrice === "number" &&
      Number.isFinite(cmPrice) &&
      cmPrice > 0
    ) {
      return Number(
        cmPrice.toFixed(2)
      );
    }
  }

  return 0;
}