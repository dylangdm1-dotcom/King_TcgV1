import type { PokemonCard } from "./types";
import {
  translatePokemonToEnglish,
  correctPokemonOCR,
  cleanTCGSuffix,
} from "./pokemonTranslator";

const API_URL = "https://api.pokemontcg.io/v2/cards";
const CACHE_KEY = "king_tcg_cards_cache";

const cache = new Map<string, PokemonCard>();
const searchCache = new Map<string, PokemonCard[]>();

function normalize(card: any): PokemonCard {
  return {
    ...card,
    quantity: card.quantity ?? 0,
    favorite: card.favorite ?? false,
    images: {
      small: card.images?.small ?? "",
      large: card.images?.large ?? card.images?.small ?? "",
    },
    cardmarket: card.cardmarket ?? undefined,
    tcgplayer: card.tcgplayer ?? undefined,
  };
}

function saveBrowserCache(cards: PokemonCard[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cards));
  } catch {}
}

function loadBrowserCache(): PokemonCard[] {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(CACHE_KEY);
    if (!data) return [];
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed.map(normalize) : [];
  } catch {
    return [];
  }
}

/**
 * Sépare le nom et le numéro OCR
 * Exemple : "Drattak ex 143/106" -> namePart = "Drattak ex", numbers = ["143", "143"]
 */
function parseSearchInput(input: string) {
  const trimmed = input.trim();
  const match = trimmed.match(/\s+(\d{1,3})(?:\/\d{1,3})?$/);

  if (!match) {
    return {
      namePart: trimmed,
      numbers: [],
    };
  }

  const original = match[1];
  const withoutZero = original.replace(/^0+/, "") || "0";

  return {
    namePart: trimmed.slice(0, match.index).trim(),
    numbers: Array.from(new Set([original, withoutZero])),
  };
}

async function fetchPage(query: string, page = 1): Promise<any[]> {
  const params = new URLSearchParams();
  params.set("q", query);
  params.set("page", String(page));
  params.set("pageSize", "50");

  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (process.env.NEXT_PUBLIC_POKEMON_TCG_API_KEY) {
    headers["X-Api-Key"] = process.env.NEXT_PUBLIC_POKEMON_TCG_API_KEY;
  }

  try {
    const res = await fetch(`${API_URL}?${params.toString()}`, {
      cache: "force-cache",
      headers,
    });

    if (!res.ok) {
      console.warn(`[Pokemon TCG API] HTTP ${res.status} pour la requête: ${query}`);
      return [];
    }

    const json = await res.json();
    return json.data ?? [];
  } catch (error) {
    console.error("[Pokemon TCG API] Erreur réseau:", error);
    return [];
  }
}

function removeDuplicates(cards: PokemonCard[]) {
  const map = new Map<string, PokemonCard>();
  cards.forEach((card) => {
    map.set(card.id, card);
  });
  return Array.from(map.values());
}

export async function searchCards(search = ""): Promise<PokemonCard[]> {
  const key = search.trim().toLowerCase();

  if (!key) return [];

  if (searchCache.has(key)) {
    return searchCache.get(key)!;
  }

  const { namePart, numbers } = parseSearchInput(key);

  const corrected = correctPokemonOCR(namePart);
  const translated = translatePokemonToEnglish(corrected);

  // Nom de base sans suffixe pour fallback
  const baseFR = cleanTCGSuffix(corrected);
  const baseEN = translatePokemonToEnglish(baseFR) || baseFR;

  const candidateNames = Array.from(
    new Set([translated, corrected, baseEN, baseFR].filter(Boolean).map(String))
  );

  let cards: PokemonCard[] = [];

  // 🎯 OPTION 1 : Recherche ultra-rapide par numéro si présent
  if (numbers.length > 0) {
    for (const number of numbers) {
      const numResults = await fetchPage(`number:"${number}"`, 1);
      if (numResults.length > 0) {
        cards = removeDuplicates([...cards, ...numResults.map(normalize)]);
      }
      if (cards.length > 0) break;
    }
  }

  // 🎯 OPTION 2 : Si aucune carte trouvée par numéro, recherche par nom (sans wildcard au début)
  if (cards.length === 0) {
    for (const name of candidateNames) {
      const safeQueries = [
        `name:"${name}"`,
        `name:${name}*` // Wildcard à la fin uniquement (syntaxe Lucene valide)
      ];

      for (const query of safeQueries) {
        const found = await fetchPage(query, 1);
        if (found.length > 0) {
          cards = removeDuplicates([...cards, ...found.map(normalize)]);
          break; // Résultats trouvés, inutile de tenter la requête suivante
        }
      }

      if (cards.length > 0) break; // Résultats trouvés, inutile d'essayer les autres noms
    }
  }

  // Trier par pertinence et date de sortie
  const target = (translated ?? corrected).toLowerCase();

  cards.sort((a, b) => {
    const an = a.name.toLowerCase();
    const bn = b.name.toLowerCase();

    if (an === target) return -1;
    if (bn === target) return 1;

    if (an.startsWith(target)) return -1;
    if (bn.startsWith(target)) return 1;

    const dateA = a.set?.releaseDate ? new Date(a.set.releaseDate).getTime() : 0;
    const dateB = b.set?.releaseDate ? new Date(b.set.releaseDate).getTime() : 0;

    return dateB - dateA;
  });

  cards.forEach((card) => {
    cache.set(card.id, card);
  });

  searchCache.set(key, cards);
  saveBrowserCache(cards);

  return cards;
}

export async function getCardById(id: string): Promise<PokemonCard | null> {
  if (cache.has(id)) {
    return cache.get(id)!;
  }

  const stored = loadBrowserCache();
  const saved = stored.find((c) => c.id === id);

  if (saved) {
    cache.set(id, saved);
    return saved;
  }

  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (process.env.NEXT_PUBLIC_POKEMON_TCG_API_KEY) {
    headers["X-Api-Key"] = process.env.NEXT_PUBLIC_POKEMON_TCG_API_KEY;
  }

  try {
    const res = await fetch(`${API_URL}/${id}`, {
      cache: "force-cache",
      headers,
    });

    if (!res.ok) return null;

    const json = await res.json();
    if (!json.data) return null;

    const card = normalize(json.data);
    cache.set(id, card);

    return card;
  } catch {
    return null;
  }
}

export function clearPokemonCache() {
  cache.clear();
  searchCache.clear();

  if (typeof window !== "undefined") {
    localStorage.removeItem(CACHE_KEY);
  }
}