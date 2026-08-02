// lib/priceTracker.ts

import type { PokemonCard } from "./types";
import {
  DEFAULT_CONDITION,
  getMarketData,
} from "./marketEngine";
import {
  saveMarketPrice,
  getMarketHistory,
} from "./priceHistory";

// =====================================================
// 💰 KING_TCG PRICE TRACKER V5
// =====================================================
//
// Utilise exclusivement le Market Engine V5.
//
// PRINCIPES :
// - Near Mint par défaut
// - aucune conversion artificielle
// - aucune source remplacée par une autre
// - aucune moyenne injectée dans une source absente
// - moyenne basée uniquement sur les prix réellement disponibles
// - historique basé sur les vraies données du marché
//
// =====================================================

/**
 * Calcule les prix réels disponibles pour une carte
 * et une condition donnée.
 *
 * Les prix retournés par marketEngine sont utilisés tels quels.
 *
 * Une source absente reste à 0.
 * Elle n'est jamais remplacée par la moyenne.
 */
export function calculateRealMarketPrices(
  card?: PokemonCard | null,
  condition: string = DEFAULT_CONDITION
) {
  if (!card) {
    return {
      cardmarket: 0,
      tcgplayer: 0,
      ebay: 0,
      average: 0,
    };
  }

  const market = getMarketData(card, condition);

  const cardmarket =
    typeof market.cardmarket === "number" && market.cardmarket > 0
      ? market.cardmarket
      : 0;

  const tcgplayer =
    typeof market.tcgplayer === "number" && market.tcgplayer > 0
      ? market.tcgplayer
      : 0;

  const ebay =
    typeof market.ebay === "number" && market.ebay > 0
      ? market.ebay
      : 0;

  // =====================================================
  // 📊 MOYENNE RÉELLE
  // =====================================================
  //
  // Uniquement les sources réellement disponibles.
  // Aucune source absente n'est remplacée par une moyenne.
  //

  const activePrices = [
    cardmarket,
    tcgplayer,
    ebay,
  ].filter(
    (price): price is number =>
      typeof price === "number" && price > 0
  );

  const average =
    activePrices.length > 0
      ? Number(
          (
            activePrices.reduce(
              (sum, price) => sum + price,
              0
            ) / activePrices.length
          ).toFixed(2)
        )
      : 0;

  return {
    cardmarket,
    tcgplayer,
    ebay,
    average,
  };
}

/**
 * Enregistre l'historique des prix de la carte
 * si aucun point n'a encore été enregistré aujourd'hui.
 *
 * Near Mint est utilisé par défaut.
 */
export function trackCardPrice(
  card?: PokemonCard | null,
  force = false,
  condition: string = DEFAULT_CONDITION
) {
  if (!card?.id) return;

  try {
    const history = getMarketHistory(card.id);
    const today = new Date().toISOString().slice(0, 10);

    // =====================================================
    // 📅 ÉVITER LES DOUBLONS QUOTIDIENS
    // =====================================================

    if (!force && Array.isArray(history) && history.length > 0) {
      const last = history[history.length - 1];

      if (last?.date) {
        const lastDate = new Date(last.date)
          .toISOString()
          .slice(0, 10);

        if (lastDate === today) {
          return;
        }
      }
    }

    // =====================================================
    // 💰 RÉCUPÉRATION DES VRAIS PRIX
    // =====================================================

    const market = calculateRealMarketPrices(
      card,
      condition
    );

    if (market.average <= 0) {
      console.warn(
        `[PriceTracker] Aucun prix valide détecté pour ${card.name} (${card.id})`
      );

      return;
    }

    // =====================================================
    // 💾 SAUVEGARDE
    // =====================================================
    //
    // Une source absente reste à 0.
    // Elle n'est jamais remplacée artificiellement
    // par la moyenne.
    //

    saveMarketPrice(
      card.id,
      market.cardmarket,
      market.ebay,
      market.tcgplayer
    );
  } catch (error) {
    console.error(
      `[PriceTracker] Erreur lors du suivi du prix pour ${card.id}:`,
      error
    );
  }
}
