// lib/search.ts

import type { SearchFilters, PokemonCard } from "./types";
import { getMinMarketPrice } from "./pricing";

export type { SearchFilters };

// Cache de mémoïsation pour éviter les recalculs inutiles sur de grandes collections
const searchMemoCache = new Map<string, { hash: string; result: PokemonCard[] }>();

/**
 * Convertit de manière sécurisée n'importe quelle date de release
 * ("YYYY/MM/DD" ou "YYYY-MM-DD") en timestamp.
 */
function parseReleaseDate(dateStr?: string): number {
  if (!dateStr) return 0;

  const cleanDate = String(dateStr).trim().replace(/\//g, "-");
  const time = new Date(cleanDate).getTime();

  return isNaN(time) ? 0 : time;
}

/**
 * Récupère le vrai prix minimum disponible pour une carte
 * et la condition sélectionnée.
 *
 * V5.0 :
 * - Near Mint par défaut
 * - aucun coefficient artificiel
 * - aucune estimation depuis une autre condition
 * - prix minimum parmi les sources réellement disponibles
 */
function getEffectivePrice(
  card: PokemonCard,
  condition?: string
): number {
  return getMinMarketPrice(
    card,
    condition ?? "Near Mint"
  );
}

export function filterCards(
  cards: PokemonCard[],
  filters: SearchFilters
): PokemonCard[] {
  if (!cards || cards.length === 0) return [];

  // Création d'une clé de cache basée sur l'état des filtres et la taille du tableau
  const cacheKey = `${cards.length}_${JSON.stringify(filters)}`;

  const firstCardId = cards[0]?.id || "";
  const lastCardId = cards[cards.length - 1]?.id || "";
  const currentHash = `${firstCardId}_${lastCardId}`;

  const cached = searchMemoCache.get(cacheKey);

  if (cached && cached.hash === currentHash) {
    return cached.result;
  }

  let results = [...cards];

  // =====================================================
  // 1. CATÉGORIE (SUPERTYPE)
  // =====================================================

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

  // =====================================================
  // 2. RARETÉ
  // =====================================================

  if (filters.rarity && filters.rarity !== "all") {
    const targetRarity = filters.rarity.toLowerCase().trim();

    results = results.filter((card) =>
      (card.rarity ?? "").toLowerCase().includes(targetRarity)
    );
  }

  // =====================================================
  // 3. EXTENSION
  // Compatible Nom ET ID de set
  // =====================================================

  if (filters.set && filters.set !== "all") {
    const targetSet = filters.set.trim().toLowerCase();

    results = results.filter((card) => {
      if (!card.set) return false;

      const setName = (card.set.name || "").toLowerCase();
      const setId = (card.set.id || "").toLowerCase();

      return (
        setName === targetSet ||
        setId === targetSet ||
        setName.includes(targetSet)
      );
    });
  }

  // =====================================================
  // 4. TRI
  // Intègre la condition / l'état de la carte pour les prix
  // =====================================================

  switch (filters.sort) {
    case "name":
      results.sort((a, b) =>
        (a.name || "").localeCompare(b.name || "")
      );
      break;

    case "price-asc":
      results.sort(
        (a, b) =>
          getEffectivePrice(a, filters.condition) -
          getEffectivePrice(b, filters.condition)
      );
      break;

    case "price-desc":
      results.sort(
        (a, b) =>
          getEffectivePrice(b, filters.condition) -
          getEffectivePrice(a, filters.condition)
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
        const numA =
          parseInt((a.number || "0").replace(/\D/g, "")) || 0;

        const numB =
          parseInt((b.number || "0").replace(/\D/g, "")) || 0;

        return numA - numB;
      });
      break;
  }

  // =====================================================
  // 5. CACHE
  // =====================================================

  searchMemoCache.set(cacheKey, {
    hash: currentHash,
    result: results,
  });

  return results;
}