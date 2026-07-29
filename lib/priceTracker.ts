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

// Taux de change approximatif USD -> EUR pour harmoniser les prix de TCGPlayer (USD) avec Cardmarket (EUR)
const USD_TO_EUR = 0.92;

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
  
  // TCGPlayer (USD -> conversion EUR)
  const rawTcg = market.tcgplayer || getTCGPlayerPrice(card) || 0;
  const tcgplayer = rawTcg > 0 ? Number((rawTcg * USD_TO_EUR).toFixed(2)) : 0;

  // eBay (EUR)
  const ebay = market.ebay || getEbayPrice(card) || 0;

  // Calcul de la moyenne harmonisée en Euros
  const activePrices = [cardmarket, tcgplayer, ebay].filter(
    (price): price is number => typeof price === "number" && price > 0
  );

  const average =
    activePrices.length > 0
      ? Number(
          (
            activePrices.reduce((sum, p) => sum + p, 0) / activePrices.length
          ).toFixed(2)
        )
      : market.average || getAverageMarketPrice(card) || 0;

  return {
    cardmarket: cardmarket || average,
    tcgplayer: tcgplayer || average,
    ebay: ebay || average,
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