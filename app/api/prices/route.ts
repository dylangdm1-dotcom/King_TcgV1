import { NextResponse } from "next/server";

import type { MarketSyncStatus } from "@/lib/types";

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

type CardmarketPayload = {
  prices?: Record<string, number>;
  url?: string;
  updatedAt?: string;
};

type TcgplayerPayload = {
  prices?: Record<string, any>;
  url?: string;
  updatedAt?: string;
  currency?: "USD" | "EUR";
};

type JustTcgPayload = {
  url?: string;
  updatedAt?: string;
  currency?: "USD" | "EUR";
  game?: "pokemon" | "pokemon-japan";
  condition?: string;
  language?: string;
  printing?: string;
  sampleSize?: number;
  medianNearMint?: number;
  average7d?: number;
  average30d?: number;
  low30d?: number;
  high30d?: number;
  matchedCardId?: string;
};

type MarketPayload = {
  cardmarket?: CardmarketPayload;
  tcgplayer?: TcgplayerPayload;
  justtcg?: JustTcgPayload;
  status: MarketSyncStatus;
  sources: {
    cardmarket: boolean;
    tcgplayer: boolean;
    justtcg: boolean;
    ebayListings: boolean;
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
const POSITIVE_CACHE_TTL = 6 * 60 * 60 * 1000;
const NEGATIVE_CACHE_TTL = 10 * 60 * 1000;

const priceCache = new Map<string, { expiresAt: number; payload: MarketPayload }>();
let exchangeRateCache: { value: number; expiresAt: number } | null = null;

function safeNumber(value: unknown): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0
    ? Number(parsed.toFixed(2))
    : undefined;
}

function cleanNumber(value?: string): string {
  return String(value ?? "").trim().split("/")[0].trim();
}

function normalizeNumber(value?: string): string {
  const raw = cleanNumber(value).toUpperCase();
  const prefix = raw.match(/^[A-Z]+/)?.[0] ?? "";
  const digits = raw.replace(/^[A-Z]+/, "").replace(/^0+(?=\d)/, "");
  return `${prefix}${digits || "0"}`;
}

function normalizeName(value?: string): string {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\u3040-\u30ff\u3400-\u9fff]/g, "");
}

function normalizeSetId(value?: string): string {
  return String(value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function tcgdexLocales(language?: CardLanguage): string[] {
  if (language === "ja") return ["ja"];
  if (language === "zh-tw") return ["zh-tw", "zh-cn"];
  if (language === "fr") return ["fr"];
  return ["en"];
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

async function usdToEur(): Promise<number> {
  if (exchangeRateCache && exchangeRateCache.expiresAt > Date.now()) {
    return exchangeRateCache.value;
  }

  const result = await fetchJson("https://api.frankfurter.app/latest?from=USD&to=EUR");
  const parsed = Number(result.data?.rates?.EUR);
  const value = Number.isFinite(parsed) && parsed > 0 ? parsed : FALLBACK_USD_TO_EUR;
  exchangeRateCache = {
    value,
    expiresAt: Date.now() + 12 * 60 * 60 * 1000,
  };
  return value;
}

function emptyPayload(status: MarketSyncStatus = "not_listed"): MarketPayload {
  return {
    status,
    sources: {
      cardmarket: false,
      tcgplayer: false,
      justtcg: false,
      ebayListings: false,
    },
  };
}

function hasAnyPrice(payload: MarketPayload): boolean {
  return Boolean(payload.cardmarket || payload.tcgplayer || payload.justtcg);
}

function mergePayload(base: MarketPayload, addition?: MarketPayload | null): MarketPayload {
  const cardmarket = base.cardmarket ?? addition?.cardmarket;
  const tcgplayer = base.tcgplayer ?? addition?.tcgplayer;
  const justtcg = base.justtcg ?? addition?.justtcg;
  const available = Boolean(cardmarket || tcgplayer || justtcg);
  const statuses = [base.status, addition?.status].filter(Boolean);

  return {
    cardmarket,
    tcgplayer,
    justtcg,
    status: available
      ? "available"
      : statuses.includes("rate_limited")
        ? "rate_limited"
        : statuses.includes("source_unavailable")
          ? "source_unavailable"
          : "not_listed",
    sources: {
      cardmarket: Boolean(cardmarket),
      tcgplayer: Boolean(tcgplayer),
      justtcg: Boolean(justtcg),
      ebayListings: false,
    },
  };
}

function candidateCardIds(card: InputCard): string[] {
  const setId = normalizeSetId(card.setId);
  const number = cleanNumber(card.number);
  if (!setId || !number) return [];

  const ids = [`${setId}-${number}`];
  const prefix = number.match(/^(GG|TG|SV)\s*/i)?.[1]?.toLowerCase();
  if (prefix && !setId.endsWith(prefix)) ids.unshift(`${setId}${prefix}-${number}`);
  return Array.from(new Set(ids));
}

function exactIdentity(detail: any, card: InputCard): boolean {
  const wantedNumber = normalizeNumber(card.number);
  const actualNumber = normalizeNumber(detail?.localId ?? detail?.number);
  if (wantedNumber && actualNumber !== wantedNumber) return false;

  const wantedSetId = normalizeSetId(card.setId);
  if (!wantedSetId) return true;

  const actualSetId =
    normalizeSetId(detail?.set?.id) ||
    normalizeSetId(String(detail?.id ?? "").split("-")[0]);

  return actualSetId === wantedSetId;
}

function mapTcgdexPricing(detail: any, rate: number): MarketPayload {
  const cm = detail?.pricing?.cardmarket;
  const tcg = detail?.pricing?.tcgplayer;
  const cardmarketPrices: Record<string, number> = {};
  const tcgPrices: Record<string, any> = {};

  const cmMapping: Record<string, string> = {
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

  for (const [source, target] of Object.entries(cmMapping)) {
    const value = safeNumber(cm?.[source]);
    if (value !== undefined) cardmarketPrices[target] = value;
  }

  if (tcg && typeof tcg === "object") {
    for (const [variant, rawValue] of Object.entries(tcg)) {
      if (!rawValue || typeof rawValue !== "object") continue;
      const source = rawValue as Record<string, unknown>;
      const mapped: Record<string, number> = {};

      for (const [sourceField, targetField] of [
        ["lowPrice", "low"],
        ["midPrice", "mid"],
        ["highPrice", "high"],
        ["marketPrice", "market"],
        ["directLowPrice", "directLow"],
      ] as const) {
        const value = safeNumber(source[sourceField]);
        if (value !== undefined) {
          mapped[targetField] = Number((value * rate).toFixed(2));
        }
      }

      if (Object.keys(mapped).length) tcgPrices[variant] = mapped;
    }
  }

  return {
    cardmarket: Object.keys(cardmarketPrices).length
      ? { prices: cardmarketPrices, updatedAt: cm?.updated }
      : undefined,
    tcgplayer: Object.keys(tcgPrices).length
      ? {
          prices: tcgPrices,
          updatedAt: tcg?.updated,
          currency: "EUR",
        }
      : undefined,
    status:
      Object.keys(cardmarketPrices).length || Object.keys(tcgPrices).length
        ? "available"
        : "not_listed",
    sources: {
      cardmarket: Object.keys(cardmarketPrices).length > 0,
      tcgplayer: Object.keys(tcgPrices).length > 0,
      justtcg: false,
      ebayListings: false,
    },
  };
}

async function fetchTcgdexExact(card: InputCard): Promise<MarketPayload> {
  const rate = await usdToEur();
  let lastStatus: FetchResult["status"] = "not_found";

  for (const locale of tcgdexLocales(card.language)) {
    for (const candidate of candidateCardIds(card)) {
      const result = await fetchJson(
        `${TCGDEX_BASE}/${locale}/cards/${encodeURIComponent(candidate)}`
      );
      lastStatus = result.status;
      if (result.data?.id && exactIdentity(result.data, card)) {
        return mapTcgdexPricing(result.data, rate);
      }
    }

    if (!card.name) continue;

    const listResult = await fetchJson(
      `${TCGDEX_BASE}/${locale}/cards?name=${encodeURIComponent(card.name)}`
    );
    lastStatus = listResult.status;
    const list = Array.isArray(listResult.data) ? listResult.data : [];

    const wantedName = normalizeName(card.name);
    const wantedNumber = normalizeNumber(card.number);
    const wantedSet = normalizeSetId(card.setId);

    const match = list.find((item: any) => {
      const itemSet =
        normalizeSetId(item?.set?.id) ||
        normalizeSetId(String(item?.id ?? "").split("-")[0]);
      return (
        normalizeName(item?.name) === wantedName &&
        normalizeNumber(item?.localId) === wantedNumber &&
        (!wantedSet || itemSet === wantedSet)
      );
    });

    if (!match?.id) continue;

    const detail = await fetchJson(
      `${TCGDEX_BASE}/${locale}/cards/${encodeURIComponent(match.id)}`
    );
    lastStatus = detail.status;
    if (detail.data?.id && exactIdentity(detail.data, card)) {
      return mapTcgdexPricing(detail.data, rate);
    }
  }

  return emptyPayload(
    lastStatus === "rate_limited"
      ? "rate_limited"
      : lastStatus === "unavailable"
        ? "source_unavailable"
        : "not_listed"
  );
}

function mapPokemonTcgPricing(card: any, rate: number): MarketPayload {
  const cm = card?.cardmarket;
  const tcg = card?.tcgplayer;
  const cardmarketPrices: Record<string, number> = {};
  const tcgPrices: Record<string, any> = {};

  for (const key of [
    "averageSellPrice",
    "lowPrice",
    "trendPrice",
    "reverseHoloSell",
    "reverseHoloLow",
    "reverseHoloTrend",
    "avg1",
    "avg7",
    "avg30",
  ]) {
    const value = safeNumber(cm?.prices?.[key]);
    if (value !== undefined) cardmarketPrices[key] = value;
  }

  if (tcg?.prices) {
    for (const [variant, rawValue] of Object.entries(tcg.prices)) {
      if (!rawValue || typeof rawValue !== "object") continue;
      const mapped: Record<string, number> = {};
      for (const field of ["low", "mid", "high", "market", "directLow"]) {
        const value = safeNumber((rawValue as any)[field]);
        if (value !== undefined) mapped[field] = Number((value * rate).toFixed(2));
      }
      if (Object.keys(mapped).length) tcgPrices[variant] = mapped;
    }
  }

  return {
    cardmarket: Object.keys(cardmarketPrices).length
      ? {
          prices: cardmarketPrices,
          url: cm?.url,
          updatedAt: cm?.updatedAt,
        }
      : undefined,
    tcgplayer: Object.keys(tcgPrices).length
      ? {
          prices: tcgPrices,
          url: tcg?.url,
          updatedAt: tcg?.updatedAt,
          currency: "EUR",
        }
      : undefined,
    status:
      Object.keys(cardmarketPrices).length || Object.keys(tcgPrices).length
        ? "available"
        : "not_listed",
    sources: {
      cardmarket: Object.keys(cardmarketPrices).length > 0,
      tcgplayer: Object.keys(tcgPrices).length > 0,
      justtcg: false,
      ebayListings: false,
    },
  };
}

async function fetchPokemonTcgExact(card: InputCard): Promise<MarketPayload> {
  // Pokémon TCG API est une source occidentale : ne jamais l'utiliser pour JP/CN.
  if (
    card.language === "ja" ||
    card.language === "zh-tw" ||
    !card.id ||
    card.id.startsWith("tcgdex-")
  ) {
    return emptyPayload();
  }

  const apiKey = process.env.POKEMON_TCG_API_KEY;
  const result = await fetchJson(
    `${POKEMON_TCG_BASE}/cards/${encodeURIComponent(card.id)}`,
    { headers: apiKey ? { "X-Api-Key": apiKey } : undefined }
  );

  if (result.status === "rate_limited") return emptyPayload("rate_limited");
  if (result.status === "unavailable") return emptyPayload("source_unavailable");
  if (!result.data?.data) return emptyPayload();

  return mapPokemonTcgPricing(result.data.data, await usdToEur());
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  if (!sorted.length) return 0;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

function expectedJustTcgLanguage(language?: CardLanguage): string {
  if (language === "ja") return "japanese";
  if (language === "zh-tw") return "chinese";
  if (language === "fr") return "french";
  return "english";
}

async function queryJustTcgGame(
  card: InputCard,
  game: "pokemon" | "pokemon-japan"
): Promise<MarketPayload> {
  const apiKey = process.env.JUSTTCG_API_KEY;
  if (!apiKey || !card.name) return emptyPayload();

  const params = new URLSearchParams({
    q: card.name,
    game,
    limit: "20",
  });
  if (card.number) params.set("number", cleanNumber(card.number));

  const result = await fetchJson(`${JUSTTCG_BASE}/cards?${params.toString()}`, {
    headers: { "x-api-key": apiKey },
  });

  if (result.status === "rate_limited") return emptyPayload("rate_limited");
  if (result.status === "unavailable") return emptyPayload("source_unavailable");

  const list = Array.isArray(result.data?.data) ? result.data.data : [];
  const wantedName = normalizeName(card.name);
  const wantedNumber = normalizeNumber(card.number);
  const wantedSetId = normalizeSetId(card.setId);
  const wantedSetName = normalizeName(card.setName);

  const matched = list.find((item: any) => {
    const itemName = normalizeName(item?.name);
    const itemNumber = normalizeNumber(item?.number);
    const itemSetId = normalizeSetId(
      item?.set_code ?? item?.set_id ?? item?.set?.id
    );
    const itemSetName = normalizeName(item?.set_name ?? item?.set?.name);

    const sameName = itemName === wantedName;
    const sameNumber = !wantedNumber || itemNumber === wantedNumber;
    const sameSet = wantedSetId && itemSetId
      ? wantedSetId === itemSetId
      : !wantedSetName ||
        itemSetName === wantedSetName ||
        itemSetName.includes(wantedSetName) ||
        wantedSetName.includes(itemSetName);

    return sameName && sameNumber && sameSet;
  });

  if (!matched) return emptyPayload();

  const expectedLanguage = expectedJustTcgLanguage(card.language);
  const variants = Array.isArray(matched.variants) ? matched.variants : [];
  const usable = variants.filter((variant: any) => {
    const condition = String(variant?.condition ?? "").toLowerCase();
    const language = String(variant?.language ?? "").toLowerCase();
    const price = safeNumber(variant?.price);
    return (
      condition === "near mint" &&
      language.includes(expectedLanguage) &&
      price !== undefined
    );
  });

  if (!usable.length) return emptyPayload();

  const rate = await usdToEur();
  const pricesEur: number[] = usable
    .map(
      (variant: any): number | undefined =>
        safeNumber(variant?.price)
    )
    .filter(
      (value: number | undefined): value is number =>
        value !== undefined
    )
    .map(
      (value: number) =>
        Number((value * rate).toFixed(2))
    );

  const medianNearMint = Number(median(pricesEur).toFixed(2));
  if (!medianNearMint) return emptyPayload();

  const averageField = (name: string) => {
    const values: number[] = usable
      .map(
        (variant: any): number | undefined =>
          safeNumber(variant?.[name])
      )
      .filter(
        (value: number | undefined): value is number =>
          value !== undefined
      )
      .map(
        (value: number) =>
          Number((value * rate).toFixed(2))
      );
    return values.length
      ? Number(
          (
            values.reduce(
              (sum: number, value: number) => sum + value,
              0
            ) / values.length
          ).toFixed(2)
        )
      : undefined;
  };

  return {
    justtcg: {
      game,
      currency: "EUR",
      condition: "Near Mint",
      language: expectedLanguage,
      printing: String(usable[0]?.printing ?? usable[0]?.finish ?? ""),
      sampleSize: usable.length,
      medianNearMint,
      average7d: averageField("avg7"),
      average30d: averageField("avg30"),
      low30d: averageField("min30"),
      high30d: averageField("max30"),
      matchedCardId: String(matched?.id ?? matched?.uuid ?? ""),
      url: matched?.url,
      updatedAt: matched?.updated_at ?? matched?.updatedAt,
    },
    status: "available",
    sources: {
      cardmarket: false,
      tcgplayer: false,
      justtcg: true,
      ebayListings: false,
    },
  };
}

async function fetchJustTcg(card: InputCard): Promise<MarketPayload> {
  if (card.language === "ja") {
    return queryJustTcgGame(card, "pokemon-japan");
  }

  // Le catalogue JustTCG occidental peut couvrir EN/FR et parfois des variantes CN.
  // Pour le chinois, le prix n'est accepté que si la variante est explicitement chinoise.
  return queryJustTcgGame(card, "pokemon");
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
    const cards = Array.isArray(body?.cards) ? (body.cards as InputCard[]) : [];
    if (!cards.length) {
      return NextResponse.json({ success: true, prices: {} });
    }

    const uniqueCards = Array.from(
      new Map(
        cards
          .filter((card) => card?.id)
          .map((card) => [
            `${card.id}:${card.language ?? "en"}:${card.setId ?? ""}:${card.number ?? ""}`,
            card,
          ])
      ).values()
    ).slice(0, 20);

    const results = await mapWithConcurrency(uniqueCards, 3, async (card) => {
      const cacheKey = [
        "prices-v5",
        card.id,
        card.language ?? "en",
        normalizeSetId(card.setId),
        normalizeNumber(card.number),
      ].join(":");

      const cached = priceCache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        return [card.id, cached.payload] as const;
      }

      let merged = await fetchTcgdexExact(card);

      if (!merged.cardmarket || !merged.tcgplayer) {
        merged = mergePayload(merged, await fetchPokemonTcgExact(card));
      }

      // JustTCG est toujours interrogé comme source indépendante,
      // et non uniquement comme remplacement de TCGPlayer.
      merged = mergePayload(merged, await fetchJustTcg(card));

      const ttl = hasAnyPrice(merged)
        ? POSITIVE_CACHE_TTL
        : NEGATIVE_CACHE_TTL;

      priceCache.set(cacheKey, {
        expiresAt: Date.now() + ttl,
        payload: merged,
      });

      return [card.id, merged] as const;
    });

    return NextResponse.json({
      success: true,
      version: "manual-price-v1",
      prices: Object.fromEntries(results),
    });
  } catch (error) {
    console.error("[API /prices] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Impossible de récupérer les prix marché.",
      },
      { status: 500 }
    );
  }
}
