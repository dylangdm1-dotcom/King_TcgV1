import { NextResponse } from "next/server";
import type {
  MarketConfidence,
  MarketQuote,
  MarketSyncStatus,
} from "@/lib/types";

type CardLanguage = "fr" | "en" | "ja" | "zh-tw";

type InputCard = {
  requestKey?: string;
  id: string;
  providerId?: string;
  name?: string;
  number?: string;
  setId?: string;
  setName?: string;
  variant?: string;
  printingVariant?: string;
  condition?: string;
  rarity?: string;
  language?: CardLanguage;
  variantCardmarketId?: number;
  variantTcgplayerId?: number;
  variantPricing?: {
    cardmarket?: Record<string, unknown>;
    tcgplayer?: Record<string, unknown>;
  };
  embeddedCardmarket?: any;
  embeddedTcgplayer?: any;
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
  average?: number;
  sampleSize?: number;
  rawSampleSize?: number;
  exactSampleSize?: number;
  language?: CardLanguage | "unknown";
  condition?: "Near Mint" | "Unknown";
  query?: string;
  url?: string;
  updatedAt?: string;
 };
  quotes: MarketQuote[];
  debugCardmarketFr?: {
    url?: string;
    fetchStatus?: string;
    articleRows: number;
    frNmPrices: number[];
    htmlHas210: boolean;
    htmlHas27899: boolean;
    stage?: string;
    searchQueries?: string[];
  };
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
const TCGCSV = "https://tcgcsv.com/tcgplayer";
const TCGCSV_JAPAN_CATEGORY_ID = 85;
const TCGCSV_TTL = 24 * 60 * 60 * 1000;
const FALLBACK_USD_TO_EUR = 0.92;
const POSITIVE_TTL = 30 * 60 * 1000;
const NEGATIVE_TTL = 5 * 60 * 1000;
const STALE_PROVIDER_TTL = 6 * 60 * 60 * 1000;

const cache = new Map<string, { expiresAt: number; value: MarketPayload }>();
const providerResponseCache = new Map<string, { freshUntil: number; staleUntil: number; data: any }>();
let fxCache: { value: number; expiresAt: number } | null = null;
let ebayTokenCache: { value: string; expiresAt: number } | null = null;
const englishIdentityCache = new Map<string, { name?: string; setName?: string; expiresAt: number }>();
let tcgCsvJapanGroupsCache: { expiresAt: number; groups: any[] } | null = null;
const tcgCsvJapanGroupCache = new Map<number, { expiresAt: number; products: any[]; prices: any[] }>();

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


function normalizedPrinting(value?: string): string {
  return normalizedText(value)
    .replace("pokeball", "pokeball")
    .replace("masterball", "masterball");
}

function isSpecialPrinting(value?: string): boolean {
  const printing = normalizedPrinting(value);
  return Boolean(
    printing &&
    !["normal", "standard", "regular", "holo", "holofoil"].includes(printing)
  );
}

function requiresExactEbayPrinting(value?: string): boolean {
  const printing = normalizedPrinting(value);
  return ["reverse", "reverseholofoil", "pokeball", "masterball", "firstedition"].includes(printing);
}

function marketSetIdCandidates(card: InputCard): string[] {
  const candidates = new Set<string>();
  const add = (value?: string) => {
    const clean = String(value || "").trim();
    if (clean) candidates.add(clean);
  };

  add(card.setId);

  if (card.language === "fr") {
    const rawSet = String(card.setId || "").trim();
    const sv = rawSet.match(/^sv0?(\d+)(\.\d+)?$/i);
    if (sv) add(`EV${Number(sv[1])}${sv[2] || ""}`);
    const ev = rawSet.match(/^ev0?(\d+)(\.\d+)?$/i);
    if (ev) add(`SV${Number(ev[1])}${ev[2] || ""}`);
  }

  if (card.language === "zh-tw") {
    const setName = normalizedText(card.setName);

    // Simplified-Chinese market IDs are not always the same identifiers used
    // by the catalogue provider. Keep this translation strictly market-side.
    if (
      setName.includes("stellarcrystal") ||
      setName.includes("星彩晶璃")
    ) {
      add("CSV9C");
    }

    // Preserve native Chinese market IDs when the catalogue already has them.
    const rawSet = String(card.setId || "").trim();
    if (/^csv/i.test(rawSet)) add(rawSet.toUpperCase());
  }

  return Array.from(candidates);
}



type RegionalMarketIdentity = {
  setId: string;
  number: string;
  setName?: string;
  cardmarketUrl?: string;
  imageUrl?: string;
};

const CHINESE_MARKET_OVERRIDES: Record<string, RegionalMarketIdentity> = {};

function regionalMarketIdentity(card: InputCard): RegionalMarketIdentity {
  if (card.language !== "zh-tw") {
    return {
      setId: String(card.setId || ""),
      number: cleanNumber(card.number),
      setName: card.setName,
    };
  }
  const key = `${normalizedSet(card.setId)}:${normalizedNumber(card.number).toLowerCase()}`;
  return CHINESE_MARKET_OVERRIDES[key] || {
    setId:
      marketSetIdCandidates(card).find((value) =>
        /^(?:csv|cbb|cs|151c|30thp|nrgy)/i.test(value)
      ) || String(card.setId || ""),
    number: cleanNumber(card.number),
    setName: card.setName,
  };
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

function robustEbaySample<T extends { price: number }>(items: T[]): {
  items: T[];
  average: number;
  median: number;
} {
  if (!items.length) return { items: [], average: 0, median: 0 };
  if (items.length <= 2) {
    const prices = items.map((item) => item.price);
    return {
      items,
      average: Number((prices.reduce((sum, value) => sum + value, 0) / prices.length).toFixed(2)),
      median: Number(median(prices).toFixed(2)),
    };
  }

  const prices = items.map((item) => item.price);
  const center = median(prices);
  const deviations = prices.map((value) => Math.abs(value - center));
  const mad = median(deviations);

  let filtered = items.filter((item) => {
    if (mad > 0) return Math.abs(item.price - center) <= Math.max(mad * 4.5, center * 0.35);
    return item.price >= center * 0.4 && item.price <= center * 2.5;
  });

  // Never let an over-aggressive rail erase the market sample.
  if (filtered.length < Math.min(2, items.length)) {
    filtered = items.filter((item) => item.price >= center * 0.35 && item.price <= center * 2.85);
  }
  if (!filtered.length) filtered = items;

  const sorted = [...filtered].sort((a, b) => a.price - b.price);
  const trim = sorted.length >= 8 ? Math.floor(sorted.length * 0.1) : 0;
  const trimmed = trim > 0 ? sorted.slice(trim, sorted.length - trim) : sorted;
  const finalItems = trimmed.length ? trimmed : sorted;
  const finalPrices = finalItems.map((item) => item.price);
  const average = finalPrices.reduce((sum, value) => sum + value, 0) / finalPrices.length;

  return {
    items: finalItems,
    average: Number(average.toFixed(2)),
    median: Number(median(finalPrices).toFixed(2)),
  };
}

async function fetchJson(url: string, init?: RequestInit): Promise<FetchResult> {
  const method = String(init?.method || "GET").toUpperCase();
  const canCache = method === "GET";
  const cacheKey = canCache ? url : "";
  const now = Date.now();
  const cached = canCache ? providerResponseCache.get(cacheKey) : undefined;
  if (cached && cached.freshUntil > now) {
    return { data: cached.data, status: "ok" };
  }

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

    if (response.status === 429) {
      if (cached && cached.staleUntil > now) return { data: cached.data, status: "ok" };
      return { data: null, status: "rate_limited" };
    }
    if (response.status === 404) return { data: null, status: "not_found" };
    if (!response.ok) {
      if (cached && cached.staleUntil > now) return { data: cached.data, status: "ok" };
      return { data: null, status: "unavailable" };
    }

    const data = await response.json();
    if (canCache && data) {
      providerResponseCache.set(cacheKey, {
        freshUntil: now + POSITIVE_TTL,
        staleUntil: now + STALE_PROVIDER_TTL,
        data,
      });
    }
    return { data, status: "ok" };
  } catch {
    if (cached && cached.staleUntil > now) return { data: cached.data, status: "ok" };
    return { data: null, status: "unavailable" };
  } finally {
    clearTimeout(timeout);
  }
}


async function fetchText(url: string, init?: RequestInit): Promise<{ data: string | null; status: FetchStatus }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);

  try {
    const response = await fetch(url, {
      ...init,
      cache: "no-store",
      signal: controller.signal,
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.7",
        "Cache-Control": "no-cache, no-store, max-age=0",
        Pragma: "no-cache",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36",
        ...(init?.headers ?? {}),
      },
    });

    if (response.status === 429) return { data: null, status: "rate_limited" };
    if (response.status === 404) return { data: null, status: "not_found" };
    if (!response.ok) return { data: null, status: "unavailable" };
    return { data: await response.text(), status: "ok" };
  } catch {
    return { data: null, status: "unavailable" };
  } finally {
    clearTimeout(timeout);
  }
}

function parseEuroPrice(raw: string): number | undefined {
  const cleaned = raw
    .replace(/&nbsp;|\u00a0/g, " ")
    .replace(/\s/g, "")
    .replace(/\.(?=\d{3}(?:,|$))/g, "")
    .replace(",", ".")
    .replace(/[^0-9.]/g, "");
  return numberValue(cleaned);
}

function extractCardmarketSellerOfferPrices(html: string): number[] {
  const decoded = html
    .replace(/&euro;|&#8364;/gi, "€")
    .replace(/&nbsp;|&#160;/gi, " ");

  // Cardmarket FR product pages expose each seller offer as an articleRow.
  // Read only those rows so summary values ("De", trend, averages) are never
  // confused with a real French Near Mint seller offer.
  const rowRegex =
    /<div[^>]+id=["']articleRow[^"']*["'][^>]+class=["'][^"']*\barticle-row\b[^"']*["'][^>]*>[\s\S]*?(?=<div[^>]+id=["']articleRow|$)/gi;

  const rows = decoded.match(rowRegex) ?? [];
  const prices: number[] = [];

  for (const row of rows) {
    const isNearMint =
      /class=["'][^"']*\bcondition-nm\b[^"']*["']/i.test(row) ||
      /data-bs-original-title=["']Near Mint["']/i.test(row);
    if (!isNearMint) continue;

    const isFrench =
      /aria-label=["']Français["']/i.test(row) ||
      /data-original-title=["']Français["']/i.test(row) ||
      /onmouseover=["'][^"']*Français[^"']*["']/i.test(row);
    if (!isFrench) continue;

    const desktopPriceContainer =
      row.match(
        /<div[^>]+class=["'][^"']*\bprice-container\b[^"']*\bd-none\b[^"']*\bd-md-flex\b[^"']*["'][^>]*>([\s\S]*?)<\/div>\s*<\/div>/i
      )?.[1] ??
      row.match(
        /<div[^>]+class=["'][^"']*\bprice-container\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/i
      )?.[1];

    if (!desktopPriceContainer) continue;

    const priceMatch =
      desktopPriceContainer.match(
        /<span[^>]+class=["'][^"']*\bcolor-primary\b[^"']*["'][^>]*>\s*([0-9]{1,6}(?:[.\s][0-9]{3})*,[0-9]{2})\s*€\s*<\/span>/i
      ) ??
      desktopPriceContainer.match(
        /([0-9]{1,6}(?:[.\s][0-9]{3})*,[0-9]{2})\s*€/i
      );

    const price = priceMatch ? parseEuroPrice(priceMatch[1]) : undefined;
    if (price && price >= 0.02 && price <= 100000) {
      prices.push(Number(price.toFixed(2)));
    }
  }

  // Preserve Cardmarket's seller order. The first value is the first real
  // French + Near Mint seller row shown on the filtered product page.
  return prices;
}

function extractFilteredCardmarketPrices(html: string): number[] {
  const sellerPrices = extractCardmarketSellerOfferPrices(html);
  if (sellerPrices.length) return sellerPrices;

  // If Cardmarket article rows exist but none pass the exact FR + NM parser,
  // fail closed instead of falling back to a page summary.
  if (/id=["']articleRow/i.test(html) && /article-row/i.test(html)) return [];

  // Compatibility fallback for alternate Cardmarket row markup. It still only
  // scans explicit offer/table rows and never the whole page summary.
  const decoded = html
    .replace(/&euro;|&#8364;/gi, "€")
    .replace(/&nbsp;|&#160;/gi, " ");

  const rowMarkers = [
    /<div[^>]+class="[^"]*(?:article-row|product-row|offer-row)[^"]*"[\s\S]*?(?=<div[^>]+class="[^"]*(?:article-row|product-row|offer-row)|$)/gi,
    /<tr[^>]*[\s\S]*?<\/tr>/gi,
  ];

  const rows: string[] = [];
  for (const regex of rowMarkers) {
    const matches = decoded.match(regex) ?? [];
    if (matches.length) {
      rows.push(...matches);
      break;
    }
  }

  const prices: number[] = [];
  const pricePatterns = [
    /data-(?:price|amount|value)=["']([0-9.,\s]+)["']/gi,
    /([0-9]{1,6}(?:[.\s][0-9]{3})*,[0-9]{2})\s*€/gi,
    /€\s*([0-9]{1,6}(?:[.\s][0-9]{3})*[.,][0-9]{2})/gi,
  ];

  for (const row of rows) {
    const plain = stripHtmlText(row);
    const hasKnownCondition = /\b(?:NM|Near\s*Mint|Mint|EX|GD|LP|PL|PO)\b/i.test(plain);
    if (hasKnownCondition && !/\b(?:NM|Near\s*Mint)\b/i.test(plain)) continue;

    for (const pattern of pricePatterns) {
      pattern.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(row))) {
        const price = parseEuroPrice(match[1]);
        if (price && price >= 0.02 && price <= 100000) {
          prices.push(Number(price.toFixed(2)));
          break;
        }
      }
      if (prices.length) break;
    }
  }

  return prices;
}

function buildCardmarketFranceUrl(productUrl: string): string | null {
  try {
    const url = new URL(productUrl);
    if (!/cardmarket\.com$/i.test(url.hostname)) return null;
    url.pathname = url.pathname.replace(/^\/(?:en|de|es|it|fr)\//i, "/fr/");
    // Cardmarket language id 2 = French. Keep the product URL otherwise
    // untouched: condition is verified from each real article-row.
    url.search = "";
    url.searchParams.set("language", "2");
    return url.toString();
  } catch {
    return null;
  }
}


function cardmarketHrefMatchesNumber(href: string, number?: string): boolean {
  const wanted = cleanNumber(number).replace(/[^a-z0-9]/gi, "").toLowerCase();
  if (!wanted) return false;
  const compact = String(href || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  return compact.endsWith(wanted) || compact.includes(`pre${wanted}`) || compact.includes(`ev${wanted}`);
}

function findCardmarketFranceProductUrl(searchHtml: string, card: InputCard): string | null {
  const hrefs = Array.from(
    searchHtml.matchAll(/href=["']([^"']*\/Pokemon\/Products\/Singles\/[^"']+)["']/gi)
  ).map((match) => match[1].replace(/&amp;/g, "&"));

  if (!hrefs.length) return null;

  const expectedSetTokens = Array.from(
    new Set(
      [card.setName, card.setId, ...marketSetIdCandidates(card)]
        .filter(Boolean)
        .map((value) => normalizedText(value))
        .filter((value) => value.length >= 3)
    )
  );
  const expectedNames = [card.name].filter(Boolean).map((value) => normalizedText(value));

  const scored = hrefs.map((href) => {
    const normalizedHref = normalizedText(href);
    let score = 0;
    if (cardmarketHrefMatchesNumber(href, card.number)) score += 500;
    if (expectedSetTokens.some((value) => normalizedHref.includes(value))) score += 180;
    if (expectedNames.some((value) => normalizedHref.includes(value))) score += 120;
    if (/\/singles\//i.test(href)) score += 20;
    return { href, score };
  }).sort((a, b) => b.score - a.score);

  const best = scored.find((item) => item.score >= 500);
  if (!best) return null;
  try {
    return new URL(best.href, "https://www.cardmarket.com").toString();
  } catch {
    return null;
  }
}

async function fromCardmarketFrance(
  card: InputCard,
  productUrl?: string
): Promise<MarketPayload> {
  if (card.language !== "fr") return emptyPayload();

  const debugBase: NonNullable<MarketPayload["debugCardmarketFr"]> = {
    fetchStatus: "not_started",
    articleRows: 0,
    frNmPrices: [],
    htmlHas210: false,
    htmlHas27899: false,
    stage: "resolve_product_url",
    searchQueries: [],
  };

  let resolvedProductUrl = productUrl;
  if (!resolvedProductUrl) {
    const englishIdentity = await englishMarketIdentity(card);
    const searches = Array.from(new Set([
      [card.name, card.number, card.setName || card.setId].filter(Boolean).join(" "),
      [englishIdentity.name, card.number, englishIdentity.setName || card.setId].filter(Boolean).join(" "),
      [card.name, card.number].filter(Boolean).join(" "),
    ].filter(Boolean)));
    debugBase.searchQueries = searches;

    for (const query of searches) {
      const searchUrl = `https://www.cardmarket.com/fr/Pokemon/Products/Search?searchString=${encodeURIComponent(query)}`;
      const search = await fetchText(searchUrl);
      if (!search.data) {
        debugBase.fetchStatus = `search_${search.status}`;
        continue;
      }
      const found = findCardmarketFranceProductUrl(search.data, card);
      if (found) {
        resolvedProductUrl = found;
        debugBase.fetchStatus = "search_ok";
        break;
      }
      debugBase.fetchStatus = "search_no_match";
    }
  } else {
    debugBase.fetchStatus = "provider_url";
  }

  if (!resolvedProductUrl) {
    const empty = emptyPayload();
    empty.debugCardmarketFr = {
      ...debugBase,
      stage: "product_url_not_resolved",
    };
    return empty;
  }

  const filteredUrl = buildCardmarketFranceUrl(resolvedProductUrl);
  if (!filteredUrl) {
    const empty = emptyPayload();
    empty.debugCardmarketFr = {
      ...debugBase,
      url: resolvedProductUrl,
      stage: "product_url_invalid",
    };
    return empty;
  }

  const result = await fetchText(filteredUrl);
  if (!result.data) {
    const empty = emptyPayload(sourceStatus(result.status));
    empty.debugCardmarketFr = {
      ...debugBase,
      url: filteredUrl,
      fetchStatus: result.status,
      stage: "product_fetch_failed",
    };
    return empty;
  }

  const frenchNmSellerPrices = extractFilteredCardmarketPrices(result.data);
  const articleRows = (result.data.match(/id=["']articleRow/gi) ?? []).length;
  const debugCardmarketFr = {
    ...debugBase,
    url: filteredUrl,
    fetchStatus: result.status,
    articleRows,
    frNmPrices: frenchNmSellerPrices.slice(0, 10),
    htmlHas210: /210[,.]00\s*€/i.test(result.data),
    htmlHas27899: /278[,.]99\s*€/i.test(result.data),
    stage: frenchNmSellerPrices.length ? "fr_nm_found" : "no_fr_nm_article_row",
  };

  if (!frenchNmSellerPrices.length) {
    console.info("[prices][cardmarket-fr]", {
      cardId: card.id,
      productUrl: filteredUrl,
      stage: "no-fr-nm-article-row",
    });
    const empty = emptyPayload();
    empty.debugCardmarketFr = debugCardmarketFr;
    return empty;
  }

  const firstSellerListing = frenchNmSellerPrices[0];
  const sample = frenchNmSellerPrices.slice(0, 25);
  const medianPrice = Number(median(sample).toFixed(2));
  const payload = emptyPayload("available");
  payload.debugCardmarketFr = debugCardmarketFr;
  payload.cardmarket = {
    prices: { frenchNmLow: firstSellerListing },
    url: filteredUrl,
    updatedAt: new Date().toISOString(),
  };

  addQuote(payload, {
    source: "cardmarket",
    label: "Cardmarket · 1re offre vendeurs FR · NM",
    price: firstSellerListing,
    currency: "EUR",
    language: "fr",
    condition: "Near Mint",
    metric: "lowest_listing",
    classification: "exact",
    compatible: true,
    confidence: sample.length >= 3 ? "medium" : "limited",
    url: filteredUrl,
    updatedAt: new Date().toISOString(),
    sampleSize: sample.length,
  });

  if (sample.length >= 3 && medianPrice !== firstSellerListing) {
    addQuote(payload, {
      source: "cardmarket",
      label: "Cardmarket · médiane offres françaises NM",
      price: medianPrice,
      currency: "EUR",
      language: "fr",
      condition: "Near Mint",
      metric: "median",
      classification: "indicative",
      compatible: false,
      confidence: "medium",
      url: filteredUrl,
      updatedAt: new Date().toISOString(),
      sampleSize: sample.length,
    });
  }

  payload.sources.cardmarket = true;
  return payload;
}

function cardmarketAsiaIdentity(card: InputCard): string {
  const set = String(card.setId || "").replace(/[^a-z0-9]/gi, "");
  const number = cleanNumber(card.number).replace(/[^a-z0-9]/gi, "");
  return `${set}${number}`;
}

function stripHtmlText(value: string): string {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&euro;|&#8364;/gi, "€")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function extractCardmarketMarketStats(htmlText: string): {
  trend?: number;
  avg1?: number;
  avg7?: number;
  avg30?: number;
} {
  // Cardmarket exposes the market summary in page metadata. Reading this small
  // text first avoids accidentally interpreting an offer/listing price as Trend.
  const metaDescriptions = Array.from(
    htmlText.matchAll(
      /<meta[^>]+(?:name|property)=["'](?:description|og:description)["'][^>]+content=["']([^"']+)["'][^>]*>/gi
    )
  ).map((match) => match[1]);

  const reverseMetaDescriptions = Array.from(
    htmlText.matchAll(
      /<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["'](?:description|og:description)["'][^>]*>/gi
    )
  ).map((match) => match[1]);

  const text = stripHtmlText(
    [...metaDescriptions, ...reverseMetaDescriptions].join(" ") || htmlText
  );

  const read = (labels: RegExp): number | undefined => {
    const match = text.match(
      new RegExp(
        `${labels.source}\\s*[:\\-]?\\s*(?:€\\s*)?([0-9]{1,6}(?:[.,][0-9]{1,2})?)\\s*€?`,
        "i"
      )
    );
    return match ? parseEuroPrice(match[1]) : undefined;
  };

  return {
    trend: read(/(?:Price Trend|Tendance des prix)/i),
    avg30: read(/(?:30-days average price|Prix moyen 30 jours)/i),
    avg7: read(/(?:7-days average price|Prix moyen 7 jours)/i),
    avg1: read(/(?:1-day average price|Prix moyen 1 jour)/i),
  };
}

function findExactCardmarketProductUrl(searchHtml: string, identity: string): string | null {
  const wanted = normalizedText(identity);
  const hrefRegex = /href=["']([^"']*\/Pokemon\/Products\/Singles\/[^"']+)["']/gi;
  let match: RegExpExecArray | null;
  while ((match = hrefRegex.exec(searchHtml))) {
    const href = match[1].replace(/&amp;/g, "&");
    if (!normalizedText(href).includes(wanted)) continue;
    try {
      return new URL(href, "https://www.cardmarket.com").toString();
    } catch {}
  }
  return null;
}

async function fromCardmarketAsia(card: InputCard): Promise<MarketPayload> {
  if (card.language !== "ja" && card.language !== "zh-tw") return emptyPayload();

  const regionalIdentity = regionalMarketIdentity(card);
  const identities = Array.from(
    new Set([
      `${String(regionalIdentity.setId).replace(/[^a-z0-9]/gi, "")}${String(regionalIdentity.number).replace(/[^a-z0-9]/gi, "")}`,
      ...marketSetIdCandidates(card).map((setId) =>
        `${String(setId).replace(/[^a-z0-9]/gi, "")}${String(regionalIdentity.number).replace(/[^a-z0-9]/gi, "")}`
      ),
    ])
  ).filter((identity) => identity.length >= 4);

  if (!identities.length) return emptyPayload();

  let productUrl: string | null = regionalIdentity.cardmarketUrl || null;
  let identity = identities[0];
  let lastSearchStatus: FetchStatus = "not_found";

  for (const candidateIdentity of productUrl ? [] : identities) {
    const searchUrl =
      `https://www.cardmarket.com/en/Pokemon/Products/Search?searchString=${encodeURIComponent(candidateIdentity)}`;
    const search = await fetchText(searchUrl);
    lastSearchStatus = search.status;
    if (!search.data) continue;

    const candidateUrl = findExactCardmarketProductUrl(
      search.data,
      candidateIdentity
    );
    if (!candidateUrl) continue;

    identity = candidateIdentity;
    productUrl = candidateUrl;
    break;
  }

  if (!productUrl) {
    console.info("[prices][cardmarket-asia]", {
      cardId: card.id,
      identities,
      stage: "product_not_found",
      status: lastSearchStatus,
    });
    return emptyPayload(sourceStatus(lastSearchStatus));
  }

  const product = await fetchText(productUrl);
  if (!product.data) {
    console.info("[prices][cardmarket-asia]", {
      cardId: card.id,
      identity,
      stage: "product",
      status: product.status,
      productUrl,
    });
    return emptyPayload(sourceStatus(product.status));
  }

  const stats = extractCardmarketMarketStats(product.data);
  if (!stats.trend && !stats.avg7 && !stats.avg30 && !stats.avg1) {
    return emptyPayload();
  }

  const payload = emptyPayload("available");
  payload.cardmarket = {
    prices: {
      ...(stats.trend ? { trendPrice: stats.trend } : {}),
      ...(stats.avg1 ? { avg1: stats.avg1 } : {}),
      ...(stats.avg7 ? { avg7: stats.avg7 } : {}),
      ...(stats.avg30 ? { avg30: stats.avg30 } : {}),
    },
    url: productUrl,
    updatedAt: new Date().toISOString(),
  };

  cardmarketQuotes(
    payload,
    payload.cardmarket.prices ?? {},
    card.language === "ja"
      ? " · impression japonaise"
      : " · impression chinoise",
    productUrl,
    new Date().toISOString()
  );
  payload.sources.cardmarket = true;

  console.info("[prices][cardmarket-asia]", {
    cardId: card.id,
    identity,
    productUrl,
    trend: stats.trend,
    avg7: stats.avg7,
  });
  return payload;
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

async function currencyToEur(currency: string): Promise<number> {
  const code = String(currency || "").toUpperCase();
  if (!code || code === "EUR") return 1;
  if (code === "USD") return usdToEur();

  const result = await fetchJson(
    `https://api.frankfurter.app/latest?from=${encodeURIComponent(code)}&to=EUR`
  );
  const parsed = Number(result.data?.rates?.EUR);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
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

function ebayMatchesSpecialPrinting(text: string, printingVariant?: string): boolean {
  if (!requiresExactEbayPrinting(printingVariant)) return true;

  const wanted = normalizedPrinting(printingVariant);
  const haystack = normalizedText(text);

  if (wanted === "masterball") {
    return haystack.includes("masterball");
  }
  if (wanted === "pokeball") {
    return haystack.includes("pokeball") && !haystack.includes("masterball");
  }
  if (wanted === "reverseholofoil" || wanted === "reverse") {
    return haystack.includes("reverse");
  }
  if (wanted === "firstedition") {
    return haystack.includes("firstedition") || haystack.includes("1stedition");
  }

  return haystack.includes(wanted);
}

async function englishMarketIdentity(card: InputCard): Promise<{ name?: string; setName?: string }> {
  if (card.language === "en") return { name: card.name, setName: card.setName };

  const cacheKey = exactCardIds(card)[0] || `${card.setId || ""}:${card.number || ""}`;
  const cached = englishIdentityCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return { name: cached.name, setName: cached.setName };
  }

  for (const id of exactCardIds(card)) {
    const result = await fetchJson(`${TCGDEX}/en/cards/${encodeURIComponent(id)}`);
    if (!result.data?.id) continue;
    const value = {
      name: String(result.data?.name || "").trim() || undefined,
      setName: String(result.data?.set?.name || "").trim() || undefined,
    };
    englishIdentityCache.set(cacheKey, { ...value, expiresAt: Date.now() + POSITIVE_TTL });
    return value;
  }

  const fallback = { name: card.name, setName: card.setName };
  englishIdentityCache.set(cacheKey, { ...fallback, expiresAt: Date.now() + NEGATIVE_TTL });
  return fallback;
}

function ebayAspectEntries(listing: any): Array<{ name: string; value: string }> {
  const raw = Array.isArray(listing?.localizedAspects) ? listing.localizedAspects : [];
  return raw.flatMap((aspect: any) => {
    const name = String(aspect?.name ?? "").trim();
    const value = String(aspect?.value ?? "").trim();
    return name && value ? [{ name, value }] : [];
  });
}

function ebayAspectText(listing: any): string {
  return ebayAspectEntries(listing)
    .map((aspect) => `${aspect.name} ${aspect.value}`)
    .join(" ");
}

function ebayAspectValue(listing: any, names: RegExp): string[] {
  return ebayAspectEntries(listing)
    .filter((aspect) => names.test(normalizedText(aspect.name)))
    .map((aspect) => aspect.value);
}

function ebayStructuredIdentity(listing: any, card: InputCard, searchNames: string[]): {
  exactNumber: boolean;
  matchingName: boolean;
  matchingLanguage: boolean;
  contradictoryLanguage: boolean;
} {
  const numberValues = ebayAspectValue(listing, /(cardnumber|number|numerodecarte|kartennummer)/i);
  const nameValues = ebayAspectValue(listing, /(cardname|character|pokemon|nomdelacarte)/i);
  const languageValues = ebayAspectValue(listing, /(language|langue|sprache)/i);

  const exactNumber = numberValues.some((value) =>
    normalizedNumber(value) === normalizedNumber(card.number)
  );
  const matchingName = nameValues.some((value) =>
    searchNames.some((name) => titleMatchesPokemon(value, name))
  );

  const languageTokens = languageValues.map((value) => normalizedText(value));
  const expected =
    card.language === "zh-tw" ? /(chinese|traditionalchinese|tchinese|chinois|中文|繁體)/i :
    card.language === "ja" ? /(japanese|japonais|日本語)/i :
    card.language === "fr" ? /(french|francais|français)/i :
    /(english|anglais)/i;
  const other =
    card.language === "zh-tw" ? /(japanese|english|french|korean)/i :
    card.language === "ja" ? /(chinese|english|french|korean)/i :
    card.language === "fr" ? /(japanese|chinese|english|korean)/i :
    /(japanese|chinese|french|korean)/i;

  const matchingLanguage = languageTokens.some((value) => expected.test(value));
  const contradictoryLanguage =
    languageTokens.length > 0 &&
    !matchingLanguage &&
    languageTokens.some((value) => other.test(value));

  return { exactNumber, matchingName, matchingLanguage, contradictoryLanguage };
}

async function fromEbay(card: InputCard): Promise<MarketPayload> {
  const token = await getEbayAccessToken();
  if (!token || !card.name || !card.number) return emptyPayload();

  // JP/CN listings are frequently titled with the English Pokémon/set name.
  // Resolve the English identity from the same TCGdex card id only for market
  // discovery; the displayed card remains strictly in its original language.
  const englishIdentity = await englishMarketIdentity(card);
  const searchNames: string[] = Array.from(
    new Set(
      [card.name, englishIdentity.name].filter(
        (value): value is string => Boolean(value && value.trim())
      )
    )
  );
  const searchSets: string[] = Array.from(
    new Set(
      [card.setName || card.setId, englishIdentity.setName].filter(
        (value): value is string => Boolean(value && value.trim())
      )
    )
  );

  const languageKeyword =
    card.language === "fr" ? "français" :
    card.language === "en" ? "English" :
    card.language === "ja" ? "Japanese JP" :
    card.language === "zh-tw" ? "Chinese CN" : "";
  // Normal/Holofoil are the base market product for eBay discovery. Sellers
  // very rarely write "Holofoil" in otherwise valid FR listings, so adding it
  // to the query caused cards that were priced before the printing selector
  // (for example regular alt-art cards) to lose their eBay signal.
  const variantKeyword = requiresExactEbayPrinting(card.printingVariant)
    ? card.printingVariant
    : "";

  const regionalIdentityForEbay = regionalMarketIdentity(card);
  const marketNumber = card.language === "zh-tw" ? regionalIdentityForEbay.number : cleanNumber(card.number);
  const localQuery = [card.name, marketNumber, card.setName || card.setId, variantKeyword, languageKeyword, "Pokemon"]
    .filter(Boolean)
    .join(" ");
  const englishQuery = [englishIdentity.name, marketNumber, englishIdentity.setName, variantKeyword, languageKeyword, "Pokemon"]
    .filter(Boolean)
    .join(" ");

  // V47: eBay search must not depend on a translated set name. Sellers usually
  // write compact identifiers such as "Squirtle 170 sv2a Japanese".
  const marketSetIds = Array.from(
    new Set([regionalIdentityForEbay.setId, ...marketSetIdCandidates(card)].filter(Boolean))
  );
  const compactEnglishQueries = marketSetIds.map((marketSetId) =>
    [englishIdentity.name, marketNumber, marketSetId, variantKeyword, languageKeyword]
      .filter(Boolean)
      .join(" ")
  );
  const setNumberQueries = marketSetIds.map((marketSetId) =>
    [marketSetId, marketNumber, variantKeyword, languageKeyword, "Pokemon"]
      .filter(Boolean)
      .join(" ")
  );
  const simpleEnglishQuery = [englishIdentity.name, marketNumber, variantKeyword, languageKeyword, "Pokemon"]
    .filter(Boolean)
    .join(" ");
  const simpleLocalQuery = [card.name, marketNumber, variantKeyword, "Pokemon"]
    .filter(Boolean)
    .join(" ");
  const simpleEnglishNoLanguageQuery = [englishIdentity.name, marketNumber, variantKeyword, "Pokemon"]
    .filter(Boolean)
    .join(" ");
  const compactLocalQueries = marketSetIds.map((marketSetId) =>
    [card.name, marketNumber, marketSetId, variantKeyword]
      .filter(Boolean)
      .join(" ")
  );

  const queries = Array.from(
    new Set(
      (card.language === "ja" || card.language === "zh-tw"
        ? [...compactEnglishQueries, simpleEnglishQuery, ...setNumberQueries, englishQuery, localQuery]
        : card.language === "fr"
          // V54: FR discovery must tolerate seller titles that omit the set name
          // or the word "français". Identity/language/printing are validated below.
          ? [localQuery, ...compactLocalQueries, simpleLocalQuery, simpleEnglishNoLanguageQuery, englishQuery]
          : [localQuery, englishQuery]
      ).filter(Boolean)
    )
  ).slice(0, card.language === "ja" || card.language === "zh-tw" ? 5 : card.language === "fr" ? 5 : 2);

  const configuredMarketplace = process.env.EBAY_MARKETPLACE_ID || "EBAY_FR";
  // V46: FR remains strictly on EBAY_FR. Asian cards are also searched on the
  // international US marketplace, where JP/CN singles are far more numerous.
  const marketplaces = card.language === "ja" || card.language === "zh-tw"
    ? Array.from(new Set(["EBAY_US", configuredMarketplace]))
    : [configuredMarketplace];

  const fetched = await Promise.all(
    marketplaces.flatMap((marketplaceId) =>
      queries.map(async (query) => {
        const params = new URLSearchParams({
          q: query,
          limit: "100",
          fieldgroups: "EXTENDED",
        });
        return {
          query,
          marketplaceId,
          result: await fetchJson(
            `https://api.ebay.com/buy/browse/v1/item_summary/search?${params.toString()}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                "X-EBAY-C-MARKETPLACE-ID": marketplaceId,
                "Accept-Language": card.language === "fr" ? "fr-FR" : "en-US",
              },
            }
          ),
        };
      })
    )
  );

  const successful = fetched.filter((item) => item.result.data);
  if (!successful.length) {
    const status = fetched.some((item) => item.result.status === "rate_limited")
      ? "rate_limited"
      : fetched.some((item) => item.result.status === "unavailable")
        ? "unavailable"
        : "not_found";
    return emptyPayload(sourceStatus(status));
  }

  const listings = Array.from(new Map(
    successful
      .flatMap((item) => Array.isArray(item.result.data?.itemSummaries) ? item.result.data.itemSummaries : [])
      .map((listing: any) => [String(listing?.itemId || listing?.itemWebUrl || listing?.title || Math.random()), listing])
  ).values());
  const query = successful[0]?.query || queries[0] || localQuery;

  const exactLanguageNm: Array<{ price: number; url?: string }> = [];
  const exactLanguageRaw: Array<{ price: number; url?: string }> = [];

  let listingsForMatching: any[] = listings;

  // CN only: enrich a bounded list of eBay summaries with full item details.
  // JP keeps the exact V47 matching path that was already validated.
  if (card.language === "zh-tw") {
    const normalizedMarketSetIds = marketSetIdCandidates(card)
      .map((value) => normalizedSet(value))
      .filter(Boolean);
    const candidateSummaries = listings
      .filter((listing: any) => {
        const title = String(listing?.title ?? "");
        const normalizedTitle = normalizedText(title);
        return (
          titleHasExactNumber(title, marketNumber) ||
          normalizedMarketSetIds.some((setId) => normalizedTitle.includes(setId)) ||
          searchNames.some((name) => titleMatchesPokemon(title, name))
        );
      })
      .slice(0, 30);

    const detailed = await Promise.all(
      candidateSummaries.map(async (listing: any) => {
        const itemId = String(listing?.itemId ?? "").trim();
        if (!itemId) return listing;

        const marketplaceId =
          String(listing?.listingMarketplaceId || "").trim() ||
          configuredMarketplace;

        const detailResult = await fetchJson(
          `https://api.ebay.com/buy/browse/v1/item/${encodeURIComponent(itemId)}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "X-EBAY-C-MARKETPLACE-ID": marketplaceId,
              "Accept-Language": "en-US",
            },
          }
        );

        return detailResult.data
          ? { ...listing, ...detailResult.data }
          : listing;
      })
    );

    const byId = new Map<string, any>();
    listings.forEach((listing: any) => {
      const key = String(listing?.itemId || listing?.itemWebUrl || listing?.title || "");
      if (key) byId.set(key, listing);
    });
    detailed.forEach((listing: any) => {
      const key = String(listing?.itemId || listing?.itemWebUrl || listing?.title || "");
      if (key) byId.set(key, listing);
    });
    listingsForMatching = Array.from(byId.values());
  }

  for (const listing of listingsForMatching) {
    const title = String(listing?.title ?? "");

    if (card.language === "ja") {
      // Exact V47 Japanese matching behavior.
      if (!title || isGradedOrNonCard(title)) continue;
      if (!titleHasExactNumber(title, card.number)) continue;

      const language = explicitLanguage(title);
      const normalizedTitle = normalizedText(title);
      const normalizedSetNames = searchSets
        .map((value) => normalizedText(value))
        .filter((value) => value.length >= 4);
      const normalizedSetId = normalizedSet(card.setId);
      const hasExactSetName = normalizedSetNames.some((setName) =>
        normalizedTitle.includes(setName)
      );
      const hasExactSetCode = Boolean(
        normalizedSetId && normalizedTitle.includes(normalizedSetId)
      );
      const hasPokemonName = searchNames.some((name) =>
        titleMatchesPokemon(title, name)
      );

      if (!hasPokemonName) {
        if (language !== card.language || !hasExactSetCode) continue;
      }

      if (language !== card.language) {
        if (language !== "unknown" || !hasExactSetName) continue;
      }
    } else {
      // CN (and non-JP fallback): use structured item details when available.
      const aspectsText = ebayAspectText(listing);
      const identityText = `${title} ${aspectsText}`.trim();
      if (!identityText || isGradedOrNonCard(identityText)) continue;

      const marketCardForIdentity: InputCard =
        card.language === "zh-tw"
          ? {
              ...card,
              setId: regionalIdentityForEbay.setId,
              number: regionalIdentityForEbay.number,
              setName: regionalIdentityForEbay.setName || card.setName,
            }
          : card;
      const structured = ebayStructuredIdentity(listing, marketCardForIdentity, searchNames);
      const exactNumberInText = titleHasExactNumber(identityText, marketCardForIdentity.number);
      if (!exactNumberInText && !structured.exactNumber) continue;

      const language = explicitLanguage(identityText);
      const normalizedIdentity = normalizedText(identityText);
      const normalizedSetNames = searchSets
        .map((value) => normalizedText(value))
        .filter((value) => value.length >= 4);
      const normalizedMarketSetIds = Array.from(
        new Set([regionalIdentityForEbay.setId, ...marketSetIdCandidates(card)].filter(Boolean))
      )
        .map((value) => normalizedSet(value))
        .filter(Boolean);
      const hasExactSetName = normalizedSetNames.some((setName) =>
        normalizedIdentity.includes(setName)
      );
      const hasExactSetCode = normalizedMarketSetIds.some((setId) =>
        normalizedIdentity.includes(setId)
      );
      const hasPokemonName =
        searchNames.some((name) => titleMatchesPokemon(identityText, name)) ||
        structured.matchingName;

      if (!hasPokemonName) {
        if (
          card.language !== "zh-tw" ||
          !(structured.exactNumber &&
            (structured.matchingLanguage || language === card.language)) ||
          !(hasExactSetCode || hasExactSetName)
        ) {
          continue;
        }
      }

      if (structured.contradictoryLanguage) continue;

      if (language !== card.language) {
        if (
          language !== "unknown" ||
          !(structured.matchingLanguage || hasExactSetName || hasExactSetCode)
        ) {
          continue;
        }
      }
    }

    const printingIdentityText = `${title} ${ebayAspectText(listing)}`.trim();
    if (!ebayMatchesSpecialPrinting(printingIdentityText, card.printingVariant)) continue;

    const currency = String(listing?.price?.currency ?? "").toUpperCase();
    const value = numberValue(listing?.price?.value);
    if (!value || !currency) continue;

    const fx = await currencyToEur(currency);
    if (!fx) continue;

    const item = {
      price: Number((value * fx).toFixed(2)),
      url: listing?.itemWebUrl,
    };

    exactLanguageRaw.push(item);
    const conditionText =
      `${title} ${ebayAspectText(listing)} ${String(listing?.condition ?? "")}`;
    if (
      isNearMintTitle(conditionText) ||
      /near\s*mint|\bnm\b/i.test(conditionText)
    ) {
      exactLanguageNm.push(item);
    }
  }

  const selectedRaw = exactLanguageNm.length
    ? exactLanguageNm
    : exactLanguageRaw;
  const robustSelected = robustEbaySample(selectedRaw);
  const selected = robustSelected.items;

  if (card.language === "ja" || card.language === "zh-tw") {
    console.info("[prices][ebay-asia]", {
      cardId: card.id,
      language: card.language,
      setId: card.setId,
      number: card.number,
      queries,
      marketplaces,
      fetchedListings: listings.length,
      acceptedRaw: exactLanguageRaw.length,
      acceptedNearMint: exactLanguageNm.length,
      selectedBeforeOutliers: selectedRaw.length,
      selectedAfterOutliers: selected.length,
    });
  }

  if (!selected.length) return emptyPayload();

  const price = robustSelected.average || robustSelected.median;
  const exactNm = exactLanguageNm.length > 0;
  const searchHost = card.language === "ja" || card.language === "zh-tw"
    ? "https://www.ebay.com/sch/i.html"
    : "https://www.ebay.fr/sch/i.html";
  const searchUrl = `${searchHost}?_nkw=${encodeURIComponent(query)}`;

  const payload = emptyPayload("available");
  payload.ebayListings = {
    median: robustSelected.median,
    average: price,
    sampleSize: selected.length,
    rawSampleSize: selectedRaw.length,
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
      ? `eBay · moyenne robuste annonces actives ${card.language?.toUpperCase()} NM`
      : `eBay · moyenne robuste annonces actives ${card.language?.toUpperCase()} non gradées`,
    price,
    currency: "EUR",
    language: card.language ?? "en",
    condition: exactNm ? "Near Mint" : "Unknown",
    metric: "active_listing_average",
    // For JP/CN, exact-language ungraded listings remain useful when NM is not
    // stated explicitly. They can contribute with limited confidence because
    // the identity checks above are strict (number + Pokémon + language/set).
    classification: exactNm
      ? "exact"
      : (card.language === "fr" || card.language === "ja" || card.language === "zh-tw")
        ? "comparable"
        : "indicative",
    // V54: exact card identity + non-contradictory language is sufficient for
    // an active eBay listing to contribute even when the seller did not state NM.
    // Such listings stay limited-confidence and are never labelled as sold prices.
    compatible: exactNm || (
      (card.language === "fr" || card.language === "ja" || card.language === "zh-tw") &&
      selected.length >= 1
    ),
    confidence:
      exactNm && selected.length >= 5
        ? "high"
        : exactNm && selected.length >= 3
          ? "medium"
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
    // V49: TCGplayer has a dedicated Pokemon Japan catalog. TCGdex can expose
    // those prices on Japanese card payloads, so do not discard them as EN-only.
    if (tcgplayer && (card.language === "en" || card.language === "ja")) {
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
            label: card.language === "ja"
              ? "TCGPlayer Japan · Market via TCGdex"
              : "TCGPlayer Market via TCGdex",
            price: Number(median(values).toFixed(2)),
            currency: "EUR",
            language: card.language === "ja" ? "ja" : "en",
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

function tcgCsvExtendedValue(product: any, key: string): string {
  const values = Array.isArray(product?.extendedData) ? product.extendedData : [];
  const item = values.find((entry: any) =>
    normalizedText(entry?.name) === normalizedText(key) ||
    normalizedText(entry?.displayName) === normalizedText(key)
  );
  return String(item?.value || "").trim();
}

function tcgCsvPrintingKey(value?: string): string {
  const clean = normalizedText(value);
  if (clean.includes("masterball")) return "masterball";
  if (clean.includes("pokeball")) return "pokeball";
  if (clean.includes("reverse")) return "reverse";
  if (clean === "foil" || clean.includes("holo")) return "holofoil";
  if (clean.includes("firstedition")) return "firstedition";
  if (clean.includes("normal")) return "normal";
  return clean;
}

async function tcgCsvJapanGroups(): Promise<any[]> {
  if (tcgCsvJapanGroupsCache && tcgCsvJapanGroupsCache.expiresAt > Date.now()) {
    return tcgCsvJapanGroupsCache.groups;
  }
  const result = await fetchJson(
    `${TCGCSV}/${TCGCSV_JAPAN_CATEGORY_ID}/groups`,
    { headers: { "User-Agent": "King_TCG/5.0" } }
  );
  const groups = Array.isArray(result.data?.results) ? result.data.results : [];
  if (groups.length) {
    tcgCsvJapanGroupsCache = { expiresAt: Date.now() + TCGCSV_TTL, groups };
  }
  return groups;
}

async function tcgCsvJapanGroupData(groupId: number): Promise<{ products: any[]; prices: any[] }> {
  const cached = tcgCsvJapanGroupCache.get(groupId);
  if (cached && cached.expiresAt > Date.now()) {
    return { products: cached.products, prices: cached.prices };
  }
  const [productsResult, pricesResult] = await Promise.all([
    fetchJson(`${TCGCSV}/${TCGCSV_JAPAN_CATEGORY_ID}/${groupId}/products`, {
      headers: { "User-Agent": "King_TCG/5.0" },
    }),
    fetchJson(`${TCGCSV}/${TCGCSV_JAPAN_CATEGORY_ID}/${groupId}/prices`, {
      headers: { "User-Agent": "King_TCG/5.0" },
    }),
  ]);
  const products = Array.isArray(productsResult.data?.results) ? productsResult.data.results : [];
  const prices = Array.isArray(pricesResult.data?.results) ? pricesResult.data.results : [];
  if (products.length) {
    tcgCsvJapanGroupCache.set(groupId, {
      expiresAt: Date.now() + TCGCSV_TTL,
      products,
      prices,
    });
  }
  return { products, prices };
}

async function fromTcgCsvJapan(card: InputCard): Promise<MarketPayload> {
  if (card.language !== "ja" || !card.setId || !card.number) return emptyPayload();

  const groups = await tcgCsvJapanGroups();
  if (!groups.length) return emptyPayload("source_unavailable");

  const expectedSet = normalizedSet(card.setId);
  const expectedName = normalizedText(card.setName);
  let bestGroup: any = null;
  let bestGroupScore = -1;
  for (const group of groups) {
    const abbreviation = normalizedSet(group?.abbreviation);
    const groupName = normalizedText(group?.name);
    let score = 0;
    if (expectedSet && abbreviation === expectedSet) score += 12;
    if (expectedSet && groupName.startsWith(expectedSet)) score += 10;
    if (expectedSet && groupName.includes(expectedSet)) score += 6;
    if (expectedName && groupName.includes(expectedName)) score += 4;
    if (score > bestGroupScore) {
      bestGroupScore = score;
      bestGroup = group;
    }
  }
  if (!bestGroup || bestGroupScore < 6) {
    console.info("[prices][tcgcsv-japan]", {
      cardId: card.id,
      stage: "group_not_found",
      setId: card.setId,
      setName: card.setName,
    });
    return emptyPayload();
  }

  const groupId = Number(bestGroup.groupId);
  if (!Number.isFinite(groupId)) return emptyPayload();
  const { products, prices } = await tcgCsvJapanGroupData(groupId);
  const expectedNumber = normalizedNumber(card.number);
  const candidates = products.filter((product: any) =>
    normalizedNumber(tcgCsvExtendedValue(product, "Number")) === expectedNumber
  );
  if (!candidates.length) {
    console.info("[prices][tcgcsv-japan]", {
      cardId: card.id,
      stage: "product_not_found",
      groupId,
      number: card.number,
    });
    return emptyPayload();
  }

  const wantedPrinting = tcgCsvPrintingKey(card.printingVariant);
  const variantTerms = (product: any) =>
    tcgCsvPrintingKey(`${product?.name || ""} ${product?.cleanName || ""}`);

  const scoredProducts = candidates
    .map((product: any) => {
      const descriptor = variantTerms(product);
      let score = 0;
      if (wantedPrinting && descriptor.includes(wantedPrinting)) score += 8;
      if (wantedPrinting === "normal" && !/(masterball|pokeball|reverse)/i.test(descriptor)) score += 3;
      return { product, score };
    })
    .sort((a: any, b: any) => b.score - a.score);

  const selectedProduct = scoredProducts[0]?.product;
  if (!selectedProduct) return emptyPayload();
  const productId = Number(selectedProduct.productId);
  const productPrices = prices.filter((price: any) => Number(price?.productId) === productId);
  const usable = productPrices.filter((price: any) => numberValue(price?.marketPrice ?? price?.midPrice));
  if (!usable.length) return emptyPayload();

  const exactPrintingRows = wantedPrinting
    ? usable.filter((price: any) => tcgCsvPrintingKey(price?.subTypeName).includes(wantedPrinting))
    : [];
  const rows = exactPrintingRows.length ? exactPrintingRows : usable;
  const preferred = rows.find((price: any) => /holofoil/i.test(String(price?.subTypeName || ""))) ?? rows[0];
  const usd = numberValue(preferred?.marketPrice ?? preferred?.midPrice);
  if (!usd) return emptyPayload();

  const rate = await usdToEur();
  const price = Number((usd * rate).toFixed(2));
  const payload = emptyPayload("available");
  const priceMap: Record<string, any> = {};
  for (const row of usable) {
    const market = numberValue(row?.marketPrice);
    const low = numberValue(row?.lowPrice);
    if (!market && !low) continue;
    const key = String(row?.subTypeName || "market")
      .replace(/\s+/g, "")
      .replace(/^./, (letter) => letter.toLowerCase());
    priceMap[key] = {
      ...(market ? { market: Number((market * rate).toFixed(2)) } : {}),
      ...(low ? { low: Number((low * rate).toFixed(2)) } : {}),
    };
  }
  payload.tcgplayer = {
    prices: priceMap,
    currency: "EUR",
    url: selectedProduct?.url,
    updatedAt: selectedProduct?.modifiedOn,
  };
  addQuote(payload, {
    source: "tcgplayer",
    label: `TCGPlayer Japan · ${String(preferred?.subTypeName || card.printingVariant || "Market")}`,
    price,
    currency: "EUR",
    language: "ja",
    condition: "Near Mint",
    metric: "market",
    classification: "exact",
    compatible: true,
    confidence: "high",
    url: selectedProduct?.url,
    updatedAt: selectedProduct?.modifiedOn,
  });
  payload.sources.tcgplayer = true;
  console.info("[prices][tcgcsv-japan]", {
    cardId: card.id,
    groupId,
    productId,
    printing: card.printingVariant,
    subtype: preferred?.subTypeName,
    marketUsd: usd,
    marketEur: price,
  });
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
  if (!apiKey || !card.number) return emptyPayload();
  // JustTCG has a dedicated Pokémon Japan catalogue. Do not use the generic
  // Pokémon game as if it were a Simplified-Chinese price source: that can
  // attach an EN/other-language product with the same local number.
  if (card.language === "zh-tw") return emptyPayload();
  const game = card.language === "ja" ? "pokemon-japan" : "pokemon";
  const number = cleanNumber(card.number);
  const queries = Array.from(new Set(["", card.setId, card.setName, card.name].map((v) => String(v ?? "").trim())));
  const expectedNumber = normalizedNumber(card.number);
  const expectedSetId = normalizedSet(card.setId);
  const expectedSetName = normalizedText(card.setName);
  const expectedName = normalizedText(card.name);
  let bestItem: any = null;
  let bestScore = -1;
  let lastStatus: FetchStatus = "not_found";

  for (const query of queries) {
    const params = new URLSearchParams({ game, number, condition: "Near Mint", limit: "100", include_price_history: "false", include_statistics: "false" });
    if (query) params.set("q", query);
    const result = await fetchJson(`${JUSTTCG}/cards?${params.toString()}`, { headers: { "x-api-key": apiKey } });
    lastStatus = result.status;
    const list = Array.isArray(result.data?.data) ? result.data.data : [];
    for (const candidate of list) {
      if (normalizedNumber(candidate?.number) !== expectedNumber) continue;
      const rawFields = [candidate?.set_code, candidate?.set_id, candidate?.set?.id, candidate?.set, candidate?.set_name, candidate?.set?.name, candidate?.id];
      const setFields = rawFields.map((v) => normalizedSet(String(v ?? ""))).filter(Boolean);
      const textFields = [candidate?.set, candidate?.set_name, candidate?.set?.name].map((v) => normalizedText(String(v ?? ""))).filter(Boolean);
      let score = 0;
      if (expectedSetId && setFields.some((field) => field === expectedSetId || field.includes(expectedSetId))) score += 6;
      if (expectedSetName && textFields.some((field) => field === expectedSetName)) score += 5;
      if (expectedSetName && textFields.some((field) => field.includes(expectedSetName) || expectedSetName.includes(field))) score += 3;
      if (expectedName && normalizedText(candidate?.name) === expectedName) score += 2;
      if (score > bestScore) { bestScore = score; bestItem = candidate; }
    }
    if (bestScore >= 5 || result.status === "rate_limited") break;
  }
  // A number alone is never enough for Asian sets: identical local numbers
  // occur across many expansions. Require a real set/name identity match.
  if (!bestItem || bestScore < 5) return emptyPayload(sourceStatus(lastStatus));
  const expectedLanguage = expectedJustTcgLanguage(card.language);
  const wantedPrinting = tcgCsvPrintingKey(card.printingVariant);
  const variants = (Array.isArray(bestItem.variants) ? bestItem.variants : []).filter((variant: any) => {
    const condition = normalizedText(variant?.condition);
    if (condition !== "nearmint" && condition !== "nm") return false;
    if (numberValue(variant?.price) === undefined) return false;
    const variantLanguage = normalizedText(variant?.language);
    if (variantLanguage && !variantLanguage.includes(normalizedText(expectedLanguage))) return false;
    if (!variantLanguage && card.language !== "ja" && card.language !== "en") return false;

    if (wantedPrinting) {
      const printing = tcgCsvPrintingKey(variant?.printing);
      if (printing && printing !== wantedPrinting && !printing.includes(wantedPrinting)) return false;
    }
    return true;
  });
  if (!variants.length) return emptyPayload();
  const rate = await usdToEur();
  const values = variants.map((v: any): number | undefined => numberValue(v?.price))
    .filter((v: number | undefined): v is number => v !== undefined)
    .map((v: number) => Number((v * rate).toFixed(2)));
  if (!values.length) return emptyPayload();
  const price = Number(median(values).toFixed(2));
  const payload = emptyPayload("available");
  payload.justtcg = { medianNearMint: price, language: expectedLanguage, printing: String(variants[0]?.printing ?? ""), sampleSize: variants.length, url: bestItem.url, updatedAt: bestItem.updatedAt ?? bestItem.lastUpdated };
  addQuote(payload, { source: "justtcg", label: `JustTCG médiane NM (${expectedLanguage})`, price, currency: "EUR", language: card.language ?? "en", condition: "Near Mint", metric: "median", classification: "exact", compatible: true, confidence: variants.length >= 3 ? "medium" : "limited", url: bestItem.url, updatedAt: bestItem.updatedAt ?? bestItem.lastUpdated, sampleSize: variants.length });
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
  const expectedSetCodes = marketSetIdCandidates(card)
    .map((value) => normalizedSet(value))
    .filter(Boolean);
  const candidateSetName = normalizedText(info.set_name);
  const expectedSetName = normalizedText(card.setName);
  const sameSet =
    candidateSetCode && expectedSetCodes.length
      ? expectedSetCodes.includes(candidateSetCode)
      : !expectedSetName ||
        candidateSetName === expectedSetName ||
        candidateSetName.includes(expectedSetName) ||
        expectedSetName.includes(candidateSetName);
  if (!sameSet) return false;

  const imageLanguages = Array.isArray(candidate?.images?.languages)
    ? candidate.images.languages.map((value: unknown) => String(value).toLowerCase())
    : [];
  if (imageLanguages.length) {
    if (card.language === "fr" && !imageLanguages.includes("fr")) return false;
    if (card.language === "ja" && !imageLanguages.some((v: string) => v === "ja" || v === "jap")) return false;
    if (card.language === "zh-tw") {
      // PokéWallet documents "en" as the default/original artwork marker,
      // including regional/Japanese products. Do not reject a proven CN set
      // merely because images.languages is ["en"].
    }
  }
  return true;
}

function fromEmbeddedMarket(card: InputCard): MarketPayload {
  const payload = emptyPayload();
  const cm = card.embeddedCardmarket;
  const tcg = card.embeddedTcgplayer;

  if (cm?.prices && typeof cm.prices === "object") {
    const prices = cm.prices as Record<string, any>;
    const current = numberValue(prices.trendPrice ?? prices.averageSellPrice ?? prices.avg7 ?? prices.avg30 ?? prices.lowPrice);
    if (current) {
      payload.cardmarket = { prices, url: cm.url, updatedAt: cm.updatedAt };
      addQuote(payload, {
        source: "cardmarket",
        label: card.language === "zh-tw" ? "Cardmarket · impression chinoise · données du set PokéWallet" : "Cardmarket · données embarquées",
        price: current,
        currency: "EUR",
        language: card.language ?? "en",
        condition: "Near Mint",
        metric: "trend_europe",
        classification: "exact",
        compatible: true,
        confidence: "high",
        url: cm.url,
        updatedAt: cm.updatedAt,
      });
    }
  }

  if (tcg?.prices && typeof tcg.prices === "object") {
    const values: number[] = [];
    for (const raw of Object.values(tcg.prices as Record<string, any>)) {
      const value = numberValue((raw as any)?.market ?? (raw as any)?.mid ?? (raw as any)?.low);
      if (value) values.push(value);
    }
    if (values.length) {
      payload.tcgplayer = { prices: tcg.prices, url: tcg.url, updatedAt: tcg.updatedAt, currency: "EUR" };
      addQuote(payload, {
        source: "tcgplayer",
        label: card.language === "zh-tw" ? "TCGPlayer · impression chinoise · données du set PokéWallet" : "TCGPlayer · données embarquées",
        price: Number(median(values).toFixed(2)),
        currency: "EUR",
        language: card.language ?? "en",
        condition: "Near Mint",
        metric: "market",
        classification: "exact",
        compatible: true,
        confidence: "high",
        url: tcg.url,
        updatedAt: tcg.updatedAt,
      });
    }
  }

  payload.sources.cardmarket = Boolean(payload.cardmarket);
  payload.sources.tcgplayer = Boolean(payload.tcgplayer);
  payload.status = payload.quotes.length ? "available" : "not_listed";
  return payload;
}

/**
 * TCGdex peut attacher des cotations directement a une impression physique
 * (Reverse, Poke Ball, Master Ball...). Elles ne doivent jamais contaminer le
 * prix Normal/Holo deja valide : cette source reste donc strictement reservee
 * aux impressions speciales selectionnees par l'utilisateur.
 */
async function fromEmbeddedVariantMarket(card: InputCard): Promise<MarketPayload> {
  if (!isSpecialPrinting(card.printingVariant) || !card.variantPricing) {
    return emptyPayload();
  }

  const payload = emptyPayload();
  const printing = String(card.printingVariant || "Variante");
  const regionalSuffix = card.language === "ja"
    ? " · impression japonaise"
    : card.language === "zh-tw"
      ? " · impression chinoise"
      : "";

  const rawCardmarket = card.variantPricing.cardmarket;
  if (rawCardmarket && typeof rawCardmarket === "object") {
    const nested = rawCardmarket.prices;
    const source = nested && typeof nested === "object"
      ? nested as Record<string, unknown>
      : rawCardmarket;
    const prices: Record<string, number> = {};
    const assign = (key: string, ...candidates: unknown[]) => {
      const value = candidates.map(numberValue).find((candidate) => candidate !== undefined);
      if (value !== undefined) prices[key] = value;
    };

    assign("trendPrice", source.trendPrice, source.trend);
    assign("averageSellPrice", source.averageSellPrice, source.average, source.avg);
    assign("lowPrice", source.lowPrice, source.low);
    assign("avg1", source.avg1, source.average1, source.avg1d);
    assign("avg7", source.avg7, source.average7, source.avg7d);
    assign("avg30", source.avg30, source.average30, source.avg30d);

    const selected = [
      ["trendPrice", "trend_europe"],
      ["averageSellPrice", "average_europe"],
      ["avg7", "average_7d_europe"],
      ["avg30", "average_30d_europe"],
      ["lowPrice", "lowest_europe"],
    ].find(([key]) => numberValue(prices[key]));

    if (selected) {
      const [key, metric] = selected;
      const price = numberValue(prices[key]);
      const url = typeof rawCardmarket.url === "string"
        ? rawCardmarket.url
        : card.variantCardmarketId
          ? `https://www.cardmarket.com/fr/Pokemon/Products/Singles?idProduct=${card.variantCardmarketId}`
          : undefined;
      const updatedAt = typeof rawCardmarket.updatedAt === "string"
        ? rawCardmarket.updatedAt
        : typeof rawCardmarket.updated === "string"
          ? rawCardmarket.updated
          : undefined;

      payload.cardmarket = { prices, url, updatedAt };
      addQuote(payload, {
        source: "cardmarket",
        label: `Cardmarket · ${printing} via TCGdex${regionalSuffix}`,
        price: price!,
        currency: "EUR",
        language: "multi",
        condition: "Unknown",
        metric: metric as MarketQuote["metric"],
        classification: "exact",
        compatible: false,
        confidence: "medium",
        url,
        updatedAt,
      });
    }
  }

  const rawTcgplayer = card.variantPricing.tcgplayer;
  if (rawTcgplayer && typeof rawTcgplayer === "object") {
    const nested = rawTcgplayer.prices;
    const source = nested && typeof nested === "object"
      ? nested as Record<string, unknown>
      : rawTcgplayer;
    const unit = String(rawTcgplayer.unit || rawTcgplayer.currency || "USD").toUpperCase();
    const rate = unit === "EUR" ? 1 : await usdToEur();
    const prices: Record<string, Record<string, number>> = {};
    const values: number[] = [];

    for (const [key, raw] of Object.entries(source)) {
      if (!raw || typeof raw !== "object") continue;
      const record = raw as Record<string, unknown>;
      const market = numberValue(record.marketPrice ?? record.market ?? record.midPrice ?? record.mid);
      const low = numberValue(record.lowPrice ?? record.low);
      const normalized: Record<string, number> = {};
      if (market) {
        normalized.market = Number((market * rate).toFixed(2));
        values.push(normalized.market);
      }
      if (low) normalized.low = Number((low * rate).toFixed(2));
      if (Object.keys(normalized).length) prices[key] = normalized;
    }

    if (values.length) {
      const url = typeof rawTcgplayer.url === "string"
        ? rawTcgplayer.url
        : card.variantTcgplayerId
          ? `https://www.tcgplayer.com/product/${card.variantTcgplayerId}`
          : undefined;
      const updatedAt = typeof rawTcgplayer.updatedAt === "string"
        ? rawTcgplayer.updatedAt
        : typeof rawTcgplayer.updated === "string"
          ? rawTcgplayer.updated
          : undefined;
      const quoteLanguage: CardLanguage = card.language === "ja" ? "ja" : "en";

      payload.tcgplayer = { prices, url, updatedAt, currency: "EUR" };
      addQuote(payload, {
        source: "tcgplayer",
        label: `TCGPlayer · ${printing} via TCGdex${regionalSuffix}`,
        price: Number(median(values).toFixed(2)),
        currency: "EUR",
        language: quoteLanguage,
        condition: "Near Mint",
        metric: "market",
        classification: "exact",
        compatible: card.language === "en" || card.language === "ja",
        confidence: "medium",
        url,
        updatedAt,
        sampleSize: values.length,
      });
    }
  }

  payload.sources.cardmarket = Boolean(payload.cardmarket);
  payload.sources.tcgplayer = Boolean(payload.tcgplayer);
  payload.status = payload.quotes.length ? "available" : "not_listed";
  return payload;
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

  // Regional catalogue cards already carry the unique PokéWallet card id.
  // Resolve that exact variant first instead of searching by name/number.
  if (card.providerId) {
    const suffix = card.setId ? `?set_code=${encodeURIComponent(card.setId)}` : "";
    const direct = await fetchJson(
      `${POKEWALLET}/cards/${encodeURIComponent(card.providerId)}${suffix}`,
      { headers: { "X-API-Key": apiKey } }
    );
    lastStatus = direct.status;
    if (direct.data && direct.status === "ok") item = direct.data;
  }

  for (const query of item ? [] : queries) {
    const result = await fetchJson(
      `${POKEWALLET}/search?q=${encodeURIComponent(query)}&limit=100`,
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
    (card.language === "zh-tw");

  const wantedPrinting = normalizedPrinting(card.printingVariant);
  const cmPrices = (Array.isArray(item?.cardmarket?.prices)
    ? item.cardmarket.prices
    : []
  ).filter((variant: any) => {
    if (!wantedPrinting || wantedPrinting === "normal") return true;
    const candidatePrinting = normalizedPrinting(
      variant?.variant || variant?.printing || variant?.name || variant?.type
    );
    return Boolean(
      candidatePrinting &&
      (candidatePrinting === wantedPrinting ||
        candidatePrinting.includes(wantedPrinting) ||
        wantedPrinting.includes(candidatePrinting))
    );
  });
  const preferredCm =
    cmPrices.find((price: any) => String(price?.variant_type).toLowerCase() === "holo") ??
    cmPrices.find((price: any) => String(price?.variant_type).toLowerCase() === "normal") ??
    cmPrices[0];
  const cardmarketValue = numberValue(
    preferredCm?.trend ?? preferredCm?.avg ?? preferredCm?.low
  );

  if (cardmarketValue && (card.language === "en" || card.language === "fr" || languageCompatible)) {
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
      card.language === "ja"
        ? " · impression japonaise via PokéWallet"
        : card.language === "zh-tw"
          ? " · impression chinoise via PokéWallet"
          : " via PokéWallet",
      item.cardmarket?.product_url,
      preferredCm?.updated_at
    );
  }

  if (
    (card.language === "en" || (card.language === "ja" && languageCompatible)) &&
    Array.isArray(item?.tcgplayer?.prices)
  ) {
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
          label: card.language === "ja"
            ? "TCGPlayer Japan via PokéWallet"
            : "TCGPlayer via PokéWallet",
          price: Number(median(values).toFixed(2)),
          currency: "EUR",
          language: card.language === "ja" ? "ja" : "en",
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
    if (part.debugCardmarketFr) merged.debugCardmarketFr = part.debugCardmarketFr;

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

function calculateEstimate(payload: MarketPayload, language: CardLanguage): MarketPayload["estimate"] {
  const compatibleInitial = payload.quotes.filter(
    (quote) => quote.compatible && quote.language === language && quote.price > 0
  );

  // FR: the exact French NM Cardmarket listing is the anchor. A lone eBay
  // listing several times above/below that price is not enough to move King_TCG.
  const frenchCardmarketAnchor = language === "fr"
    ? compatibleInitial.find(
        (quote) =>
          quote.source === "cardmarket" &&
          quote.metric === "lowest_listing" &&
          quote.classification === "exact" &&
          quote.condition === "Near Mint"
      )
    : undefined;

  const compatible = compatibleInitial.filter((quote) => {
    if (!frenchCardmarketAnchor || quote.source !== "ebay") return true;
    const ratio = quote.price / frenchCardmarketAnchor.price;
    const sampleSize = Number(quote.sampleSize || 0);
    if (sampleSize <= 2 && (ratio > 2.5 || ratio < 0.4)) return false;
    if (ratio > 4 || ratio < 0.2) return false;
    return true;
  });
  const exactAsianRegional =
    (language === "ja" || language === "zh-tw")
      ? payload.quotes.find(
          (quote) =>
            quote.source === "cardmarket" &&
            quote.metric === "trend_europe" &&
            /impression (?:japonaise|chinoise)/i.test(quote.label) &&
            quote.price > 0
        )
      : undefined;

  const regional =
    exactAsianRegional ??
    payload.quotes.find((quote) => quote.metric === "trend_europe" && quote.price > 0) ??
    payload.quotes.find((quote) => quote.metric === "average_europe" && quote.price > 0) ??
    payload.quotes.find((quote) => quote.metric === "average_7d_europe" && quote.price > 0) ??
    payload.quotes.find((quote) => quote.metric === "average_30d_europe" && quote.price > 0);

  const excluded = payload.quotes
    .filter((quote) => !compatible.includes(quote) && quote !== regional)
    .map((quote) => ({
      source: quote.label,
      reason:
        quote.language !== language
          ? `Langue ${quote.language} différente de ${language}`
          : frenchCardmarketAnchor && quote.source === "ebay" && compatibleInitial.includes(quote)
            ? "Écart eBay incohérent avec le prix FR NM exact / échantillon insuffisant"
            : "Source indicative ou comparable",
    }));

  if (compatible.length) {
    // V46: a single sub-2 EUR JustTCG quote on an Asian card is too weak to
    // establish the official King_TCG quote by itself. This specifically blocks
    // bad variant/set mappings such as the recurring 0.89/0.92 EUR values.
    const only = compatible.length === 1 ? compatible[0] : undefined;
    if (
      (language === "ja" || language === "zh-tw") &&
      only?.source === "justtcg" &&
      only.price < 2
    ) {
      if (regional?.price) {
        return {
          price: Number(regional.price.toFixed(2)),
          language,
          currency: "EUR",
          condition: "Near Mint",
          confidence: "limited",
          includedSources: [`${regional.label} · référence occidentale`],
          excludedSources: [
            ...excluded,
            { source: only.label, reason: "Cotation locale isolée anormalement basse" },
          ],
        };
      }
      return undefined;
    }

    const center = median(compatible.map((quote) => quote.price));
    const filtered = compatible.length >= 3
      ? compatible.filter((quote) => quote.price >= center * 0.25 && quote.price <= center * 4)
      : compatible;

    // V54: eBay becomes a stronger local-market signal, especially for JP/CN.
    // We still keep the existing outlier rails and exact language/card matching.
    const weightedLocal = filtered.reduce(
      (acc, quote) => {
        const ebayWeight = quote.source === "ebay"
          ? (language === "ja" || language === "zh-tw" ? 2.25 : 1.5)
          : 1;
        acc.sum += quote.price * ebayWeight;
        acc.weight += ebayWeight;
        return acc;
      },
      { sum: 0, weight: 0 }
    );
    const localCenter = weightedLocal.weight > 0
      ? weightedLocal.sum / weightedLocal.weight
      : median(filtered.map((quote) => quote.price));

    // V44 JP/CN: exact-language eBay/JustTCG are local signals, while the
    // exact Cardmarket product attached to the same TCGdex identity is a real
    // western-market reference. Give it meaningful weight instead of letting a
    // single bad local quote (e.g. wrong 0.89 EUR variant) dominate the result.
    let finalPrice = localCenter;
    const includedSources = filtered.map((quote) => quote.label);
    if ((language === "ja" || language === "zh-tw") && regional?.price) {
      const ratio = localCenter > 0 ? regional.price / localCenter : 0;

      // If the local quote is implausibly tiny compared with the exact western
      // reference, treat it as a likely bad variant/mapping rather than letting
      // it become the official King_TCG quote.
      if (ratio >= 4 && localCenter < 5) {
        finalPrice = regional.price;
        includedSources.push(`${regional.label} · référence occidentale retenue (écart local incohérent)`);
      } else {
        const boundedRegional = Math.min(localCenter * 2.5, Math.max(localCenter * 0.4, regional.price));
        const hasEbay = filtered.some((quote) => quote.source === "ebay");
        const localWeight = hasEbay
          ? (filtered.length >= 3 ? 0.78 : filtered.length >= 2 ? 0.72 : 0.68)
          : (filtered.length >= 3 ? 0.65 : filtered.length >= 2 ? 0.60 : 0.50);
        finalPrice = localCenter * localWeight + boundedRegional * (1 - localWeight);
        includedSources.push(`${regional.label} · référence occidentale ${Math.round((1-localWeight)*100)} %`);
      }
    }

    return {
      price: Number(finalPrice.toFixed(2)),
      language,
      currency: "EUR",
      condition: "Near Mint",
      confidence: filtered.some((quote) => quote.confidence === "high")
        ? "high"
        : filtered.length >= 2
          ? "medium"
          : "limited",
      includedSources,
      excludedSources: excluded,
    };
  }

  if (!regional) return undefined;
  return {
    price: Number(regional.price.toFixed(2)),
    language,
    currency: "EUR",
    condition: "Near Mint",
    confidence: "limited",
    includedSources: [`Référence indicative : ${regional.label}`],
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
        language === "zh-tw" ? "price-v94-cn-variant" : "price-v94-variant",
        card.id,
        language,
        normalizedSet(card.setId),
        normalizedNumber(card.number),
        normalizedText(card.printingVariant),
        normalizedText(card.condition),
        String(card.variantCardmarketId || ""),
        String(card.variantTcgplayerId || ""),
      ].join(":");

      const resultKey = typeof card.requestKey === "string" && card.requestKey.length <= 500
        ? card.requestKey
        : card.id;

      const cached = cache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        return [resultKey, cached.value] as const;
      }

      // V85: keep the previously validated JP/FR/EN provider pipeline byte-for-byte
      // in the same order as V80. CN alone receives the embedded PokéWallet set quote.
      const providerPromises: Promise<MarketPayload>[] = language === "zh-tw"
        ? [
            fromEmbeddedVariantMarket(card),
            Promise.resolve(fromEmbeddedMarket(card)),
            fromTcgCsvJapan(card),
            fromCardmarketAsia(card),
            fromPokeWallet(card),
            Promise.resolve(emptyPayload()),
            Promise.resolve(emptyPayload()),
            fromJustTcg(card),
            fromEbay(card),
          ]
        : [
            fromEmbeddedVariantMarket(card),
            fromTcgCsvJapan(card),
            fromCardmarketAsia(card),
            fromPokeWallet(card),
            fromTcgdex(card),
            fromPokemonTcg(card),
            fromJustTcg(card),
            fromEbay(card),
          ];
      const settled = await Promise.allSettled(providerPromises);
      const baseParts = settled
        .filter((result): result is PromiseFulfilledResult<MarketPayload> => result.status === "fulfilled")
        .map((result) => result.value);
      const value = mergePayloads(...baseParts);

      // V53: a special physical printing is a different market product.
      // Never fall back to the Standard/Normal price when Master Ball, Poké Ball
      // or Reverse is selected. Keep only printing-aware sources.
      if (isSpecialPrinting(card.printingVariant)) {
        const wanted = normalizedPrinting(card.printingVariant);
        value.quotes = value.quotes.filter((quote) => {
          if (quote.source === "ebay") return true; // query includes printing keyword
          if (quote.source === "justtcg") return true; // filtered by variant.printing
          if (quote.source === "tcgplayer") {
            return normalizedText(quote.label).includes(wanted);
          }
          if (quote.source === "cardmarket") {
            return normalizedText(quote.label).includes(wanted);
          }
          return false;
        });

        const hasCardmarket = value.quotes.some((quote) => quote.source === "cardmarket");
        const hasTcgplayer = value.quotes.some((quote) => quote.source === "tcgplayer");
        if (!hasCardmarket) value.cardmarket = undefined;
        if (!hasTcgplayer) value.tcgplayer = undefined;
        value.sources.cardmarket = hasCardmarket;
        value.sources.tcgplayer = hasTcgplayer;
      }

      // V52: only a regionally resolved Cardmarket product may appear on JP/CN.
      if (language === "ja" || language === "zh-tw") {
        const exactAsianCardmarket = value.quotes.filter(
          (quote) =>
            quote.source === "cardmarket" &&
            (
              /impression (?:japonaise|chinoise)/i.test(String(quote.label || "")) ||
              // Preserve the currently validated JP behaviour, but CN must be
              // explicitly tied to a Chinese product. Generic "exact" is not
              // enough because TCGdex zh-tw and western products can share IDs.
              (language === "ja" && quote.classification === "exact")
            )
        );
        value.quotes = value.quotes.filter(
          (quote) =>
            quote.source !== "cardmarket" ||
            exactAsianCardmarket.includes(quote)
        );
        if (!exactAsianCardmarket.length) {
          value.cardmarket = undefined;
          value.sources.cardmarket = false;
        }
      }

      // FR exact Cardmarket offer: run after the base providers so we can reuse
      // any product URL they may expose. This is deliberately isolated from JP/CN.
      if (language === "fr" && !isSpecialPrinting(card.printingVariant)) {
        const france = await fromCardmarketFrance(card, value.cardmarket?.url);

        // The FR source of truth is exclusively the filtered Cardmarket seller
        // page (?language=2). Provider-derived Europe stats remain visible, but
        // no previous Cardmarket quote may pretend to be an exact French offer.
        value.quotes = value.quotes.filter(
          (quote) =>
            quote.source !== "cardmarket" ||
            quote.language === "multi" ||
            !quote.compatible
        );

        if (france.cardmarket) {
          value.cardmarket = {
            ...value.cardmarket,
            ...france.cardmarket,
            prices: {
              ...(value.cardmarket?.prices || {}),
              ...(france.cardmarket.prices || {}),
            },
          };
        }
        for (const quote of france.quotes) addQuote(value, quote);
        if (france.debugCardmarketFr) value.debugCardmarketFr = france.debugCardmarketFr;

        const exactFrenchSellerQuote = france.quotes.find(
          (quote) =>
            quote.source === "cardmarket" &&
            quote.language === "fr" &&
            quote.condition === "Near Mint" &&
            quote.metric === "lowest_listing" &&
            quote.classification === "exact" &&
            quote.compatible &&
            quote.price > 0
        );

        if (value.cardmarket?.prices) {
          if (exactFrenchSellerQuote) {
            value.cardmarket.prices.frenchNmLow = exactFrenchSellerQuote.price;
          } else {
            delete value.cardmarket.prices.frenchNmLow;
          }
        }

        value.sources.cardmarket = Boolean(
          value.cardmarket || value.quotes.some((quote) => quote.source === "cardmarket")
        );
        if (france.status === "available") value.status = "available";

        const exactFrenchNm = value.quotes.find(
          (quote) =>
            quote.source === "cardmarket" &&
            quote.language === "fr" &&
            quote.condition === "Near Mint" &&
            quote.metric === "lowest_listing" &&
            quote.classification === "exact" &&
            quote.price > 0
        );
        const ebayQuote = value.quotes.find(
          (quote) => quote.source === "ebay" && quote.language === "fr" && quote.price > 0
        );
        if (exactFrenchNm && ebayQuote) {
          const ratio = ebayQuote.price / exactFrenchNm.price;
          const sampleSize = Number(ebayQuote.sampleSize || 0);
          if ((sampleSize <= 2 && (ratio > 2.5 || ratio < 0.4)) || ratio > 4 || ratio < 0.2) {
            value.quotes = value.quotes.filter((quote) => quote !== ebayQuote);
            value.ebayListings = undefined;
            value.sources.ebayListings = false;
          }
        }
      }

      // V47: do not expose a lone suspicious sub-2 EUR Asian JustTCG quote as
      // if it were a meaningful market price. Keep it out of the visible market
      // payload unless another independent local source confirms the market.
      if (language === "ja" || language === "zh-tw") {
        const localIndependent = value.quotes.filter(
          (quote) =>
            quote.language === language &&
            quote.compatible &&
            quote.source !== "justtcg" &&
            quote.price > 0
        );
        if (!localIndependent.length) {
          value.quotes = value.quotes.filter(
            (quote) =>
              !(
                quote.source === "justtcg" &&
                quote.language === language &&
                quote.price < 2
              )
          );
          if (value.justtcg?.medianNearMint && value.justtcg.medianNearMint < 2) {
            value.justtcg = undefined;
            value.sources.justtcg = false;
          }
        }
      }

      value.estimate = calculateEstimate(value, language);

      cache.set(cacheKey, {
        expiresAt:
          Date.now() + (value.status === "available" ? POSITIVE_TTL : NEGATIVE_TTL),
        value,
      });
      return [resultKey, value] as const;
    });

    return NextResponse.json({
      success: true,
      version: "price-engine-v94-cardmarket-fr-resolution-diag",
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
