import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function decodeHtml(value: string): string {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function GET(request: Request) {
  const { searchParams } =
    new URL(request.url);

  const query =
    searchParams.get("q")?.trim();

  if (!query) {
    return NextResponse.json(
      {
        success: false,
        error: "Recherche vide.",
      },
      { status: 400 }
    );
  }

  const searchUrl =
    `https://www.pricecharting.com/search-products` +
    `?type=prices` +
    `&view=table` +
    `&q=${encodeURIComponent(query)}`;

  try {
    const controller =
      new AbortController();

    const timeout =
      setTimeout(() => {
        controller.abort();
      }, 15000);

    let response: Response;

    try {
      response = await fetch(searchUrl, {
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
        `PriceCharting HTTP ${response.status}`
      );
    }

    const html =
      await response.text();

    const trMatches =
      html.match(
        /<tr\b[^>]*>[\s\S]*?<\/tr>/gi
      ) ?? [];

    /**
     * On prend seulement les 5 premières lignes.
     *
     * Cela permet de diagnostiquer la structure
     * sans renvoyer les 216k caractères.
     */
    const firstRows =
      trMatches
        .slice(0, 5)
        .map((row, index) => ({
          index,
          raw: row,
          decoded: decodeHtml(row),
        }));

    /**
     * Recherche très large de "charizard"
     * directement dans le HTML.
     */
    const charizardIndex =
      html.toLowerCase().indexOf("charizard");

    let charizardContext = "";

    if (charizardIndex >= 0) {
      charizardContext =
        html.slice(
          Math.max(0, charizardIndex - 1500),
          Math.min(
            html.length,
            charizardIndex + 5000
          )
        );
    }

    /**
     * Recherche de tous les href présents
     * dans les premiers résultats.
     */
    const hrefMatches =
      html.match(
        /href\s*=\s*["'][^"']+["']/gi
      ) ?? [];

    return NextResponse.json({
      success: true,
      query,
      htmlLength: html.length,
      trCount: trMatches.length,

      debug: {
        firstRows,

        charizardFound:
          charizardIndex >= 0,

        charizardContext,

        hrefExamples:
          hrefMatches.slice(0, 50),
      },
    });
  } catch (error) {
    console.error(
      "PriceCharting diagnostic error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Erreur inconnue",
      },
      { status: 502 }
    );
  }
}
