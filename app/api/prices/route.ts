import { NextResponse } from "next/server";

import type { MarketSyncStatus } from "@/lib/types";

type InputCard = {
  id: string;
  name?: string;
  number?: string;
  setId?: string;
  setName?: string;
  variant?: "Normal" | "Full Art" | "Alt Art" | "Rainbow" | "Gold" | "Shiny" | "Unknown";
  rarity?: string;
  language?: "fr" | "en" | "ja" | "zh-tw";
};

type MarketPayload = {
  cardmarket?: { prices?: Record<string, number>; url?: string; updatedAt?: string };
  tcgplayer?: {
    prices?: Record<string, any>;
    url?: string;
    updatedAt?: string;
    currency?: "USD" | "EUR";
  };
  status: MarketSyncStatus;
  sources: {
    cardmarket: boolean;
    tcgplayer: boolean;
    justtcg: boolean;
  };
};

type FetchResult = {
  data: any | null;
  status: "ok" | "not_found" | "rate_limited" | "unavailable";
};

const TCGDEX_BASE = "https://api.tcgdex.net/v2";
const POKEMON_TCG_BASE = "https://api.pokemontcg.io/v2";
const JUSTTCG_BASE = "https://api.justtcg.com/v1";
const FALLBACK_USD_TO_EUR = 0.92;
const POSITIVE_CACHE_TTL = 12 * 60 * 60 * 1000;
const NEGATIVE_CACHE_TTL = 10 * 60 * 1000;
const priceCache = new Map<string, { expiresAt: number; payload: MarketPayload }>();

function tcgdexLocales(language?: InputCard["language"]): string[] {
  if (language === "ja") return ["ja"];
  if (language === "zh-tw") return ["zh-tw", "zh-cn"];
  if (language === "fr") return ["fr"];
  return ["en"];
}

function normalizedSetId(value?: string): string {
  return String(value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function detailMatchesInput(detail: any, card: InputCard): boolean {
  const wantedNumber = normalizeNumber(card.number);
  const actualNumber = normalizeNumber(detail?.localId ?? detail?.number);
  if (wantedNumber && actualNumber !== wantedNumber) return false;

  const wantedSet = normalizedSetId(card.setId);
  if (!wantedSet) return true;

  const actualSet =
    normalizedSetId(detail?.set?.id) ||
    normalizedSetId(String(detail?.id ?? "").split("-")[0]);

  return actualSet === wantedSet;
}

let exchangeRateCache: { value: number; expiresAt: number } | null = null;

function num(value: unknown): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Number(parsed.toFixed(2)) : undefined;
}

function cleanNumber(value?: string): string {
  return String(value ?? "").trim().split("/")[0].trim();
}

function normalizeName(value?: string): string {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\u3040-\u30ff\u3400-\u9fff]/g, "");
}

function normalizeNumber(value?: string): string {
  const raw = cleanNumber(value).toUpperCase();
  const prefix = raw.match(/^[A-Z]+/)?.[0] ?? "";
  const digits = raw.replace(/^[A-Z]+/, "").replace(/^0+(?=\d)/, "");
  return `${prefix}${digits || "0"}`;
}

async function fetchJson(url: string, init?: RequestInit): Promise<FetchResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 9000);

  try {
    const response = await fetch(url, {
      ...init,
      cache: "no-store",
      signal: controller.signal,
      headers: { Accept: "application/json", ...(init?.headers ?? {}) },
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

async function getUsdToEurRate(): Promise<number> {
  if (exchangeRateCache && exchangeRateCache.expiresAt > Date.now()) {
    return exchangeRateCache.value;
  }
  const result = await fetchJson("https://api.frankfurter.app/latest?from=USD&to=EUR");
  const parsed = Number(result.data?.rates?.EUR);
  const value = Number.isFinite(parsed) && parsed > 0 ? parsed : FALLBACK_USD_TO_EUR;
  exchangeRateCache = { value, expiresAt: Date.now() + 12 * 60 * 60 * 1000 };
  return value;
}

function emptyPayload(status: MarketSyncStatus = "not_listed"): MarketPayload {
  return {
    status,
    sources: { cardmarket: false, tcgplayer: false, justtcg: false },
  };
}

function hasPrice(payload: MarketPayload): boolean {
  return Boolean(payload.cardmarket || payload.tcgplayer);
}

function mergeMarketPayload(primary: MarketPayload, fallback?: MarketPayload | null): MarketPayload {
  const cardmarket = primary.cardmarket ?? fallback?.cardmarket;
  const tcgplayer = primary.tcgplayer ?? fallback?.tcgplayer;
  const available = Boolean(cardmarket || tcgplayer);
  const statuses = [primary.status, fallback?.status].filter(Boolean);
  const status: MarketSyncStatus = available
    ? "available"
    : statuses.includes("rate_limited")
      ? "rate_limited"
      : statuses.includes("source_unavailable")
        ? "source_unavailable"
        : "not_listed";

  return {
    cardmarket,
    tcgplayer,
    status,
    sources: {
      cardmarket: Boolean(cardmarket),
      tcgplayer: Boolean(tcgplayer),
      justtcg: Boolean(primary.sources.justtcg || fallback?.sources.justtcg),
    },
  };
}

function tcgdexCandidates(card: InputCard): string[] {
  const setId = String(card.setId ?? "").trim().toLowerCase();
  const number = cleanNumber(card.number);
  if (!setId || !number) return [];

  const candidates = [`${setId}-${number}`];
  const prefix = number.match(/^(GG|TG|SV)\s*/i)?.[1]?.toLowerCase();
  if (prefix && !setId.endsWith(prefix)) candidates.unshift(`${setId}${prefix}-${number}`);
  return Array.from(new Set(candidates));
}

function mapTcgdexPricing(card: any, usdToEur: number): MarketPayload {
  const cm = card?.pricing?.cardmarket;
  const tcg = card?.pricing?.tcgplayer;
  const cardmarketPrices: Record<string, number> = {};
  const tcgPrices: Record<string, any> = {};

  if (cm) {
    const mapping: Record<string, string> = {
      avg: "averageSellPrice",
      low: "lowPrice",
      trend: "trendPrice",
      avg1: "avg1",
      avg7: "avg7",
      avg30: "avg30",
      "avg-holo": "reverseHoloSell",
      "low-holo": "reverseHoloLow",
      "trend-holo": "reverseHoloTrend",
    };
    for (const [source, target] of Object.entries(mapping)) {
      const value = num(cm[source]);
      if (value !== undefined) cardmarketPrices[target] = value;
    }
  }

  if (tcg && typeof tcg === "object") {
    for (const [key, value] of Object.entries(tcg)) {
      if (!value || typeof value !== "object") continue;
      const raw = value as Record<string, unknown>;
      const mapped: Record<string, number> = {};
      for (const [source, target] of [
        ["lowPrice", "low"],
        ["midPrice", "mid"],
        ["highPrice", "high"],
        ["marketPrice", "market"],
        ["directLowPrice", "directLow"],
      ] as const) {
        const valueNumber = num(raw[source]);
        if (valueNumber !== undefined) mapped[target] = Number((valueNumber * usdToEur).toFixed(2));
      }
      if (Object.keys(mapped).length) tcgPrices[key] = mapped;
    }
  }

  const payload: MarketPayload = {
    cardmarket: Object.keys(cardmarketPrices).length
      ? { prices: cardmarketPrices, updatedAt: cm?.updated }
      : undefined,
    tcgplayer: Object.keys(tcgPrices).length
      ? { prices: tcgPrices, updatedAt: tcg?.updated, currency: "EUR" }
      : undefined,
    status: Object.keys(cardmarketPrices).length || Object.keys(tcgPrices).length ? "available" : "not_listed",
    sources: {
      cardmarket: Object.keys(cardmarketPrices).length > 0,
      tcgplayer: Object.keys(tcgPrices).length > 0,
      justtcg: false,
    },
  };
  return payload;
}

async function fetchTcgdexCard(card: InputCard): Promise<{ payload: MarketPayload; sourceStatus: FetchResult["status"] }> {
  const usdToEur = await getUsdToEurRate();
  let lastStatus: FetchResult["status"] = "not_found";

  for (const locale of tcgdexLocales(card.language)) {
    for (const candidate of tcgdexCandidates(card)) {
      const result = await fetchJson(
        `${TCGDEX_BASE}/${locale}/cards/${encodeURIComponent(candidate)}`
      );
      lastStatus = result.status;
      if (result.data?.id && detailMatchesInput(result.data, card)) {
        return {
          payload: mapTcgdexPricing(result.data, usdToEur),
          sourceStatus: "ok",
        };
      }
    }

    if (!card.name) continue;

    const listResult = await fetchJson(
      `${TCGDEX_BASE}/${locale}/cards?name=${encodeURIComponent(card.name)}`
    );
    lastStatus = listResult.status;
    const list = Array.isArray(listResult.data) ? listResult.data : [];
    if (!list.length) continue;

    const wantedName = normalizeName(card.name);
    const wantedNumber = normalizeNumber(card.number);
    const wantedSetId = normalizedSetId(card.setId);
    const wantedSetName = normalizeName(card.setName);

    const match = list.find((item: any) => {
      const exactName = normalizeName(item.name) === wantedName;
      const exactNumber = normalizeNumber(item.localId) === wantedNumber;
      const itemSetId =
        normalizedSetId(item.set?.id) ||
        normalizedSetId(String(item.id ?? "").split("-")[0]);
      const exactSet = !wantedSetId || itemSetId === wantedSetId;
      const compatibleSetName =
        !wantedSetName ||
        normalizeName(item.set?.name) === wantedSetName;

      return exactName && exactNumber && exactSet && compatibleSetName;
    });

    if (!match?.id) continue;

    const detail = await fetchJson(
      `${TCGDEX_BASE}/${locale}/cards/${encodeURIComponent(match.id)}`
    );
    if (detail.data?.id && detailMatchesInput(detail.data, card)) {
      return {
        payload: mapTcgdexPricing(detail.data, usdToEur),
        sourceStatus: "ok",
      };
    }
    lastStatus = detail.status;
  }

  return {
    payload: emptyPayload(
      lastStatus === "rate_limited"
        ? "rate_limited"
        : lastStatus === "unavailable"
          ? "source_unavailable"
          : "not_listed"
    ),
    sourceStatus: lastStatus,
  };
}

function mapPokemonTcgPricing(card: any, usdToEur: number): MarketPayload {
  const cm = card?.cardmarket;
  const tcg = card?.tcgplayer;
  const cardmarketPrices: Record<string, number> = {};
  const tcgPrices: Record<string, any> = {};

  for (const key of ["averageSellPrice", "lowPrice", "trendPrice", "reverseHoloSell", "reverseHoloLow", "reverseHoloTrend", "avg1", "avg7", "avg30"]) {
    const value = num(cm?.prices?.[key]);
    if (value !== undefined) cardmarketPrices[key] = value;
  }

  if (tcg?.prices) {
    for (const [key, rawValue] of Object.entries(tcg.prices)) {
      if (!rawValue || typeof rawValue !== "object") continue;
      const mapped: Record<string, number> = {};
      for (const field of ["low", "mid", "high", "market", "directLow"]) {
        const value = num((rawValue as any)[field]);
        if (value !== undefined) mapped[field] = Number((value * usdToEur).toFixed(2));
      }
      if (Object.keys(mapped).length) tcgPrices[key] = mapped;
    }
  }

  return {
    cardmarket: Object.keys(cardmarketPrices).length ? { prices: cardmarketPrices, url: cm?.url, updatedAt: cm?.updatedAt } : undefined,
    tcgplayer: Object.keys(tcgPrices).length ? { prices: tcgPrices, url: tcg?.url, updatedAt: tcg?.updatedAt, currency: "EUR" } : undefined,
    status: Object.keys(cardmarketPrices).length || Object.keys(tcgPrices).length ? "available" : "not_listed",
    sources: {
      cardmarket: Object.keys(cardmarketPrices).length > 0,
      tcgplayer: Object.keys(tcgPrices).length > 0,
      justtcg: false,
    },
  };
}

async function fetchPokemonTcgExact(card: InputCard): Promise<MarketPayload> {
  if (!card.id || card.id.startsWith("tcgdex-")) return emptyPayload();
  const apiKey = process.env.POKEMON_TCG_API_KEY;
  const result = await fetchJson(`${POKEMON_TCG_BASE}/cards/${encodeURIComponent(card.id)}`, {
    headers: apiKey ? { "X-Api-Key": apiKey } : undefined,
  });
  if (result.status === "rate_limited") return emptyPayload("rate_limited");
  if (result.status === "unavailable") return emptyPayload("source_unavailable");
  if (!result.data?.data) return emptyPayload();
  return mapPokemonTcgPricing(result.data.data, await getUsdToEurRate());
}

async function fetchJustTcg(card: InputCard): Promise<MarketPayload> {
  const apiKey = process.env.JUSTTCG_API_KEY;
  if (!apiKey || !card.name) return emptyPayload();

  const params = new URLSearchParams({ q: card.name, game: "pokemon", limit: "20" });
  if (card.number) params.set("number", cleanNumber(card.number));
  const result = await fetchJson(`${JUSTTCG_BASE}/cards?${params.toString()}`, {
    headers: { "x-api-key": apiKey },
  });
  if (result.status === "rate_limited") return emptyPayload("rate_limited");
  if (result.status === "unavailable") return emptyPayload("source_unavailable");

  const list = Array.isArray(result.data?.data) ? result.data.data : [];
  const wantedName = normalizeName(card.name);
  const wantedNumber = normalizeNumber(card.number);
  const wantedSet = normalizeName(card.setName);
  const matched = list.find((item: any) => {
    const sameName = normalizeName(item.name) === wantedName;
    const sameNumber =
      !wantedNumber || normalizeNumber(item.number) === wantedNumber;

    const itemSetName = normalizeName(item.set_name);
    const itemSetCode = normalizedSetId(
      item.set_code ?? item.set_id ?? item.set?.id
    );
    const wantedSetCode = normalizedSetId(card.setId);

    const sameSet =
      wantedSetCode && itemSetCode
        ? wantedSetCode === itemSetCode
        : !wantedSet ||
          itemSetName === wantedSet ||
          itemSetName.includes(wantedSet) ||
          wantedSet.includes(itemSetName);

    return sameName && sameNumber && sameSet;
  });
  if (!matched) return emptyPayload();

  const expectedLanguage = card.language === "ja" ? "japanese" : card.language === "zh-tw" ? "chinese" : "english";
  const usable = (Array.isArray(matched.variants) ? matched.variants : []).filter((variant: any) => {
    const condition = String(variant.condition ?? "").toLowerCase();
    const language = String(variant.language ?? "english").toLowerCase();
    return condition === "near mint" && language.includes(expectedLanguage) && num(variant.price) !== undefined;
  });
  if (!usable.length) return emptyPayload();

  const prices: number[] = usable
  .map((variant: any) => num(variant.price))
  .filter((value: number | undefined): value is number => value !== undefined)
  .sort((a: number, b: number) => a - b);
  const medianUsd = prices.length % 2 ? prices[(prices.length - 1) / 2] : (prices[prices.length / 2 - 1] + prices[prices.length / 2]) / 2;
  const market = Number((medianUsd * (await getUsdToEurRate())).toFixed(2));

  return {
    tcgplayer: { prices: { normal: { market, low: market, high: market } }, currency: "EUR" },
    status: "available",
    sources: { cardmarket: false, tcgplayer: true, justtcg: true },
  };
}

async function mapWithConcurrency<T, R>(items: T[], limit: number, worker: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await worker(items[index]);
    }
  });
  await Promise.all(runners);
  return results;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const cards = Array.isArray(body?.cards) ? (body.cards as InputCard[]) : [];
    if (!cards.length) return NextResponse.json({ success: true, prices: {} });

    const uniqueCards = Array.from(new Map(cards.filter((card) => card?.id).map((card) => [card.id, card])).values()).slice(0, 20);
    const results = await mapWithConcurrency(uniqueCards, 4, async (card) => {
      const cacheKey = `${card.id}:${card.language ?? "en"}`;
      const cached = priceCache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) return [card.id, cached.payload] as const;

      // Source 1: TCGdex, déjà multilingue et souvent déjà enrichi Cardmarket/TCGPlayer.
      const tcgdex = await fetchTcgdexCard(card);
      let merged = tcgdex.payload;

      // Source 2: Pokémon TCG API uniquement pour compléter ce qui manque sur les cartes anglaises/officielles.
      if (!merged.cardmarket || !merged.tcgplayer) {
        merged = mergeMarketPayload(merged, await fetchPokemonTcgExact(card));
      }

      // Source 3: JustTCG uniquement si aucune cotation TCGPlayer n'est disponible.
      if (!merged.tcgplayer) {
        merged = mergeMarketPayload(merged, await fetchJustTcg(card));
      }

      const ttl = hasPrice(merged) ? POSITIVE_CACHE_TTL : NEGATIVE_CACHE_TTL;
      priceCache.set(cacheKey, { expiresAt: Date.now() + ttl, payload: merged });
      return [card.id, merged] as const;
    });

    return NextResponse.json({ success: true, prices: Object.fromEntries(results) });
  } catch (error) {
    console.error("[API /prices] Error:", error);
    return NextResponse.json({ success: false, error: "Impossible de récupérer les prix marché." }, { status: 500 });
  }
}
