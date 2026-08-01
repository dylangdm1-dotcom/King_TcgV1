// lib/resolvePokemon.ts

// =====================================================
// 🧠 TYPES CENTRAUX
// =====================================================

export type {
  CardPrice,
  PokemonCard,
  CardScanResult,
  SearchFilters,
  PriceHistoryPoint,
  MarketSnapshot,
  InvestmentResult,
  PredictionResult,
  CollectionEntry,
  CollectionMap,
} from "@/lib/types";

import type { PokemonCard } from "@/lib/types";

// =====================================================
// 💰 PRIX PRINCIPAL
// =====================================================

export function getCardPrice(
  card?: PokemonCard | null
): number {
  if (!card) {
    return 0;
  }

  // ---------------------------------------------------
  // 1. TCGPlayer
  // ---------------------------------------------------

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

  // ---------------------------------------------------
  // 2. CardMarket
  // ---------------------------------------------------

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