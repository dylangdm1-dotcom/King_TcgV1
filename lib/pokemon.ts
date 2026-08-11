// lib/pokemon.ts

import type { PokemonCard, CardScanResult, CardPrintVariant, CardPrintVariantKey } from "./types";
import {
  translatePokemonToEnglish,
  translatePokemonToFrench,
  correctPokemonOCR,
  cleanTCGSuffix,
  resolvePokemonName,
} from "./pokemonTranslator";
import { logger } from "./cache/logger";
import { JAPANESE_SET_CATALOG, CHINESE_SET_CATALOG } from "./regionalSetCatalog";
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

const CACHE_KEY = "king_tcg_cards_cache_v16_regional_catalogs";

const cache = new Map<string, PokemonCard>();
const searchCache = new Map<string, PokemonCard[]>();
const setMetadataCache = new Map<string, { name?: string; releaseDate?: string; series?: string }>();

export type LanguageCode = "fr" | "en" | "ja" | "zh-tw";

function tcgdexLocales(lang: LanguageCode): string[] {
  // Mainland Simplified Chinese is intentionally NOT routed through TCGdex.
  // `zh-tw` in TCGdex is Traditional Chinese and caused JP/CN catalogue mixing.
  return [lang];
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
      "king_tcg_cards_cache_v12_set_catalog",
      "king_tcg_cards_cache_v13_language_strict",
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

function tcgdexImageCandidates(
  card: any,
  lang: LanguageCode,
  setId: string,
  localId: string,
  parentSet?: any
): string[] {
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

  if (lang === "ja" && setId && localId) {
    // Verified public JP scan fallback: /sets_jp/{SET}/{NUMBER}.jpg
    // This is only an image fallback; card identity still comes from JP catalogue data.
    add(`https://pokecardex-scans.b-cdn.net/sets_jp/${String(setId).toUpperCase()}/${localId}.jpg?class=md`);
    add(`https://pokecardex-scans.b-cdn.net/sets_jp/${String(setId).toUpperCase()}/${localId}.jpg?class=hd`);
  }

  if (setId && localId) {
    // TCGdex assets include the serie id in their path:
    // /{lang}/{serie}/{set}/{localId}. Set-search summaries may omit `image`,
    // especially on JP sets, so reconstructing without the serie made every
    // generated fallback URL invalid.
    const seriesId = String(
      card?.set?.serie?.id ||
      card?.set?.series?.id ||
      parentSet?.serie?.id ||
      parentSet?.series?.id ||
      ""
    ).trim();

    for (const locale of tcgdexLocales(lang)) {
      if (seriesId) {
        const base = `https://assets.tcgdex.net/${locale}/${seriesId}/${setId}/${localId}`;
        add(`${base}/high.webp`);
        add(`${base}/high.png`);
        add(`${base}/low.webp`);
        add(`${base}/low.png`);
      }
    }
  }

  add("/placeholder.png");
  return candidates;
}

function tcgdexPrintVariants(card: any): CardPrintVariant[] {
  const variants = new Map<CardPrintVariantKey, CardPrintVariant>();
  const add = (key: CardPrintVariantKey, extra: Partial<CardPrintVariant> = {}) => {
    const existing = variants.get(key);
    variants.set(key, {
      key,
      label: key,
      ...existing,
      ...extra,
    });
  };

  const basic = card?.variants || {};
  if (basic.normal) add("Normal");
  if (basic.holo) add("Holofoil");
  if (basic.reverse) add("Reverse Holofoil");
  if (basic.firstEdition) add("First Edition");

  const detailed = Array.isArray(card?.variants_detailed)
    ? card.variants_detailed
    : Array.isArray(card?.variantsDetailed)
      ? card.variantsDetailed
      : [];

  for (const raw of detailed) {
    const foil = String(raw?.foil || "").toLowerCase();
    const descriptor = normalizeSearchText(
      [raw?.type, raw?.variant, raw?.name, raw?.printing].filter(Boolean).join(" ")
    );

    let key: CardPrintVariantKey | null = null;
    if (foil === "masterball" || descriptor.includes("masterball")) key = "Master Ball";
    else if (foil === "pokeball" || descriptor.includes("pokeball")) key = "Poké Ball";
    else if (descriptor.includes("reverse")) key = "Reverse Holofoil";
    else if (descriptor.includes("holo")) key = "Holofoil";
    else if (descriptor.includes("firstedition") || descriptor.includes("1stedition")) key = "First Edition";
    else if (descriptor.includes("normal")) key = "Normal";

    if (!key) continue;
    add(key, {
      foil: foil || undefined,
      tcgplayerId: Number(raw?.thirdParty?.tcgplayer) || undefined,
      cardmarketId: Number(raw?.thirdParty?.cardmarket) || undefined,
    });
  }

  if (!variants.size) add("Normal");
  return Array.from(variants.values());
}

function normalizeTCGdexCard(card: any, lang: LanguageCode, parentSet?: any): PokemonCard {
  const setId = deriveTcgdexSetId(card, parentSet);
  const setMeta = setMetadataCache.get(normalizeSetId(setId));
  const cardId = String(card.id || "");
  const localId = String(card.localId || card.number || "");
  const imageCandidates = tcgdexImageCandidates(card, lang, setId, localId, parentSet);

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
    availablePrintVariants: tcgdexPrintVariants(card),
    set: {
      id: setId,
      name: card.set?.name || parentSet?.name || setMeta?.name || "Extension non renseignée",
      series:
        card.set?.serie?.name ||
        card.set?.series?.name ||
        parentSet?.serie?.name ||
        parentSet?.series?.name ||
        parentSet?.series ||
        setMeta?.series ||
        undefined,
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
    const candidates = buildSearchNameCandidates(key);
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
      // V37: list/search endpoints are catalogue-only. Their summaries already
      // contain the identity and image needed by the result grid. Do not fetch
      // dozens of card-detail endpoints here; full details are loaded on click.
      tcgdexCards = applySetMetadataAndRecentSort(
        summaries.map((card: any) => normalizeTCGdexCard(card, lang))
      );
    }

    // V39 FR completeness: English is used only as a discovery index.
    // A discovered id is accepted only if the exact same id exists in the FR
    // endpoint. This recovers genuine French prints without ever showing an
    // English image, English set label or English-only card.
    if (lang === "fr") {
      const englishNames = Array.from(new Set(
        [translatePokemonToEnglish(key), ...buildSearchNameCandidates(key)]
          .filter((value): value is string => Boolean(value && value.trim()))
      ));
      const enResponses = await Promise.all(englishNames.map(async (candidate) => {
        try {
          const response = await fetch(`${TCGDEX_URL}/en/cards?name=${encodeURIComponent(candidate)}`);
          if (!response.ok) return [];
          const data = await response.json();
          return Array.isArray(data) ? data : [];
        } catch {
          return [];
        }
      }));

      const knownIds = new Set(tcgdexCards.map((card) => String(card.id).replace(/^tcgdex-fr-/, "")));
      const discoveryIds = Array.from(new Set(
        enResponses.flat().map((card: any) => String(card?.id || "")).filter((id) => id && !knownIds.has(id))
      ));

      const verifiedFrench: PokemonCard[] = [];
      const concurrency = 8;
      for (let index = 0; index < discoveryIds.length; index += concurrency) {
        const batch = discoveryIds.slice(index, index + concurrency);
        const resolved = await Promise.all(batch.map(async (cardId) => {
          try {
            const response = await fetch(`${TCGDEX_URL}/fr/cards/${encodeURIComponent(cardId)}`);
            if (!response.ok) return null;
            const detail = await response.json();
            return normalizeTCGdexCard(detail, "fr");
          } catch {
            return null;
          }
        }));
        verifiedFrench.push(...resolved.filter((card): card is PokemonCard => Boolean(card)));
      }

      if (verifiedFrench.length) {
        tcgdexCards = applySetMetadataAndRecentSort(
          removeDuplicates([...tcgdexCards, ...verifiedFrench])
        );
      }
    }
  } catch (error) {
    logger.error("API", "[TCGdex Search Error]", error);
  }

  // 2. Pokémon TCG API est un fallback strictement anglais.
  // V38: ne jamais injecter ses cartes/images EN dans une recherche FR.
  // Les autres langues restent exclusivement servies par leur catalogue TCGdex.
  if (lang === "en" && tcgdexCards.length < 24) {
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


function normalizeRegionalProxyCard(raw: any, lang: LanguageCode): PokemonCard {
  return normalize({
    ...raw,
    id: String(raw?.id || ""),
    name: String(raw?.name || "Carte inconnue"),
    number: String(raw?.number || ""),
    rarity: raw?.rarity || undefined,
    images: raw?.images || { small: "/placeholder.png", large: "/placeholder.png" },
    imageCandidates: Array.isArray(raw?.imageCandidates) ? raw.imageCandidates : [],
    set: raw?.set || {},
    dataLanguage: lang,
    pricing: undefined,
  });
}

async function fetchRegionalSetCards(setId: string, lang: "ja" | "zh-tw"): Promise<PokemonCard[]> {
  try {
    const response = await fetch(
      `/api/catalog/sets?lang=${encodeURIComponent(lang)}&set=${encodeURIComponent(setId)}`,
      { cache: "no-store" }
    );
    if (!response.ok) return [];
    const json = await response.json();
    const rows = Array.isArray(json?.cards) ? json.cards : [];
    return rows.map((raw: any) => normalizeRegionalProxyCard(raw, lang));
  } catch (error) {
    logger.warn("API", `[Regional catalogue ${lang}/${setId}]`, error);
    return [];
  }
}

async function fetchRegionalSets(lang: "ja" | "zh-tw"): Promise<any[]> {
  try {
    const response = await fetch(
      `/api/catalog/sets?lang=${encodeURIComponent(lang)}`,
      { cache: "no-store" }
    );
    if (!response.ok) return [];
    const json = await response.json();
    return Array.isArray(json?.sets) ? json.sets : [];
  } catch (error) {
    logger.warn("API", `[Regional sets ${lang}]`, error);
    return [];
  }
}

function regionalCanonicalCodeSet(lang: "ja" | "zh-tw"): Set<string> {
  const source = lang === "ja" ? JAPANESE_SET_CATALOG : CHINESE_SET_CATALOG;
  return new Set(source.map((entry) => normalizeSetId(entry.code)));
}

function dedupeRegionalSets(sets: any[], lang: "ja" | "zh-tw"): any[] {
  const curated = lang === "ja" ? JAPANESE_SET_CATALOG : CHINESE_SET_CATALOG;
  const curatedByCode = new Map(
    curated.map((entry) => [normalizeSetId(entry.code), entry])
  );
  const byCode = new Map<string, any>();
  for (const set of sets) {
    const code = normalizeSetId(set?.id);
    if (!code || byCode.has(code)) continue;
    const meta = curatedByCode.get(code);
    byCode.set(code, {
      ...set,
      id: meta?.code || set.id,
      name: meta?.name || set.name,
      series: meta?.era || set.series || "Pokémon TCG",
    });
  }
  return Array.from(byCode.values());
}

export async function searchCardsBySetId(
  setId: string,
  lang: LanguageCode = "fr"
): Promise<PokemonCard[]> {
  if (!setId) return [];

  const aliases = setIdAliases(setId);
  const cleanId = normalizeSetId(setId);
  // Never use normalizeSetId() for provider URLs: it intentionally strips
  // punctuation for comparisons, while TCGdex set ids such as sv08.5 require
  // the dot to remain present.
  const providerSetIds = Array.from(new Set([String(setId).trim(), ...aliases].filter(Boolean)));
  const cacheKey = `set_v7_${cleanId}_${lang}`;
  if (searchCache.has(cacheKey)) return searchCache.get(cacheKey)!;

  let cards: PokemonCard[] = [];
  let resolvedSetId = cleanId;

  // V53: Mainland Chinese and Japanese have independent catalogue paths.
  // CN never falls through TCGdex Traditional Chinese. JP uses TCGdex first and
  // the authenticated PokéWallet regional catalogue as a strong fallback.
  if (lang === "zh-tw") {
    cards = await fetchRegionalSetCards(String(setId).trim(), "zh-tw");
  }

  if (lang !== "zh-tw") for (const locale of tcgdexLocales(lang)) {
    for (const candidateId of providerSetIds.length ? providerSetIds : [String(setId).trim()]) {
      try {
        const response = await fetch(
          `${TCGDEX_URL}/${locale}/sets/${encodeURIComponent(candidateId)}`
        );
        if (!response.ok) continue;

        const setData = await response.json();
        if (!Array.isArray(setData?.cards)) continue;

        resolvedSetId = String(setData.id || candidateId);
        // V37: preserve the complete set catalogue. Card summaries are enough
        // for the grid; a detail request is made only when a card is opened.
        cards = setData.cards.map((card: any) => normalizeTCGdexCard(card, lang, setData));

        // V51: some set endpoints return CardBrief entries without `image`
        // even though the single-card endpoint has the asset. Hydrate ONLY
        // those missing-image summaries, never the whole extension. This also
        // recovers several FR visuals without introducing an English fallback.
        if (setData.cards.some((raw: any) => !raw?.image)) {
          const missingIndexes = setData.cards
            .map((raw: any, index: number) => (!raw?.image ? index : -1))
            .filter((index: number) => index >= 0);
          const concurrency = 8;
          for (let start = 0; start < missingIndexes.length; start += concurrency) {
            const indexes = missingIndexes.slice(start, start + concurrency);
            const details = await Promise.all(indexes.map(async (cardIndex: number) => {
              const raw = setData.cards[cardIndex];
              const rawId = String(raw?.id || "");
              if (!rawId) return null;
              try {
                const detailResponse = await fetch(
                  `${TCGDEX_URL}/${locale}/cards/${encodeURIComponent(rawId)}`
                );
                if (!detailResponse.ok) return null;
                return await detailResponse.json();
              } catch {
                return null;
              }
            }));
            details.forEach((detail: any, offset: number) => {
              if (!detail) return;
              const cardIndex = indexes[offset];
              cards[cardIndex] = normalizeTCGdexCard(detail, lang, setData);
            });
          }
        }

        if (cards.length) break;
      } catch (error) {
        logger.error("API", `[TCGdex extension ${candidateId} / ${locale}]`, error);
      }
    }
    if (cards.length) break;
  }

  if (!cards.length && lang === "ja") {
    cards = await fetchRegionalSetCards(String(setId).trim(), "ja");
  }

  // JP fallback through filtered card list when a set detail endpoint is incomplete.
  if (!cards.length && lang === "ja") {
    const providerCandidates = Array.from(
      new Set([String(setId).trim(), ...setIdAliases(setId)].filter(Boolean))
    );
    for (const candidate of providerCandidates) {
      try {
        const response = await fetch(
          `${TCGDEX_URL}/ja/cards?set.id=${encodeURIComponent(candidate)}`
        );
        if (!response.ok) continue;
        const data = await response.json();
        if (!Array.isArray(data) || !data.length) continue;
        cards = data.map((raw: any) =>
          normalizeTCGdexCard(
            raw,
            "ja",
            { id: candidate, name: setMetadataCache.get(normalizeSetId(candidate))?.name }
          )
        );
        if (cards.length) break;
      } catch {}
    }
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

  if (!cards.length && lang === "en") {
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

  cards.forEach((card) => cache.set(card.id, card));
  saveBrowserCache(cards);
  searchCache.set(cacheKey, cards);
  if (resolvedSetId !== cleanId) {
    searchCache.set(`set_v7_${normalizeSetId(resolvedSetId)}_${lang}`, cards);
  }
  return cards;
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

  if (targetLang === "zh-tw") {
    const regional = dedupeRegionalSets(
      await fetchRegionalSets("zh-tw"),
      "zh-tw"
    );
    regional.forEach((set: any) => {
      setMetadataCache.set(normalizeSetId(set.id), {
        name: set.name,
        releaseDate: set.releaseDate || "",
        series: typeof set.series === "string" ? set.series : set.series?.name,
      });
    });
    return regional.sort(compareSetsNewestFirst);
  }

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

  if (targetLang === "ja") {
    const regionalSets = await fetchRegionalSets("ja");
    tcgdexSets = dedupeRegionalSets(
      [...tcgdexSets, ...regionalSets],
      "ja"
    );
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

  // Pokémon TCG API is an EN-centric fallback. V38 makes the language
  // boundary strict: never merge its sets into FR, JP or CN catalogues.
  // A French label must always come from the French catalogue itself.
  if (targetLang === "en") {
    try {
      const response = await fetch("/api/cards/sets", { cache: "no-store" });
      if (response.ok) {
        const json = await response.json();
        if (Array.isArray(json?.data)) pokemonSets = json.data;
      }
    } catch (error) {
      logger.error("API", "[Pokemon Sets Proxy Error]", error);
    }
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
  const stored = loadBrowserCache();
  const saved = stored.find((card) => card.id === decodedId || card.id === id);
  const fallbackCard = cached ?? saved ?? null;

  // TCGdex search/set results are intentionally lightweight summaries in V37.
  // On detail open we request exactly one full card payload. If that request
  // fails (network, locale coverage, quota), the cached summary still renders
  // instead of turning the whole page into an error.
  const targetId = decodedId.startsWith("tcgdex-") ? decodedId : id;
  if (targetId.startsWith("tcgdex-")) {
    const parts = targetId.split("-");
    const lang = (parts[1] === "zh" ? "zh-tw" : parts[1]) as LanguageCode;
    const rawCardId = parts.slice(2).join("-");
    const detailKey = `${lang}:${rawCardId}`;

    try {
      let data = tcgdexDetailCache.get(detailKey);
      if (!data) {
        for (const locale of tcgdexLocales(lang)) {
          const response = await fetch(`${TCGDEX_URL}/${locale}/cards/${encodeURIComponent(rawCardId)}`);
          if (!response.ok) continue;
          data = await response.json();
          tcgdexDetailCache.set(detailKey, data);
          break;
        }
      }

      if (data) {
        const card = normalizeTCGdexCard(data, lang);
        cache.set(card.id, card);
        cache.set(targetId, card);
        saveBrowserCache([card]);
        return card;
      }
    } catch (error) {
      logger.warn("API", `[TCGdex detail fallback ${rawCardId}]`, error);
    }

    if (fallbackCard) {
      cache.set(fallbackCard.id, fallbackCard);
      return fallbackCard;
    }
    return null;
  }

  if (fallbackCard) {
    cache.set(fallbackCard.id, fallbackCard);
    return fallbackCard;
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
    const keysToRemove: string[] = [];
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (key && (key === CACHE_KEY || key.startsWith("king_tcg_cards_cache"))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));
  }
}
