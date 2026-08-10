import { getCardPrice, type MarketQuote, type MarketSyncStatus, type PokemonCard } from "./types";

type Item = {
  cardmarket?: PokemonCard["cardmarket"];
  tcgplayer?: PokemonCard["tcgplayer"];
  justtcg?: PokemonCard["justtcg"];
  ebayListings?: PokemonCard["ebayListings"];
  quotes?: unknown;
  estimate?: PokemonCard["marketEstimate"];
  status?: MarketSyncStatus;
  sources?: PokemonCard["marketSources"];
};
type Response = { success?: boolean; prices?: Record<string, Item> };
const BATCH = 20;
function language(card: PokemonCard) {
  if (card.dataLanguage) return card.dataLanguage;
  if (card.id.startsWith("tcgdex-ja-")) return "ja";
  if (card.id.startsWith("tcgdex-zh-")) return "zh-tw";
  if (card.id.startsWith("tcgdex-fr-")) return "fr";
  return "en";
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
      headers: { "Content-Type": "application/json", "X-King-TCG-Price-Version": "45" },
      signal: controller.signal,
      body: JSON.stringify({ cards: cards.map((card) => ({
        id: card.id, name: card.name, number: card.number,
        setId: card.set?.id, setName: card.set?.name,
        variant: card.variant, rarity: card.rarity, language: language(card),
      })) }),
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data && typeof data === "object" ? data : null;
  } catch { return null; }
  finally { window.clearTimeout(timer); }
}
export async function enrichCardsWithMarketPrices(cards: PokemonCard[]) {
  if (!cards.length) return cards;
  const resultMap = new Map(cards.map((card) => [card.id, card]));
  const groups: PokemonCard[][] = [];
  for (let index = 0; index < cards.length; index += BATCH) groups.push(cards.slice(index, index + BATCH));
  const settled = await Promise.allSettled(groups.map((group) => batch(group)));
  settled.forEach((result, index) => {
    if (result.status !== "fulfilled" || !result.value?.success || !result.value.prices) return;
    for (const card of groups[index]) resultMap.set(card.id, merge(card, result.value.prices[card.id]));
  });
  return cards.map((card) => resultMap.get(card.id) ?? card);
}
