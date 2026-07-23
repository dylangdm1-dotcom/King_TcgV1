// lib/enrichCards.ts

import type { PokemonCard } from "./types";
import { fetchPricesFromJustTCG } from "./priceProviders/justTcgProvider";

/**
 * ⚡ Fusionne proprement les prix externes d'une carte sans écraser
 * les métadonnées ou les structures existantes.
 */
export async function enrichCard(card: PokemonCard): Promise<PokemonCard> {
  if (!card?.id) return card;

  try {
    const prices = await fetchPricesFromJustTCG(card.id);
    if (!prices) return card;

    return {
      ...card,
      tcgplayer: {
        ...card.tcgplayer,
        ...prices.tcgplayer,
        prices: {
          ...card.tcgplayer?.prices,
          ...prices.tcgplayer?.prices,
        },
      },
      cardmarket: {
        ...card.cardmarket,
        ...prices.cardmarket,
        prices: {
          ...card.cardmarket?.prices,
          ...prices.cardmarket?.prices,
        },
      },
    };
  } catch (error) {
    console.warn(`[King_TCG] Impossible d'enrichir la carte ${card.id}:`, error);
    return card;
  }
}