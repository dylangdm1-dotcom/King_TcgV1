import { getCardPrice, type PokemonCard } from "./types";

type PriceResponse = {
  success?: boolean;
  prices?: Record<
    string,
    {
      cardmarket?: PokemonCard["cardmarket"];
      tcgplayer?: PokemonCard["tcgplayer"];
    }
  >;
};

export async function enrichCardsWithMarketPrices(
  cards: PokemonCard[]
): Promise<PokemonCard[]> {
  if (!Array.isArray(cards) || cards.length === 0) return cards;

  try {
    const response = await fetch("/api/prices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cards: cards.map((card) => ({
          id: card.id,
          name: card.name,
          number: card.number,
          setId: card.set?.id,
          setName: card.set?.name,
          variant: card.variant,
          rarity: card.rarity,
          language: card.id.startsWith("tcgdex-ja-")
            ? "ja"
            : card.id.startsWith("tcgdex-zh-")
              ? "zh-tw"
              : card.id.startsWith("tcgdex-fr-")
                ? "fr"
                : "en",
        })),
      }),
    });

    if (!response.ok) return cards;

    const data = (await response.json()) as PriceResponse;
    if (!data.success || !data.prices) return cards;

    return cards.map((card) => {
      const pricing = data.prices?.[card.id];
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
      };

      return {
        ...mergedCard,
        computedPrice: getCardPrice(mergedCard),
      };
    });
  } catch {
    return cards;
  }
}
