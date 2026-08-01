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

import { getCardPrice } from "@/lib/types";

// =====================================================
// 💰 PRIX PRINCIPAL V5
// =====================================================
//
// Une seule source de vérité pour le prix.
// La logique complète se trouve dans lib/types.ts.
// =====================================================

export { getCardPrice };
