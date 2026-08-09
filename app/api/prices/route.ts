import { NextResponse } from "next/server";
import type {
  MarketConfidence,
  MarketQuote,
  MarketSyncStatus,
} from "@/lib/types";

type CardLanguage = "fr" | "en" | "ja" | "zh-tw";

type InputCard = {
  id: string;
  name?: string;
  number?: string;
  setId?: string;
  setName?: string;
  variant?: string;
  rarity?: string;
  language?: CardLanguage;
};

type MarketPayload = {
  cardmarket?: {
    prices?: Record<string, number>;
    url?: string;
    updatedAt?: string;
  };
  tcgplayer?: {
    prices?: Record<string, any>;
    url?: string;
    updatedAt?: string;
    currency?: "EUR";
  };
  justtcg?: {
    medianNearMint?: number;
    language?: string;
    printing?: string;
    sampleSize?: number;
    url?: string;
    updatedAt?: string;
  };
  ebayListings?: {
  median?: number;
  sampleSize?: number;
  exactSampleSize?: number;
  language?: CardLanguage | "unknown";
  condition?: "Near Mint" | "Unknown";
  query?: string;
  url?: string;
  updatedAt?: string;
 };
  quotes: MarketQuote[];
  estimate?: {
    price: number;
    language: CardLanguage;
    currency: "EUR";
    condition: "Near Mint";
    confidence: MarketConfidence;
    includedSources: string[];
    excludedSources: Array<{ source: string; reason: string }>;
  };
  status: MarketSyncStatus;
  sources: {
    cardmarket: boolean;
    tcgplayer: boolean;
    justtcg: boolean;
    ebayListings: boolean;
    pokewallet?: boolean;
  };
};

type FetchStatus = "ok" | "not_found" | "rate_limited" | "unavailable";
type FetchResult = { data: any | null; status: FetchStatus };

const TCGDEX = "https://api.tcgdex.net/v2";
const POKEMON = "https://api.pokemontcg.io/v2";
const JUSTTCG = "https://api.justtcg.com/v1";
const POKEWALLET = "https://api.pokewallet.io";
const FALLBACK_USD_TO_EUR = 0.92;
const POSITIVE_TTL = 6 * 60 * 60 * 1000;
const NEGATIVE_TTL = 10 * 60 * 1000;

const cache = new Map<string, { expiresAt: number; value: MarketPayload }>();
let fxCache: { value: number; expiresAt: number } | null = null;
let ebayTokenCache: { value: string; expiresAt: number } | null = null;

function numberValue(value: unknown): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0
    ? Number(parsed.toFixed(2))
    : undefined;
}

function cleanNumber(value?: string): string {
  return String(value ?? "").trim().split("/")[0].trim();
}

function normalizedNumber(value?: string): string {
  const raw = cleanNumber(value).toUpperCase();
  const prefix = raw.match(/^[A-Z]+/)?.[0] ?? "";
  const digits = raw.replace(/^[A-Z]+/, "").replace(/^0+(?=\d)/, "");
  return `${prefix}${digits || "0"}`;
}

function normalizedText(value?: string): string {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\u3040-\u30ff\u3400-\u9fff]/g, "");
}

function normalizedSet(value?: string): string {
  return String(value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  if (!sorted.length) return 0;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

async function fetchJson(url: string, init?: RequestInit): Promise<FetchResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const response = await fetch(url, {
      ...init,
      cache: "no-store",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        ...(init?.headers ?? {}),
      },
    });

    if (response.status === 429) return { data: null, status: "rate_limited" };
    if (response.status === 404) return { data: null, status: "not_found" };
    if (!response.ok) return { data: null, status: "unavailable" };
    return { data: await response.json(), status: "ok" };
  } catch {
    return { data: null, status: "unavailable" };
  } finally {
    clearTimeout(timeout);
  }
}

async function usdToEur(): Promise<number> {
  if (fxCache && fxCache.expiresAt > Date.now()) return fxCache.value;

  const result = await fetchJson(
    "https://api.frankfurter.app/latest?from=USD&to=EUR"
  );
  const parsed = Number(result.data?.rates?.EUR);
  const value = Number.isFinite(parsed) && parsed > 0
    ? parsed
    : FALLBACK_USD_TO_EUR;

  fxCache = { value, expiresAt: Date.now() + 12 * 60 * 60 * 1000 };
  return value;
}

async function getEbayAccessToken(): Promise<string | null> {
  if (ebayTokenCache && ebayTokenCache.expiresAt > Date.now()) {
    return ebayTokenCache.value;
  }

  const clientId = process.env.EBAY_CLIENT_ID;
  const clientSecret = process.env.EBAY_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const response = await fetch(
      "https://api.ebay.com/identity/v1/oauth2/token",
      {
        method: "POST",
        cache: "no-store",
        signal: controller.signal,
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "client_credentials",
          scope: "https://api.ebay.com/oauth/api_scope",
        }),
      }
    );

    if (!response.ok) return null;
    const data = await response.json();
    const token = String(data?.access_token ?? "");
    const expiresIn = Number(data?.expires_in ?? 7200);
    if (!token) return null;

    ebayTokenCache = {
      value: token,
      expiresAt: Date.now() + Math.max(300, expiresIn - 120) * 1000,
    };
    return token;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function cardmarketQuotes(
  payload: MarketPayload,
  prices: Record<string, unknown>,
  labelSuffix: string,
  url?: string,
  updatedAt?: string
): void {
  const definitions: Array<{
    key: string;
    label: string;
    metric: MarketQuote["metric"];
    confidence: MarketConfidence;
  }> = [
    {
      key: "trendPrice",
      label: `Cardmarket Europe · tendance${labelSuffix}`,
      metric: "trend_europe",
      confidence: "medium",
    },
    {
      key: "averageSellPrice",
      label: `Cardmarket Europe · moyenne${labelSuffix}`,
      metric: "average_europe",
      confidence: "medium",
    },
    {
      key: "lowPrice",
      label: `Cardmarket Europe · prix le plus bas${labelSuffix}`,
      metric: "lowest_europe",
      confidence: "limited",
    },
    {
      key: "avg1",
      label: `Cardmarket Europe · moyenne 1 jour${labelSuffix}`,
      metric: "average_1d_europe",
      confidence: "medium",
    },
    {
      key: "avg7",
      label: `Cardmarket Europe · moyenne 7 jours${labelSuffix}`,
      metric: "average_7d_europe",
      confidence: "medium",
    },
    {
      key: "avg30",
      label: `Cardmarket Europe · moyenne 30 jours${labelSuffix}`,
      metric: "average_30d_europe",
      confidence: "medium",
    },
  ];

  for (const definition of definitions) {
    const price = numberValue(prices[definition.key]);
    if (!price) continue;

    addQuote(payload, {
      source: "cardmarket",
      label: definition.label,
      price,
      currency: "EUR",
      language: "multi",
      condition: "Unknown",
      metric: definition.metric,
      classification: "indicative",
      compatible: false,
      confidence: definition.confidence,
      url,
      updatedAt,
    });
  }
}

function titleHasExactNumber(title: string, number?: string): boolean {
  const wanted = cleanNumber(number);
  if (!wanted) return false;

  const escaped = wanted.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^0-9A-Z])${escaped}([^0-9A-Z]|$)`, "i").test(title);
}

function titleMatchesPokemon(title: string, name?: string): boolean {
  const normalizedTitle = normalizedText(title);
  const normalizedName = normalizedText(name);
  if (!normalizedName) return true;

  const core = normalizedName
    .replace(/mega/g, "")
    .replace(/ex$/g, "")
    .trim();

  return normalizedTitle.includes(normalizedName) ||
    (core.length >= 4 && normalizedTitle.includes(core));
}

function isGradedOrNonCard(title: string): boolean {
  return /\b(psa|bgs|beckett|cgc|pca|ace|sgc|graded|grad[eé]e?|slab|proxy|custom|fan\s*art|lot|bundle|booster|display|box|digital|online|code)\b/i.test(
    title
  );
}

function explicitLanguage(title: string): CardLanguage | "other" | "unknown" {
  if (/\b(fr|french|fran[cç]ais|fran[cç]aise)\b/i.test(title)) return "fr";
  if (/\b(en|english|anglais|anglaise)\b/i.test(title)) return "en";
  if (/\b(jp|jpn|japanese|japonais|japonaise)\b/i.test(title)) return "ja";
  if (/\b(zh|cn|chinese|chinois|chinoise)\b/i.test(title)) return "zh-tw";
  if (/\b(es|spanish|espagnol|espagnole|espa[nñ]ol)\b/i.test(title)) return "other";
  if (/\b(it|italian|italien|italienne)\b/i.test(title)) return "other";
  if (/\b(de|german|allemand|allemande|deutsch)\b/i.test(title)) return "other";
  return "unknown";
}

function isNearMintTitle(title: string): boolean {
  return /\b(nm|near\s*mint|mint|comme\s*neuve?|proche\s*du\s*neuf)\b/i.test(title);
}

async function fromEbay(card: InputCard): Promise<MarketPayload> {
  const token = await getEbayAccessToken();
  if (!token || !card.name || !card.number) return emptyPayload();

  const queryParts = [
    card.name,
    cleanNumber(card.number),
    card.setName || card.setId,
    card.language === "fr" ? "français" : undefined,
    card.language === "en" ? "English" : undefined,
    card.language === "ja" ? "Japanese" : undefined,
    card.language === "zh-tw" ? "Chinese" : undefined,
    "Pokemon",
  ].filter(Boolean);

  const query = queryParts.join(" ");
  const params = new URLSearchParams({
    q: query,
    limit: "50",
    fieldgroups: "EXTENDED",
  });

  const result = await fetchJson(
    `https://api.ebay.com/buy/browse/v1/item_summary/search?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-EBAY-C-MARKETPLACE-ID": "EBAY_FR",
      },
    }
  );

  if (!result.data) return emptyPayload(sourceStatus(result.status));

  const listings = Array.isArray(result.data?.itemSummaries)
    ? result.data.itemSummaries
    : [];

  const exactLanguageNm: Array<{ price: number; url?: string }> = [];
  const exactLanguageRaw: Array<{ price: number; url?: string }> = [];

  for (const listing of listings) {
    const title = String(listing?.title ?? "");
    if (!title || isGradedOrNonCard(title)) continue;
    if (!titleHasExactNumber(title, card.number)) continue;
    if (!titleMatchesPokemon(title, card.name)) continue;

    const language = explicitLanguage(title);
    if (language !== card.language) continue;

    const currency = String(listing?.price?.currency ?? "").toUpperCase();
    const value = numberValue(listing?.price?.value);
    if (!value || currency !== "EUR") continue;

    const item = {
      price: value,
      url: listing?.itemWebUrl,
    };

    exactLanguageRaw.push(item);
    if (isNearMintTitle(title)) exactLanguageNm.push(item);
  }

  const selected = exactLanguageNm.length
    ? exactLanguageNm
    : exactLanguageRaw;

  if (!selected.length) return emptyPayload();

  const prices = selected.map((item) => item.price);
  const price = Number(median(prices).toFixed(2));
  const exactNm = exactLanguageNm.length > 0;
  const searchUrl = `https://www.ebay.fr/sch/i.html?_nkw=${encodeURIComponent(query)}`;

  const payload = emptyPayload("available");
  payload.ebayListings = {
    median: price,
    sampleSize: selected.length,
    exactSampleSize: exactLanguageNm.length,
    language: card.language ?? "en",
    condition: exactNm ? "Near Mint" : "Unknown",
    query,
    url: searchUrl,
    updatedAt: new Date().toISOString(),
  };

  addQuote(payload, {
    source: "ebay",
    label: exactNm
      ? `eBay · médiane annonces actives ${card.language?.toUpperCase()} NM`
      : `eBay · médiane annonces actives ${card.language?.toUpperCase()} non gradées`,
    price,
    currency: "EUR",
    language: card.language ?? "en",
    condition: exactNm ? "Near Mint" : "Unknown",
    metric: "active_listing_median",
    classification: exactNm ? "exact" : "indicative",
    compatible: exactNm,
    confidence:
      exactNm && selected.length >= 3
        ? "medium"
        : exactNm
          ? "limited"
          : "limited",
    url: searchUrl,
    updatedAt: new Date().toISOString(),
    sampleSize: selected.length,
  });

  payload.sources.ebayListings = true;
  return payload;
}

function emptyPayload(status: MarketSyncStatus = "not_listed"): MarketPayload {
  return {
    quotes: [],
    status,
    sources: {
      cardmarket: false,
      tcgplayer: false,
      justtcg: false,
      ebayListings: false,
      pokewallet: false,
    },
  };
}

function addQuote(payload: MarketPayload, quote: MarketQuote): void {
  const alreadyExists = payload.quotes.some(
    (item) =>
      item.source === quote.source &&
      item.language === quote.language &&
      item.metric === quote.metric &&
      item.price === quote.price
  );
  if (!alreadyExists) payload.quotes.push(quote);
}

function localeFor(language?: CardLanguage): string {
  if (language === "ja") return "ja";
  if (language === "zh-tw") return "zh-tw";
  if (language === "fr") return "fr";
  return "en";
}

function exactIdentity(detail: any, card: InputCard): boolean {
  const expectedNumber = normalizedNumber(card.number);
  const actualNumber = normalizedNumber(detail?.localId ?? detail?.number);
  if (expectedNumber && expectedNumber !== actualNumber) return false;

  const expectedSet = normalizedSet(card.setId);
  if (!expectedSet) return true;

  const actualSet =
    normalizedSet(detail?.set?.id) ||
    normalizedSet(String(detail?.id ?? "").split("-")[0]);
  return expectedSet === actualSet;
}

function exactCardIds(card: InputCard): string[] {
  const ids = new Set<string>();
  const wrapped = String(card.id ?? "").match(
    /^tcgdex-(?:fr|en|ja|zh-tw|zh-cn)-(.+)$/i
  )?.[1];
  if (wrapped) ids.add(wrapped);

  if (card.setId && card.number) {
    ids.add(`${String(card.setId).toLowerCase()}-${cleanNumber(card.number)}`);
  }
  return Array.from(ids);
}

function sourceStatus(status: FetchStatus): MarketSyncStatus {
  if (status === "rate_limited") return "rate_limited";
  if (status === "unavailable") return "source_unavailable";
  return "not_listed";
}

async function fromTcgdex(card: InputCard): Promise<MarketPayload> {
  const payload = emptyPayload();
  const rate = await usdToEur();
  const locale = localeFor(card.language);

  for (const id of exactCardIds(card)) {
    const result = await fetchJson(
      `${TCGDEX}/${locale}/cards/${encodeURIComponent(id)}`
    );
    if (!result.data?.id || !exactIdentity(result.data, card)) continue;

    const cardmarket = result.data?.pricing?.cardmarket;
    if (cardmarket) {
      const low = numberValue(cardmarket.low);
      const trend = numberValue(cardmarket.trend);
      const average = numberValue(cardmarket.avg);
      const avg1 = numberValue(cardmarket.avg1);
      const avg7 = numberValue(cardmarket.avg7);
      const avg30 = numberValue(cardmarket.avg30);

      payload.cardmarket = {
        prices: {
          ...(low ? { lowPrice: low } : {}),
          ...(trend ? { trendPrice: trend } : {}),
          ...(average ? { averageSellPrice: average } : {}),
          ...(avg1 ? { avg1 } : {}),
          ...(avg7 ? { avg7 } : {}),
          ...(avg30 ? { avg30 } : {}),
        },
        updatedAt: cardmarket.updated,
      };

      cardmarketQuotes(
        payload,
        payload.cardmarket.prices ?? {},
        " via TCGdex",
        undefined,
        cardmarket.updated
      );
    }

    const tcgplayer = result.data?.pricing?.tcgplayer;
    if (tcgplayer && card.language === "en") {
      const prices: Record<string, any> = {};
      for (const [variant, raw] of Object.entries(tcgplayer)) {
        if (!raw || typeof raw !== "object") continue;
        const market = numberValue((raw as any).marketPrice);
        const low = numberValue((raw as any).lowPrice);
        if (!market && !low) continue;
        prices[variant] = {
          ...(market ? { market: Number((market * rate).toFixed(2)) } : {}),
          ...(low ? { low: Number((low * rate).toFixed(2)) } : {}),
        };
      }

      if (Object.keys(prices).length) {
        payload.tcgplayer = {
          prices,
          currency: "EUR",
          updatedAt: tcgplayer.updated,
        };
        const values = Object.values(prices)
          .map((value: any) => numberValue(value.market ?? value.low))
          .filter(
            (value: number | undefined): value is number => value !== undefined
          );
        if (values.length) {
          addQuote(payload, {
            source: "tcgplayer",
            label: "TCGPlayer Market via TCGdex",
            price: Number(median(values).toFixed(2)),
            currency: "EUR",
            language: "en",
            condition: "Near Mint",
            metric: "market",
            classification: "exact",
            compatible: true,
            confidence: "medium",
            updatedAt: tcgplayer.updated,
          });
        }
      }
    }

    payload.status = payload.quotes.length ? "available" : "not_listed";
    payload.sources.cardmarket = Boolean(payload.cardmarket);
    payload.sources.tcgplayer = Boolean(payload.tcgplayer);
    return payload;
  }

  return payload;
}

async function fromPokemonTcg(card: InputCard): Promise<MarketPayload> {
  if (
    card.language !== "en" ||
    !card.id ||
    card.id.startsWith("tcgdex-")
  ) {
    return emptyPayload();
  }

  const apiKey = process.env.POKEMON_TCG_API_KEY;
  const result = await fetchJson(
    `${POKEMON}/cards/${encodeURIComponent(card.id)}`,
    { headers: apiKey ? { "X-Api-Key": apiKey } : {} }
  );
  if (!result.data?.data) return emptyPayload(sourceStatus(result.status));

  const payload = emptyPayload();
  const data = result.data.data;
  const rate = await usdToEur();

  if (data.cardmarket?.prices) {
    payload.cardmarket = data.cardmarket;
    cardmarketQuotes(
      payload,
      data.cardmarket.prices,
      " via Pokémon TCG API",
      data.cardmarket.url,
      data.cardmarket.updatedAt
    );
  }

  if (data.tcgplayer?.prices) {
    const prices: Record<string, any> = {};
    for (const [variant, raw] of Object.entries(data.tcgplayer.prices)) {
      const market = numberValue((raw as any)?.market);
      const low = numberValue((raw as any)?.low);
      if (!market && !low) continue;
      prices[variant] = {
        ...(market ? { market: Number((market * rate).toFixed(2)) } : {}),
        ...(low ? { low: Number((low * rate).toFixed(2)) } : {}),
      };
    }

    if (Object.keys(prices).length) {
      payload.tcgplayer = {
        prices,
        currency: "EUR",
        url: data.tcgplayer.url,
        updatedAt: data.tcgplayer.updatedAt,
      };
      const values = Object.values(prices)
        .map((value: any) => numberValue(value.market ?? value.low))
        .filter(
          (value: number | undefined): value is number => value !== undefined
        );
      if (values.length) {
        addQuote(payload, {
          source: "tcgplayer",
          label: "TCGPlayer Market via Pokémon TCG API",
          price: Number(median(values).toFixed(2)),
          currency: "EUR",
          language: "en",
          condition: "Near Mint",
          metric: "market",
          classification: "exact",
          compatible: true,
          confidence: "high",
          url: data.tcgplayer.url,
          updatedAt: data.tcgplayer.updatedAt,
        });
      }
    }
  }

  payload.status = payload.quotes.length ? "available" : "not_listed";
  payload.sources.cardmarket = Boolean(payload.cardmarket);
  payload.sources.tcgplayer = Boolean(payload.tcgplayer);
  return payload;
}

function expectedJustTcgLanguage(language?: CardLanguage): string {
  if (language === "ja") return "japanese";
  if (language === "zh-tw") return "chinese";
  if (language === "fr") return "french";
  return "english";
}

async function fromJustTcg(card: InputCard): Promise<MarketPayload> {
  const apiKey = process.env.JUSTTCG_API_KEY;
  if (!apiKey || !card.name) return emptyPayload();

  const game = card.language === "ja" ? "pokemon-japan" : "pokemon";
  const params = new URLSearchParams({ q: card.name, game, limit: "20" });
  if (card.number) params.set("number", cleanNumber(card.number));

  const result = await fetchJson(`${JUSTTCG}/cards?${params.toString()}`, {
    headers: { "x-api-key": apiKey },
  });
  if (!result.data) return emptyPayload(sourceStatus(result.status));

  const list = Array.isArray(result.data?.data) ? result.data.data : [];
  const expectedName = normalizedText(card.name);
  const expectedNumber = normalizedNumber(card.number);
  const expectedSet = normalizedText(card.setName);
  const expectedSetId = normalizedSet(card.setId);

  const item = list.find((candidate: any) => {
    const sameName = normalizedText(candidate?.name) === expectedName;
    const sameNumber = normalizedNumber(candidate?.number) === expectedNumber;
    const candidateSetName = normalizedText(
      candidate?.set_name ?? candidate?.set?.name
    );
    const candidateSetId = normalizedSet(
      candidate?.set_code ?? candidate?.set_id ?? candidate?.set?.id
    );
    const sameSet =
      expectedSetId && candidateSetId
        ? expectedSetId === candidateSetId
        : !expectedSet ||
          candidateSetName === expectedSet ||
          candidateSetName.includes(expectedSet) ||
          expectedSet.includes(candidateSetName);
    return sameName && sameNumber && sameSet;
  });

  if (!item) return emptyPayload();

  const expectedLanguage = expectedJustTcgLanguage(card.language);
  const variants = (Array.isArray(item.variants) ? item.variants : []).filter(
    (variant: any) =>
      String(variant?.condition ?? "").toLowerCase() === "near mint" &&
      String(variant?.language ?? "").toLowerCase().includes(expectedLanguage) &&
      numberValue(variant?.price) !== undefined
  );
  if (!variants.length) return emptyPayload();

  const rate = await usdToEur();
  const values = variants
    .map((variant: any): number | undefined => numberValue(variant?.price))
    .filter(
      (value: number | undefined): value is number => value !== undefined
    )
    .map((value: number) => Number((value * rate).toFixed(2)));

  const price = Number(median(values).toFixed(2));
  const payload = emptyPayload("available");
  payload.justtcg = {
    medianNearMint: price,
    language: expectedLanguage,
    printing: String(variants[0]?.printing ?? ""),
    sampleSize: variants.length,
    url: item.url,
    updatedAt: item.updatedAt,
  };
  addQuote(payload, {
    source: "justtcg",
    label: `JustTCG médiane NM (${expectedLanguage})`,
    price,
    currency: "EUR",
    language: card.language ?? "en",
    condition: "Near Mint",
    metric: "median",
    classification: "exact",
    compatible: true,
    confidence: variants.length >= 3 ? "medium" : "limited",
    url: item.url,
    updatedAt: item.updatedAt,
    sampleSize: variants.length,
  });
  payload.sources.justtcg = true;
  return payload;
}

function pokewalletLanguage(language?: CardLanguage): string {
  if (language === "ja") return "jap";
  if (language === "zh-tw") return "chn";
  if (language === "fr") return "fr";
  return "eng";
}

function matchesPokeWallet(candidate: any, card: InputCard): boolean {
  const info = candidate?.card_info ?? {};
  const sameNumber = normalizedNumber(info.card_number) === normalizedNumber(card.number);
  if (!sameNumber) return false;

  const candidateSetCode = normalizedSet(info.set_code);
  const expectedSetCode = normalizedSet(card.setId);
  const candidateSetName = normalizedText(info.set_name);
  const expectedSetName = normalizedText(card.setName);
  const sameSet =
    expectedSetCode && candidateSetCode
      ? expectedSetCode === candidateSetCode
      : !expectedSetName ||
        candidateSetName === expectedSetName ||
        candidateSetName.includes(expectedSetName) ||
        expectedSetName.includes(candidateSetName);
  if (!sameSet) return false;

  const imageLanguages = Array.isArray(candidate?.images?.languages)
    ? candidate.images.languages.map((value: unknown) => String(value).toLowerCase())
    : [];
  if (card.language === "fr" && imageLanguages.length && !imageLanguages.includes("fr")) {
    return false;
  }
  return true;
}

async function fromPokeWallet(card: InputCard): Promise<MarketPayload> {
  const apiKey = process.env.POKEWALLET_API_KEY;
  if (!apiKey || !card.name) return emptyPayload();

  const queries = Array.from(
    new Set(
      [
        [card.setId, cleanNumber(card.number)].filter(Boolean).join(" "),
        [card.setName, cleanNumber(card.number)].filter(Boolean).join(" "),
        [card.name, cleanNumber(card.number)].filter(Boolean).join(" "),
      ].filter(Boolean)
    )
  );

  let item: any = null;
  let lastStatus: FetchStatus = "not_found";

  for (const query of queries) {
    const result = await fetchJson(
      `${POKEWALLET}/search?q=${encodeURIComponent(query)}&limit=20`,
      { headers: { "X-API-Key": apiKey } }
    );
    lastStatus = result.status;
    const results = Array.isArray(result.data?.results)
      ? result.data.results
      : [];
    item = results.find((candidate: any) =>
      matchesPokeWallet(candidate, card)
    );
    if (item) break;
    if (result.status === "rate_limited") break;
  }

  if (!item) return emptyPayload(sourceStatus(lastStatus));

  const payload = emptyPayload();
  const requestedLanguage = pokewalletLanguage(card.language);
  const visibleLanguages = Array.isArray(item?.images?.languages)
    ? item.images.languages.map((value: unknown) => String(value).toLowerCase())
    : [];
  const languageCompatible =
    card.language === "en" ||
    (card.language === "fr" && visibleLanguages.includes("fr")) ||
    (card.language === "ja" && (visibleLanguages.includes("ja") || visibleLanguages.includes("jap"))) ||
    (card.language === "zh-tw" && (visibleLanguages.includes("zh") || visibleLanguages.includes("chn")));

  const cmPrices = Array.isArray(item?.cardmarket?.prices)
    ? item.cardmarket.prices
    : [];
  const preferredCm =
    cmPrices.find((price: any) => String(price?.variant_type).toLowerCase() === "holo") ??
    cmPrices.find((price: any) => String(price?.variant_type).toLowerCase() === "normal") ??
    cmPrices[0];
  const cardmarketValue = numberValue(
    preferredCm?.low ?? preferredCm?.trend ?? preferredCm?.avg
  );

  if (cardmarketValue) {
    payload.cardmarket = {
      prices: {
        ...(numberValue(preferredCm?.low) ? { lowPrice: numberValue(preferredCm.low)! } : {}),
        ...(numberValue(preferredCm?.trend) ? { trendPrice: numberValue(preferredCm.trend)! } : {}),
        ...(numberValue(preferredCm?.avg) ? { averageSellPrice: numberValue(preferredCm.avg)! } : {}),
        ...(numberValue(preferredCm?.avg1) ? { avg1: numberValue(preferredCm.avg1)! } : {}),
        ...(numberValue(preferredCm?.avg7) ? { avg7: numberValue(preferredCm.avg7)! } : {}),
        ...(numberValue(preferredCm?.avg30) ? { avg30: numberValue(preferredCm.avg30)! } : {}),
      },
      url: item.cardmarket?.product_url,
      updatedAt: preferredCm?.updated_at,
    };

    // PokéWallet identifie la carte, mais pas la langue de chaque annonce Cardmarket.
    // Ces métriques restent donc européennes et indicatives.
    cardmarketQuotes(
      payload,
      payload.cardmarket.prices ?? {},
      " via PokéWallet",
      item.cardmarket?.product_url,
      preferredCm?.updated_at
    );
  }

  if (card.language === "en" && Array.isArray(item?.tcgplayer?.prices)) {
    const rate = await usdToEur();
    const prices: Record<string, any> = {};
    for (const variant of item.tcgplayer.prices) {
      const key = String(variant?.sub_type_name ?? "normal")
        .replace(/\s+/g, "")
        .replace(/^./, (letter) => letter.toLowerCase());
      const market = numberValue(variant?.market_price);
      const low = numberValue(variant?.low_price);
      if (!market && !low) continue;
      prices[key] = {
        ...(market ? { market: Number((market * rate).toFixed(2)) } : {}),
        ...(low ? { low: Number((low * rate).toFixed(2)) } : {}),
      };
    }
    if (Object.keys(prices).length) {
      payload.tcgplayer = {
        prices,
        currency: "EUR",
        url: item.tcgplayer?.url,
      };
      const values = Object.values(prices)
        .map((value: any) => numberValue(value.market ?? value.low))
        .filter(
          (value: number | undefined): value is number => value !== undefined
        );
      if (values.length) {
        addQuote(payload, {
          source: "pokewallet",
          label: "TCGPlayer via PokéWallet",
          price: Number(median(values).toFixed(2)),
          currency: "EUR",
          language: "en",
          condition: "Near Mint",
          metric: "market",
          classification: "exact",
          compatible: true,
          confidence: "high",
          url: item.tcgplayer?.url,
        });
      }
    }
  }

  payload.sources.pokewallet = payload.quotes.length > 0;
  payload.sources.cardmarket = Boolean(payload.cardmarket);
  payload.sources.tcgplayer = Boolean(payload.tcgplayer);
  payload.status = payload.quotes.length ? "available" : "not_listed";
  return payload;
}

function mergePayloads(...parts: MarketPayload[]): MarketPayload {
  const merged = emptyPayload();

  for (const part of parts) {
    // PokéWallet is queried first and therefore wins when it has an exact match.
    if (part.cardmarket && !merged.cardmarket) merged.cardmarket = part.cardmarket;
    if (part.tcgplayer && !merged.tcgplayer) merged.tcgplayer = part.tcgplayer;
    if (part.justtcg && !merged.justtcg) merged.justtcg = part.justtcg;
    if (part.ebayListings && !merged.ebayListings) {
      merged.ebayListings = part.ebayListings;
    }

    for (const quote of part.quotes) addQuote(merged, quote);

    if (part.status === "rate_limited") merged.status = "rate_limited";
    if (
      part.status === "source_unavailable" &&
      merged.status === "not_listed"
    ) {
      merged.status = "source_unavailable";
    }

    merged.sources.cardmarket = Boolean(merged.cardmarket);
    merged.sources.tcgplayer = Boolean(merged.tcgplayer);
    merged.sources.justtcg = Boolean(merged.justtcg);
    merged.sources.ebayListings = Boolean(merged.ebayListings);
    merged.sources.pokewallet = Boolean(
      merged.sources.pokewallet || part.sources.pokewallet
    );
  }

  if (merged.quotes.length) merged.status = "available";
  return merged;
}

function calculateEstimate(
  payload: MarketPayload,
  language: CardLanguage
): MarketPayload["estimate"] {
  const compatible = payload.quotes.filter(
    (quote) => quote.compatible && quote.language === language && quote.price > 0
  );

  const excluded = payload.quotes
    .filter((quote) => !compatible.includes(quote))
    .map((quote) => ({
      source: quote.label,
      reason:
        quote.language !== language
          ? `Langue ${quote.language} différente de ${language}`
          : "Source non compatible avec cette impression",
    }));

  if (!compatible.length) return undefined;

  const center = median(compatible.map((quote) => quote.price));
  const filtered =
    compatible.length >= 3
      ? compatible.filter(
          (quote) => quote.price >= center * 0.25 && quote.price <= center * 4
        )
      : compatible;

  const price = Number(median(filtered.map((quote) => quote.price)).toFixed(2));
  const confidence: MarketConfidence = filtered.some(
    (quote) => quote.confidence === "high"
  )
    ? "high"
    : filtered.length >= 2
      ? "medium"
      : "limited";

  return {
    price,
    language,
    currency: "EUR",
    condition: "Near Mint",
    confidence,
    includedSources: filtered.map((quote) => quote.label),
    excludedSources: excluded,
  };
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  const workers = Array.from(
    { length: Math.min(limit, items.length) },
    async () => {
      while (cursor < items.length) {
        const index = cursor++;
        results[index] = await worker(items[index]);
      }
    }
  );
  await Promise.all(workers);
  return results;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const cards = (Array.isArray(body?.cards) ? body.cards : [])
      .filter((card: any) => card?.id)
      .slice(0, 20) as InputCard[];

    const results = await mapWithConcurrency(cards, 3, async (card) => {
      const language = card.language ?? "en";
      const cacheKey = [
        "price-v26-europe-ebay",
        card.id,
        language,
        normalizedSet(card.setId),
        normalizedNumber(card.number),
      ].join(":");

      const cached = cache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        return [card.id, cached.value] as const;
      }

      const parts = await Promise.all([
        fromPokeWallet(card),
        fromTcgdex(card),
        fromPokemonTcg(card),
        fromJustTcg(card),
        fromEbay(card),
      ]);
      const value = mergePayloads(...parts);
      value.estimate = calculateEstimate(value, language);

      cache.set(cacheKey, {
        expiresAt:
          Date.now() + (value.status === "available" ? POSITIVE_TTL : NEGATIVE_TTL),
        value,
      });
      return [card.id, value] as const;
    });

    return NextResponse.json({
      success: true,
      version: "price-engine-v26-europe-ebay",
      prices: Object.fromEntries(results),
    });
  } catch (error) {
    console.error("[prices]", error);
    return NextResponse.json(
      { success: false, error: "Impossible de récupérer les prix marché." },
      { status: 500 }
    );
  }
}
