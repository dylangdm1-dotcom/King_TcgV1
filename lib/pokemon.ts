// lib/pokemon.ts

import type { PokemonCard, CardScanResult } from "./types";
import {
  translatePokemonToEnglish,
  correctPokemonOCR,
  cleanTCGSuffix,
  resolvePokemonName,
} from "./pokemonTranslator";

const API_URL = "https://api.pokemontcg.io/v2/cards";
const SETS_URL = "https://api.pokemontcg.io/v2/sets";
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
    // Conservation intégrale des structures de prix
    cardmarket: card.cardmarket ? { ...card.cardmarket } : undefined,
    tcgplayer: card.tcgplayer ? { ...card.tcgplayer } : undefined,
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

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function cleanCardNumber(rawNumber: string | null | undefined): string | null {
  if (!rawNumber) return null;
  let clean = rawNumber.split("/")[0].trim();
  if (/^\d+$/.test(clean)) {
    clean = String(parseInt(clean, 10));
  }
  return clean;
}

async function fetchPage(query: string, page = 1): Promise<any[]> {
  const params = new URLSearchParams();
  params.set("q", query);
  params.set("page", String(page));
  params.set("pageSize", "250");

  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (process.env.NEXT_PUBLIC_POKEMON_TCG_API_KEY) {
    headers["X-Api-Key"] = process.env.NEXT_PUBLIC_POKEMON_TCG_API_KEY;
  }

  try {
    const response = await fetch(`${API_URL}?${params}`, {
      cache: "force-cache",
      headers,
    });

    if (!response.ok) {
      console.warn("[Pokemon API]", response.status, query);
      return [];
    }

    const json = await response.json();
    return json.data ?? [];
  } catch (error) {
    console.error("[Pokemon API]", error);
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

function scoreCard(card: PokemonCard, scan: CardScanResult) {
  let score = 0;
  const cardName = normalizeText(card.name);
  const target = normalizeText(scan.cardName ?? scan.pokemonName ?? "");
  const scanNumber = cleanCardNumber(scan.cardNumber);
  const cardNumber = cleanCardNumber(card.number);

  if (scanNumber && cardNumber && scanNumber === cardNumber) {
    score += 200;
  }

  if (cardName === target) {
    score += 100;
  } else if (target && cardName.includes(target)) {
    score += 40;
  }

  if (
    scan.setName &&
    card.set?.name &&
    normalizeText(card.set.name).includes(normalizeText(scan.setName))
  ) {
    score += 80;
  }

  return score;
}

export async function searchCardsFromScan(
  scan: CardScanResult
): Promise<PokemonCard[]> {
  let cards: PokemonCard[] = [];
  const cleanNum = cleanCardNumber(scan.cardNumber);
  
  const rawName = scan.cardName || scan.pokemonName || "";
  let corrected = correctPokemonOCR(rawName);
  corrected = resolvePokemonName(corrected);
  const cleanBase = cleanTCGSuffix(corrected);
  const translated = translatePokemonToEnglish(corrected);
  const translatedBase = translatePokemonToEnglish(cleanBase);

  const nameCandidates = Array.from(
    new Set(
      [translated, translatedBase, corrected, cleanBase, rawName]
        .filter(Boolean)
        .map(String)
    )
  );

  if (cleanNum && nameCandidates.length) {
    for (const name of nameCandidates) {
      const found = await fetchPage(`number:"${cleanNum}" name:"*${name}*"`, 1);
      if (found.length) {
        cards = removeDuplicates([...cards, ...found.map(normalize)]);
        break;
      }
    }
  }

  if (!cards.length && cleanNum) {
    const found = await fetchPage(`number:"${cleanNum}"`, 1);
    if (found.length) {
      cards = removeDuplicates([...cards, ...found.map(normalize)]);
    }
  }

  if (!cards.length && nameCandidates.length) {
    for (const name of nameCandidates) {
      const found = await fetchPage(`name:"*${name}*"`, 1);
      if (found.length) {
        cards = removeDuplicates([...cards, ...found.map(normalize)]);
        break;
      }
    }
  }

  cards.sort((a, b) => scoreCard(b, scan) - scoreCard(a, scan));

  return cards;
}

export async function searchCards(search = ""): Promise<PokemonCard[]> {
  const key = search.trim().toLowerCase();

  if (!key) return [];
  if (searchCache.has(key)) return searchCache.get(key)!;

  const found = await fetchPage(`name:"*${key}*"`, 1);
  const cards = removeDuplicates(found.map(normalize));

  searchCache.set(key, cards);
  saveBrowserCache(cards);

  return cards;
}

/**
 * Récupérer toutes les cartes d'une extension par son ID de set
 */
export async function searchCardsBySetId(setId: string): Promise<PokemonCard[]> {
  if (!setId) return [];
  const cacheKey = `set_${setId}`;
  if (searchCache.has(cacheKey)) return searchCache.get(cacheKey)!;

  const found = await fetchPage(`set.id:"${setId}"`, 1);
  const cards = removeDuplicates(found.map(normalize));

  // Tri par numéro de carte dans la série
  cards.sort((a, b) => {
    const numA = parseInt(a.number) || 0;
    const numB = parseInt(b.number) || 0;
    return numA - numB;
  });

  searchCache.set(cacheKey, cards);
  return cards;
}

/**
 * Récupérer la liste complète de TOUS les sets/extensions
 */
export async function getAllSets(): Promise<any[]> {
  try {
    const params = new URLSearchParams();
    params.set("pageSize", "300"); // Charge l'intégralité des séries sans limite de pagination
    params.set("orderBy", "-releaseDate"); // Tri de la plus récente à la plus ancienne

    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    if (process.env.NEXT_PUBLIC_POKEMON_TCG_API_KEY) {
      headers["X-Api-Key"] = process.env.NEXT_PUBLIC_POKEMON_TCG_API_KEY;
    }

    const response = await fetch(`${SETS_URL}?${params}`, {
      cache: "force-cache",
      headers,
    });

    if (!response.ok) return [];
    const json = await response.json();
    return json.data ?? [];
  } catch (error) {
    console.error("[Pokemon Sets API]", error);
    return [];
  }
}

export async function getCardById(id: string): Promise<PokemonCard | null> {
  if (cache.has(id)) {
    return cache.get(id)!;
  }

  const stored = loadBrowserCache();
  const saved = stored.find((card) => card.id === id);

  if (saved) {
    cache.set(id, saved);
    return saved;
  }

  try {
    const response = await fetch(`${API_URL}/${id}`);

    if (!response.ok) return null;

    const json = await response.json();
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
