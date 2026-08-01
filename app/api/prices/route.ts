// app/api/prices/route.ts

import { NextResponse } from "next/server";

import {
  searchPricesFromJustTCG,
} from "@/lib/priceProviders/justTcgProvider";

/**
 * =====================================================
 * 💰 KING_TCG V5 — PRICE API
 * =====================================================
 *
 * Passerelle serveur entre King_TCG et JustTCG.
 *
 * IMPORTANT :
 * JUSTTCG_API_KEY reste uniquement côté serveur.
 * Elle n'est jamais exposée au navigateur.
 * =====================================================
 */

export const dynamic = "force-dynamic";

type PriceRequest = {
  name?: string;
  number?: string;
  setName?: string;
  rarity?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as PriceRequest;

    const name = String(body.name || "").trim();
    const number = String(body.number || "").trim();
    const setName = String(body.setName || "").trim();
    const rarity = String(body.rarity || "").trim();

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          found: false,
          price: null,
          error: "Nom de carte manquant.",
        },
        { status: 400 }
      );
    }

    const result = await searchPricesFromJustTCG({
      name,
      number,
      setName,
      rarity,
    });

    /**
     * Aucun prix JustTCG trouvé.
     *
     * IMPORTANT :
     * On ne met PAS 1.50 € ici.
     *
     * Le fallback 1.50 € doit être géré
     * par le moteur de prix local.
     */
    if (!result) {
      return NextResponse.json(
        {
          success: false,
          found: false,
          price: null,
          source: null,
        },
        { status: 200 }
      );
    }

    /**
     * Prix JustTCG réel.
     */
    return NextResponse.json(
      {
        success: true,
        found: true,

        cardId: result.cardId,
        cardName: result.cardName,
        setName: result.setName,
        number: result.number,
        rarity: result.rarity,

        price: result.marketPriceEUR,
        priceUSD: result.marketPriceUSD,

        lowPrice: result.lowPriceEUR,
        highPrice: result.highPriceEUR,

        variant: result.variant,
        condition: result.condition,

        source: "JustTCG",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[King_TCG Price API]", error);

    return NextResponse.json(
      {
        success: false,
        found: false,
        price: null,
        error: "Erreur lors de la récupération du prix.",
      },
      { status: 500 }
    );
  }
}
