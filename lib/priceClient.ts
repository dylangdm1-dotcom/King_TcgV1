import { getCardPrice, type MarketSyncStatus, type PokemonCard } from "./types";

type PriceResponse = {
  success?: boolean;
  prices?: Record<
    string,
    {
      cardmarket?: PokemonCard["cardmarket"];
      tcgplayer?: PokemonCard["tcgplayer"];
      justtcg?: PokemonCard["justtcg"];
      ebayListings?: PokemonCard["ebayListings"];
      status?: MarketSyncStatus;
      sources?: PokemonCard["marketSources"];
    }
  >;
};

const BATCH_SIZE = 20;
const REQUEST_TIMEOUT = 22000;

function cardLanguage(card: PokemonCard): "fr" | "en" | "ja" | "zh-tw" {
  if (card.dataLanguage) return card.dataLanguage;
  if (card.id.startsWith("tcgdex-ja-")) return "ja";
  if (card.id.startsWith("tcgdex-zh-")) return "zh-tw";
  if (card.id.startsWith("tcgdex-fr-")) return "fr";
  return "en";
}

function mergePricing(
  card: PokemonCard,
  pricing?: NonNullable<PriceResponse["prices"]>[string]
): PokemonCard {
  if (!pricing) return card;

  const mergedCard: PokemonCard = {
    ...card,
    cardmarket: pricing.cardmarket
      ? {
          ...card.cardmarket,
          ...pricing.cardmarket,
          prices: {
            ...card.cardmarket?.prices,
            ...pricing.cardmarket.prices,
          },
        }
      : card.cardmarket,
    tcgplayer: pricing.tcgplayer
      ? {
          ...card.tcgplayer,
          ...pricing.tcgplayer,
          prices: {
            ...card.tcgplayer?.prices,
            ...pricing.tcgplayer.prices,
          },
        }
      : card.tcgplayer,
    justtcg: pricing.justtcg
      ? {
          ...card.justtcg,
          ...pricing.justtcg,
        }
      : card.justtcg,
    ebayListings: pricing.ebayListings
      ? {
          ...card.ebayListings,
          ...pricing.ebayListings,
        }
      : card.ebayListings,
    marketStatus: pricing.status ?? card.marketStatus,
    marketSources: {
      ...card.marketSources,
      ...pricing.sources,
    },
  };

  return mergedCard;
}

async function fetchBatch(cards: PokemonCard[]): Promise<PriceResponse | null> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const response = await fetch("/api/prices", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-King-TCG-Price-Version": "5",
      },
      signal: controller.signal,
      body: JSON.stringify({
        cards: cards.map((card) => ({
          id: card.id,
          name: card.name,
          number: card.number,
          setId: card.set?.id,
          setName: card.set?.name,
          variant: card.variant,
          rarity: card.rarity,
          language: cardLanguage(card),
        })),
      }),
    });

    if (!response.ok) return null;
    return (await response.json()) as PriceResponse;
  } catch {
    return null;
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function enrichCardsWithMarketPrices(
  cards: PokemonCard[]
): Promise<PokemonCard[]> {
  if (!Array.isArray(cards) || cards.length === 0) return cards;

  const uniqueCards = Array.from(
    new Map(cards.map((card) => [card.id, card])).values()
  );
  const mergedById = new Map(uniqueCards.map((card) => [card.id, card]));

  const batches: PokemonCard[][] = [];
  for (let index = 0; index < uniqueCards.length; index += BATCH_SIZE) {
    batches.push(uniqueCards.slice(index, index + BATCH_SIZE));
  }

  // Lots de 20 cartes maximum, conformément à la capacité de la source gratuite.
  // Un seul lot est traité à la fois pour éviter de multiplier les appels externes.
  let cursor = 0;
  const workers = Array.from({ length: Math.min(1, batches.length) }, async () => {
    while (cursor < batches.length) {
      const batch = batches[cursor++];
      let data = await fetchBatch(batch);

      // Un seul nouvel essai sur les échecs temporaires. Les réponses partielles
      // restent utilisables et les prix déjà présents ne sont jamais effacés.
      if (!data?.success) data = await fetchBatch(batch);
      if (!data?.success || !data.prices) continue;

      batch.forEach((card) => {
        const merged = mergePricing(card, data?.prices?.[card.id]);
        mergedById.set(card.id, {
          ...merged,
          computedPrice: getCardPrice(merged),
        } as PokemonCard);
      });
    }
  });

  await Promise.all(workers);
  return cards.map((card) => mergedById.get(card.id) ?? card);
}
