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

// =====================================================
// 💰 PRIX PRINCIPAL V5
// =====================================================
//
// Une seule façade pour le système de prix.
// La logique complète se trouve dans :
//
// lib/pricing.ts
//     ↓
// lib/marketEngine.ts
//
// =====================================================

export {
  getMinMarketPrice,
  getRealAverageMarketPrice,
  getBestMarketPrice,
  getMarketStatistics,
} from "@/lib/pricing";