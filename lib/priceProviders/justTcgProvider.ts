// lib/priceProviders/justTcgProvider.ts

import { JustTCG } from "justtcg-js";
import type { CardPrice, PokemonCard } from "../types";

const apiKey = process.env.JUSTTCG_API_KEY;
const client = apiKey ? new JustTCG({ apiKey }) : null;

const USD_TO_EUR = 0.92;

export interface JustTcgPriceResponse {
  marketPrice: number;
  lowPrice?: number;
  highPrice?: number;
}

/**
 * JustTCG v1 stocke les prix sur `variants`.
 * Chaque variant porte sa condition, son printing et son prix en USD.
 */
export async function fetchPricesFromJustTCG(
  card: PokemonCard
): Promise<{
  tcgplayer?: {
    prices: {
      normal?: CardPrice;
      holofoil?: CardPrice;
      reverseHolofoil?: CardPrice;
    };
  };
} | null> {
  if (!client || !card?.name) return null;

  try {
    const response = await client.v1.cards.get({
      q: card.name,
      game: "pokemon",
      number: card.number || undefined,
      condition: "NM",
      limit: 20,
    } as any);

    if (response.error || !response.data?.length) {
      return null;
    }

    const wantedName = card.name.toLowerCase().replace(/[^a-z0-9]/g, "");
    const wantedSet = (card.set?.name || "").toLowerCase().replace(/[^a-z0-9]/g, "");

    const matched =
      response.data.find((item: any) => {
        const itemName = String(item.name || "")
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "");
        const itemSet = String(item.set_name || "")
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "");
        return (
          item.number === card.number &&
          (itemName === wantedName ||
            itemName.includes(wantedName) ||
            wantedName.includes(itemName)) &&
          (!wantedSet ||
            itemSet.includes(wantedSet) ||
            wantedSet.includes(itemSet))
        );
      }) ??
      response.data.find(
        (item: any) =>
          item.number === card.number &&
          String(item.name || "")
            .toLowerCase()
            .replace(/[^a-z0-9]/g, "")
            .includes(wantedName)
      );

    if (!matched || !Array.isArray(matched.variants)) return null;

    const nmPrices = matched.variants
      .filter(
        (variant: any) =>
          String(variant.condition || "").toLowerCase() === "near mint" &&
          Number.isFinite(Number(variant.price)) &&
          Number(variant.price) > 0
      )
      .map((variant: any) => Number(variant.price));

    if (!nmPrices.length) return null;

    const marketUsd =
      nmPrices.reduce((sum: number, price: number) => sum + price, 0) /
      nmPrices.length;

    const toEur = (value: number) =>
      Number((value * USD_TO_EUR).toFixed(2));

    return {
      tcgplayer: {
        prices: {
          normal: {
            market: toEur(marketUsd),
            low: toEur(Math.min(...nmPrices)),
            high: toEur(Math.max(...nmPrices)),
          },
        },
      },
    };
  } catch (error) {
    console.error(
      `[JustTCG] Erreur pour ${card.id}:`,
      (error as Error).message
    );
    return null;
  }
}
