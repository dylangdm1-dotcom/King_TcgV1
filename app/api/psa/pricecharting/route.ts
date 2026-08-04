import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function decodeHtml(value: string): string {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/p>/gi, " ")
    .replace(/<\/div>/gi, " ")
    .replace(/<\/td>/gi, " ")
    .replace(/<\/th>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&nbsp;/gi, " ")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, code) =>
      String.fromCharCode(Number(code))
    )
    .replace(/&#x([0-9a-f]+);/gi, (_, code) =>
      String.fromCharCode(parseInt(code, 16))
    )
    .replace(/\s+/g, " ")
    .trim();
}

function extractPrice(
  html: string,
  id: string
): number | null {
  const regex = new RegExp(
    `<td[^>]*id=["']${id}["'][^>]*>[\\s\\S]*?<span[^>]*class=["'][^"']*price[^"']*["'][^>]*>\\s*\\$([0-9,]+(?:\\.[0-9]+)?)`,
    "i"
  );

  const match = html.match(regex);

  if (!match) {
    return null;
  }

  const value = Number(
    match[1].replace(/,/g, "")
  );

  return Number.isFinite(value) ? value : null;
}

function extractRecentSales(html: string) {
  const rows =
    html.match(
      /<tr\b[^>]*id=["'][^"']+["'][^>]*>[\s\S]*?<\/tr>/gi
    ) ?? [];

  const sales = [];

  for (const row of rows) {
    const dateMatch =
      row.match(
        /<td[^>]*class=["'][^"']*\bdate\b[^"']*["'][^>]*>\s*([^<]+)\s*<\/td>/i
      );

    const titleMatch =
      row.match(
        /<td[^>]*class=["'][^"']*\btitle\b[^"']*["'][^>]*>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/i
      );

    const priceMatch =
      row.match(
        /<td[^>]*class=["'][^"']*\bnumeric\b[^"']*["'][^>]*>[\s\S]*?\$([0-9,]+(?:\.[0-9]+)?)/i
      );

    if (!dateMatch || !titleMatch || !priceMatch) {
      continue;
    }

    const title = decodeHtml(titleMatch[1]);

    const price = Number(
      priceMatch[1].replace(/,/g, "")
    );

    if (!Number.isFinite(price)) {
      continue;
    }

    const lowerTitle = title.toLowerCase();

    /**
     * On garde uniquement les ventes qui semblent
     * correspondre à la fiche consultée.
     *
     * Cela évite notamment de remonter des cartes
     * chinoises/japonaises ou d'autres variantes
     * mélangées dans les résultats.
     */
    const isRelevant =
      lowerTitle.includes("charizard") &&
      (
        lowerTitle.includes("vmax") ||
        lowerTitle.includes("020/189") ||
        lowerTitle.includes("#20")
      );

    if (!isRelevant) {
      continue;
    }

    sales.push({
      date: dateMatch[1].trim(),
      title,
      priceUsd: price,
    });

    if (sales.length >= 20) {
      break;
    }
  }

  return sales;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const query = searchParams.get("q")?.trim();

  if (!query) {
    return NextResponse.json(
      {
        success: false,
        error: "Recherche vide.",
      },
      { status: 400 }
    );
  }

  /**
   * Fiche actuellement validée pour le test.
   *
   * IMPORTANT :
   * pour l'instant on conserve cette URL afin
   * de valider toute la chaîne d'extraction.
   */
  const productUrl =
    "https://www.pricecharting.com/game/pokemon-darkness-ablaze/charizard-vmax-20";

  try {
    const controller = new AbortController();

    const timeout = setTimeout(() => {
      controller.abort();
    }, 15000);

    let response: Response;

    try {
      response = await fetch(productUrl, {
        method: "GET",

        headers: {
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",

          "Accept-Language":
            "en-US,en;q=0.9",

          "Cache-Control":
            "no-cache",

          Pragma:
            "no-cache",

          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/150.0 Safari/537.36",
        },

        cache: "no-store",
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      throw new Error(
        `PriceCharting fiche HTTP ${response.status}`
      );
    }

    const html = await response.text();

    if (!html || html.length < 1000) {
      throw new Error(
        "Réponse PriceCharting vide ou invalide."
      );
    }

    /**
     * Prix actuels uniquement.
     *
     * IMPORTANT :
     * aucun historicalPrices ici.
     * Aucun graphique d'évolution.
     */
    const prices = {
      ungraded: extractPrice(
        html,
        "used_price"
      ),

      grade7: extractPrice(
        html,
        "complete_price"
      ),

      grade8: extractPrice(
        html,
        "new_price"
      ),

      grade9: extractPrice(
        html,
        "graded_price"
      ),

      grade9_5: extractPrice(
        html,
        "box_only_price"
      ),

      psa10: extractPrice(
        html,
        "manual_only_price"
      ),
    };

    /**
     * Ventes récentes.
     *
     * Ce ne sont PAS des historiques de prix.
     * Ce sont simplement les ventes récentes
     * utilisées comme données de marché.
     */
    const recentSales =
      extractRecentSales(html);

    return NextResponse.json({
      success: true,

      productUrl,

      query,

      prices,

      recentSales,

      /**
       * Indique clairement au frontend
       * quelles données sont disponibles.
       */
      availableGrades: [
        "ungraded",
        "grade7",
        "grade8",
        "grade9",
        "grade9_5",
        "psa10",
      ],
    });
  } catch (error) {
    console.error(
      "PriceCharting product error:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        productUrl,

        error:
          error instanceof Error
            ? error.message
            : "Erreur inconnue",
      },
      {
        status: 502,
      }
    );
  }
}
