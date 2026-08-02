// lib/pricing.ts

import type { PokemonCard } from "./types";

import {
  DEFAULT_CONDITION,
  normalizeCondition,
  getMarketData,
  getCardMarketPrice,
  getTCGPlayerPrice,
  getEbayPrice,
  getJustTCGPrice,
  getAverageMarketPrice,
  getLowestMarketPrice,
  getHighestMarketPrice,
  getMarketSpread,
  getAdjustedPriceByCondition,
  aggregateMarketPrices,
} from "./marketEngine";

/**
 * =====================================================
 * 💰 KING_TCG PRICING V5.0
 * =====================================================
 *
 * Façade unique vers le Market Engine V5.0.
 *
 * PRINCIPES :
 * - Near Mint par défaut
 * - aucune estimation par coefficient
 * - aucun fallback artificiel
 * - aucune moyenne approximative
 * - minimum = vrai prix minimum disponible
 * - moyenne = moyenne des sources réellement disponibles
 * - maximum = vrai prix maximum disponible
 * - les conditions doivent être récupérées auprès
 *   des sources correspondantes
 *
 * Les providers réels sont branchés progressivement
 * dans les prochaines étapes.
 *
 * =====================================================
 */

// =====================================================
// 🔁 EXPORTS — COMPATIBILITÉ
// =====================================================

export {
  DEFAULT_CONDITION,
  normalizeCondition,

  getMarketData,

  getCardMarketPrice,
  getTCGPlayerPrice,
  getEbayPrice,
  getJustTCGPrice,

  getAverageMarketPrice,
  getLowestMarketPrice,
  getHighestMarketPrice,

  getMarketSpread,

  /**
   * Conservé temporairement pour compatibilité avec
   * les anciens imports.
   *
   * IMPORTANT :
   * cette fonction ne fait plus de conversion artificielle
   * entre les états.
   */
  getAdjustedPriceByCondition,

  aggregateMarketPrices,
};

// =====================================================
// ❌ ANCIEN SYSTÈME DE MULTIPLICATEURS SUPPRIMÉ
// =====================================================

/**
 * Ancien système :
 *
 * Near Mint = 0.90
 * Excellent = 0.75
 * Good = 0.60
 * etc.
 *
 * SUPPRIMÉ EN V5.0.
 *
 * Une condition doit correspondre à un prix réellement
 * récupéré depuis une source.
 *
 * Cette fonction est conservée temporairement afin de ne
 * pas casser les composants qui l'importent encore.
 *
 * Elle ne doit PLUS être utilisée pour calculer un prix
 * de marché.
 */
export function getConditionMultiplier(
  condition: string = DEFAULT_CONDITION
): number {
  const normalized = normalizeCondition(condition);

  // V5.0 :
  // aucun coefficient artificiel.
  //
  // On retourne 1 uniquement pour maintenir la compatibilité
  // technique des anciens consommateurs pendant la migration.
  return normalized ? 1 : 1;
}

// =====================================================
// 📈 PRIX MAXIMUM DU MARCHÉ
// =====================================================

/**
 * Retourne le prix maximum réellement disponible
 * pour la condition demandée.
 *
 * V5.0 :
 * - aucune multiplication par condition
 * - aucune donnée inventée
 * - aucune copie d'une source vers une autre
 */
export function getBestMarketPrice(
  card?: PokemonCard | null,
  condition: string = DEFAULT_CONDITION
): number {
  if (!card) {
    return 0;
  }

  return getHighestMarketPrice(
    card,
    condition
  );
}

// =====================================================
// 📉 PRIX MINIMUM DU MARCHÉ
// =====================================================

/**
 * Retourne le prix réellement le moins cher parmi
 * les sources disponibles pour la condition demandée.
 *
 * Exemple :
 *
 * Cardmarket : 24,90 €
 * eBay       : 26,50 €
 * JustTCG    : 25,30 €
 *
 * → 24,90 €
 */
export function getMinMarketPrice(
  card?: PokemonCard | null,
  condition: string = DEFAULT_CONDITION
): number {
  if (!card) {
    return 0;
  }

  return getLowestMarketPrice(
    card,
    condition
  );
}

// =====================================================
// 📊 PRIX MOYEN DU MARCHÉ
// =====================================================

/**
 * Retourne la moyenne réelle des sources disponibles.
 *
 * Exemple :
 *
 * Cardmarket : 24,90 €
 * eBay       : 26,50 €
 * JustTCG    : 25,30 €
 *
 * → 25,57 €
 */
export function getRealAverageMarketPrice(
  card?: PokemonCard | null,
  condition: string = DEFAULT_CONDITION
): number {
  if (!card) {
    return 0;
  }

  return getAverageMarketPrice(
    card,
    condition
  );
}

// =====================================================
// 📊 STATISTIQUES COMPLÈTES
// =====================================================

/**
 * Point d'entrée recommandé pour les nouveaux composants.
 *
 * Retourne :
 *
 * - lowestPrice
 * - averagePrice
 * - highestPrice
 * - sourceCount
 * - condition
 * - détail de chaque source
 */
export function getMarketStatistics(
  card?: PokemonCard | null,
  condition: string = DEFAULT_CONDITION
) {
  return getMarketData(
    card,
    condition
  );
}