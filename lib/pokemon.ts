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
import { normalizeSearchText, normalizeCardNumber } from "./pokemon/normalize";
import { enrichCardsWithMarketPrices } from "./priceClient";

const TCGDEX_URL = "https://api.tcgdex.net/v2";

const CACHE_KEY = "king_tcg_cards_cache_v10_prices";

const cache = new Map<string, PokemonCard>();
const searchCache = new Map<string, PokemonCard[]>();
const setMetadataCache = new Map<string, { name?: string; releaseDate?: string; series?: string }>();

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

const KNOWN_SET_RELEASE_DATES: Record<string, string> = {
  m6: "2026-07-31",
};

function normalizedSetId(id?: string): string {
  return String(id || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function setCodeRecency(id?: string): number {
  const clean = normalizedSetId(id);
  const match = clean.match(/^([a-z]+)(\d+)(?:[-.]?(\d+))?/);
  if (!match) return 0;
  const era: Record<string, number> = { m: 900, sv: 800, swsh: 700, sm: 600, xy: 500, bw: 400, hgss: 300, dp: 200 };
  return (era[match[1]] || 100) * 1_000_000 + Number(match[2] || 0) * 1_000 + Number(match[3] || 0);
}

function effectiveSetReleaseDate(id?: string, releaseDate?: string): string {
  return releaseDate || KNOWN_SET_RELEASE_DATES[normalizedSetId(id)] || "";
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
  return normalizeSearchText(value);
}

function cleanCardNumber(rawNumber: string | null | undefined): string | null {
  const clean = normalizeCardNumber(rawNumber);
  return clean || null;
}

function tcgdexImageCandidates(card: any, lang: LanguageCode, setId: string, localId: string): string[] {
  const candidates: string[] = [];
  const add = (value?: string) => {
    const clean = String(value ?? "").trim();
    if (clean && !candidates.includes(clean)) candidates.push(clean);
  };

  if (card.image) {
    const raw = String(card.image).trim();
    const base = raw
      .replace(/\/(high|low)(\.(png|webp|jpg|jpeg))?$/i, "")
      .replace(/\.(png|webp|jpg|jpeg)$/i, "");
    add(raw);
    add(`${base}/high.webp`);
    add(`${base}/high.png`);
    add(`${base}/low.webp`);
    add(`${base}/low.png`);
  }

  if (setId && localId) {
    for (const locale of Array.from(new Set([lang, "en"]))) {
      const base = `https://assets.tcgdex.net/${locale}/${setId}/${localId}`;
      add(`${base}/high.webp`);
      add(`${base}/high.png`);
      add(`${base}/low.webp`);
      add(`${base}/low.png`);
    }
  }

  add("/placeholder.png");
  return candidates;
}

function normalizeTCGdexCard(card: any, lang: LanguageCode, parentSet?: any): PokemonCard {
  const setId = String(card.set?.id || parentSet?.id || "");
  const cardId = String(card.id || "");
  const localId = String(card.localId || card.number || "");
  const imageCandidates = tcgdexImageCandidates(card, lang, setId, localId);

  // IMPORTANT : conserver `pricing` sous sa forme native TCGdex. Le normaliseur
  // sait la lire directement. Le placer dans `cardmarket`/`tcgplayer` sans
  // enveloppe `prices` faisait perdre les cotations sur la page Recherche.
  return normalize({
    id: `tcgdex-${lang}-${cardId}`,
    name: card.name ?? "Carte inconnue",
    supertype: card.category ?? "Pokemon",
    number: localId,
    rarity: card.rarity || undefined,
    images: {
      small: imageCandidates.find((url) => url.includes("/low.")) || imageCandidates[0] || "/placeholder.png",
      large: imageCandidates.find((url) => url.includes("/high.")) || imageCandidates[0] || "/placeholder.png",
    },
    imageCandidates,
    set: {
      id: setId,
      name: card.set?.name || parentSet?.name || "Extension non renseignée",
      series: card.set?.series?.name || parentSet?.series?.name || parentSet?.series || undefined,
      printedTotal: parentSet?.cardCount?.official ?? card.set?.cardCount?.official ?? 0,
      total: parentSet?.cardCount?.total ?? card.set?.cardCount?.total ?? 0,
      releaseDate: effectiveSetReleaseDate(setId, parentSet?.releaseDate || card.set?.releaseDate || ""),
      images: {
        symbol: card.set?.symbol ? `${card.set.symbol}.png` : parentSet?.symbol ? `${parentSet.symbol}.png` : "",
        logo: card.set?.logo ? `${card.set.logo}.png` : parentSet?.logo ? `${parentSet.logo}.png` : "",
      },
    },
    pricing: card.pricing,
    quantity: 0,
    favorite: false,
    dataLanguage: lang,
  });
}

const tcgdexDetailCache = new Map<string, any>();

async function hydrateTCGdexCards(
  cards: any[],
  lang: LanguageCode,
  parentSet?: any,
  limit = 48
): Promise<PokemonCard[]> {
  const selected = cards.slice(0, limit);
  const results = new Array<PokemonCard>(selected.length);
  let cursor = 0;

  const workers = Array.from({ length: Math.min(6, selected.length) }, async () => {
    while (cursor < selected.length) {
      const index = cursor++;
      const summary = selected[index];
      const id = String(summary?.id ?? "");
      if (!id) {
        results[index] = normalizeTCGdexCard(summary, lang, parentSet);
        continue;
      }

      const cacheKey = `${lang}:${id}`;
      let detail = tcgdexDetailCache.get(cacheKey);
      if (!detail) {
        try {
          const response = await fetch(`${TCGDEX_URL}/${lang}/cards/${encodeURIComponent(id)}`);
          if (response.ok) {
            detail = await response.json();
            tcgdexDetailCache.set(cacheKey, detail);
          }
        } catch {}
      }
      results[index] = normalizeTCGdexCard(detail || summary, lang, parentSet);
    }
  });

  await Promise.all(workers);
  const remaining = cards.slice(limit).map((card) => normalizeTCGdexCard(card, lang, parentSet));
  return [...results.filter(Boolean), ...remaining];
}

async function fetchPage(query: string, page = 1): Promise<any[]> {
  const params = new URLSearchParams({
    q: query,
    page: String(page),
    pageSize: "250",
  });

  try {
    const response = await fetch(`/api/cards/search?${params.toString()}`, {
      cache: "no-store",
    });

    if (!response.ok) {
      if (response.status === 429) {
        logger.warn("API", "Limite temporaire Pokémon TCG API");
      }
      return [];
    }

    const json = await response.json();
    return Array.isArray(json?.data) ? json.data : [];
  } catch (error) {
    logger.error("API", "Erreur lors de l'appel proxy Pokémon TCG API", error);
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
  
  if (!card.id.startsWith("tcgdex-")) {
    score += 500;
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

  if (cleanNum && nameCandidates.length) {
    for (const name of nameCandidates) {
      const found = await fetchPage(`number:"${cleanNum}" name:"${name}"`, 1);
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
        logger.error("API", "[Scan Fallback TCGdex Error]", e);
      }
    }
  }

  cards.sort((a, b) => scoreCard(b, scan) - scoreCard(a, scan));

  const pricedCards = await enrichCardsWithMarketPrices(cards);
  pricedCards.forEach((c) => cache.set(c.id, c));
  saveBrowserCache(pricedCards);

  return pricedCards;
}

export async function searchCards(
  search = "",
  lang: LanguageCode = "fr"
): Promise<PokemonCard[]> {
  const key = search.trim();
  if (!key) return [];

  const normalizedKey = normalizeText(key);
  const cacheKey = `search_${lang}_${normalizedKey}`;
  if (searchCache.has(cacheKey)) return searchCache.get(cacheKey)!;

  logger.api(`[SEARCH ENGINE DATA] Recherche TCGdex prioritaire pour "${key}" en ${lang}`);
  let tcgdexCards: PokemonCard[] = [];
  let officialCards: PokemonCard[] = [];

  // 1. TCGdex est prioritaire : langue demandée, images, extension et prix embarqués.
  try {
    const response = await fetch(`${TCGDEX_URL}/${lang}/cards?name=${encodeURIComponent(key)}`);
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data)) {
        tcgdexCards = await hydrateTCGdexCards(data.slice(0, 100), lang, undefined, 24);
      }
    }
  } catch (error) {
    logger.error("API", "[TCGdex Search Error]", error);
  }

  // 2. Pokémon TCG API complète FR/EN lorsque TCGdex ne couvre pas assez la recherche.
  // La clé reste exclusivement dans la route serveur /api/cards/search.
  if ((lang === "fr" || lang === "en") && tcgdexCards.length < 24) {
    try {
      const englishName = translatePokemonToEnglish(key) || key;
      const frenchName = translatePokemonToFrench(key) || key;
      const queryNames = Array.from(new Set([key, englishName, frenchName].filter(Boolean))).slice(0, 2);
      const pages = await Promise.all(
        queryNames.flatMap((name) => [fetchPage(`name:"*${name}*"`, 1), fetchPage(`name:"*${name}*"`, 2)])
      );
      officialCards = pages.flatMap((page) => page.map(normalize));
    } catch (error) {
      logger.error("API", "[Pokemon TCG API Search Error]", error);
    }
  }

  const finalCards = removeDuplicates([...tcgdexCards, ...officialCards]);
  // Les résumés TCGdex ne contiennent pas toujours la date de sortie.
  // Le catalogue d'extensions chargé par la page alimente ce cache afin que
  // la recherche par nom reste réellement triée du plus récent au plus ancien.
  finalCards.forEach((card) => {
    const meta = setMetadataCache.get(normalizedSetId(card.set?.id));
    if (!meta || !card.set) return;
    card.set = {
      ...card.set,
      name: card.set.name || meta.name || "Extension inconnue",
      releaseDate: card.set.releaseDate || meta.releaseDate || "",
      series: card.set.series || meta.series || "Pokémon TCG",
    };
  });
  finalCards.sort((a, b) => {
    const timeDiff = parseReleaseDate(b.set?.releaseDate) - parseReleaseDate(a.set?.releaseDate);
    if (timeDiff) return timeDiff;
    const setCodeDiff = setCodeRecency(b.set?.id) - setCodeRecency(a.set?.id);
    if (setCodeDiff) return setCodeDiff;
    const setDiff = String(b.set?.id || "").localeCompare(String(a.set?.id || ""), undefined, { numeric: true });
    if (setDiff) return setDiff;
    return (parseInt((b.number || "0").replace(/\D/g, "")) || 0) -
      (parseInt((a.number || "0").replace(/\D/g, "")) || 0);
  });

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

  // TCGdex prioritaire pour conserver la langue et l'identité exacte de l'extension.
  try {
    const response = await fetch(`${TCGDEX_URL}/${lang}/sets/${encodeURIComponent(cleanId)}`);
    if (response.ok) {
      const setData = await response.json();
      if (Array.isArray(setData?.cards)) {
        cards = await hydrateTCGdexCards(setData.cards, lang, setData, Math.min(setData.cards.length, 60));
      }
    }
  } catch (error) {
    logger.error("API", `[TCGdex extension ${cleanId}]`, error);
  }

  // Secours Pokémon TCG API uniquement si l'extension n'est pas disponible dans TCGdex.
  if (!cards.length && (lang === "fr" || lang === "en")) {
    try {
      const found = await fetchPage(`set.id:"${cleanId}"`, 1);
      cards = removeDuplicates(found.map(normalize));
    } catch (error) {
      logger.error("API", `Erreur extension ${cleanId}:`, error);
    }
  }

  cards.sort((a, b) => {
    const numA = parseInt((a.number || "0").replace(/\D/g, "")) || 0;
    const numB = parseInt((b.number || "0").replace(/\D/g, "")) || 0;
    return numA - numB;
  });

  cards.forEach((card) => cache.set(card.id, card));
  saveBrowserCache(cards);
  searchCache.set(cacheKey, cards);
  return cards;
}

export async function getAllSets(lang: LanguageCode = "fr"): Promise<any[]> {
  const targetLang = lang === "en" ? "en" : lang === "ja" ? "ja" : lang === "zh-tw" ? "zh-tw" : "fr";
  let tcgdexSets: any[] = [];
  let pokemonSets: any[] = [];

  try {
    const response = await fetch(`${TCGDEX_URL}/${targetLang}/sets`);
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data)) {
        tcgdexSets = data.map((set: any) => ({
          id: set.id,
          name: set.name,
          series: set.series?.name || "Pokémon TCG",
          total: set.cardCount?.total ?? set.cardCount?.official ?? 0,
          printedTotal: set.cardCount?.official ?? 0,
          images: {
            logo: set.logo ? `${set.logo}.png` : undefined,
            symbol: set.symbol ? `${set.symbol}.png` : undefined,
          },
          releaseDate: effectiveSetReleaseDate(set.id, set.releaseDate || ""),
        }));
      }
    }
  } catch (error) {
    logger.error("API", "[TCGdex Sets API Error]", error);
  }

  try {
    const response = await fetch("/api/cards/sets", { cache: "no-store" });
    if (response.ok) {
      const json = await response.json();
      if (Array.isArray(json?.data)) pokemonSets = json.data;
    }
  } catch (error) {
    logger.error("API", "[Pokemon Sets Proxy Error]", error);
  }

  const merged = new Map<string, any>();
  for (const set of pokemonSets) merged.set(String(set.id).toLowerCase(), set);
  for (const set of tcgdexSets) {
    const key = String(set.id).toLowerCase();
    const fallback = merged.get(key) || {};
    merged.set(key, {
      ...fallback,
      ...set,
      releaseDate: set.releaseDate || fallback.releaseDate || "",
      total: set.total || fallback.total || fallback.printedTotal || 0,
      printedTotal: set.printedTotal || fallback.printedTotal || 0,
      images: { ...(fallback.images || {}), ...(set.images || {}) },
    });
  }

  const mergedSets = Array.from(merged.values());
  mergedSets.forEach((set: any) => {
    setMetadataCache.set(normalizedSetId(set.id), {
      name: set.name,
      releaseDate: set.releaseDate || "",
      series: typeof set.series === "string" ? set.series : set.series?.name,
    });
  });

  return mergedSets.sort((a: any, b: any) => {
    const dateDiff = parseReleaseDate(b.releaseDate) - parseReleaseDate(a.releaseDate);
    if (dateDiff) return dateDiff;
    const codeDiff = setCodeRecency(b.id) - setCodeRecency(a.id);
    if (codeDiff) return codeDiff;
    return String(b.id).localeCompare(String(a.id), undefined, { numeric: true });
  });
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
    const response = await fetch(`/api/cards/${encodeURIComponent(decodedId)}`, { cache: "no-store" });
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