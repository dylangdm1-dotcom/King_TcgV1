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

/**
 * Nettoie le numéro de carte (ex: "006/182" -> "6", "06/182" -> "6", "TG06/TG30" -> "TG06")
 */
function cleanCardNumber(rawNumber: string | null | undefined): string | null {
  if (!rawNumber) return null;
  
  // On prend ce qu'il y a avant le slash (ex: 006/182 -> 006)
  let clean = rawNumber.split("/")[0].trim();
  
  // Si c'est un pur chiffre avec des zéros devant (ex: 006 -> 6)
  if (/^\d+$/.test(clean)) {
    clean = String(parseInt(clean, 10));
  }
  
  return clean;
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

function scoreCard(card: PokemonCard, scan: CardScanResult) {
  let score = 0;
  const cardName = normalizeText(card.name);
  const target = normalizeText(scan.cardName ?? scan.pokemonName ?? "");
  const scanNumber = cleanCardNumber(scan.cardNumber);
  const cardNumber = cleanCardNumber(card.number);

  // Match Numéro Exact (Critère très fort !)
  if (scanNumber && cardNumber && scanNumber === cardNumber) {
    score += 200;
  }

  // Match Nom
  if (cardName === target) {
    score += 100;
  } else if (target && cardName.includes(target)) {
    score += 40;
  }

  // Match Set / Extension
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
 * Recherche dédiée et ultra-précise pour le résultat du Scan Gemini
 */
export async function searchCardsFromScan(
  scan: CardScanResult
): Promise<PokemonCard[]> {
  let cards: PokemonCard[] = [];
  const cleanNum = cleanCardNumber(scan.cardNumber);
  
  // Préparation du nom Pokémon
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

  /*
    ETAPE 1 : Recherche combinée Numéro + Nom (Le plus précis)
  */
  if (cleanNum && nameCandidates.length) {
    for (const name of nameCandidates) {
      const found = await fetchPage(`number:"${cleanNum}" name:"*${name}*"`, 1);
      if (found.length) {
        cards = removeDuplicates([...cards, ...found.map(normalize)]);
        break;
      }
    }
  }

  /*
    ETAPE 2 : Recherche par Numéro seul si l'étape 1 n'a rien donné
  */
  if (!cards.length && cleanNum) {
    const found = await fetchPage(`number:"${cleanNum}"`, 1);
    if (found.length) {
      cards = removeDuplicates([...cards, ...found.map(normalize)]);
    }
  }

  /*
    ETAPE 3 : Recherche par Nom seul (fallback)
  */
  if (!cards.length && nameCandidates.length) {
    for (const name of nameCandidates) {
      const found = await fetchPage(`name:"*${name}*"`, 1);
      if (found.length) {
        cards = removeDuplicates([...cards, ...found.map(normalize)]);
        break;
      }
    }
  }

  // Tri par meilleur score selon ce qu me Gemini avait scanné
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
