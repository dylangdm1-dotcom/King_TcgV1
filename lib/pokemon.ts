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
import { enrichCardsWithMarketPrices } from "./priceClient";

const API_URL = "https://api.pokemontcg.io/v2/cards";
const SETS_URL = "https://api.pokemontcg.io/v2/sets";
const TCGDEX_URL = "https://api.tcgdex.net/v2";

const CACHE_KEY = "king_tcg_cards_cache_v10_prices";

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
      "king_tcg_cards_cache_v9_0",
      "king_tcg_cards_cache_v9_1",
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
  const rawCardmarket = card.cardmarket?.prices || card.pricing?.cardmarket || {};
  const rawTcgplayer = card.tcgplayer?.prices || card.pricing?.tcgplayer || {};

  const cm = {
    averageSellPrice: safePrice(
      rawCardmarket.averageSellPrice ?? rawCardmarket.avg
    ),
    lowPrice: safePrice(
      rawCardmarket.lowPrice ?? rawCardmarket.low
    ),
    trendPrice: safePrice(
      rawCardmarket.trendPrice ?? rawCardmarket.trend
    ),
    reverseHoloSell: safePrice(
      rawCardmarket.reverseHoloSell ?? rawCardmarket["avg-holo"]
    ),
    reverseHoloLow: safePrice(
      rawCardmarket.reverseHoloLow ?? rawCardmarket["low-holo"]
    ),
    reverseHoloTrend: safePrice(
      rawCardmarket.reverseHoloTrend ?? rawCardmarket["trend-holo"]
    ),
    avg1: safePrice(rawCardmarket.avg1),
    avg7: safePrice(rawCardmarket.avg7),
    avg30: safePrice(rawCardmarket.avg30),
  };

  const tcgCurrency: "USD" | "EUR" =
    rawTcgplayer?.currency === "EUR" ? "EUR" : "USD";
  const tcgRate = tcgCurrency === "EUR" ? 1 : 0.92;

  const mapTcgVariant = (variant: any) => {
    if (!variant) return undefined;

    const low = safePrice(
      variant.low ?? variant.lowPrice
    );
    const mid = safePrice(
      variant.mid ?? variant.midPrice
    );
    const high = safePrice(
      variant.high ?? variant.highPrice
    );
    const market = safePrice(
      variant.market ?? variant.marketPrice
    );
    const directLow = safePrice(
      variant.directLow ?? variant.directLowPrice
    );

    return {
      ...(low > 0 ? { low: Number((low * tcgRate).toFixed(2)) } : {}),
      ...(mid > 0 ? { mid: Number((mid * tcgRate).toFixed(2)) } : {}),
      ...(high > 0 ? { high: Number((high * tcgRate).toFixed(2)) } : {}),
      ...(market > 0 ? { market: Number((market * tcgRate).toFixed(2)) } : {}),
      ...(directLow > 0
        ? { directLow: Number((directLow * tcgRate).toFixed(2)) }
        : {}),
    };
  };

  const tcg = {
    holofoil: mapTcgVariant(rawTcgplayer.holofoil ?? rawTcgplayer.holo),
    normal: mapTcgVariant(rawTcgplayer.normal),
    reverseHolofoil: mapTcgVariant(
      rawTcgplayer.reverseHolofoil ?? rawTcgplayer.reverse
    ),
    firstEditionHolofoil: mapTcgVariant(
      rawTcgplayer.firstEditionHolofoil ?? rawTcgplayer["1st-edition-holofoil"]
    ),
    firstEditionNormal: mapTcgVariant(
      rawTcgplayer.firstEditionNormal ?? rawTcgplayer["1st-edition"]
    ),
  };

  const hasCardmarket =
    Object.values(cm).some((value) => typeof value === "number" && value > 0);
  const hasTcgplayer =
    Object.values(tcg).some((value) => value && Object.keys(value).length > 0);

  const cmData = hasCardmarket
    ? {
        url: card.cardmarket?.url || "",
        updatedAt:
          card.cardmarket?.updatedAt ||
          card.pricing?.cardmarket?.updated ||
          "",
        prices: cm,
      }
    : undefined;

  const tcgData = hasTcgplayer
    ? {
        url: card.tcgplayer?.url || "",
        updatedAt:
          card.tcgplayer?.updatedAt ||
          card.pricing?.tcgplayer?.updated ||
          "",
        currency: tcgCurrency,
        prices: tcg,
      }
    : undefined;

  const marketValues = [
    cm.trendPrice,
    cm.averageSellPrice,
    cm.avg7,
    cm.avg30,
    cm.lowPrice,
    tcg.holofoil?.market,
    tcg.normal?.market,
    tcg.reverseHolofoil?.market,
    tcg.firstEditionHolofoil?.market,
    tcg.firstEditionNormal?.market,
  ].filter(
    (value): value is number =>
      typeof value === "number" && Number.isFinite(value) && value > 0
  );

  const computedPrice =
    marketValues.length > 0
      ? Number(
          (
            marketValues.reduce((sum, value) => sum + value, 0) /
            marketValues.length
          ).toFixed(2)
        )
      : 0;

  return {
    ...card,
    quantity: card.quantity ?? 0,
    favorite: card.favorite ?? false,
    computedPrice,
    images: {
      small: card.images?.small ?? "",
      large: card.images?.large ?? card.images?.small ?? "",
    },
    cardmarket: cmData,
    tcgplayer: tcgData,
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


export async function enrichAndCacheCards(cards: PokemonCard[]): Promise<PokemonCard[]> {
  if (!cards.length) return cards;

  const enriched = await enrichCardsWithMarketPrices(cards);
  enriched.forEach((card) => cache.set(card.id, card));
  saveBrowserCache(enriched);
  return enriched;
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

function scoreCard(card: PokemonCard, scan: CardScanResult) {
  let score = 0;
  const scanLanguage = scanLanguageToSearchLanguage(scan.language);
  const isTcgdex = card.id.startsWith("tcgdex-");

  if (!isTcgdex && scanLanguage !== "ja" && scanLanguage !== "zh-tw") {
    score += 500;
  }
  if (card.id.startsWith(`tcgdex-${scanLanguage}-`)) {
    score += 550;
  }

  const cardName = normalizeText(card.name);
  const target = normalizeText(scan.cardName ?? scan.pokemonName ?? "");
  const scanNumber = cleanCardNumber(scan.cardNumber);
  const cardNumber = cleanCardNumber(card.number);

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
    (normalizeText(card.set.name).includes(normalizeText(scan.setName)) ||
      normalizeText(scan.setName).includes(normalizeText(card.set.name)))
  ) {
    score += 300;
  }

  if (scan.setSymbol && card.set?.id) {
    const symbol = normalizeText(scan.setSymbol);
    const setId = normalizeText(card.set.id);
    if (symbol && (setId.includes(symbol) || symbol.includes(setId))) score += 350;
  }

  return score;
}

function scanLanguageToSearchLanguage(language?: string | null): LanguageCode {
  const normalized = String(language ?? "fr").toLowerCase().replace("_", "-");
  if (normalized === "ja" || normalized === "jp") return "ja";
  if (["zh", "zh-cn", "zh-tw", "cn", "tw"].includes(normalized)) return "zh-tw";
  if (normalized === "en") return "en";
  return "fr";
}

function scanNameCandidates(scan: CardScanResult, language: LanguageCode): string[] {
  const rawNames = [scan.cardName, scan.pokemonName, ...(scan.possibleNames ?? [])]
    .filter((value): value is string => Boolean(value?.trim()))
    .map((value) => value.trim());

  // Pour le japonais/chinois, le texte original doit rester prioritaire.
  if (language === "ja" || language === "zh-tw") {
    return Array.from(new Set(rawNames));
  }

  const expanded: string[] = [];
  for (const rawName of rawNames) {
    let corrected = correctPokemonOCR(rawName);
    corrected = resolvePokemonName(corrected);
    const variants = [
      corrected,
      cleanTCGSuffix(corrected),
      translatePokemonToEnglish(corrected),
      translatePokemonToFrench(corrected),
      rawName,
    ].filter((value): value is string => Boolean(value));
    expanded.push(...variants);
  }

  return Array.from(new Set(expanded.filter(Boolean).map(String)));
}

async function searchTcgdexSetAndNumber(
  scan: CardScanResult,
  language: LanguageCode,
  number: string | null
): Promise<PokemonCard[]> {
  if (!number || (!scan.setName && !scan.setSymbol)) return [];

  try {
    const sets = await getAllSets(language);
    const setTargets = [scan.setName, scan.setSymbol]
      .filter((value): value is string => Boolean(value))
      .map(normalizeText);

    const matchingSets = (sets || [])
      .filter((set: any) => {
        const haystack = normalizeText(`${set?.id ?? ""} ${set?.name ?? ""} ${set?.series?.name ?? set?.series ?? ""}`);
        return setTargets.some((target) => target && (haystack.includes(target) || target.includes(haystack)));
      })
      .slice(0, 5);

    const results: PokemonCard[] = [];
    for (const set of matchingSets) {
      try {
        const response = await fetch(`${TCGDEX_URL}/${language}/sets/${encodeURIComponent(set.id)}`);
        if (!response.ok) continue;
        const detail = await response.json();
        const cards = Array.isArray(detail?.cards) ? detail.cards : [];
        const exact = cards.filter((card: any) => cleanCardNumber(card.localId ?? card.number) === number);
        results.push(...exact.map((card: any) => normalizeTCGdexCard(card, language, detail)));
      } catch (error) {
        logger.warn("API", `[SCAN MATCH] Extension TCGdex indisponible: ${set?.id}`);
      }
    }

    return removeDuplicates(results);
  } catch (error) {
    logger.error("API", "[SCAN MATCH] Recherche extension/numéro TCGdex", error);
    return [];
  }
}

export async function searchCardsFromScan(
  scan: CardScanResult
): Promise<PokemonCard[]> {
  const language = scanLanguageToSearchLanguage(scan.language);
  const cleanNum = cleanCardNumber(scan.cardNumber);
  const nameCandidates = scanNameCandidates(scan, language);
  let cards: PokemonCard[] = [];

  logger.api(
    `[SCAN MATCH V5.02] langue=${language}, noms=${nameCandidates.join(" | ") || "—"}, numéro=${cleanNum || "—"}, extension=${scan.setName || scan.setSymbol || "—"}`
  );

  // 1. Même moteur que la recherche manuelle, dans la langue détectée.
  for (const name of nameCandidates.slice(0, 5)) {
    try {
      const found = await searchCards(name, language);
      if (found.length) cards = removeDuplicates([...cards, ...found]);
      if (cards.some((card) => cleanNum && cleanCardNumber(card.number) === cleanNum)) break;
    } catch (error) {
      logger.warn("API", `[SCAN MATCH] Recherche standard impossible pour ${name}`);
    }
  }

  // 2. Pour JP/CN, extension + numéro est souvent plus fiable que le nom.
  if (language === "ja" || language === "zh-tw") {
    const bySetAndNumber = await searchTcgdexSetAndNumber(scan, language, cleanNum);
    cards = removeDuplicates([...bySetAndNumber, ...cards]);
  }

  // 3. Secours PokemonTCG.io pour les cartes occidentales et les promos.
  if (cleanNum && language !== "ja" && language !== "zh-tw") {
    if (nameCandidates.length) {
      for (const name of nameCandidates.slice(0, 4)) {
        const found = await fetchPage(`number:"${cleanNum}" name:"${name}"`, 1);
        if (found.length) cards = removeDuplicates([...found.map(normalize), ...cards]);
      }
    }

    if (!cards.some((card) => cleanCardNumber(card.number) === cleanNum)) {
      const found = await fetchPage(`number:"${cleanNum}"`, 1);
      if (found.length) cards = removeDuplicates([...found.map(normalize), ...cards]);
    }
  }

  // 4. Dernier secours TCGdex dans la bonne langue, jamais forcé en français.
  if (!cards.length && nameCandidates.length) {
    for (const name of nameCandidates.slice(0, 5)) {
      try {
        const response = await fetch(`${TCGDEX_URL}/${language}/cards?name=${encodeURIComponent(name)}`);
        if (!response.ok) continue;
        const data = await response.json();
        if (!Array.isArray(data)) continue;
        cards = removeDuplicates([
          ...cards,
          ...data.slice(0, 80).map((card: any) => normalizeTCGdexCard(card, language)),
        ]);
      } catch (error) {
        logger.error("API", "[SCAN MATCH] Secours TCGdex", error);
      }
    }
  }

  cards.sort((a, b) => scoreCard(b, scan) - scoreCard(a, scan));

  // Le scanner n'a besoin que des meilleurs candidats. Cela utilise le même
  // enrichissement de prix que la recherche standard sans ralentir le scan.
  const bestCandidates = cards.slice(0, 12);
  const pricedCards = await enrichAndCacheCards(bestCandidates);
  pricedCards.forEach((card) => cache.set(card.id, card));

  return pricedCards;
}

export async function searchCards(
  search = "",
  lang: LanguageCode = "fr"
): Promise<PokemonCard[]> {
  const key = search.trim().toLowerCase();
  if (!key) return [];

  const cacheKey = `search_${lang}_${key}`;
  if (searchCache.has(cacheKey)) return searchCache.get(cacheKey)!;

  logger.api(`[SEARCH ENGINE v9.1] Recherche globale pour "${key}" en langue ${lang}`);

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

  // La recherche retourne immédiatement les cartes normalisées.
  // Les prix sont enrichis ensuite par lots, uniquement pour les cartes visibles.
  // Cela évite qu'une recherche volumineuse ne laisse une partie des résultats
  // sans prix à cause d'une limite globale de traitement.
  finalCards.forEach((card) => cache.set(card.id, card));
  saveBrowserCache(finalCards);
  searchCache.set(cacheKey, finalCards);

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
    // Même logique que la recherche par nom : résultat immédiat, puis
    // enrichissement des cartes réellement affichées dans la page Recherche.
    cards.forEach((card) => cache.set(card.id, card));
    saveBrowserCache(cards);
    searchCache.set(cacheKey, cards);
    return cards;
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

async function ensureMarketPrices(card: PokemonCard): Promise<PokemonCard> {
  // Detail pages can be opened from an older browser cache. Refresh the
  // market payload so the detail view uses the same source-of-truth prices
  // as the search results instead of returning stale/missing values.
  const [pricedCard] = await enrichAndCacheCards([card]);
  return pricedCard ?? card;
}

export async function getCardById(id: string): Promise<PokemonCard | null> {
  const decodedId = decodeURIComponent(id);

  const cached = cache.get(decodedId) ?? cache.get(id);
  if (cached) {
    const refreshed = await ensureMarketPrices(cached);
    cache.set(cached.id, refreshed);
    saveBrowserCache([refreshed]);
    return refreshed;
  }

  const stored = loadBrowserCache();
  const saved = stored.find((card) => card.id === decodedId || card.id === id);
  if (saved) {
    const refreshed = await ensureMarketPrices(saved);
    cache.set(saved.id, refreshed);
    saveBrowserCache([refreshed]);
    return refreshed;
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
      const [pricedCard] = await enrichAndCacheCards([card]);
      const finalCard = pricedCard ?? card;

      cache.set(targetId, finalCard);
      return finalCard;
    } catch (error) {
      return null;
    }
  }

  try {
    const response = await fetch(`${API_URL}/${encodeURIComponent(decodedId)}`);
    if (!response.ok) return null;

    const json = await response.json();
    const card = normalize(json.data);
    const [pricedCard] = await enrichAndCacheCards([card]);
    const finalCard = pricedCard ?? card;

    cache.set(card.id, finalCard);
    return finalCard;
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