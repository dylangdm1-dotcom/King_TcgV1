// lib/enrichCards.ts

import type { PokemonCard } from "./types";
import { fetchPricesFromJustTCG } from "./priceProviders/JustTcgProvider";

/**
 * =====================================================
 * 🃏 KING_TCG CARD ENRICHMENT V5
 * =====================================================
 *
 * Rôle :
 * - récupérer les données de prix externes
 * - fusionner proprement les données
 * - conserver les données existantes
 *
 * IMPORTANT :
 * Ce fichier NE calcule aucun prix.
 *
 * Le calcul :
 * - minimum
 * - moyenne
 * - maximum
 * - condition
 *
 * est exclusivement géré par marketEngine.ts.
 *
 * =====================================================
 */

/**
 * Extraction de l'ID exploitable depuis un ID TCGdex.
 *
 * Exemple :
 *
 * tcgdex-fr-sv05-1
 *       ↓
 * sv05-1
 */
function extractCleanCardId(
  cardId: string
): string {
  if (!cardId) {
    return "";
  }

  const normalized =
    String(cardId).trim();

  if (
    normalized.startsWith("tcgdex-")
  ) {
    const parts =
      normalized.split("-");

    return parts
      .slice(2)
      .join("-");
  }

  return normalized;
}

/**
 * Fusionne les prix externes d'une carte.
 *
 * Aucune donnée existante n'est supprimée.
 * Les nouvelles données externes remplacent uniquement
 * les valeurs correspondantes lorsqu'elles existent.
 */
export async function enrichCard(
  card: PokemonCard
): Promise<PokemonCard> {
  if (!card?.id) {
    return card;
  }

  try {
    const cleanId =
      extractCleanCardId(card.id);

    const lookupId =
      cleanId || card.id;

    const prices =
      await fetchPricesFromJustTCG(
        lookupId
      );

    if (!prices) {
      return card;
    }

    // =================================================
    // 💰 TCGPLAYER
    // =================================================

    const updatedTcgplayer = card.tcgplayer;

    // =================================================
    // 💰 CARDMARKET
    // =================================================

    const updatedCardmarket = card.cardmarket;

    // =================================================
    // 🃏 CARTE FINALE
    // =================================================

    return {
      ...card,
      tcgplayer:
        updatedTcgplayer,
      cardmarket:
        updatedCardmarket,
    };
  } catch (error) {
    console.warn(
      `[King_TCG] Impossible d'enrichir la carte ${card.id}:`,
      error
    );

    // En cas d'erreur réseau/provider,
    // la carte originale reste intacte.
    return card;
  }
}

/**
 * =====================================================
 * 🚀 ENRICHISSEMENT BATCH
 * =====================================================
 *
 * Traite les cartes par groupes afin d'éviter
 * un trop grand nombre de requêtes simultanées.
 */
export async function enrichCardsBatch(
  cards: PokemonCard[],
  concurrencyLimit = 5
): Promise<PokemonCard[]> {
  if (
    !Array.isArray(cards) ||
    cards.length === 0
  ) {
    return [];
  }

  const safeLimit =
    Math.max(
      1,
      Math.floor(
        Number(concurrencyLimit) || 5
      )
    );

  const results: PokemonCard[] = [];

  for (
    let i = 0;
    i < cards.length;
    i += safeLimit
  ) {
    const chunk =
      cards.slice(
        i,
        i + safeLimit
      );

    const enrichedChunk =
      await Promise.all(
        chunk.map(
          (card) =>
            enrichCard(card)
        )
      );

    results.push(
      ...enrichedChunk
    );
  }

  return results;
}
