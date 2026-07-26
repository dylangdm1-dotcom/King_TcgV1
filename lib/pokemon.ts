import type { PokemonCard, CardScanResult } from "./types";

import {
  translatePokemonToEnglish,
  correctPokemonOCR,
  cleanTCGSuffix,
  resolvePokemonName,
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

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

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

function compareCardNumbers(a?: string, b?: string | null) {
  if (!a || !b) {
    return false;
  }

  const clean = (value: string) =>
    value.split("/")[0].replace(/^0+/, "");

  return clean(a) === clean(b);
}

function scoreCard(card: PokemonCard, scan: CardScanResult) {
  let score = 0;

  const cardName = normalizeText(card.name);

  const targetName = normalizeText(
    scan.cardName ?? scan.pokemonName ?? ""
  );

  if (cardName === targetName) {
    score += 100;
  }

  if (targetName && cardName.includes(targetName)) {
    score += 50;
  }

  if (
    scan.cardNumber &&
    compareCardNumbers(card.number, scan.cardNumber)
  ) {
    score += 120;
  }

  if (
    scan.setName &&
    card.set?.name?.toLowerCase().includes(scan.setName.toLowerCase())
  ) {
    score += 80;
  }

  return score;
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

  let corrected = correctPokemonOCR(namePart);

  corrected = resolvePokemonName(corrected);

  const translated = translatePokemonToEnglish(corrected);

  const cleanBase = cleanTCGSuffix(corrected);

  const englishBase =
    translatePokemonToEnglish(cleanBase) || cleanBase;

  const candidateNames = Array.from(
    new Set(
      [translated, corrected, cleanBase, englishBase]
        .filter(Boolean)
        .map(String)
    )
  );

  let cards: PokemonCard[] = [];

  /*
    Recherche principale :
    Nom + numéro quand disponible
  */
  for (const name of candidateNames) {
    let query = `name:"${name}"`;

    if (numbers.length) {
      query += ` number:${numbers[0]}`;
    }

    const found = await fetchPage(query, 1);

    cards = removeDuplicates([...cards, ...found.map(normalize)]);
  }

  /*
    Sécurité :
    recherche numéro seulement
    en dernier recours
  */
  if (cards.length === 0 && numbers.length) {
    for (const number of numbers) {
      const found = await fetchPage(`number:${number}`, 1);

      cards = removeDuplicates([...cards, ...found.map(normalize)]);
    }
  }

  cards.sort((a, b) =>
    (b.set?.releaseDate ?? "").localeCompare(a.set?.releaseDate ?? "")
  );

  searchCache.set(key, cards);

  saveBrowserCache(cards);

  return cards;
}

export async function searchCardsFromScan(
  scan: CardScanResult
): Promise<PokemonCard[]> {
  const queryParts = [scan.cardName, scan.pokemonName, scan.cardNumber]
    .filter(Boolean)
    .join(" ");

  const cards = await searchCards(queryParts);

  return cards.sort(
    (a, b) => scoreCard(b, scan) - scoreCard(a, scan)
  );
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

    if (!response.ok) {
      return null;
    }

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