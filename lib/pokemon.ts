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
import { findClosestPokemon } from "./levenshtein";
import {
  compareSetsNewestFirst,
  effectiveSetReleaseDate,
  normalizeSetId,
  setCodeRecency,
  setIdAliases,
} from "./setCatalog";

const TCGDEX_URL = "https://api.tcgdex.net/v2";

const CACHE_KEY = "king_tcg_cards_cache_v12_set_catalog";

const cache = new Map<string, PokemonCard>();
const searchCache = new Map<string, PokemonCard[]>();
const setMetadataCache = new Map<string, { name?: string; releaseDate?: string; series?: string }>();

export type LanguageCode = "fr" | "en" | "ja" | "zh-tw";

function tcgdexLocales(lang: LanguageCode): string[] {
  return lang === "zh-tw" ? ["zh-tw", "zh-cn"] : [lang];
}


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
      "king_tcg_cards_cache_v10_prices",
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
  return normalizeSearchText(value);
}

function cleanCardNumber(rawNumber: string | null | undefined): string | null {
  const clean = normalizeCardNumber(rawNumber);
  return clean || null;
}

function deriveTcgdexSetId(card: any, parentSet?: any): string {
  const explicit = String(card?.set?.id || parentSet?.id || "").trim();
  if (explicit) return explicit;

  const cardId = String(card?.id || "").trim();
  const localId = String(card?.localId || card?.number || "").trim();
  if (!cardId) return "";

  if (localId && cardId.toLowerCase().endsWith(`-${localId.toLowerCase()}`)) {
    return cardId.slice(0, -(localId.length + 1));
  }

  const lastDash = cardId.lastIndexOf("-");
  return lastDash > 0 ? cardId.slice(0, lastDash) : "";
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
    for (const locale of Array.from(new Set([...tcgdexLocales(lang), "en"]))) {
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
  const setId = deriveTcgdexSetId(card, parentSet);
  const setMeta = setMetadataCache.get(normalizeSetId(setId));
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
      name: card.set?.name || parentSet?.name || setMeta?.name || "Extension non renseignée",
      series: card.set?.series?.name || parentSet?.series?.name || parentSet?.series || setMeta?.series || undefined,
      printedTotal: parentSet?.cardCount?.official ?? card.set?.cardCount?.official ?? 0,
      total: parentSet?.cardCount?.total ?? card.set?.cardCount?.total ?? 0,
      releaseDate: effectiveSetReleaseDate(setId, parentSet?.releaseDate || card.set?.releaseDate || setMeta?.releaseDate || ""),
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
        for (const locale of tcgdexLocales(lang)) {
          try {
            const response = await fetch(`${TCGDEX_URL}/${locale}/cards/${encodeURIComponent(id)}`);
            if (response.ok) {
              detail = await response.json();
              tcgdexDetailCache.set(cacheKey, detail);
              break;
            }
          } catch {}
        }
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

async function fetchAllPages(query: string, maxPages = 6): Promise<any[]> {
  const results: any[] = [];

  for (let page = 1; page <= maxPages; page += 1) {
    const current = await fetchPage(query, page);
    results.push(...current);
    // Une page incomplète indique que la pagination est terminée. Cette boucle
    // séquentielle évite de consommer inutilement plusieurs appels gratuits.
    if (current.length < 250) break;
  }

  return results;
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

const SEARCH_NAME_ALIASES: Record<string, string[]> = {
  melofee: ["Mélofée", "Clefairy"],
  melodelfe: ["Mélodelfe", "Clefable"],
};

function buildSearchNameCandidates(value: string): string[] {
  const normalized = normalizeText(value);
  const explicit = SEARCH_NAME_ALIASES[normalized] || [];
  const corrected = correctPokemonOCR(value);
  const resolved = resolvePokemonName(value);
  const english = translatePokemonToEnglish(value);
  const french = translatePokemonToFrench(value);
  const closest = findClosestPokemon(value);

  return Array.from(
    new Set(
      [value, ...explicit, corrected, resolved, english, french, closest]
        .filter((item): item is string => Boolean(item && item.trim()))
        .map((item) => item.trim())
    )
  );
}

function applySetMetadataAndRecentSort(cards: PokemonCard[]): PokemonCard[] {
  cards.forEach((card) => {
    if (!card.set) return;
    const meta = setMetadataCache.get(normalizeSetId(card.set.id));
    if (!meta) return;
    card.set = {
      ...card.set,
      name: card.set.name || meta.name || "Extension inconnue",
      releaseDate: card.set.releaseDate || meta.releaseDate || "",
      series: card.set.series || meta.series || "Pokémon TCG",
    };
  });
  return [...cards].sort((a, b) => {
    const timeDiff = parseReleaseDate(b.set?.releaseDate) - parseReleaseDate(a.set?.releaseDate);
    if (timeDiff) return timeDiff;
    const setCodeDiff = setCodeRecency(b.set?.id) - setCodeRecency(a.set?.id);
    if (setCodeDiff) return setCodeDiff;
    const setDiff = String(b.set?.id || "").localeCompare(String(a.set?.id || ""), undefined, { numeric: true });
    if (setDiff) return setDiff;
    return (parseInt((b.number || "0").replace(/\D/g, "")) || 0) - (parseInt((a.number || "0").replace(/\D/g, "")) || 0);
  });
}

export async function searchCards(
  search = "",
  lang: LanguageCode = "fr"
): Promise<PokemonCard[]> {
  const key = search.trim();
  if (!key) return [];

  const normalizedKey = normalizeText(key);
  const cacheKey = `search_${lang}_${normalizedKey}`;
  if (searchCache.has(cacheKey)) return applySetMetadataAndRecentSort(searchCache.get(cacheKey)!);

  logger.api(`[SEARCH ENGINE DATA] Recherche TCGdex prioritaire pour "${key}" en ${lang}`);
  let tcgdexCards: PokemonCard[] = [];
  let officialCards: PokemonCard[] = [];

  // 1. TCGdex est prioritaire. On essaie le nom saisi, son alias accentué
  // et son équivalent anglais afin que Mélofée/Mélodelfe et les noms FR sans accent fonctionnent.
  try {
    const candidates = buildSearchNameCandidates(key).slice(0, 4);
    const responses = await Promise.all(candidates.map(async (candidate) => {
      try {
        const response = await fetch(`${TCGDEX_URL}/${lang}/cards?name=${encodeURIComponent(candidate)}`);
        if (!response.ok) return [];
        const data = await response.json();
        return Array.isArray(data) ? data : [];
      } catch {
        return [];
      }
    }));
    const summaries = Array.from(
      new Map(
        responses
          .flat()
          .map((card: any) => [String(card?.id || `${card?.name}-${card?.localId}`), card])
      ).values()
    );

    if (summaries.length) {
      // Les résumés TCGdex n'incluent pas toujours l'objet set. On dérive donc
      // l'identifiant d'extension depuis l'id carte, on applique le catalogue
      // chargé, puis on trie AVANT d'hydrater. Ainsi les appels de détail sont
      // réservés aux cartes réellement les plus récentes.
      const normalizedSummaries = applySetMetadataAndRecentSort(
        summaries.slice(0, 200).map((card: any) => normalizeTCGdexCard(card, lang))
      );
      const newestIds = new Set(normalizedSummaries.slice(0, 48).map((card) => card.id.replace(`tcgdex-${lang}-`, "")));
      const prioritizedRaw = [
        ...summaries.filter((card: any) => newestIds.has(String(card?.id || ""))),
        ...summaries.filter((card: any) => !newestIds.has(String(card?.id || ""))),
      ].slice(0, 200);
      tcgdexCards = await hydrateTCGdexCards(prioritizedRaw, lang, undefined, Math.min(48, prioritizedRaw.length));
    }
  } catch (error) {
    logger.error("API", "[TCGdex Search Error]", error);
  }

  // 2. Pokémon TCG API complète FR/EN lorsque TCGdex ne couvre pas assez la recherche.
  // La clé reste exclusivement dans la route serveur /api/cards/search.
  if ((lang === "fr" || lang === "en") && tcgdexCards.length < 24) {
    try {
      const queryNames = buildSearchNameCandidates(key).slice(0, 4);
      const pages = await Promise.all(
        queryNames.map((name) => fetchAllPages(`name:"*${name}*"`, 2))
      );
      officialCards = pages.flatMap((page) => page.map(normalize));
    } catch (error) {
      logger.error("API", "[Pokemon TCG API Search Error]", error);
    }
  }

  const finalCards = applySetMetadataAndRecentSort(removeDuplicates([...tcgdexCards, ...officialCards]));

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

  const aliases = setIdAliases(setId);
  const cleanId = aliases[0] || normalizeSetId(setId);
  const cacheKey = `set_v3_${cleanId}_${lang}`;
  if (searchCache.has(cacheKey)) return searchCache.get(cacheKey)!;

  let cards: PokemonCard[] = [];
  let resolvedSetId = cleanId;

  for (const locale of tcgdexLocales(lang)) {
    for (const candidateId of aliases.length ? aliases : [cleanId]) {
      try {
        const response = await fetch(
          `${TCGDEX_URL}/${locale}/sets/${encodeURIComponent(candidateId)}`
        );
        if (!response.ok) continue;

        const setData = await response.json();
        if (!Array.isArray(setData?.cards)) continue;

        resolvedSetId = String(setData.id || candidateId);
        cards = await hydrateTCGdexCards(
          setData.cards,
          lang,
          setData,
          Math.min(setData.cards.length, 80)
        );
        if (cards.length) break;
      } catch (error) {
        logger.error("API", `[TCGdex extension ${candidateId} / ${locale}]`, error);
      }
    }
    if (cards.length) break;
  }

  if (!cards.length) {
    try {
      const sets = await getAllSets(lang);
      const aliasSet = new Set(aliases);
      const normalizedQuery = normalizeText(setId);
      const matched = sets.find((set: any) => {
        const id = normalizeSetId(set.id);
        const name = normalizeText(set.name);
        return (
          aliasSet.has(id) ||
          name === normalizedQuery ||
          name.includes(normalizedQuery)
        );
      });

      if (matched?.id && normalizeSetId(matched.id) !== cleanId) {
        return searchCardsBySetId(String(matched.id), lang);
      }
    } catch {}
  }

  if (!cards.length && (lang === "fr" || lang === "en")) {
    try {
      const found = await fetchAllPages(`set.id:"${cleanId}"`, 6);
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

  // Les résultats par extension doivent être enrichis AVANT l'ouverture
  // de la fiche. Cela évite une synchronisation tardive dans le composant carte.
  const pricedCards = await enrichCardsWithMarketPrices(cards);

  pricedCards.forEach((card) => cache.set(card.id, card));
  saveBrowserCache(pricedCards);
  searchCache.set(cacheKey, pricedCards);
  if (resolvedSetId !== cleanId) {
    searchCache.set(
      `set_v3_${normalizeSetId(resolvedSetId)}_${lang}`,
      pricedCards
    );
  }
  return pricedCards;
}

type CachedSetMetadata = {
  releaseDate?: string;
  series?: string;
  name?: string;
  savedAt: number;
};

function loadSetDetailsCache(
  lang: LanguageCode
): Record<string, CachedSetMetadata> {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = localStorage.getItem(
      `king_tcg_set_details_v3_${lang}`
    );

    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(
      raw
    ) as Record<string, CachedSetMetadata>;

    const now = Date.now();
    const maxAge = 7 * 24 * 60 * 60 * 1000;

    return Object.fromEntries(
      Object.entries(parsed).filter(([, value]) => {
        return (
          value &&
          typeof value === "object" &&
          typeof value.savedAt === "number" &&
          now - value.savedAt < maxAge
        );
      })
    ) as Record<string, CachedSetMetadata>;
  } catch {
    return {};
  }
}

function saveSetDetailsCache(
  lang: LanguageCode,
  cacheValue: Record<string, CachedSetMetadata>
) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.setItem(
      `king_tcg_set_details_v3_${lang}`,
      JSON.stringify(cacheValue)
    );
  } catch {
    // Le cache local est facultatif.
  }
}

function readSeriesName(set: any): string {
  return (
    set?.series?.name ||
    set?.serie?.name ||
    set?.series ||
    set?.serie ||
    ""
  );
}

async function hydrateRecentSetMetadata(lang: LanguageCode, sets: any[]): Promise<any[]> {
  const cached = loadSetDetailsCache(lang);
  const currentPrefixes = /^(?:m|me|sv|ev|csv|swsh|eb|sm|sl|xy|bw|nb)\d+/i;
  const candidates = sets.filter((set) => {
    const id = normalizeSetId(set.id);
    const genericSeries = !set.series || set.series === "Pokémon TCG";
    return !set.releaseDate || genericSeries || currentPrefixes.test(id);
  });

  for (const set of sets) {
    const hit = cached[normalizeSetId(set.id)];
    if (!hit) continue;
    set.releaseDate = effectiveSetReleaseDate(set.id, set.releaseDate || hit.releaseDate || "");
    if ((!set.series || set.series === "Pokémon TCG") && hit.series) set.series = hit.series;
    if (!set.name && hit.name) set.name = hit.name;
  }

  const pending = candidates.filter((set) => !cached[normalizeSetId(set.id)]).sort(compareSetsNewestFirst);
  const concurrency = 8;
  for (let index = 0; index < pending.length; index += concurrency) {
    const batch = pending.slice(index, index + concurrency);
    const details = await Promise.all(batch.map(async (set) => {
      try {
        const response = await fetch(`${TCGDEX_URL}/${lang}/sets/${encodeURIComponent(set.id)}`);
        if (!response.ok) return null;
        const detail = await response.json();
        return { set, detail };
      } catch {
        return null;
      }
    }));

    for (const item of details) {
      if (!item) continue;
      const { set, detail } = item;
      const series = readSeriesName(detail);
      const releaseDate = effectiveSetReleaseDate(set.id, detail.releaseDate || set.releaseDate || "");
      if (releaseDate) set.releaseDate = releaseDate;
      if (series) set.series = series;
      cached[normalizeSetId(set.id)] = { releaseDate, series, name: detail.name || set.name, savedAt: Date.now() };
    }
  }

  saveSetDetailsCache(lang, cached);
  return sets;
}

export async function getAllSets(lang: LanguageCode = "fr"): Promise<any[]> {
  const targetLang = lang === "en" ? "en" : lang === "ja" ? "ja" : lang === "zh-tw" ? "zh-tw" : "fr";
  let tcgdexSets: any[] = [];
  let pokemonSets: any[] = [];

  try {
    const byId = new Map<string, any>();
    for (const locale of tcgdexLocales(targetLang as LanguageCode)) {
      const response = await fetch(`${TCGDEX_URL}/${locale}/sets`);
      if (!response.ok) continue;
      const data = await response.json();
      if (!Array.isArray(data)) continue;

      for (const set of data) {
        const key = normalizeSetId(set.id);
        if (!key || byId.has(key)) continue;
        byId.set(key, {
          id: set.id,
          name: set.name,
          series: readSeriesName(set) || "Pokémon TCG",
          total: set.cardCount?.total ?? set.cardCount?.official ?? 0,
          printedTotal: set.cardCount?.official ?? 0,
          images: {
            logo: set.logo ? `${set.logo}.png` : undefined,
            symbol: set.symbol ? `${set.symbol}.png` : undefined,
          },
          releaseDate: effectiveSetReleaseDate(set.id, set.releaseDate || ""),
        });
      }
    }
    tcgdexSets = Array.from(byId.values());
  } catch (error) {
    logger.error("API", "[TCGdex Sets API Error]", error);
  }

  if (targetLang === "ja" && !tcgdexSets.some((set) => normalizeSetId(set.id) === "m6")) {
    tcgdexSets.unshift({
      id: "m6",
      name: "ストームエメラルダ",
      series: "MEGA",
      total: 0,
      printedTotal: 0,
      releaseDate: "2026-07-31",
      images: {},
    });
  }

  tcgdexSets = await hydrateRecentSetMetadata(targetLang as LanguageCode, tcgdexSets);

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
    setMetadataCache.set(normalizeSetId(set.id), {
      name: set.name,
      releaseDate: set.releaseDate || "",
      series: typeof set.series === "string" ? set.series : set.series?.name,
    });
  });

  // Les recherches mises en cache avant le chargement des extensions peuvent être mal triées.
  // On les invalide une fois les dates disponibles pour garantir récent → ancien.
  for (const key of Array.from(searchCache.keys())) {
    if (key.startsWith("search_")) searchCache.delete(key);
  }

  return mergedSets.sort(compareSetsNewestFirst);
}

export async function getCardById(id: string): Promise<PokemonCard | null> {
  const decodedId = decodeURIComponent(id);

  const cached = cache.get(decodedId) ?? cache.get(id);
  if (cached) {
    return cached;
  }

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
      cache.set(card.id, card);
      saveBrowserCache([card]);
      return card;
    } catch (error) {
      return null;
    }
  }

  try {
    const response = await fetch(`/api/cards/${encodeURIComponent(decodedId)}`, { cache: "no-store" });
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
