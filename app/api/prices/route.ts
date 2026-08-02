// app/api/prices/route.ts

import { NextResponse } from "next/server";

import {
  searchPricesFromJustTCG,
} from "@/lib/priceProviders/JustTcgProvider";

/**
 * =====================================================
 * 💰 KING_TCG V5.0 — PRICE API
 * =====================================================
 *
 * Passerelle serveur entre King_TCG et les providers
 * de prix.
 *
 * V5.0 :
 * - Near Mint par défaut
 * - aucune valeur de fallback artificielle
 * - aucune estimation par rareté
 * - prix retourné uniquement s'il existe réellement
 * - condition explicitement transmise au provider
 * - JustTCG reste une source indépendante
 *
 * IMPORTANT :
 * JUSTTCG_API_KEY reste uniquement côté serveur.
 * Elle n'est jamais exposée au navigateur.
 *
 * =====================================================
 */

export const dynamic = "force-dynamic";

// =====================================================
// 📦 REQUEST
// =====================================================

type CardCondition =
  | "Mint"
  | "Near Mint"
  | "Excellent"
  | "Good"
  | "Light Played"
  | "Played"
  | "Poor";

const DEFAULT_CONDITION: CardCondition = "Near Mint";

type PriceRequest = {
  name?: string;
  number?: string;
  setName?: string;
  rarity?: string;

  /**
   * Near Mint par défaut.
   */
  condition?: CardCondition | string;
};

// =====================================================
// 🧹 CONDITION
// =====================================================

function normalizeCondition(
  condition?: string
): CardCondition {
  const normalized = String(
    condition || DEFAULT_CONDITION
  )
    .trim()
    .toLowerCase();

  const conditions: Record<
    string,
    CardCondition
  > = {
    mint: "Mint",

    "near mint": "Near Mint",
    nm: "Near Mint",

    excellent: "Excellent",
    ex: "Excellent",

    good: "Good",

    "light played": "Light Played",
    lp: "Light Played",

    played: "Played",
    mp: "Played",

    poor: "Poor",
    damaged: "Poor",
  };

  return (
    conditions[normalized] ??
    DEFAULT_CONDITION
  );
}

// =====================================================
// 🔢 PRICE NORMALIZATION
// =====================================================

function normalizePrice(
  value: unknown
): number | null {
  const price = Number(value);

  if (
    !Number.isFinite(price) ||
    price <= 0
  ) {
    return null;
  }

  return Number(price.toFixed(2));
}

// =====================================================
// 🚀 POST
// =====================================================

export async function POST(
  request: Request
) {
  try {
    const body =
      (await request.json()) as PriceRequest;

    const name =
      String(body.name || "").trim();

    const number =
      String(body.number || "").trim();

    const setName =
      String(body.setName || "").trim();

    const rarity =
      String(body.rarity || "").trim();

    const condition =
      normalizeCondition(body.condition);

    // -------------------------------------------------
    // VALIDATION
    // -------------------------------------------------

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          found: false,

          price: null,

          source: null,

          condition,

          error:
            "Nom de carte manquant.",
        },
        { status: 400 }
      );
    }

    // -------------------------------------------------
    // JUSTTCG
    // -------------------------------------------------
    //
    // Le provider reçoit explicitement la condition.
    //
    // Near Mint est donc utilisé par défaut.
    //
    // IMPORTANT :
    // le provider doit réellement retourner le prix
    // correspondant à cette condition.
    // -------------------------------------------------

    const result =
      await searchPricesFromJustTCG({
        name,
        number,
        setName,
        rarity,

        condition,
      });

    // -------------------------------------------------
    // AUCUNE DONNÉE RÉELLE
    // -------------------------------------------------
    //
    // Aucun fallback.
    //
    // null = prix indisponible.
    // -------------------------------------------------

    if (!result) {
      return NextResponse.json(
        {
          success: false,
          found: false,

          price: null,

          lowPrice: null,
          highPrice: null,

          priceUSD: null,

          source: null,

          condition,

          cardId: null,
          cardName: null,
          setName: null,
          number: null,
          rarity: null,
          variant: null,
        },
        { status: 200 }
      );
    }

    // -------------------------------------------------
    // NORMALISATION DES PRIX
    // -------------------------------------------------

    const marketPriceEUR =
      normalizePrice(
        result.marketPriceEUR
      );

    const lowPriceEUR =
      normalizePrice(
        result.lowPriceEUR
      );

    const highPriceEUR =
      normalizePrice(
        result.highPriceEUR
      );

    const marketPriceUSD =
      normalizePrice(
        result.marketPriceUSD
      );

    // -------------------------------------------------
    // PROTECTION
    // -------------------------------------------------
    //
    // Si JustTCG renvoie un résultat mais aucun prix
    // exploitable, ce n'est PAS un prix valide.
    // -------------------------------------------------

    if (
      marketPriceEUR === null &&
      lowPriceEUR === null &&
      highPriceEUR === null
    ) {
      return NextResponse.json(
        {
          success: false,
          found: false,

          price: null,

          lowPrice: null,
          highPrice: null,

          priceUSD: marketPriceUSD,

          source: null,

          condition,

          cardId:
            result.cardId ?? null,

          cardName:
            result.cardName ?? null,

          setName:
            result.setName ?? null,

          number:
            result.number ?? null,

          rarity:
            result.rarity ?? null,

          variant:
            result.variant ?? null,
        },
        { status: 200 }
      );
    }

    // -------------------------------------------------
    // RÉPONSE JUSTTCG RÉELLE
    // -------------------------------------------------

    return NextResponse.json(
      {
        success: true,
        found: true,

        cardId:
          result.cardId ?? null,

        cardName:
          result.cardName ?? name,

        setName:
          result.setName ?? setName,

        number:
          result.number ?? number,

        rarity:
          result.rarity ?? rarity,

        variant:
          result.variant ?? null,

        // Prix principal réellement disponible.
        price: marketPriceEUR,

        // Prix complémentaires réellement disponibles.
        priceUSD: marketPriceUSD,

        lowPrice: lowPriceEUR,

        highPrice: highPriceEUR,

        /**
         * Condition demandée.
         */
        condition,

        /**
         * Source explicite.
         */
        source: "JustTCG",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(
      "[King_TCG V5.0 Price API]",
      error
    );

    return NextResponse.json(
      {
        success: false,
        found: false,

        price: null,

        lowPrice: null,
        highPrice: null,

        priceUSD: null,

        source: null,

        condition:
          DEFAULT_CONDITION,

        error:
          "Erreur lors de la récupération du prix.",
      },
      { status: 500 }
    );
  }
}
