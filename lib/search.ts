// lib/search.ts

import type { SearchFilters, PokemonCard } from "./types";
import { getCardPrice } from "./types";
import { compareCardsNewestFirst } from "./setCatalog";


export type { SearchFilters };

// Cache de mémoïsation pour éviter les recalculs inutiles sur de grandes collections
const searchMemoCache = new Map<string, { hash: string; result: PokemonCard[] }>();



/**
 * Récupère le prix effectif d'une carte en tenant compte de la condition (état) sélectionnée.
 */
function getEffectivePrice(card: PokemonCard): number {
  // Le tri utilise uniquement une valeur de marché réellement fournie.
  // Aucun coefficient artificiel par état n'est appliqué.
  return getCardPrice(card);
}

export function filterCards(
  cards: PokemonCard[],
  filters: SearchFilters
): PokemonCard[] {
  if (!cards || cards.length === 0) return [];

  // Création d'une clé de cache basée sur l'état des filtres et la taille du tableau
  const cacheKey = `${cards.length}_${JSON.stringify(filters)}`;
  const currentHash = cards
    .map((card) => `${card.id}:${card.set?.releaseDate || ""}:${card.set?.id || ""}`)
    .join("|");

  const cached = searchMemoCache.get(cacheKey);
  if (cached && cached.hash === currentHash) {
    return cached.result;
  }

  let results = [...cards];

  // 1. Catégorie (Supertype)
  if (filters.category && filters.category !== "all") {
    results = results.filter((card) => {
      const supertype = (card.supertype || "").toLowerCase().trim();

      switch (filters.category) {
        case "pokemon":
          return supertype === "pokemon";
        case "trainer":
          return supertype === "trainer";
        case "energy":
          return supertype === "energy";
        default:
          return true;
      }
    });
  }

  // 2. Rareté
  if (filters.rarity && filters.rarity !== "all") {
    const targetRarity = filters.rarity.toLowerCase().trim();
    results = results.filter((card) =>
      (card.rarity ?? "").toLowerCase().includes(targetRarity)
    );
  }

  // 3. Extension (Compatible Nom ET ID de set)
  if (filters.set && filters.set !== "all") {
    const targetSet = filters.set.trim().toLowerCase();
    results = results.filter((card) => {
      if (!card.set) return false;
      const setName = (card.set.name || "").toLowerCase();
      const setId = (card.set.id || "").toLowerCase();
      
      return setName === targetSet || setId === targetSet || setName.includes(targetSet);
    });
  }

  // 4. Tri (Intègre la condition / l'état de la carte pour les prix)
  switch (filters.sort) {
    case "name":
      results.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      break;

    case "price-asc":
      results.sort((a, b) => 
        getEffectivePrice(a) - getEffectivePrice(b)
      );
      break;

    case "price-desc":
      results.sort((a, b) => 
        getEffectivePrice(b) - getEffectivePrice(a)
      );
      break;

    case "recent":
      results.sort(compareCardsNewestFirst);
      break;
  }

  // Stockage dans le cache de performance
  searchMemoCache.set(cacheKey, { hash: currentHash, result: results });

  return results;
}
