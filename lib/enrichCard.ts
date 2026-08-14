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
    const prices = await fetchPricesFromJustTCG(card);

    if (!prices) {
      // Fallback : Si aucun prix externe n'est renvoyé, conserve la carte inchangée
      return card;
    }

    const updatedTcgplayer = prices.tcgplayer
      ? {
          ...card.tcgplayer,
          ...prices.tcgplayer,
          prices: {
            ...card.tcgplayer?.prices,
            ...prices.tcgplayer?.prices,
          },
        }
      : card.tcgplayer;

    return {
      ...card,
      tcgplayer: updatedTcgplayer,
    };
  } catch (error) {
    console.warn(`[King_TCG] Impossible d'enrichir la carte ${card.id}:`, error);
    return card;
  }
}

/**
 * 🚀 Enrichit une liste complète de cartes en parallèle (batching)
 */
export async function enrichCardsBatch(
  cards: PokemonCard[],
  concurrencyLimit = 5
): Promise<PokemonCard[]> {
  if (!Array.isArray(cards) || !cards.length) return [];

  const results: PokemonCard[] = [];
  
  for (let i = 0; i < cards.length; i += concurrencyLimit) {
    const chunk = cards.slice(i, i + concurrencyLimit);
    const enrichedChunk = await Promise.all(chunk.map((card) => enrichCard(card)));
    results.push(...enrichedChunk);
  }

  return results;
}