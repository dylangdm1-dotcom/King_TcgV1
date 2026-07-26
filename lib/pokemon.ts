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
const TCGDEX_URL = "https://api.tcgdex.net/v2";
const CACHE_KEY = "king_tcg_cards_cache";

const cache = new Map<string, PokemonCard>();
const searchCache = new Map<string, PokemonCard[]>();

export type LanguageCode = "fr" | "en" | "ja" | "zh-tw";

function normalize(card: any): PokemonCard {
  return {
    ...card,
    quantity: card.quantity ?? 0,
    favorite: card.favorite ?? false,
    images: {
      small: card.images?.small ?? "",
      large: card.images?.large ?? card.images?.small ?? "",
    },
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

/**
 * Normalise une carte TCGdex au format PokemonCard avec résolution stricte des images
 */
function normalizeTCGdexCard(card: any, lang: LanguageCode): PokemonCard {
  let imageUrl = "";
  let smallImageUrl = "";

  if (card.image) {
    let cleanImage = String(card.image).trim();
    // Supprimer une éventuelle extension déjà présente à la fin
    cleanImage = cleanImage.replace(/\/(high|low)(\.(png|webp|jpg))?$/, "");

    imageUrl = `${cleanImage}/high.png`;
    smallImageUrl = `${cleanImage}/low.png`;
  }

  return {
    id: `tcgdex-${lang}-${card.id}`,
    name: card.name ?? "Carte Inconnue",
    supertype: card.category ?? "Pokemon",
    number: card.localId ?? card.id,
    rarity: card.rarity ?? "Rare",
    images: {
      small: smallImageUrl || "/placeholder.png",
      large: imageUrl || smallImageUrl || "/placeholder.png",
    },
    set: {
      id: card.set?.id ?? "",
      name: card.set?.name ?? "Extension Asiatique",
      series: card.set?.series?.name ?? (lang === "ja" ? "Japon" : "Chine / Taïwan"),
      printedTotal: card.set?.cardCount?.official ?? 0,
      total: card.set?.cardCount?.total ?? 0,
      releaseDate: "",
      images: { symbol: "", logo: "" },
    },
    quantity: 0,
    favorite: false,
  };
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

export async function searchCards(
  search = "",
  lang: LanguageCode = "fr"
): Promise<PokemonCard[]> {
  const key = search.trim().toLowerCase();

  if (!key) return [];

  if (lang === "ja" || lang === "zh-tw") {
    try {
      const response = await fetch(`${TCGDEX_URL}/${lang}/cards?name=${encodeURIComponent(key)}`, {
        cache: "force-cache",
      });
      if (!response.ok) return [];
      const data = await response.json();
      return data.slice(0, 60).map((c: any) => normalizeTCGdexCard(c, lang));
    } catch (err) {
      console.error("[TCGdex Search API]", err);
      return [];
    }
  }

  const cacheKey = `search_${lang}_${key}`;
  if (searchCache.has(cacheKey)) return searchCache.get(cacheKey)!;

  const found = await fetchPage(`name:"*${key}*"`, 1);
  const cards = removeDuplicates(found.map(normalize));

  searchCache.set(cacheKey, cards);
  saveBrowserCache(cards);

  return cards;
}

export async function searchCardsBySetId(
  setId: string,
  lang: LanguageCode = "fr"
): Promise<PokemonCard[]> {
  if (!setId) return [];

  if (lang === "ja" || lang === "zh-tw") {
    try {
      const response = await fetch(`${TCGDEX_URL}/${lang}/sets/${setId}`, {
        cache: "force-cache",
      });
      if (!response.ok) return [];
      const data = await response.json();
      const rawCards = data.cards ?? [];

      const normalizedCards = rawCards.map((c: any) =>
        normalizeTCGdexCard(
          { ...c, set: { id: data.id, name: data.name, cardCount: data.cardCount } },
          lang
        )
      );

      return normalizedCards;
    } catch (err) {
      console.error("[TCGdex Cards Set API]", err);
      return [];
    }
  }

  const cacheKey = `set_${setId}`;
  if (searchCache.has(cacheKey)) return searchCache.get(cacheKey)!;

  const found = await fetchPage(`set.id:"${setId}"`, 1);
  const cards = removeDuplicates(found.map(normalize));

  cards.sort((a, b) => {
    const numA = parseInt(a.number) || 0;
    const numB = parseInt(b.number) || 0;
    return numA - numB;
  });

  searchCache.set(cacheKey, cards);
  return cards;
}

export async function getAllSets(lang: LanguageCode = "fr"): Promise<any[]> {
  if (lang === "ja" || lang === "zh-tw") {
    try {
      const response = await fetch(`${TCGDEX_URL}/${lang}/sets`, {
        cache: "force-cache",
      });
      if (!response.ok) return [];
      const data = await response.json();
      return data.map((set: any) => ({
        id: set.id,
        name: set.name,
        series: set.series?.name || (lang === "ja" ? "Japon" : "Chine / Taïwan"),
        total: set.cardCount?.total ?? 0,
        logo: set.logo ? `${set.logo}.png` : undefined,
      }));
    } catch (err) {
      console.error("[TCGdex Sets API]", err);
      return [];
    }
  }

  try {
    const params = new URLSearchParams();
    params.set("pageSize", "300");
    params.set("orderBy", "-releaseDate");

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

  if (id.startsWith("tcgdex-")) {
    const parts = id.split("-");
    const lang = (parts[1] === "zh" ? "zh-tw" : parts[1]) as LanguageCode;
    const rawCardId = parts.slice(2).join("-");

    try {
      const response = await fetch(`${TCGDEX_URL}/${lang}/cards/${rawCardId}`, {
        cache: "force-cache",
      });
      if (!response.ok) return null;

      const data = await response.json();
      const card = normalizeTCGdexCard(data, lang);

      cache.set(id, card);
      return card;
    } catch (error) {
      console.error("[TCGdex Card Details API]", error);
      return null;
    }
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