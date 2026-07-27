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
    const existing = loadBrowserCache();
    const map = new Map<string, PokemonCard>();
    existing.forEach((c) => map.set(c.id, c));
    cards.forEach((c) => map.set(c.id, c));
    localStorage.setItem(CACHE_KEY, JSON.stringify(Array.from(map.values())));
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
 * Normalise une carte issue de l'API TCGdex
 */
function normalizeTCGdexCard(card: any, lang: LanguageCode, parentSet?: any): PokemonCard {
  const setId = card.set?.id || parentSet?.id || "";
  const cardId = card.id || "";
  const localId = card.localId || card.number || "";

  let imageUrl = "";
  let smallImageUrl = "";

  if (card.image) {
    let cleanImage = String(card.image).trim().replace(/\/(high|low)(\.(png|webp|jpg))?$/, "");
    imageUrl = `${cleanImage}/high.png`;
    smallImageUrl = `${cleanImage}/low.png`;
  } else if (cardId) {
    const cleanSetId = setId || cardId.split("-")[0];
    const baseUrl = `https://assets.tcgdex.net/${lang}/${cleanSetId}/${localId}`;
    imageUrl = `${baseUrl}/high.png`;
    smallImageUrl = `${baseUrl}/low.png`;
  }

  return {
    id: `tcgdex-${lang}-${cardId}`,
    name: card.name ?? "Carte Inconnue",
    supertype: card.category ?? "Pokemon",
    number: String(localId),
    rarity: card.rarity ?? "Rare",
    images: {
      small: smallImageUrl || "/placeholder.png",
      large: imageUrl || smallImageUrl || "/placeholder.png",
    },
    set: {
      id: setId,
      name: card.set?.name || parentSet?.name || "Extension TCGdex",
      series: card.set?.series?.name || parentSet?.series?.name || "Pokémon TCG",
      printedTotal: parentSet?.cardCount?.official ?? card.set?.cardCount?.official ?? 0,
      total: parentSet?.cardCount?.total ?? card.set?.cardCount?.total ?? 0,
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

    if (!response.ok) return [];

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

/**
 * Récupération directe des cartes via TCGdex pour une extension
 */
async function fetchTCGdexSetCards(setId: string, lang: LanguageCode): Promise<PokemonCard[]> {
  const cleanId = setId.trim().toLowerCase();
  
  const targetLangs: LanguageCode[] = [lang];
  if (lang !== "fr") targetLangs.push("fr");
  if (!targetLangs.includes("en")) targetLangs.push("en");

  for (const l of targetLangs) {
    try {
      const response = await fetch(`${TCGDEX_URL}/${l}/sets/${cleanId}`, {
        cache: "force-cache",
      });

      if (response.ok) {
        const setData = await response.json();
        const rawCards = setData.cards ?? [];

        if (rawCards.length > 0) {
          return rawCards.map((c: any) => normalizeTCGdexCard(c, l, setData));
        }
      }
    } catch (err) {
      console.warn(`[TCGdex Set API] Erreur pour l'extension ${cleanId} (${l})`);
    }
  }

  return [];
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

  // 1. Recherche par numéro et nom via l'API Pokemontcg.io
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

  // 2. Fallback TCGdex si aucun résultat trouvé
  if (cards.length === 0 && nameCandidates.length > 0) {
    for (const name of nameCandidates) {
      try {
        const res = await fetch(`${TCGDEX_URL}/fr/cards?name=${encodeURIComponent(name)}`);
        if (res.ok) {
          const tcgdexData = await res.json();
          if (Array.isArray(tcgdexData) && tcgdexData.length > 0) {
            const formatted = tcgdexData.slice(0, 30).map((c) => normalizeTCGdexCard(c, "fr"));
            cards = removeDuplicates([...cards, ...formatted]);
            break;
          }
        }
      } catch (e) {
        console.error("[Scan Fallback TCGdex Error]", e);
      }
    }
  }

  // 3. Tri des résultats
  cards.sort((a, b) => scoreCard(b, scan) - scoreCard(a, scan));

  // 4. Mettre en cache toutes les cartes scannées (en mémoire + dans localStorage)
  cards.forEach((c) => cache.set(c.id, c));
  saveBrowserCache(cards);

  return cards;
}

export async function searchCards(
  search = "",
  lang: LanguageCode = "fr"
): Promise<PokemonCard[]> {
  const key = search.trim().toLowerCase();

  if (!key) return [];

  const cacheKey = `search_${lang}_${key}`;
  if (searchCache.has(cacheKey)) return searchCache.get(cacheKey)!;

  let cards: PokemonCard[] = [];

  if (lang === "ja" || lang === "zh-tw") {
    try {
      const response = await fetch(`${TCGDEX_URL}/${lang}/cards?name=${encodeURIComponent(key)}`, {
        cache: "force-cache",
      });
      if (response.ok) {
        const data = await response.json();
        cards = data.slice(0, 60).map((c: any) => normalizeTCGdexCard(c, lang));
      }
    } catch (err) {
      console.error("[TCGdex Search API]", err);
    }
  } else {
    const found = await fetchPage(`name:"*${key}*"`, 1);
    cards = removeDuplicates(found.map(normalize));

    if (cards.length === 0) {
      try {
        const response = await fetch(`${TCGDEX_URL}/${lang}/cards?name=${encodeURIComponent(key)}`, {
          cache: "force-cache",
        });
        if (response.ok) {
          const data = await response.json();
          cards = data.slice(0, 60).map((c: any) => normalizeTCGdexCard(c, lang));
        }
      } catch (err) {}
    }
  }

  cards.forEach((c) => cache.set(c.id, c));
  searchCache.set(cacheKey, cards);
  saveBrowserCache(cards);

  return cards;
}

export async function searchCardsBySetId(
  setId: string,
  lang: LanguageCode = "fr"
): Promise<PokemonCard[]> {
  if (!setId) return [];

  const cleanId = setId.trim().toLowerCase();
  const cacheKey = `set_${cleanId}_${lang}`;

  if (searchCache.has(cacheKey)) return searchCache.get(cacheKey)!;

  let cards: PokemonCard[] = [];

  try {
    const found = await fetchPage(`set.id:"${cleanId}"`, 1);
    cards = removeDuplicates(found.map(normalize));
  } catch (error) {
    console.error(`[Pokemon API] Erreur extension ${cleanId}:`, error);
  }

  if (cards.length === 0) {
    cards = await fetchTCGdexSetCards(cleanId, lang);
  }

  if (cards.length === 0) {
    const altId = cleanId.replace(/0(\d)/, "$1");
    if (altId !== cleanId) {
      cards = await fetchTCGdexSetCards(altId, lang);
    }
  }

  cards.sort((a, b) => {
    const numA = parseInt((a.number || "0").replace(/\D/g, "")) || 0;
    const numB = parseInt((b.number || "0").replace(/\D/g, "")) || 0;
    return numA - numB;
  });

  if (cards.length > 0) {
    cards.forEach((c) => cache.set(c.id, c));
    searchCache.set(cacheKey, cards);
    saveBrowserCache(cards);
  }

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

    if (response.ok) {
      const json = await response.json();
      if (json.data && json.data.length > 0) {
        return json.data;
      }
    }
  } catch (error) {
    console.error("[Pokemon Sets API]", error);
  }

  try {
    const response = await fetch(`${TCGDEX_URL}/${lang}/sets`, {
      cache: "force-cache",
    });
    if (response.ok) {
      const data = await response.json();
      return data.map((set: any) => ({
        id: set.id,
        name: set.name,
        series: set.series?.name || "Pokémon TCG",
        total: set.cardCount?.total ?? 0,
        logo: set.logo ? `${set.logo}.png` : undefined,
      }));
    }
  } catch (err) {
    console.error("[TCGdex Fallback Sets API]", err);
  }

  return [];
}

export async function getCardById(id: string): Promise<PokemonCard | null> {
  const decodedId = decodeURIComponent(id);

  // 1. Vérifier la mémoire active
  if (cache.has(decodedId)) {
    return cache.get(decodedId)!;
  }
  if (cache.has(id)) {
    return cache.get(id)!;
  }

  // 2. Vérifier dans le stockage local du navigateur
  const stored = loadBrowserCache();
  const saved = stored.find((card) => card.id === decodedId || card.id === id);
  if (saved) {
    cache.set(saved.id, saved);
    return saved;
  }

  // 3. Si c'est une carte TCGdex
  const targetId = decodedId.startsWith("tcgdex-") ? decodedId : id;
  if (targetId.startsWith("tcgdex-")) {
    const parts = targetId.split("-");
    const lang = (parts[1] === "zh" ? "zh-tw" : parts[1]) as LanguageCode;
    const rawCardId = parts.slice(2).join("-");

    try {
      const response = await fetch(`${TCGDEX_URL}/${lang}/cards/${rawCardId}`, {
        cache: "force-cache",
      });
      if (!response.ok) return null;

      const data = await response.json();
      const card = normalizeTCGdexCard(data, lang);

      cache.set(targetId, card);
      saveBrowserCache([card]);
      return card;
    } catch (error) {
      console.error("[TCGdex Card Details API]", error);
      return null;
    }
  }

  // 4. Appel réseau sur Pokemontcg.io si absente des caches
  try {
    const response = await fetch(`${API_URL}/${encodeURIComponent(decodedId)}`);

    if (!response.ok) return null;

    const json = await response.json();
    const card = normalize(json.data);

    cache.set(card.id, card);
    saveBrowserCache([card]);
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