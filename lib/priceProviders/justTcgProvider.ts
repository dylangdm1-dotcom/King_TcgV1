// lib/priceProviders/justTcgProvider.ts

import { JustTCG } from "justtcg-js";
import type { CardPrice, PokemonCard } from "../types";

const apiKey = process.env.JUSTTCG_API_KEY;
const client = apiKey ? new JustTCG({ apiKey }) : null;

const USD_TO_EUR = 0.92;

function normalizeNumber(value?: string): string {
  const clean = String(value ?? "").trim().split("/")[0].trim().toLowerCase();
  return clean.replace(/^0+/, "") || "0";
}

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
    currency: "EUR";
    prices: {
      normal?: CardPrice;
      holofoil?: CardPrice;
      reverseHolofoil?: CardPrice;
    };
  };
} | null> {
  if (!client || !card?.name) return null;

  try {
    const normalizedCardName = card.name.toLowerCase().replace(/[^a-z0-9]/g, "");
    const queries =
      normalizedCardName === "dracaufeu" || normalizedCardName === "charizard"
        ? ["Dracaufeu", "Charizard"]
        : [card.name];

    const responses = await Promise.all(
      queries.map((q) =>
        client!.v1.cards.get({
          q,
          game: "pokemon",
          number: card.number || undefined,
          condition: "NM",
          limit: 20,
        } as any)
      )
    );
    const responseData = responses.flatMap((r: any) =>
      Array.isArray(r?.data) ? r.data : []
    );

    if (!responseData.length) return null;

    const wantedName = normalizedCardName;
    const wantedSet = (card.set?.name || "").toLowerCase().replace(/[^a-z0-9]/g, "");

    const matched =
      responseData.find((item: any) => {
        const itemName = String(item.name || "")
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "");
        const itemSet = String(item.set_name || "")
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "");
        return (
          normalizeNumber(item.number) === normalizeNumber(card.number) &&
          (itemName === wantedName ||
            itemName.includes(wantedName) ||
            wantedName.includes(itemName)) &&
          (!wantedSet ||
            itemSet.includes(wantedSet) ||
            wantedSet.includes(itemSet))
        );
      }) ??
      responseData.find(
        (item: any) =>
          normalizeNumber(item.number) === normalizeNumber(card.number) &&
          String(item.name || "")
            .toLowerCase()
            .replace(/[^a-z0-9]/g, "")
            .includes(wantedName)
      );

    if (!matched || !Array.isArray(matched.variants)) return null;

    const usable = matched.variants.filter(
      (variant: any) =>
        String(variant.condition || "").toLowerCase() === "near mint" &&
        String(variant.language ?? "English").toLowerCase() === "english" &&
        Number.isFinite(Number(variant.price)) &&
        Number(variant.price) > 0
    );

    if (!usable.length) return null;

    const printingRank = (printing: unknown): number => {
      const value = String(printing ?? "").toLowerCase();
      if (/1st|first edition/.test(value)) return -100;
      if (/foil|holo/.test(value)) return 30;
      if (/normal|unlimited/.test(value)) return 20;
      return 10;
    };

    usable.sort((a: any, b: any) => {
      const rankDiff = printingRank(b.printing) - printingRank(a.printing);
      return rankDiff !== 0 ? rankDiff : Number(b.price) - Number(a.price);
    });

    const selectedPrice = Number(usable[0].price);
    const toEur = (value: number) => Number((value * USD_TO_EUR).toFixed(2));

    return {
      tcgplayer: {
        currency: "EUR",
        prices: {
          normal: {
            market: toEur(selectedPrice),
            low: toEur(selectedPrice),
            high: toEur(selectedPrice),
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
