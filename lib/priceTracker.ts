// lib/pricetracker.ts

import type { PokemonCard } from "./types";
import { saveMarketPrice, getMarketHistory } from "./priceHistory";
import { getCardMarketPrice, getTCGPlayerPrice, getEbayPrice, getAverageMarketPrice } from "./marketEngine";

// Taux de change approximatif USD -> EUR pour harmoniser les prix de TCGPlayer (USD) avec Cardmarket (EUR)
const USD_TO_EUR = 0.92;

/**
 * Calcule des prix réels, harmonisés et une vraie moyenne pour une carte donnée
 * Aligné rigoureusement sur le moteur de marché global (marketEngine)
 */
export function calculateRealMarketPrices(card: PokemonCard) {
  // 1. Extraction Cardmarket (Déjà en Euros dans l'API)
  const cardmarket = getCardMarketPrice(card);

  // 2. Extraction TCGPlayer (En USD dans l'API -> Conversion en Euros pour l'historique)
  const rawTcg = getTCGPlayerPrice(card);
  const tcgplayer = rawTcg > 0 ? Number((rawTcg * USD_TO_EUR).toFixed(2)) : 0;

  // 3. Extraction eBay (Calculé de manière croisée ou estimé par le moteur)
  const ebay = getEbayPrice(card);

  // 4. Calcul de la moyenne générale harmonisée en Euros
  const activePrices = [cardmarket, tcgplayer, ebay].filter(price => price > 0);
  const average = activePrices.length > 0 
    ? Number((activePrices.reduce((sum, p) => sum + p, 0) / activePrices.length).toFixed(2))
    : getAverageMarketPrice(card);

  return {
    cardmarket: cardmarket || average,
    tcgplayer: tcgplayer || average,
    ebay: ebay || average,
    average
  };
}

/**
 * Enregistre l'historique des prix de la carte s'il n'a pas encore été fait aujourd'hui
 */
export function trackCardPrice(card: PokemonCard, force = false) {
  if (!card?.id) return;

  const history = getMarketHistory(card.id);
  const today = new Date().toISOString().slice(0, 10);
  
  // Vérification de sécurité sur l'existence de l'historique
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
    console.warn(`[PriceTracker] Aucun prix valide détecté pour ${card.name} (${card.id})`);
    return;
  }

  // Sauvegarde dans la base de données de l'historique
  saveMarketPrice(
    card.id,
    market.cardmarket,
    market.ebay,
    market.tcgplayer
  );
}