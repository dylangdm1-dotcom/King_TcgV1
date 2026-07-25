import type { PokemonCard } from "./types";
import {
  translatePokemonToEnglish,
  correctPokemonOCR,
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
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cards));
  } catch {}
}

function loadBrowserCache(): PokemonCard[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const data = localStorage.getItem(CACHE_KEY);

    if (!data) {
      return [];
    }

    const parsed = JSON.parse(data);

    return Array.isArray(parsed) ? parsed.map(normalize) : [];
  } catch {
    return [];
  }
}

/**
 * Sépare le nom et le numéro OCR
 *
 * Exemple :
 * Pikachu 089/193
 *
 * devient :
 * namePart = Pikachu
 * numberParts = ["089","89"]
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
    numbers: [original, withoutZero],
  };
}

async function fetchPage(query: string, page: number) {
  const params = new URLSearchParams();

  params.set("q", query);
  params.set("page", String(page));
  params.set("pageSize", "100");

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
      return [];
    }

    const json = await res.json();

    return json.data ?? [];
  } catch {
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

  if (!key) {
    return [];
  }

  if (searchCache.has(key)) {
    return searchCache.get(key)!;
  }

  const { namePart, numbers } = parseSearchInput(key);

  const corrected = correctPokemonOCR(namePart);
  const translated = translatePokemonToEnglish(corrected);

  const names = [translated, corrected]
    .filter(Boolean)
    .map(String)
    .map((v) => v.toLowerCase());

  let cards: PokemonCard[] = [];

  for (const name of names) {
    let queries: string[] = [];

    /**
     * Recherche avec numéro
     */
    if (numbers.length) {
      for (const number of numbers) {
        queries.push(`name:"${name}" number:"${number}"`);
        queries.push(`name:${name}* number:"${number}"`);
      }
    }

    /**
     * Recherche normale
     */
    queries.push(`name:"${name}"`);
    queries.push(`name:${name}*`);
    queries.push(`name:*${name}*`);

    for (const query of queries) {
      const pages = await Promise.all([
        fetchPage(query, 1),
        fetchPage(query, 2),
      ]);

      const found = pages.flat().map(normalize);

      cards = removeDuplicates([...cards, ...found]);
    }
  }

  const target = (translated ?? corrected).toLowerCase();

  cards.sort((a, b) => {
    const an = a.name.toLowerCase();
    const bn = b.name.toLowerCase();

    if (an === target) {
      return -1;
    }

    if (bn === target) {
      return 1;
    }

    if (an.startsWith(target)) {
      return -1;
    }

    if (bn.startsWith(target)) {
      return 1;
    }

    const dateA = a.set?.releaseDate
      ? new Date(a.set.releaseDate).getTime()
      : 0;

    const dateB = b.set?.releaseDate
      ? new Date(b.set.releaseDate).getTime()
      : 0;

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

    if (!res.ok) {
      return null;
    }

    const json = await res.json();

    if (!json.data) {
      return null;
    }

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