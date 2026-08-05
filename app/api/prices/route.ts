import { NextResponse } from "next/server";

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
  cardmarket?: {
    prices?: Record<string, number>;
    url?: string;
    updatedAt?: string;
  };
  tcgplayer?: {
    prices?: Record<string, any>;
    url?: string;
    updatedAt?: string;
    currency?: "USD" | "EUR";
  };
  sources?: {
    cardmarket: boolean;
    tcgplayer: boolean;
  };
};

const TCGDEX_BASE = "https://api.tcgdex.net/v2";
const POKEMON_TCG_BASE = "https://api.pokemontcg.io/v2";
const JUSTTCG_BASE = "https://api.justtcg.com/v1";
const FALLBACK_USD_TO_EUR = 0.92;
const PRICE_CACHE_TTL = 15 * 60 * 1000;
const priceCache = new Map<string, { expiresAt: number; payload: MarketPayload }>();

async function getUsdToEurRate(): Promise<number> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const response = await fetch(
        "https://api.frankfurter.app/latest?from=USD&to=EUR",
        { cache: "no-store", signal: controller.signal }
      );
      if (!response.ok) return FALLBACK_USD_TO_EUR;
      const data = await response.json();
      const rate = Number(data?.rates?.EUR);
      return Number.isFinite(rate) && rate > 0 ? rate : FALLBACK_USD_TO_EUR;
    } finally {
      clearTimeout(timeout);
    }
  } catch {
    return FALLBACK_USD_TO_EUR;
  }
}

function num(value: unknown): number | undefined {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Number(n.toFixed(2)) : undefined;
}

function cleanNumber(value?: string): string {
  return String(value ?? "").trim().split("/")[0].trim();
}

function normalizeName(value?: string): string {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function normalizeNumber(value?: string): string {
  return cleanNumber(value).toLowerCase().replace(/^0+/, "") || "0";
}

function tcgdexCandidates(card: InputCard): string[] {
  const setId = String(card.setId ?? "").trim().toLowerCase();
  const number = cleanNumber(card.number);
  if (!setId || !number) return [];

  const candidates = [
    `${setId}-${number}`,
    `${setId}${/^(gg|tg|sv|swsh)/i.test(number) ? "" : ""}-${number}`,
  ];

  // TCGdex uses dedicated gallery set IDs for TG/GG cards.
  const prefix = number.match(/^(GG|TG|SV)\s*/i)?.[1]?.toLowerCase();
  if (prefix && !setId.endsWith(prefix)) {
    candidates.unshift(`${setId}${prefix}-${number}`);
  }

  return Array.from(new Set(candidates));
}

async function fetchJson(url: string, init?: RequestInit): Promise<any | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);

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

    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function mergeMarketPayload(primary: MarketPayload, fallback?: MarketPayload | null): MarketPayload {
  return {
    cardmarket: primary.cardmarket ?? fallback?.cardmarket,
    tcgplayer: primary.tcgplayer ?? fallback?.tcgplayer,
    sources: {
      cardmarket: Boolean(primary.cardmarket ?? fallback?.cardmarket),
      tcgplayer: Boolean(primary.tcgplayer ?? fallback?.tcgplayer),
    },
  };
}

async function fetchPokemonTcgExact(card: InputCard): Promise<any | null> {
  if (!card.id || card.id.startsWith("tcgdex-")) return null;

  const apiKey =
    process.env.POKEMON_TCG_API_KEY ||
    process.env.NEXT_PUBLIC_POKEMON_TCG_API_KEY;

  const data = await fetchJson(
    `${POKEMON_TCG_BASE}/cards/${encodeURIComponent(card.id)}`,
    apiKey ? { headers: { "X-Api-Key": apiKey } } : undefined
  );

  return data?.data ?? null;
}

function mapPokemonTcgPricing(card: any, usdToEur: number): MarketPayload {
  const cm = card?.cardmarket;
  const tcg = card?.tcgplayer;
  const cardmarketPrices: Record<string, number> = {};
  const tcgPrices: Record<string, any> = {};

  if (cm?.prices) {
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
      const value = num(cm.prices[key]);
      if (value !== undefined) cardmarketPrices[key] = value;
    }
  }

  if (tcg?.prices) {
    for (const [key, rawValue] of Object.entries(tcg.prices)) {
      if (!rawValue || typeof rawValue !== "object") continue;
      const value = rawValue as Record<string, unknown>;
      const mapped: Record<string, number> = {};
      for (const sourceKey of ["low", "mid", "high", "market", "directLow"]) {
        const parsed = num(value[sourceKey]);
        if (parsed !== undefined) mapped[sourceKey] = Number((parsed * usdToEur).toFixed(2));
      }
      if (Object.keys(mapped).length) tcgPrices[key] = mapped;
    }
  }

  return {
    cardmarket: Object.keys(cardmarketPrices).length
      ? { prices: cardmarketPrices, url: cm?.url, updatedAt: cm?.updatedAt }
      : undefined,
    tcgplayer: Object.keys(tcgPrices).length
      ? { prices: tcgPrices, url: tcg?.url, updatedAt: tcg?.updatedAt, currency: "EUR" }
      : undefined,
    sources: {
      cardmarket: Object.keys(cardmarketPrices).length > 0,
      tcgplayer: Object.keys(tcgPrices).length > 0,
    },
  };
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<R>
): Promise<R[]> {
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

async function fetchTcgdexCard(card: InputCard): Promise<any | null> {
  const lang = card.language === "ja" ? "ja" : card.language === "zh-tw" ? "zh-tw" : "en";

  for (const candidate of tcgdexCandidates(card)) {
    const data = await fetchJson(
      `${TCGDEX_BASE}/${lang}/cards/${encodeURIComponent(candidate)}`
    );
    if (data?.id) return data;
  }

  // Last-resort search by aliases, then match number + set/name before
  // fetching the detailed card (pricing is only present on card details).
  if (!card.name) return null;

  const normalizedCardName = normalizeName(card.name);
  const nameQueries =
    normalizedCardName === "dracaufeu" || normalizedCardName === "charizard"
      ? ["Dracaufeu", "Charizard"]
      : [card.name];

  const lists = await Promise.all(
    nameQueries.map((name) =>
      fetchJson(`${TCGDEX_BASE}/${lang}/cards?name=${encodeURIComponent(name)}`)
    )
  );

  const list = lists.flatMap((items) => (Array.isArray(items) ? items : []));
  if (!list.length) return null;

  const wantedName = normalizedCardName;
  const wantedNumber = normalizeNumber(card.number);
  const wantedSet = normalizeName(card.setName);
  const isCharizard = wantedName === "dracaufeu" || wantedName === "charizard";

  const sameName = (itemName: string) =>
    itemName === wantedName ||
    itemName.includes(wantedName) ||
    wantedName.includes(itemName) ||
    (isCharizard && (itemName === "charizard" || itemName === "dracaufeu"));

  const match =
    list.find((item: any) => {
      const itemNumber = normalizeNumber(item.localId);
      const itemName = normalizeName(item.name);
      return itemNumber === wantedNumber && sameName(itemName);
    }) ??
    list.find((item: any) => {
      const itemNumber = normalizeNumber(item.localId);
      const itemSet = normalizeName(item.set?.name);
      return (
        itemNumber === wantedNumber &&
        (!wantedSet || itemSet.includes(wantedSet) || wantedSet.includes(itemSet))
      );
    }) ??
    list.find((item: any) => normalizeNumber(item.localId) === wantedNumber);

  if (!match?.id) return null;

  return fetchJson(`${TCGDEX_BASE}/${lang}/cards/${encodeURIComponent(match.id)}`);
}

function mapTcgdexPricing(card: any, usdToEur: number): MarketPayload {
  const cm = card?.pricing?.cardmarket;
  const tcg = card?.pricing?.tcgplayer;

  if (!cm && !tcg) {
    return { sources: { cardmarket: false, tcgplayer: false } };
  }

  const cardmarketPrices: Record<string, number> = {};
  if (cm) {
    const avg = num(cm.avg);
    const low = num(cm.low);
    const trend = num(cm.trend);
    const avg1 = num(cm.avg1);
    const avg7 = num(cm.avg7);
    const avg30 = num(cm.avg30);
    const avgHolo = num(cm["avg-holo"]);
    const lowHolo = num(cm["low-holo"]);
    const trendHolo = num(cm["trend-holo"]);

    if (avg !== undefined) cardmarketPrices.averageSellPrice = avg;
    if (low !== undefined) cardmarketPrices.lowPrice = low;
    if (trend !== undefined) cardmarketPrices.trendPrice = trend;
    if (avg1 !== undefined) cardmarketPrices.avg1 = avg1;
    if (avg7 !== undefined) cardmarketPrices.avg7 = avg7;
    if (avg30 !== undefined) cardmarketPrices.avg30 = avg30;
    if (avgHolo !== undefined) cardmarketPrices.avgHolo = avgHolo;
    if (lowHolo !== undefined) cardmarketPrices.lowHolo = lowHolo;
    if (trendHolo !== undefined) cardmarketPrices.trendHolo = trendHolo;
  }

  const tcgPrices: Record<string, any> = {};
  if (tcg) {
    for (const [key, value] of Object.entries(tcg)) {
      if (!value || typeof value !== "object") continue;
      const v = value as Record<string, unknown>;
      const mapped: Record<string, number> = {};
      const low = num(v.lowPrice);
      const mid = num(v.midPrice);
      const high = num(v.highPrice);
      const market = num(v.marketPrice);
      const directLow = num(v.directLowPrice);
      if (low !== undefined) mapped.low = Number((low * usdToEur).toFixed(2));
      if (mid !== undefined) mapped.mid = Number((mid * usdToEur).toFixed(2));
      if (high !== undefined) mapped.high = Number((high * usdToEur).toFixed(2));
      if (market !== undefined) mapped.market = Number((market * usdToEur).toFixed(2));
      if (directLow !== undefined) mapped.directLow = Number((directLow * usdToEur).toFixed(2));
      if (Object.keys(mapped).length) tcgPrices[key] = mapped;
    }
  }

  return {
    cardmarket: Object.keys(cardmarketPrices).length
      ? {
          prices: cardmarketPrices,
          updatedAt: cm?.updated,
        }
      : undefined,
    tcgplayer: Object.keys(tcgPrices).length
      ? {
          prices: tcgPrices,
          updatedAt: tcg?.updated,
          currency: "EUR",
        }
      : undefined,
    sources: {
      cardmarket: Object.keys(cardmarketPrices).length > 0,
      tcgplayer: Object.keys(tcgPrices).length > 0,
    },
  };
}

async function fetchJustTcg(card: InputCard): Promise<MarketPayload | null> {
  const apiKey = process.env.JUSTTCG_API_KEY;
  if (!apiKey || !card.name) return null;

  const params = new URLSearchParams();
  params.set("q", card.name);
  params.set("game", "pokemon");
  params.set("limit", "20");
  if (card.number) params.set("number", cleanNumber(card.number));
  params.set("condition", "NM");

  const data = await fetchJson(`${JUSTTCG_BASE}/cards?${params.toString()}`, {
    headers: { "x-api-key": apiKey },
  });

  if (!Array.isArray(data?.data)) return null;

  const wantedName = normalizeName(card.name);
  const wantedNumber = normalizeNumber(card.number);
  const wantedSet = normalizeName(card.setName);
  const wantedSetId = normalizeName(card.setId);

  const matched = data.data.find((item: any) => {
    const sameNumber =
      !wantedNumber || normalizeNumber(item.number) === wantedNumber;
    const sameName =
      normalizeName(item.name) === wantedName ||
      normalizeName(item.name).includes(wantedName) ||
      wantedName.includes(normalizeName(item.name));
    const itemSetId = normalizeName(item.set_id ?? item.setId);
    const sameSetId =
      !wantedSetId ||
      !itemSetId ||
      itemSetId === wantedSetId;
    const sameSet =
      !wantedSet ||
      normalizeName(item.set_name).includes(wantedSet) ||
      wantedSet.includes(normalizeName(item.set_name));

    return sameNumber && sameName && sameSet && sameSetId;
  }) ?? data.data.find((item: any) => {
    const itemSetId = normalizeName(item.set_id ?? item.setId);
    const sameSetId = !wantedSetId || !itemSetId || itemSetId === wantedSetId;
    return (
      sameSetId &&
      normalizeNumber(item.number) === wantedNumber &&
      (normalizeName(item.name) === wantedName ||
        normalizeName(item.name).includes(wantedName) ||
        wantedName.includes(normalizeName(item.name)))
    );
  });

  if (!matched) return null;

  const variants = Array.isArray(matched.variants) ? matched.variants : [];
  const usable = variants.filter((variant: any) =>
    String(variant.condition).toLowerCase() === "near mint" &&
    String(variant.language ?? "English").toLowerCase() === "english" &&
    num(variant.price) !== undefined
  );

  if (!usable.length) return null;

  // JustTCG exposes one price per condition × printing variant. Never pick a
  // variant only because it is the most expensive one: that can associate a
  // holo/reverse/1st-edition price with a normal or promo card.
  const variantRank = (printing: unknown): number => {
    const value = String(printing ?? "").toLowerCase();
    const wanted = String(card.variant ?? "").toLowerCase();
    const isFirst = /1st|first edition/.test(value);
    const isHolo = /foil|holo/.test(value);
    const isReverse = /reverse/.test(value);
    const isNormal = /normal|unlimited/.test(value);

    let score = 0;
    if (wanted.includes("full art") && /full art/.test(value)) score += 100;
    if (wanted.includes("alt art") && /alt|alternate/.test(value)) score += 100;
    if (wanted.includes("rainbow") && /rainbow/.test(value)) score += 100;
    if (wanted.includes("gold") && /gold/.test(value)) score += 100;
    if (wanted.includes("shiny") && /shiny/.test(value)) score += 100;
    if (wanted.includes("normal") && isNormal) score += 90;
    if (wanted.includes("holo") && isHolo && !isReverse) score += 90;
    if (wanted.includes("reverse") && isReverse) score += 90;
    if (isFirst) score -= 1000;
    if (isNormal) score += 20;
    if (isHolo && !isReverse) score += 10;
    return score;
  };

  const sorted = [...usable].sort((a: any, b: any) => {
    const rankDiff = variantRank(b.printing) - variantRank(a.printing);
    if (rankDiff !== 0) return rankDiff;
    return (num(b.price) ?? 0) - (num(a.price) ?? 0);
  });

  const selected = sorted[0];
  const marketUsd = num(selected.price);
  if (marketUsd === undefined) return null;

  // JustTCG prices are USD. Convert exactly once here; never apply a second
  // synthetic conversion in the client-side normalizer.
  const market = Number((marketUsd * 0.92).toFixed(2));
  const low = market;
  const high = market;

  return {
    tcgplayer: {
      prices: {
        normal: {
          market,
          low,
          high,
        },
      },
      currency: "EUR",
      updatedAt: selected.lastUpdated
        ? new Date(Number(selected.lastUpdated) * 1000).toISOString()
        : undefined,
    },
    sources: {
      cardmarket: false,
      tcgplayer: true,
    },
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const cards = Array.isArray(body?.cards) ? (body.cards as InputCard[]) : [];

    if (!cards.length) {
      return NextResponse.json({ success: true, prices: {} });
    }

    const uniqueCards = Array.from(
      new Map(cards.filter((card) => card?.id).map((card) => [card.id, card])).values()
    ).slice(0, 30);

    const usdToEur = await getUsdToEurRate();

    const results = await mapWithConcurrency(uniqueCards, 5, async (card) => {
      const cacheKey = `${card.id}:${card.language ?? "en"}`;
      const cached = priceCache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        return [card.id, cached.payload] as const;
      }

      // 1. Source exacte par ID pour les cartes Pokémon TCG API.
      // 2. TCGdex en secours pour les cartes multilingues ou si une source manque.
      // 3. JustTCG uniquement en dernier recours pour le prix NM TCGPlayer.
      const exactCard = await fetchPokemonTcgExact(card);
      const exactMarket = exactCard
        ? mapPokemonTcgPricing(exactCard, usdToEur)
        : { sources: { cardmarket: false, tcgplayer: false } };

      let merged = exactMarket;
      if (!exactMarket.cardmarket || !exactMarket.tcgplayer) {
        const tcgdexCard = await fetchTcgdexCard(card);
        const tcgdexMarket = tcgdexCard
          ? mapTcgdexPricing(tcgdexCard, usdToEur)
          : null;
        merged = mergeMarketPayload(exactMarket, tcgdexMarket);
      }

      if (!merged.tcgplayer) {
        const justTcg = await fetchJustTcg(card);
        merged = mergeMarketPayload(merged, justTcg);
      }

      priceCache.set(cacheKey, {
        expiresAt: Date.now() + PRICE_CACHE_TTL,
        payload: merged,
      });

      return [card.id, merged] as const;
    });

    return NextResponse.json({
      success: true,
      prices: Object.fromEntries(results),
    });
  } catch (error) {
    console.error("[API /prices] Error:", error);
    return NextResponse.json(
      { success: false, error: "Impossible de récupérer les prix marché." },
      { status: 500 }
    );
  }
}

