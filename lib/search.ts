import type { SearchFilters, PokemonCard } from "./types";
import { getCardPrice } from "./types";

export type { SearchFilters };

export function filterCards(
  cards: PokemonCard[],
  filters: SearchFilters
) {
  let results = [...cards];

  // Catégorie
  if (
    filters.category &&
    filters.category !== "all"
  ) {
    results = results.filter((card) => {
      const supertype = card.supertype?.toLowerCase() ?? "";

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

  // Rareté
  if (
    filters.rarity &&
    filters.rarity !== "all"
  ) {
    results = results.filter((card) =>
      (card.rarity ?? "")
        .toLowerCase()
        .includes(filters.rarity!.toLowerCase())
    );
  }

  // Extension
  if (
    filters.set &&
    filters.set !== "all"
  ) {
    results = results.filter(
      (card) => card.set?.name === filters.set
    );
  }

  // Tri
  switch (filters.sort) {
    case "name":
      results.sort((a, b) => a.name.localeCompare(b.name));
      break;

    case "price-asc":
      results.sort((a, b) => getCardPrice(a) - getCardPrice(b));
      break;

    case "price-desc":
      results.sort((a, b) => getCardPrice(b) - getCardPrice(a));
      break;

    case "recent":
      results.sort((a, b) => {
        const dateB = b.set.releaseDate ? new Date(b.set.releaseDate).getTime() : 0;
        const dateA = a.set.releaseDate ? new Date(a.set.releaseDate).getTime() : 0;
        return dateB - dateA;
      });
      break;
  }

  return results;
}