import { getCardPrice, type MarketQuote, type MarketSyncStatus, type PokemonCard } from "./types";

type Item = {
  cardmarket?: PokemonCard["cardmarket"];
  tcgplayer?: PokemonCard["tcgplayer"];
  justtcg?: PokemonCard["justtcg"];
  ebayListings?: PokemonCard["ebayListings"];
  quotes?: unknown;
  debugCardmarketFr?: PokemonCard["debugCardmarketFr"];
  debugJustTcg?: PokemonCard["debugJustTcg"];
  estimate?: PokemonCard["marketEstimate"];
  status?: MarketSyncStatus;
  sources?: PokemonCard["marketSources"];
};
type Response = { success?: boolean; prices?: Record<string, Item> };
const BATCH = 20;
const PRICE_CACHE_KEY = "king_tcg_market_price_cache_v17_tcgdex_filtered_identity";
const LEGACY_PRICE_CACHE_KEYS = [
  "king_tcg_market_price_cache_v1",
  "king_tcg_market_price_cache_v2_variant_condition",
  "king_tcg_market_price_cache_v3_fr_nm_ebay_robust",
  "king_tcg_market_price_cache_v4_cardmarket_seller_row",
  "king_tcg_market_price_cache_v5_cardmarket_fr_article_row",
] as const;
const PRICE_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const PRICE_CACHE_MAX_ENTRIES = 200;

type CachedMarketCard = {
  updatedAt: number;
  card: PokemonCard;
};

function readPriceCache(): Record<string, CachedMarketCard> {
  if (typeof window === "undefined") return {};
  try {
    LEGACY_PRICE_CACHE_KEYS.forEach((key) => localStorage.removeItem(key));
    const raw = localStorage.getItem(PRICE_CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writePriceCache(cache: Record<string, CachedMarketCard>) {
  if (typeof window === "undefined") return;
  try {
    const bounded = Object.fromEntries(
      Object.entries(cache)
        .sort(([, left], [, right]) => right.updatedAt - left.updatedAt)
        .slice(0, PRICE_CACHE_MAX_ENTRIES)
    );
    localStorage.setItem(PRICE_CACHE_KEY, JSON.stringify(bounded));
  } catch {}
}

function mergeCachedMarket(base: PokemonCard, cached: PokemonCard): PokemonCard {
  const next: PokemonCard = {
    ...base,
    cardmarket: cached.cardmarket ?? base.cardmarket,
    tcgplayer: cached.tcgplayer ?? base.tcgplayer,
    justtcg: cached.justtcg ?? base.justtcg,
    ebayListings: cached.ebayListings ?? base.ebayListings,
    marketQuotes: cached.marketQuotes ?? base.marketQuotes,
    debugCardmarketFr: cached.debugCardmarketFr ?? base.debugCardmarketFr,
    debugJustTcg: cached.debugJustTcg ?? base.debugJustTcg,
    marketEstimate: cached.marketEstimate ?? base.marketEstimate,
    marketStatus: cached.marketStatus ?? base.marketStatus,
    marketSources: { ...base.marketSources, ...cached.marketSources },
  };
  return { ...next, computedPrice: getCardPrice(next) };
}
function language(card: PokemonCard) {
  if (card.dataLanguage) return card.dataLanguage;
  if (card.id.startsWith("tcgdex-ja-")) return "ja";
  if (card.id.startsWith("tcgdex-zh-")) return "zh-tw";
  if (card.id.startsWith("tcgdex-fr-")) return "fr";
  return "en";
}

function activePrintVariant(card: PokemonCard) {
  const variants = card.availablePrintVariants || [];
  const selectedKey = card.selectedPrintVariant || variants[0]?.key || "Normal";
  return {
    key: selectedKey,
    detail: variants.find((variant) => variant.key === selectedKey),
  };
}

function cacheToken(value: unknown): string {
  return encodeURIComponent(String(value ?? "").trim().toLowerCase());
}

function priceRequestKey(card: PokemonCard): string {
  const printing = activePrintVariant(card).key;
  return [
    "price-v10-tcgdex-filtered-identity",
    card.id,
    language(card),
    card.set?.id,
    card.number,
    printing,
    card.condition || "Near Mint",
  ].map(cacheToken).join(":");
}
function safeQuotes(value: unknown): MarketQuote[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((raw: any) => {
    const price = Number(raw?.price);
    if (!Number.isFinite(price) || price <= 0) return [];
    const quoteLanguage = ["fr", "en", "ja", "zh-tw", "multi"].includes(raw?.language) ? raw.language : "multi";
    return [{
      source: ["pokewallet", "cardmarket", "tcgplayer", "justtcg", "ebay"].includes(raw?.source) ? raw.source : "cardmarket",
      label: String(raw?.label || "Cotation marché"),
      price: Number(price.toFixed(2)),
      currency: "EUR",
      language: quoteLanguage,
      condition: raw?.condition || "Unknown",
      metric: raw?.metric || "market",
      classification: raw?.classification || "indicative",
      compatible: Boolean(raw?.compatible),
      confidence: raw?.confidence || "limited",
      url: typeof raw?.url === "string" ? raw.url : undefined,
      updatedAt: typeof raw?.updatedAt === "string" ? raw.updatedAt : undefined,
      sampleSize: Number.isFinite(Number(raw?.sampleSize)) ? Number(raw.sampleSize) : undefined,
    } as MarketQuote];
  });
}
function merge(card: PokemonCard, payload?: Item): PokemonCard {
  if (!payload) return card;
  const next: PokemonCard = {
    ...card,
    cardmarket: payload.cardmarket ?? card.cardmarket,
    tcgplayer: payload.tcgplayer ?? card.tcgplayer,
    justtcg: payload.justtcg ?? card.justtcg,
    ebayListings: payload.ebayListings ?? card.ebayListings,
    marketQuotes: safeQuotes(payload.quotes),
    debugCardmarketFr: payload.debugCardmarketFr ?? card.debugCardmarketFr,
    debugJustTcg: payload.debugJustTcg ?? card.debugJustTcg,
    marketEstimate: payload.estimate ?? card.marketEstimate,
    marketStatus: payload.status ?? card.marketStatus,
    marketSources: { ...card.marketSources, ...payload.sources },
  };
  return { ...next, computedPrice: getCardPrice(next) };
}
async function batch(cards: PokemonCard[]): Promise<Response | null> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 25000);
  try {
    const response = await fetch("/api/prices", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-King-TCG-Price-Version": "72" },
      signal: controller.signal,
      body: JSON.stringify({ cards: cards.map((card) => {
        const activeVariant = activePrintVariant(card);
        return {
          requestKey: priceRequestKey(card),
          id: card.id,
          providerId: (card as any).providerId,
          name: card.name,
          number: card.number,
          setId: card.set?.id,
          setName: card.set?.name,
          variant: card.variant,
          printingVariant: activeVariant.key,
          condition: card.condition || "Near Mint",
          rarity: card.rarity,
          language: language(card),
          variantCardmarketId: activeVariant.detail?.cardmarketId,
          variantTcgplayerId: activeVariant.detail?.tcgplayerId,
          directCardmarketUrl: card.cardmarket?.url,
          variantPricing: activeVariant.detail?.pricing,
          ...(language(card) === "zh-tw" ? { embeddedCardmarket: card.cardmarket, embeddedTcgplayer: card.tcgplayer } : {}),
        };
      }) }),
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data && typeof data === "object" ? data : null;
  } catch { return null; }
  finally { window.clearTimeout(timer); }
}
export async function enrichCardsWithMarketPrices(cards: PokemonCard[]) {
  if (!cards.length) return cards;

  const now = Date.now();
  const priceCache = readPriceCache();
  const resultMap = new Map<string, PokemonCard>();
  const cardsToRefresh: PokemonCard[] = [];

  for (const card of cards) {
    const requestKey = priceRequestKey(card);
    const cached = priceCache[requestKey];
    if (
      cached?.card &&
      Number.isFinite(cached.updatedAt) &&
      now - cached.updatedAt < PRICE_CACHE_TTL_MS
    ) {
      resultMap.set(requestKey, mergeCachedMarket(card, cached.card));
    } else {
      resultMap.set(requestKey, card);
      cardsToRefresh.push(card);
    }
  }

  const groups: PokemonCard[][] = [];
  for (let index = 0; index < cardsToRefresh.length; index += BATCH) {
    groups.push(cardsToRefresh.slice(index, index + BATCH));
  }

  if (groups.length) {
    const settled = await Promise.allSettled(groups.map((group) => batch(group)));
    settled.forEach((result, index) => {
      if (result.status !== "fulfilled" || !result.value?.success || !result.value.prices) return;
      for (const card of groups[index]) {
        const requestKey = priceRequestKey(card);
        const enriched = merge(
          card,
          result.value.prices[requestKey] ?? result.value.prices[card.id]
        );
        resultMap.set(requestKey, enriched);
        priceCache[requestKey] = { updatedAt: now, card: enriched };
      }
    });
    writePriceCache(priceCache);

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("king_tcg_market_price_update"));
      window.dispatchEvent(new CustomEvent("king_tcg_update"));
    }
  }

  return cards.map((card) => resultMap.get(priceRequestKey(card)) ?? card);
}
