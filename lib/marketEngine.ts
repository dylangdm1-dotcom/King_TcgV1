// lib/marketEngine.ts

import type {
  PokemonCard,
  CardCondition,
  MarketSourcePrice,
} from "./types";

import {
  DEFAULT_CONDITION,
} from "./types";

export { DEFAULT_CONDITION };

/**
 * =====================================================
 * 🧠 KING_TCG MARKET ENGINE V5.0
 * =====================================================
 *
 * SOURCE UNIQUE DE VÉRITÉ POUR LES PRIX.
 *
 * PRINCIPES :
 * - Near Mint par défaut
 * - aucune estimation par rareté
 * - aucun coefficient artificiel de condition
 * - aucune fausse source
 * - uniquement les prix réellement disponibles
 * - comparaison des sources indépendantes
 * - minimum / moyenne / maximum réels
 * - nombre de sources réelles
 * - condition isolée
 *
 * =====================================================
 */

export type MarketPrices = {
  lowestPrice: number;
  averagePrice: number;
  highestPrice: number;
  sourceCount: number;

  condition: CardCondition;

  cardmarket: number;
  ebay: number;
  justtcg: number;
  tcgplayer: number;

  /**
   * Compatibilité avec les anciens composants.
   * Toujours égal à averagePrice.
   */
  average: number;

  priceTrend7d: number;
  priceTrend30d: number;
  priceTrend90d: number;

  sources: MarketSourcePrice[];
};

// =====================================================
// 💱 TCGPLAYER USD → EUR
// =====================================================
//
// Taux temporaire utilisé par les données TCGPlayer.
// Il devra idéalement être remplacé par un taux dynamique
// lorsque le projet disposera d'une source FX fiable.
//
// =====================================================

const USD_TO_EUR = 0.92;

// =====================================================
// 🧹 HELPERS
// =====================================================

function safeNumber(value: unknown): number {
  const number = Number(value);

  return Number.isFinite(number) && number > 0
    ? number
    : 0;
}

function roundPrice(value: number): number {
  return Number(value.toFixed(2));
}

// =====================================================
// 💰 NORMALISATION CONDITION
// =====================================================

export function normalizeCondition(
  condition?: string | null
): CardCondition {
  const normalized = String(
    condition || DEFAULT_CONDITION
  )
    .trim()
    .toLowerCase();

  const conditions: Record<
    string,
    CardCondition
  > = {
    mint: "Mint",

    "near mint": "Near Mint",
    nm: "Near Mint",

    excellent: "Excellent",
    ex: "Excellent",

    good: "Good",

    "light played": "Light Played",
    lp: "Light Played",

    played: "Played",
    mp: "Played",

    poor: "Poor",
    damaged: "Poor",
  };

  return (
    conditions[normalized] ??
    DEFAULT_CONDITION
  );
}

// =====================================================
// ❌ ANCIEN SYSTÈME DE COEFFICIENTS
// =====================================================
//
// Conservé uniquement pour compatibilité avec les anciens
// appels.
//
// IMPORTANT :
// aucune condition différente de NM n'est estimée.
//
// Si un prix NM est fourni et que la condition demandée
// est "Played", nous NE faisons PAS :
// NM × 0.40
//
// Nous retournons 0 tant qu'aucun prix Played réel
// n'est disponible.
//
// =====================================================

export function getAdjustedPriceByCondition(
  basePrice: number,
  condition: string = DEFAULT_CONDITION
): number {
  const normalizedCondition =
    normalizeCondition(condition);

  const price = safeNumber(basePrice);

  if (!price) {
    return 0;
  }

  if (
    normalizedCondition === DEFAULT_CONDITION
  ) {
    return roundPrice(price);
  }

  return 0;
}

// =====================================================
// 💰 CARDMARKET
// =====================================================

/**
 * Retourne le prix Cardmarket réellement disponible.
 *
 * IMPORTANT :
 * Les données Cardmarket actuellement présentes dans
 * PokemonCard ne distinguent pas encore systématiquement
 * chaque condition.
 *
 * On utilise donc uniquement les données réellement
 * présentes, sans inventer de prix pour une autre condition.
 */
export function getCardMarketPrice(
  card?: PokemonCard | null,
  condition: CardCondition = DEFAULT_CONDITION
): number {
  if (!card?.cardmarket?.prices) {
    return 0;
  }

  /**
   * Tant que Cardmarket ne fournit pas de prix par état
   * dans notre modèle actuel, les données existantes
   * sont considérées comme NM uniquement.
   */
  if (condition !== DEFAULT_CONDITION) {
    return 0;
  }

  const prices = card.cardmarket.prices;

  const price =
    safeNumber(prices.lowPrice) ||
    safeNumber(prices.reverseHoloLow) ||
    safeNumber(prices.trendPrice) ||
    safeNumber(prices.averageSellPrice) ||
    safeNumber(prices.avg1);

  return price > 0
    ? roundPrice(price)
    : 0;
}

// =====================================================
// 💰 TCGPLAYER
// =====================================================

/**
 * Retourne le prix TCGPlayer réellement disponible.
 *
 * TCGPlayer fournit principalement ses données en USD.
 * Elles sont converties en EUR avant agrégation.
 *
 * Tant que notre modèle ne possède pas de prix TCGPlayer
 * séparé par condition, les données sont utilisables
 * uniquement pour Near Mint.
 */
export function getTCGPlayerPrice(
  card?: PokemonCard | null,
  condition: CardCondition = DEFAULT_CONDITION
): number {
  if (
    !card?.tcgplayer?.prices
  ) {
    return 0;
  }

  if (
    condition !== DEFAULT_CONDITION
  ) {
    return 0;
  }

  const prices =
    card.tcgplayer.prices;

  const extractLow = (
    target: unknown
  ): number => {
    if (
      !target ||
      typeof target !== "object"
    ) {
      return 0;
    }

    const data =
      target as Record<
        string,
        unknown
      >;

    return (
      safeNumber(data.low) ||
      safeNumber(data.directLow) ||
      safeNumber(data.market) ||
      safeNumber(data.mid)
    );
  };

  const usdPrice =
    extractLow(prices.normal) ||
    extractLow(prices.holofoil) ||
    extractLow(
      prices.reverseHolofoil
    ) ||
    extractLow(
      prices.firstEditionHolofoil
    ) ||
    extractLow(
      prices.firstEditionNormal
    );

  if (usdPrice <= 0) {
    return 0;
  }

  return roundPrice(
    usdPrice * USD_TO_EUR
  );
}

// =====================================================
// 💰 JUSTTCG
// =====================================================

/**
 * Prix JustTCG réellement stocké sur la carte.
 *
 * Aucun prix n'est copié depuis Cardmarket ou TCGPlayer.
 */
export function getJustTCGPrice(
  card?: PokemonCard | null,
  condition: CardCondition = DEFAULT_CONDITION
): number {
  if (!card?.justtcg) {
    return 0;
  }

  /**
   * Priorité aux données explicitement liées
   * à la condition demandée.
   */
  const conditionPrice =
    card.justtcg.prices?.[
      condition
    ];

  if (
    typeof conditionPrice === "number" &&
    Number.isFinite(conditionPrice) &&
    conditionPrice > 0
  ) {
    return roundPrice(
      conditionPrice
    );
  }

  /**
   * Le champ .price correspond au prix normalisé
   * principal du provider.
   *
   * Il est considéré comme Near Mint uniquement.
   */
  if (
    condition === DEFAULT_CONDITION
  ) {
    const price =
      safeNumber(
        card.justtcg.price
      );

    return price > 0
      ? roundPrice(price)
      : 0;
  }

  return 0;
}

// =====================================================
// 💰 EBAY
// =====================================================

/**
 * Prix eBay réel.
 *
 * Aucun calcul à partir d'une autre plateforme.
 */
export function getEbayPrice(
  card?: PokemonCard | null,
  condition: CardCondition = DEFAULT_CONDITION
): number {
  if (!card?.ebay) {
    return 0;
  }

  /**
   * Prix explicitement lié à la condition.
   */
  const conditionPrice =
    card.ebay.prices?.[
      condition
    ];

  if (
    typeof conditionPrice === "number" &&
    Number.isFinite(conditionPrice) &&
    conditionPrice > 0
  ) {
    return roundPrice(
      conditionPrice
    );
  }

  /**
   * .price = prix principal réel.
   * Il est utilisé uniquement pour NM.
   */
  if (
    condition === DEFAULT_CONDITION
  ) {
    const price =
      safeNumber(
        card.ebay.price
      );

    return price > 0
      ? roundPrice(price)
      : 0;
  }

  return 0;
}

// =====================================================
// 📊 SOURCES VALIDES
// =====================================================

function getValidSourcePrices(
  card: PokemonCard,
  condition: CardCondition
): MarketSourcePrice[] {
  const timestamp =
    Date.now();

  const cardmarket =
    getCardMarketPrice(
      card,
      condition
    );

  const ebay =
    getEbayPrice(
      card,
      condition
    );

  const justtcg =
    getJustTCGPrice(
      card,
      condition
    );

  const tcgplayer =
    getTCGPlayerPrice(
      card,
      condition
    );

  const sources:
    MarketSourcePrice[] = [];

  if (cardmarket > 0) {
    sources.push({
      source: "cardmarket",
      price: cardmarket,
      currency: "EUR",
      condition,
      timestamp,
    });
  }

  if (ebay > 0) {
    sources.push({
      source: "ebay",
      price: ebay,
      currency: "EUR",
      condition,
      timestamp,
    });
  }

  if (justtcg > 0) {
    sources.push({
      source: "justtcg",
      price: justtcg,
      currency: "EUR",
      condition,
      timestamp,
    });
  }

  if (tcgplayer > 0) {
    sources.push({
      source: "tcgplayer",
      price: tcgplayer,
      currency: "EUR",
      condition,
      timestamp,
    });
  }

  return sources;
}

// =====================================================
// 📊 AGRÉGATION
// =====================================================

export function aggregateMarketPrices(
  sourcePrices: MarketSourcePrice[],
  _condition: CardCondition =
    DEFAULT_CONDITION
): Pick<
  MarketPrices,
  | "lowestPrice"
  | "averagePrice"
  | "highestPrice"
  | "sourceCount"
> {
  /**
   * Une source = un prix.
   *
   * Les prix invalides sont ignorés.
   */
  const validPrices =
    sourcePrices
      .map((source) =>
        safeNumber(
          source.price
        )
      )
      .filter(
        (price) => price > 0
      );

  if (
    validPrices.length === 0
  ) {
    return {
      lowestPrice: 0,
      averagePrice: 0,
      highestPrice: 0,
      sourceCount: 0,
    };
  }

  const lowestPrice =
    Math.min(
      ...validPrices
    );

  const highestPrice =
    Math.max(
      ...validPrices
    );

  const total =
    validPrices.reduce(
      (
        sum,
        price
      ) => sum + price,
      0
    );

  const averagePrice =
    total /
    validPrices.length;

  return {
    lowestPrice:
      roundPrice(
        lowestPrice
      ),

    averagePrice:
      roundPrice(
        averagePrice
      ),

    highestPrice:
      roundPrice(
        highestPrice
      ),

    sourceCount:
      validPrices.length,
  };
}

// =====================================================
// 📉 PRIX MINIMUM
// =====================================================

export function getLowestMarketPrice(
  card?: PokemonCard | null,
  condition: string =
    DEFAULT_CONDITION
): number {
  if (!card) {
    return 0;
  }

  const normalizedCondition =
    normalizeCondition(
      condition
    );

  const sources =
    getValidSourcePrices(
      card,
      normalizedCondition
    );

  return aggregateMarketPrices(
    sources,
    normalizedCondition
  ).lowestPrice;
}

// =====================================================
// 📊 PRIX MOYEN
// =====================================================

export function getAverageMarketPrice(
  card?: PokemonCard | null,
  condition: string =
    DEFAULT_CONDITION
): number {
  if (!card) {
    return 0;
  }

  const normalizedCondition =
    normalizeCondition(
      condition
    );

  const sources =
    getValidSourcePrices(
      card,
      normalizedCondition
    );

  return aggregateMarketPrices(
    sources,
    normalizedCondition
  ).averagePrice;
}

// =====================================================
// 📈 PRIX MAXIMUM
// =====================================================

export function getHighestMarketPrice(
  card?: PokemonCard | null,
  condition: string =
    DEFAULT_CONDITION
): number {
  if (!card) {
    return 0;
  }

  const normalizedCondition =
    normalizeCondition(
      condition
    );

  const sources =
    getValidSourcePrices(
      card,
      normalizedCondition
    );

  return aggregateMarketPrices(
    sources,
    normalizedCondition
  ).highestPrice;
}

// =====================================================
// 📈 TENDANCE 7 JOURS
// =====================================================

export function getPriceTrend7d(
  card?: PokemonCard | null
): number {
  if (
    !card?.cardmarket?.prices
  ) {
    return 0;
  }

  const current =
    getCardMarketPrice(
      card,
      DEFAULT_CONDITION
    );

  const avg7 =
    safeNumber(
      card.cardmarket
        .prices.avg7
    );

  if (
    current <= 0 ||
    avg7 <= 0
  ) {
    return 0;
  }

  const diff =
    ((current - avg7) /
      avg7) *
    100;

  return Number.isFinite(diff)
    ? Number(
        diff.toFixed(1)
      )
    : 0;
}

// =====================================================
// 📈 TENDANCE 30 JOURS
// =====================================================

export function getPriceTrend30d(
  card?: PokemonCard | null
): number {
  if (
    !card?.cardmarket?.prices
  ) {
    return 0;
  }

  const current =
    getCardMarketPrice(
      card,
      DEFAULT_CONDITION
    );

  const avg30 =
    safeNumber(
      card.cardmarket
        .prices.avg30
    );

  if (
    current <= 0 ||
    avg30 <= 0
  ) {
    return 0;
  }

  const diff =
    ((current - avg30) /
      avg30) *
    100;

  return Number.isFinite(diff)
    ? Number(
        diff.toFixed(1)
      )
    : 0;
}

// =====================================================
// 📈 TENDANCE 90 JOURS
// =====================================================
//
// Le modèle Cardmarket actuel ne possède pas de valeur
// avg90.
//
// On retourne donc 0 tant qu'un historique réel 90 jours
// n'est pas disponible.
//
// =====================================================

export function getPriceTrend90d(
  _card?: PokemonCard | null
): number {
  return 0;
}

// =====================================================
// 📏 SPREAD
// =====================================================

export function getMarketSpread(
  card?: PokemonCard | null,
  condition: string =
    DEFAULT_CONDITION
): number {
  if (!card) {
    return 0;
  }

  const normalizedCondition =
    normalizeCondition(
      condition
    );

  const sources =
    getValidSourcePrices(
      card,
      normalizedCondition
    );

  const market =
    aggregateMarketPrices(
      sources,
      normalizedCondition
    );

  if (
    market.lowestPrice <= 0 ||
    market.highestPrice <= 0
  ) {
    return 0;
  }

  return roundPrice(
    market.highestPrice -
      market.lowestPrice
  );
}

// =====================================================
// 🔥 MARKET DATA
// =====================================================

export function getMarketData(
  card?: PokemonCard | null,
  condition: string =
    DEFAULT_CONDITION
): MarketPrices {
  const normalizedCondition =
    normalizeCondition(
      condition
    );

  if (!card) {
    return {
      lowestPrice: 0,
      averagePrice: 0,
      highestPrice: 0,
      sourceCount: 0,

      condition:
        normalizedCondition,

      cardmarket: 0,
      ebay: 0,
      justtcg: 0,
      tcgplayer: 0,

      average: 0,

      priceTrend7d: 0,
      priceTrend30d: 0,
      priceTrend90d: 0,

      sources: [],
    };
  }

  const sources =
    getValidSourcePrices(
      card,
      normalizedCondition
    );

  const aggregated =
    aggregateMarketPrices(
      sources,
      normalizedCondition
    );

  const cardmarket =
    sources.find(
      (source) =>
        source.source ===
        "cardmarket"
    )?.price ?? 0;

  const ebay =
    sources.find(
      (source) =>
        source.source ===
        "ebay"
    )?.price ?? 0;

  const justtcg =
    sources.find(
      (source) =>
        source.source ===
        "justtcg"
    )?.price ?? 0;

  const tcgplayer =
    sources.find(
      (source) =>
        source.source ===
        "tcgplayer"
    )?.price ?? 0;

  return {
    lowestPrice:
      aggregated.lowestPrice,

    averagePrice:
      aggregated.averagePrice,

    highestPrice:
      aggregated.highestPrice,

    sourceCount:
      aggregated.sourceCount,

    condition:
      normalizedCondition,

    cardmarket,
    ebay,
    justtcg,
    tcgplayer,

    /**
     * Compatibilité V4/V5.
     *
     * IMPORTANT :
     * ce n'est plus le minimum.
     * C'est la vraie moyenne.
     */
    average:
      aggregated.averagePrice,

    priceTrend7d:
      getPriceTrend7d(
        card
      ),

    priceTrend30d:
      getPriceTrend30d(
        card
      ),

    priceTrend90d:
      getPriceTrend90d(
        card
      ),

    sources,
  };
}

// =====================================================
// 📈 CROISSANCE
// =====================================================

export function getMarketGrowth(
  card?: PokemonCard | null,
  buyPrice: number = 0,
  condition: string =
    DEFAULT_CONDITION
): number {
  if (
    !card ||
    buyPrice <= 0
  ) {
    return 0;
  }

  const market =
    getMarketData(
      card,
      condition
    );

  const currentPrice =
    market.averagePrice;

  if (
    currentPrice <= 0
  ) {
    return 0;
  }

  const growth =
    ((currentPrice -
      buyPrice) /
      buyPrice) *
    100;

  return Number.isFinite(growth)
    ? Number(
        growth.toFixed(1)
      )
    : 0;
}
