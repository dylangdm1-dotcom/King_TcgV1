// lib/priceProviders/justTcgProvider.ts

import { JustTCG } from "justtcg-js";
import type { CardPrice } from "../types";

// Initialisation flexible (Clé serveur prioritaire, puis publique côté client)
const apiKey =
  process.env.JUSTTCG_API_KEY || process.env.NEXT_PUBLIC_JUSTTCG_API_KEY;

const client = apiKey ? new JustTCG({ apiKey }) : null;

export interface JustTcgPriceResponse {
  marketPrice: number;
  lowPrice?: number;
  highPrice?: number;
  foilPrice?: number;
  reverseFoilPrice?: number;
}

/**
 * Récupère les données de prix en temps réel pour une carte spécifique depuis JustTCG
 * @param cardId ID de la carte (ex: "swsh3-136")
 */
export async function fetchPricesFromJustTCG(cardId: string): Promise<{
  tcgplayer?: { prices: { normal?: CardPrice; holofoil?: CardPrice } };
  cardmarket?: { prices: { trendPrice?: number; lowPrice?: number } };
} | null> {
  if (!client) {
    console.warn(
      "[JustTCG] Client non initialisé. Clé API (JUSTTCG_API_KEY) manquante."
    );
    return null;
  }

  try {
    // Appel via le SDK JustTCG
    const response = await client.v1.cards.get({
      cardId: cardId,
      limit: 1,
    });

    if (response.error || !response.data || response.data.length === 0) {
      console.warn(
        `[JustTCG] Aucun prix trouvé pour la carte ${cardId}: ${
          response.error ?? "Résultat vide"
        }`
      );
      return null;
    }

    const cardData = response.data[0];
    const prices = cardData.prices;

    if (!prices) return null;

    // Mapping sécurisé vers l'interface CardPrice (plancher & marché)
    return {
      tcgplayer: {
        prices: {
          normal: {
            low: prices.lowPrice,
            market: prices.marketPrice ?? prices.cleanRawMarket,
            high: prices.highPrice,
            directLow: prices.directLow ?? prices.lowPrice,
          },
          holofoil: {
            low: prices.foilLowPrice ?? prices.lowPrice,
            market: prices.foilPrice ?? prices.marketPrice,
          },
        },
      },
      cardmarket: {
        prices: {
          lowPrice: prices.lowPrice,
          trendPrice: prices.marketPrice,
        },
      },
    };
  } catch (error) {
    console.error(
      `[JustTCG SDK] Erreur pour la carte ${cardId}:`,
      (error as Error).message
    );
    return null;
  }
}
