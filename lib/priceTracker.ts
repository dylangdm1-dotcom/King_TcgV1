// lib/priceTracker.ts

import type { PokemonCard } from "./types";
import { saveMarketPrice, getMarketHistory } from "./priceHistory";
import {
  getMarketData,
  getCardMarketPrice,
  getTCGPlayerPrice,
  getEbayPrice,
  getAverageMarketPrice,
} from "./marketEngine";

/**
 * Calcule des prix réels, harmonisés et une vraie moyenne pour une carte donnée
 * Aligné rigoureusement sur le moteur de marché global (marketEngine)
 */
export function calculateRealMarketPrices(card?: PokemonCard | null) {
  if (!card) {
    return { cardmarket: 0, tcgplayer: 0, ebay: 0, average: 0 };
  }

  // Utilisation directe du moteur central de marché pour cohérence
  const market = getMarketData(card);

  const cardmarket = market.cardmarket || getCardMarketPrice(card) || 0;
  
  // marketEngine renvoie déjà le TCGPlayer harmonisé en EUR.
  const tcgplayer = market.tcgplayer || getTCGPlayerPrice(card) || 0;

  // eBay reste 0 tant qu'une source eBay réelle n'est pas branchée.
  const ebay = market.ebay || getEbayPrice(card) || 0;

  // V45: there is only one official King_TCG quote. Collection, Dashboard,
  // history and card detail must never recompute a different arithmetic mean.
  const average = market.average || getAverageMarketPrice(card) || 0;

  return {
    cardmarket,
    tcgplayer,
    ebay,
    average,
  };
}

/**
 * Enregistre l'historique des prix de la carte s'il n'a pas encore été fait aujourd'hui
 */
export function trackCardPrice(card?: PokemonCard | null, force = false) {
  if (!card?.id) return;

  try {
    const history = getMarketHistory(card.id);
    const today = new Date().toISOString().slice(0, 10);

    // Vérification si un point a déjà été enregistré aujourd'hui
    if (!force && Array.isArray(history) && history.length > 0) {
      const last = history[history.length - 1];
      if (last && last.date) {
        const lastDate = new Date(last.date).toISOString().slice(0, 10);
        if (lastDate === today) return; // Déjà enregistré aujourd'hui
      }
    }

    // Calcul des vrais prix harmonisés en Euros
    const market = calculateRealMarketPrices(card);

    if (market.average <= 0) {
      console.warn(
        `[PriceTracker] Aucun prix valide détecté pour ${card.name} (${card.id})`
      );
      return;
    }

    // Sauvegarde dans le store d'historique local
    saveMarketPrice(
      card.id,
      market.cardmarket,
      market.ebay,
      market.tcgplayer
    );
  } catch (error) {
    console.error(`[PriceTracker] Erreur lors du suivi du prix pour ${card.id}:`, error);
  }
}