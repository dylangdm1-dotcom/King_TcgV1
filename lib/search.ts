// lib/search.ts

import type { SearchFilters, PokemonCard } from "./types";
import { getAdjustedPriceByCondition } from "./marketEngine";

export type { SearchFilters };

/**
 * Convertit de manière sécurisée n'importe quelle date de release ("YYYY/MM/DD" ou "YYYY-MM-DD") en timestamp.
 */
function parseReleaseDate(dateStr?: string): number {
  if (!dateStr) return 0;
  const cleanDate = String(dateStr).trim().replace(/\//g, "-");
  const time = new Date(cleanDate).getTime();
  return isNaN(time) ? 0 : time;
}

/**
 * Récupère le prix effectif d'une carte en tenant compte de la condition (état) sélectionnée.
 */
function getEffectivePrice(card: PokemonCard, condition?: string): number {
  const basePrice = card.computedPrice ?? 0;
  return getAdjustedPriceByCondition(basePrice, condition ?? "Near Mint");
}

export function filterCards(
  cards: PokemonCard[],
  filters: SearchFilters
): PokemonCard[] {
  let results = [...cards];

  // 1. Catégorie (Supertype)
  if (filters.category && filters.category !== "all") {
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

  // 2. Rareté
  if (filters.rarity && filters.rarity !== "all") {
    const targetRarity = filters.rarity.toLowerCase();
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

  // 4. Tri (Intègre désormais la condition / l'état de la carte pour les prix)
  switch (filters.sort) {
    case "name":
      results.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      break;

    case "price-asc":
      results.sort((a, b) => 
        getEffectivePrice(a, filters.condition) - getEffectivePrice(b, filters.condition)
      );
      break;

    case "price-desc":
      results.sort((a, b) => 
        getEffectivePrice(b, filters.condition) - getEffectivePrice(a, filters.condition)
      );
      break;

    case "recent":
      results.sort((a, b) => {
        const dateB = parseReleaseDate(b.set?.releaseDate);
        const dateA = parseReleaseDate(a.set?.releaseDate);
        
        if (dateB !== dateA) {
          return dateB - dateA;
        }

        // En cas d'égalité de date, tri par numéro de carte
        const numA = parseInt((a.number || "0").replace(/\D/g, "")) || 0;
        const numB = parseInt((b.number || "0").replace(/\D/g, "")) || 0;
        return numA - numB;
      });
      break;
  }

  return results;
}
