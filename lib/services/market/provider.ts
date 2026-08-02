// lib/services/market/provider.ts

import { getCache, setCache } from "../../cache";
import type { PokemonCard } from "../../types";

import {
  getCardById,
  searchCards,
} from "../../pokemon";

const CARD_TTL = 1000 * 60 * 10; // 10 minutes
const SEARCH_TTL = 1000 * 60 * 5; // 5 minutes

/**
 * Normalise une clé de cache.
 *
 * Évite notamment d'avoir plusieurs entrées pour une même recherche
 * à cause des espaces ou de la casse.
 */
function normalizeQuery(query: string): string {
  return query
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/**
 * Récupère une carte par son ID.
 *
 * Ordre :
 * 1. Cache
 * 2. API / provider
 * 3. Mise en cache du résultat
 */
export async function getCard(
  id: string
): Promise<PokemonCard | null> {
  if (!id?.trim()) {
    return null;
  }

  const cleanId = id.trim();
  const key = `card:${cleanId}`;

  const cached = getCache<PokemonCard>(key);

  if (cached) {
    return cached;
  }

  try {
    const card = await getCardById(cleanId);

    if (card) {
      setCache(key, card, CARD_TTL);
    }

    return card ?? null;
  } catch (error) {
    console.error(
      `[King_TCG] Erreur récupération carte ${cleanId}:`,
      error
    );

    return null;
  }
}

/**
 * Recherche des cartes.
 *
 * Ordre :
 * 1. Normalisation de la recherche
 * 2. Cache
 * 3. API / provider
 * 4. Mise en cache du résultat
 */
export async function findCards(
  query: string
): Promise<PokemonCard[]> {
  const cleanQuery = normalizeQuery(query);

  if (!cleanQuery) {
    return [];
  }

  const key = `search:${cleanQuery}`;

  const cached = getCache<PokemonCard[]>(key);

  if (cached) {
    return cached;
  }

  try {
    const cards = await searchCards(cleanQuery);

    const safeCards = Array.isArray(cards) ? cards : [];

    setCache(
      key,
      safeCards,
      SEARCH_TTL
    );

    return safeCards;
  } catch (error) {
    console.error(
      `[King_TCG] Erreur recherche cartes "${cleanQuery}":`,
      error
    );

    return [];
  }
}
