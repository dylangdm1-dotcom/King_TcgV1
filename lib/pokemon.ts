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

// ⚠️ Incrémenté en v5 pour FORCER le nettoyage du cache obsolète sur mobile
const CACHE_KEY = "king_tcg_cards_cache_v5";

const cache = new Map<string, PokemonCard>();
const searchCache = new Map<string, PokemonCard[]>();

export type LanguageCode = "fr" | "en" | "ja" | "zh-tw";

/**
 * Nettoyage automatique des anciens caches localStorage sur mobile/desktop
 */
if (typeof window !== "undefined") {
  try {
    const oldKeys = [
      "king_tcg_cards_cache",
      "king_tcg_cards_cache_v1",
      "king_tcg_cards_cache_v2",
      "king_tcg_cards_cache_v3",
      "king_tcg_cards_cache_v4",
    ];
    oldKeys.forEach((key) => localStorage.removeItem(key));
  } catch {}
}

/**
 * Parsing ultra-sécurisé de date (compatible Safari iOS & Mobile)
 */
function parseReleaseDate(dateStr?: string): number {
  if (!dateStr) return 0;
  const cleanDate = String(dateStr).trim().replace(/\//g, "-");
  const time = new Date(cleanDate).getTime();
  return isNaN(time) ? 0 : time;
}

/**
 * Conversion sécurisée de tout type de prix en Number
 */
function safePrice(val: any): number {
  const num = Number(val);
  return !isNaN(num) && isFinite(num) && num > 0 ? Number(num.toFixed(2)) : 0;
}

/**
 * Normalise les cartes pour garantir la présence des champs prix
 */
function normalize(card: any): PokemonCard {
  const cmPrices = card.cardmarket?.prices || {};
  const tcgPrices = card.tcgplayer?.prices || {};

  return {
    ...card,
    quantity: card.quantity ?? 0,
    favorite: card.favorite ?? false,
    images: {
      small: card.images?.small ?? "",
      large: card.images?.large ?? card.images?.small ?? "",
    },
    cardmarket: card.cardmarket
      ? {
          url: card.cardmarket.url || "",
          updatedAt: card.cardmarket.updatedAt || new Date().toISOString(),
          prices: {
            averageSellPrice: safePrice(cmPrices.averageSellPrice ?? cmPrices.avg),
            lowPrice: safePrice(cmPrices.lowPrice ?? cmPrices.low),
            trendPrice: safePrice(cmPrices.trendPrice ?? cmPrices.trend),
            reverseHoloSell: safePrice(cmPrices.reverseHoloSell),
            reverseHoloLow: safePrice(cmPrices.reverseHoloLow),
            reverseHoloTrend: safePrice(cmPrices.reverseHoloTrend),
            avg1: safePrice(cmPrices.avg1),
            avg7: safePrice(cmPrices.avg7),
            avg30: safePrice(cmPrices.avg30),
          },
        }
      : undefined,
    tcgplayer: card.tcgplayer
      ? {
          url: card.tcgplayer.url || "",
          updatedAt: card.tcgplayer.updatedAt || new Date().toISOString(),
          prices: {
            holofoil: tcgPrices.holofoil ? { market: safePrice(tcgPrices.holofoil.market) } : undefined,
            normal: tcgPrices.normal ? { market: safePrice(tcgPrices.normal.market) } : undefined,
            reverseHolofoil: tcgPrices.reverseHolofoil ? { market: safePrice(tcgPrices.reverseHolofoil.market) } : undefined,
          },
        }
      : undefined,
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

  const cardmarketPrices = card.cardmarket?.prices || card.pricing?.cardmarket || {};
  const tcgplayerPrices = card.tcgplayer?.prices || card.pricing?.tcgplayer || {};

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
      name: card.set?.name || parentSet?.name || "Extension Pokémon",
      series: card.set?.series?.name || parentSet?.series?.name || "Pokémon TCG",
      printedTotal: parentSet?.cardCount?.official ?? card.set?.cardCount?.official ?? 0,
      total: parentSet?.cardCount?.total ?? card.set?.cardCount?.total ?? 0,
      releaseDate: parentSet?.releaseDate || card.set?.releaseDate || "",
      images: { symbol: "", logo: parentSet?.logo ? `${parentSet.logo}.png` : "" },
    },
    cardmarket: {
      url: card.cardmarket?.url || "",
      updatedAt: new Date().toISOString(),
      prices: {
        averageSellPrice: safePrice(cardmarketPrices.averageSellPrice ?? cardmarketPrices.avg),
        lowPrice: safePrice(cardmarketPrices.lowPrice ?? cardmarketPrices.low),
        trendPrice: safePrice(cardmarketPrices.trendPrice ?? cardmarketPrices.trend),
        reverseHoloSell: 0,
        reverseHoloLow: 0,
        reverseHoloTrend: 0,
        avg1: safePrice(cardmarketPrices.avg1),
        avg7: safePrice(cardmarketPrices.avg7),
        avg30: safePrice(cardmarketPrices.avg30),
      },
    },
    tcgplayer: {
      url: card.tcgplayer?.url || "",
      updatedAt: new Date().toISOString(),
      prices: {
        holofoil: tcgplayerPrices.holofoil ? { market: safePrice(tcgplayerPrices.holofoil.market) } : undefined,
        normal: tcgplayerPrices.normal ? { market: safePrice(tcgplayerPrices.normal.market) } : undefined,
        reverseHolofoil: tcgplayerPrices.reverseHolofoil ? { market: safePrice(tcgplayerPrices.reverseHolofoil.market) } : undefined,
      },
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
  params.set("orderBy", "-set.releaseDate");

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
    console.error("[Pokemon TCG API]", error);
    return [];
  }
}

function removeDuplicates(cards: PokemonCard[]) {
  const map = new Map<string, PokemonCard>();
  cards.forEach((card) => {
    const key = `${normalizeText(card.name)}_${cleanCardNumber(card.number)}_${card.set?.id}`;
    if (!map.has(key)) {
      map.set(key, card);
    } else {
      const existing = map.get(key)!;
      const isNewOfficial = !card.id.startsWith("tcgdex-");
      const isOldOfficial = !existing.id.startsWith("tcgdex-");

      if (isNewOfficial && !isOldOfficial) {
        map.set(key, card);
      } else if (isNewOfficial === isOldOfficial) {
        const hasPricesNew = (card.cardmarket?.prices?.averageSellPrice ?? 0) > 0 || (card.tcgplayer?.prices?.holofoil?.market ?? 0) > 0;
        const hasPricesOld = (existing.cardmarket?.prices?.averageSellPrice ?? 0) > 0 || (existing.tcgplayer?.prices?.holofoil?.market ?? 0) > 0;
        if (hasPricesNew && !hasPricesOld) {
          map.set(key, card);
        }
      }
    }
  });
  return Array.from(map.values());
}

function scoreCard(card: PokemonCard, scan: CardScanResult) {
  let score = 0;
  
  if (!card.id.startsWith("tcgdex-")) {
    score += 500;
  }

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
      [corrected, cleanBase, translated, translatedBase, rawName]
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

  cards.sort((a, b) => scoreCard(b, scan) - scoreCard(a, scan));

  cards.forEach((c) => cache.set(c.id, c));
  saveBrowserCache(cards);

  return cards;
}

/**
 * 🔍 RECHERCHE GLOBALE AVEC GARANTIE DU TRI ET DES PRIX
 */
export async function searchCards(
  search = "",
  lang: LanguageCode = "fr"
): Promise<PokemonCard[]> {
  const key = search.trim().toLowerCase();
  if (!key) return [];

  const cacheKey = `search_${lang}_${key}`;
  if (searchCache.has(cacheKey)) return searchCache.get(cacheKey)!;

  let officialCards: PokemonCard[] = [];

  try {
    const translatedName = translatePokemonToEnglish(key) || key;
    const queryNames = Array.from(new Set([translatedName, key]));
    
    for (const qName of queryNames) {
      // Pour les gros Pokémon comme Dracaufeu, charge page 1 ET page 2
      const [p1, p2] = await Promise.all([
        fetchPage(`name:"*${qName}*"`, 1),
        fetchPage(`name:"*${qName}*"`, 2),
      ]);
      
      if (p1.length || p2.length) {
        officialCards.push(...[...p1, ...p2].map(normalize));
      }
    }
  } catch (err) {
    console.error("[Pokemon TCG API Search Error]", err);
  }

  let finalCards = removeDuplicates(officialCards);

  // Fallback TCGdex uniquement si 0 résultat officiel
  if (finalCards.length === 0) {
    try {
      const targetLang = lang === "en" ? "en" : lang === "ja" ? "ja" : lang === "zh-tw" ? "zh-tw" : "fr";
      const response = await fetch(`${TCGDEX_URL}/${targetLang}/cards?name=${encodeURIComponent(key)}`, {
        cache: "force-cache",
      });
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          const tcgdexCards = data.slice(0, 100).map((c: any) => normalizeTCGdexCard(c, targetLang));
          finalCards = removeDuplicates(tcgdexCards);
        }
      }
    } catch (err) {
      console.error("[TCGdex Search API Fallback]", err);
    }
  }

  // Tri Strict : Cartes officielles d'abord, puis Récentes -> Anciennes
  finalCards.sort((a, b) => {
    const isOfficialA = !a.id.startsWith("tcgdex-") ? 1 : 0;
    const isOfficialB = !b.id.startsWith("tcgdex-") ? 1 : 0;
    if (isOfficialA !== isOfficialB) return isOfficialB - isOfficialA;

    const timeA = parseReleaseDate(a.set?.releaseDate);
    const timeB = parseReleaseDate(b.set?.releaseDate);

    if (timeB !== timeA) {
      return timeB - timeA;
    }

    return (b.set?.id || "").localeCompare(a.set?.id || "");
  });

  finalCards.forEach((c) => cache.set(c.id, c));
  searchCache.set(cacheKey, finalCards);
  saveBrowserCache(finalCards);

  return finalCards;
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
    try {
      const response = await fetch(`${TCGDEX_URL}/${lang}/sets/${cleanId}`, { cache: "force-cache" });
      if (response.ok) {
        const setData = await response.json();
        if (setData.cards) {
          cards = setData.cards.map((c: any) => normalizeTCGdexCard(c, lang, setData));
        }
      }
    } catch (e) {}
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
  try {
    const params = new URLSearchParams();
    params.set("pageSize", "300");
    params.set("orderBy", "-releaseDate");

    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (process.env.NEXT_PUBLIC_POKEMON_TCG_API_KEY) {
      headers["X-Api-Key"] = process.env.NEXT_PUBLIC_POKEMON_TCG_API_KEY;
    }

    const response = await fetch(`${SETS_URL}?${params}`, { cache: "force-cache", headers });
    if (response.ok) {
      const json = await response.json();
      if (json.data && json.data.length > 0) return json.data;
    }
  } catch (error) {
    console.error("[Pokemon Sets API Error]", error);
  }

  try {
    const response = await fetch(`${TCGDEX_URL}/${lang}/sets`, { cache: "force-cache" });
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data)) {
        return data.map((set: any) => ({
          id: set.id,
          name: set.name,
          series: set.series?.name || "Pokémon TCG",
          total: set.cardCount?.total ?? set.cardCount?.official ?? 0,
          logo: set.logo ? `${set.logo}.png` : undefined,
          symbol: set.symbol ? `${set.symbol}.png` : undefined,
          releaseDate: set.releaseDate || "",
        }));
      }
    }
  } catch (err) {}

  return [];
}

export async function getCardById(id: string): Promise<PokemonCard | null> {
  const decodedId = decodeURIComponent(id);

  if (cache.has(decodedId)) return cache.get(decodedId)!;
  if (cache.has(id)) return cache.get(id)!;

  const stored = loadBrowserCache();
  const saved = stored.find((card) => card.id === decodedId || card.id === id);
  if (saved) {
    cache.set(saved.id, saved);
    return saved;
  }

  const targetId = decodedId.startsWith("tcgdex-") ? decodedId : id;
  if (targetId.startsWith("tcgdex-")) {
    const parts = targetId.split("-");
    const lang = (parts[1] === "zh" ? "zh-tw" : parts[1]) as LanguageCode;
    const rawCardId = parts.slice(2).join("-");

    try {
      const response = await fetch(`${TCGDEX_URL}/${lang}/cards/${rawCardId}`, { cache: "force-cache" });
      if (!response.ok) return null;

      const data = await response.json();
      const card = normalizeTCGdexCard(data, lang);

      cache.set(targetId, card);
      saveBrowserCache([card]);
      return card;
    } catch (error) {
      return null;
    }
  }

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
    localStorage.clear();
  }
}
