import { getCache, setCache } from "../../cache";

import type { PokemonCard } from "../../types";

import {
  getCardById,
  searchCards,
} from "../../pokemon";

const CARD_TTL =
  1000 * 60 * 10;

const SEARCH_TTL =
  1000 * 60 * 5;



export async function getCard(
  id: string
): Promise<PokemonCard | null> {

  const key =
    `card:${id}`;

  const cached =
    getCache<PokemonCard>(key);

  if (cached) {
    return cached;
  }

  const card =
    await getCardById(id);

  if (card) {

    setCache(
      key,
      card,
      CARD_TTL
    );

  }

  return card;

}



export async function findCards(
  query: string
): Promise<PokemonCard[]> {

  const key =
    `search:${query}`;

  const cached =
    getCache<PokemonCard[]>(key);

  if (cached) {
    return cached;
  }

  const cards =
    await searchCards(query);

  setCache(
    key,
    cards,
    SEARCH_TTL
  );

  return cards;

}