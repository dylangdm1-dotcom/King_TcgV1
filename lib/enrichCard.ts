// lib/enrichCards.ts

import type { PokemonCard } from "./types";
import { fetchPricesFromJustTCG } from "./priceProviders/justTcgProvider";

/**
 * Extraction de l'ID natif TCGPlayer / Cardmarket depuis un ID TCGdex
 * (ex: tcgdex-fr-sv05-1 -> sv05-1)
 */
function extractCleanCardId(cardId: string): string {
  if (!cardId) return "";
  if (cardId.startsWith("tcgdex-")) {
    const parts = cardId.split("-");
    // Conserve uniquement la partie set-number (ex: sv05-001 ou sv05-1)
    return parts.slice(2).join("-");
  }
  return cardId;
}

/**
 * ⚡ Fusionne proprement les prix externes d'une carte sans écraser
 * les métadonnées ou les structures existantes.
 */
export async function enrichCard(card: PokemonCard): Promise<PokemonCard> {
  if (!card?.id) return card;

  try {
    const cleanId = extractCleanCardId(card.id);
    const prices = await fetchPricesFromJustTCG(cleanId || card.id);

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

    const updatedCardmarket = prices.cardmarket
      ? {
          ...card.cardmarket,
          ...prices.cardmarket,
          prices: {
            ...card.cardmarket?.prices,
            ...prices.cardmarket?.prices,
          },
        }
      : card.cardmarket;

    return {
      ...card,
      tcgplayer: updatedTcgplayer,
      cardmarket: updatedCardmarket,
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