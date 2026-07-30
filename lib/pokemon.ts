// lib/pokemon.ts

import type { PokemonCard, CardScanResult } from "./types";
import {
  translatePokemonToEnglish,
  translatePokemonToFrench,
  correctPokemonOCR,
  cleanTCGSuffix,
  resolvePokemonName,
} from "./pokemonTranslator";
import { logger } from "./cache/logger";

const API_URL = "https://api.pokemontcg.io/v2/cards";
const SETS_URL = "https://api.pokemontcg.io/v2/sets";
const TCGDEX_URL = "https://api.tcgdex.net/v2";

const CACHE_KEY = "king_tcg_cards_cache_v9_0";

const cache = new Map<string, PokemonCard>();
const searchCache = new Map<string, PokemonCard[]>();

export type LanguageCode = "fr" | "en" | "ja" | "zh-tw";

if (typeof window !== "undefined") {
  try {
    const oldKeys = [
      "king_tcg_cards_cache",
      "king_tcg_cards_cache_v1",
      "king_tcg_cards_cache_v2",
      "king_tcg_cards_cache_v3",
      "king_tcg_cards_cache_v4",
      "king_tcg_cards_cache_v5",
      "king_tcg_cards_cache_v6",
      "king_tcg_cards_cache_v7",
      "king_tcg_cards_cache_v8",
      "king_tcg_cards_cache_v8_1",
    ];
    oldKeys.forEach((key) => localStorage.removeItem(key));
  } catch {}
}

function parseReleaseDate(dateStr?: string): number {
  if (!dateStr) return 0;
  const cleanDate = String(dateStr).trim().replace(/\//g, "-");
  const time = new Date(cleanDate).getTime();
  return isNaN(time) ? 0 : time;
}

function safePrice(val: any): number {
  const num = Number(val);
  return !isNaN(num) && isFinite(num) && num > 0 ? Number(num.toFixed(2)) : 0;
}

function normalize(card: any): PokemonCard {
  const cmPrices = card.cardmarket?.prices || card.pricing?.cardmarket || {};
  const tcgPrices = card.tcgplayer?.prices || card.pricing?.tcgplayer || {};

  const avgSell = safePrice(cmPrices.averageSellPrice ?? cmPrices.avg);
  const trend = safePrice(cmPrices.trendPrice ?? cmPrices.trend);
  const low = safePrice(cmPrices.lowPrice ?? cmPrices.low);
  const avg30 = safePrice(cmPrices.avg30);
  const avg7 = safePrice(cmPrices.avg7);

  const tcgHolo = safePrice(tcgPrices.holofoil?.market ?? tcgPrices.holofoil?.mid) * 0.92;
  const tcgNormal = safePrice(tcgPrices.normal?.market ?? tcgPrices.normal?.mid) * 0.92;
  const tcgReverse = safePrice(tcgPrices.reverseHolofoil?.market ?? tcgPrices.reverseHolofoil?.mid) * 0.92;
  const tcgUnlimited = safePrice(tcgPrices.unlimitedHolofoil?.market) * 0.92;

  // On évite un prix par défaut arbitraire de 1.50 s'il n'y a vraiment aucune donnée de prix
  const rawComputed =
    avgSell ||
    trend ||
    low ||
    avg7 ||
    avg30 ||
    safePrice(tcgHolo) ||
    safePrice(tcgNormal) ||
    safePrice(tcgReverse) ||
    safePrice(tcgUnlimited) ||
    0;

  const computedPrice = safePrice(rawComputed);

  return {
    ...card,
    quantity: card.quantity ?? 0,
    favorite: card.favorite ?? false,
    computedPrice,
    images: {
      small: card.images?.small ?? "",
      large: card.images?.large ?? card.images?.small ?? "",
    },
    cardmarket: card.cardmarket
      ? {
          url: card.cardmarket.url || "",
          updatedAt: card.cardmarket.updatedAt || new Date().toISOString(),
          prices: {
            averageSellPrice: avgSell || computedPrice,
            lowPrice: low,
            trendPrice: trend || computedPrice,
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
            holofoil: tcgPrices.holofoil ? { market: safePrice(tcgHolo) } : undefined,
            normal: tcgPrices.normal ? { market: safePrice(tcgNormal) } : undefined,
            reverseHolofoil: tcgPrices.reverseHolofoil ? { market: safePrice(tcgReverse) } : undefined,
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

  return normalize({
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
    cardmarket: card.cardmarket || card.pricing?.cardmarket,
    tcgplayer: card.tcgplayer || card.pricing?.tcgplayer,
    quantity: 0,
    favorite: false,
  });
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
      headers,
    });

    if (!response.ok) return [];

    const json = await response.json();
    return json.data ?? [];
  } catch (error) {
    logger.error("API", "Erreur lors de l'appel Pokemon TCG API", error);
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
        const priceNew = (card as any).computedPrice ?? 0;
        const priceOld = (existing as any).computedPrice ?? 0;
        if (priceNew > 0 && priceOld === 0) {
          map.set(key, card);
        }
      }
    }
  });
  return Array.from(map.values());
}

/**
 * Algorithme de scoring affiné pour éviter les faux positifs (ex: Machopeur vs Morpeko)
 */
function scoreCard(card: PokemonCard, scan: CardScanResult) {
  let score = 0;
  
  if (!card.id.startsWith("tcgdex-")) {
    score += 500;
  }

  const cardName = normalizeText(card.name);
  const target = normalizeText(scan.cardName ?? scan.pokemonName ?? "");
  const scanNumber = cleanCardNumber(scan.cardNumber);
  const cardNumber = cleanCardNumber(card.number);

  // Le numéro de carte est le critère le plus discriminant pour éviter les confusions d'espèces
  if (scanNumber && cardNumber && scanNumber === cardNumber) {
    score += 1000;
  }

  if (cardName === target) {
    score += 400;
  } else if (target && cardName.includes(target)) {
    score += 150;
  }

  if (
    scan.setName &&
    card.set?.name &&
    normalizeText(card.set.name).includes(normalizeText(scan.setName))
  ) {
    score += 300;
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
  const translatedEN = translatePokemonToEnglish(corrected);
  const translatedFR = translatePokemonToFrench(corrected);

  const nameCandidates = Array.from(
    new Set(
      [corrected, cleanBase, translatedEN, translatedFR, rawName]
        .filter(Boolean)
        .map(String)
    )
  );

  logger.api(`[SCAN MATCH] Recherche TCG pour candidates: ${nameCandidates.join(", ")} (Numéro: ${cleanNum})`);

  // 1. Priorité absolue au duo Numéro + Nom exact si les deux sont détectés
  if (cleanNum && nameCandidates.length) {
    for (const name of nameCandidates) {
      const found = await fetchPage(`number:"${cleanNum}" name:"${name}"`, 1);
      if (found.length) {
        cards = removeDuplicates([...cards, ...found.map(normalize)]);
        break;
      }
    }
  }

  // 2. Si le numéro seul donne des résultats précis
  if (!cards.length && cleanNum) {
    const found = await fetchPage(`number:"${cleanNum}"`, 1);
    if (found.length) {
      cards = removeDuplicates([...cards, ...found.map(normalize)]);
    }
  }

  // 3. Recherche par nom étendu
  if (!cards.length && nameCandidates.length) {
    for (const name of nameCandidates) {
      const found = await fetchPage(`name:"*${name}*"`, 1);
      if (found.length) {
        cards = removeDuplicates([...cards, ...found.map(normalize)]);
      }
    }
  }

  // 4. Fallback TCGdex si l'API officielle ne trouve rien
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
        logger.error("API", "[Scan Fallback TCGdex Error]", e);
      }
    }
  }

  cards.sort((a, b) => scoreCard(b, scan) - scoreCard(a, scan));

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

  logger.api(`[SEARCH ENGINE v9.0] Recherche globale pour "${key}" en langue ${lang}`);

  let officialCards: PokemonCard[] = [];

  try {
    let queryNames: string[] = [];
    if (key.includes("dracaufeu") || key.includes("charizard")) {
      queryNames = ["Dracaufeu", "Charizard"];
    } else {
      const englishName = translatePokemonToEnglish(key) || key;
      const frenchName = translatePokemonToFrench(key) || key;
      queryNames = Array.from(new Set([englishName, frenchName, key])).filter(Boolean);
    }

    const searchPromises = queryNames.flatMap((qName) => [
      fetchPage(`name:"*${qName}*"`, 1),
      fetchPage(`name:"*${qName}*"`, 2),
    ]);

    const resultsPages = await Promise.all(searchPromises);

    resultsPages.forEach((pageResults) => {
      if (pageResults && pageResults.length > 0) {
        officialCards.push(...pageResults.map(normalize));
      }
    });
  } catch (err) {
    logger.error("API", "[Pokemon TCG API Search Error]", err);
  }

  let finalCards = removeDuplicates(officialCards);

  if (finalCards.length < 3) {
    try {
      const targetLang = lang === "en" ? "en" : lang === "ja" ? "ja" : lang === "zh-tw" ? "zh-tw" : "fr";
      const response = await fetch(`${TCGDEX_URL}/${targetLang}/cards?name=${encodeURIComponent(key)}`);
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          const tcgdexCards = data.slice(0, 100).map((c: any) => normalizeTCGdexCard(c, targetLang));
          finalCards = removeDuplicates([...finalCards, ...tcgdexCards]);
        }
      }
    } catch (err) {
      logger.error("API", "[TCGdex Search API Fallback]", err);
    }
  }

  // Tri strict : Les plus récentes en premier, puis par numéro décroissant
  finalCards.sort((a, b) => {
    const isOfficialA = !a.id.startsWith("tcgdex-") ? 1 : 0;
    const isOfficialB = !b.id.startsWith("tcgdex-") ? 1 : 0;
    if (isOfficialA !== isOfficialB) return isOfficialB - isOfficialA;

    const timeA = parseReleaseDate(a.set?.releaseDate);
    const timeB = parseReleaseDate(b.set?.releaseDate);

    if (timeB !== timeA) {
      return timeB - timeA;
    }

    const setIdA = a.set?.id || "";
    const setIdB = b.set?.id || "";
    if (setIdA !== setIdB) {
      return setIdB.localeCompare(setIdA);
    }

    const numA = parseInt((a.number || "0").replace(/\D/g, "")) || 0;
    const numB = parseInt((b.number || "0").replace(/\D/g, "")) || 0;
    return numB - numA;
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
    logger.error("API", `Erreur extension ${cleanId}:`, error);
  }

  if (cards.length === 0) {
    try {
      const response = await fetch(`${TCGDEX_URL}/${lang}/sets/${cleanId}`);
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
    const targetLang = lang === "en" ? "en" : lang === "ja" ? "ja" : lang === "zh-tw" ? "zh-tw" : "fr";
    const response = await fetch(`${TCGDEX_URL}/${targetLang}/sets`);
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        const mappedSets = data.map((set: any) => ({
          id: set.id,
          name: set.name,
          series: set.series?.name || "Pokémon TCG",
          total: set.cardCount?.total ?? set.cardCount?.official ?? 0,
          logo: set.logo ? `${set.logo}.png` : undefined,
          symbol: set.symbol ? `${set.symbol}.png` : undefined,
          releaseDate: set.releaseDate || "",
        }));

        mappedSets.sort((a: any, b: any) => parseReleaseDate(b.releaseDate) - parseReleaseDate(a.releaseDate));
        return mappedSets;
      }
    }
  } catch (error) {
    logger.error("API", "[TCGdex Sets API Error]", error);
  }

  try {
    const params = new URLSearchParams();
    params.set("pageSize", "300");
    params.set("orderBy", "-releaseDate");

    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (process.env.NEXT_PUBLIC_POKEMON_TCG_API_KEY) {
      headers["X-Api-Key"] = process.env.NEXT_PUBLIC_POKEMON_TCG_API_KEY;
    }

    const response = await fetch(`${SETS_URL}?${params}`, { headers });
    if (response.ok) {
      const json = await response.json();
      if (json.data && json.data.length > 0) return json.data;
    }
  } catch (error) {
    logger.error("API", "[Pokemon Sets API Error]", error);
  }

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
      const response = await fetch(`${TCGDEX_URL}/${lang}/cards/${rawCardId}`);
      if (!response.ok) return null;

      const data = await response.json();
      const card = normalizeTCGdexCard(data, lang);

      cache.set(targetId, card);
      saveBrowserCard([card]);
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
