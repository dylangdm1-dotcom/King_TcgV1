import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Result {
  id: string;
  cardName: string;
  setName: string;
  cardNumber: string;
  imageUrl: string;
  sourceUrl: string;
  prices: {
    ungraded: number;
    psa7: number;
    psa8: number;
    psa9: number;
    psa9_5?: number;
    psa10: number;
  };
}

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

function money(value: string | undefined): number {
  if (!value) return 0;

  const cleaned = value
    .replace(/[$€£,\s]/g, "")
    .trim();

  const parsed = Number.parseFloat(cleaned);

  return Number.isFinite(parsed) ? parsed : 0;
}

function extractPrices(rowHtml: string): number[] {
  const rowText = decodeHtml(rowHtml);

  const matches = rowText.match(
    /\$[0-9,]+(?:\.[0-9]+)?/g
  );

  if (!matches) {
    return [];
  }

  return matches.map((value) => money(value));
}

function parseCardTitle(
  title: string
): {
  cardName: string;
  cardNumber: string;
} | null {
  const cleanTitle = decodeHtml(title);

  const match = cleanTitle.match(
    /^(.+?)\s+#([A-Za-z0-9./-]+)$/
  );

  if (!match) {
    return null;
  }

  return {
    cardName: match[1].trim(),
    cardNumber: match[2].trim(),
  };
}

function extractSetName(rowHtml: string): string {
  const linkRegex =
    /<a[^>]+href=["'][^"']+["'][^>]*>([\s\S]*?)<\/a>/gi;

  const links: string[] = [];

  let match: RegExpExecArray | null;

  while ((match = linkRegex.exec(rowHtml)) !== null) {
    const text = decodeHtml(match[1]);

    if (text) {
      links.push(text);
    }
  }

  const pokemonSet = links.find((value) =>
    /^Pokemon\b/i.test(value)
  );

  return pokemonSet ?? "";
}

function parseSearchResults(
  html: string
): {
  results: Result[];
  debug: {
    htmlLength: number;
    trCount: number;
    gameLinkCount: number;
    gameLinkExamples: string[];
    titleExamples: string[];
  };
} {
  const results: Result[] = [];
  const seen = new Set<string>();

  const trMatches =
    html.match(/<tr\b/gi) ?? [];

  const trCount = trMatches.length;

  /**
   * IMPORTANT :
   *
   * On ne dépend plus de <tr> pour trouver les cartes.
   *
   * On cherche directement tous les liens /game/.
   */
  const linkRegex =
    /<a[^>]+href=["'](\/game\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;

  const gameLinkExamples: string[] = [];
  const titleExamples: string[] = [];

  let linkMatch: RegExpExecArray | null;

  while ((linkMatch = linkRegex.exec(html)) !== null) {
    const sourcePath = linkMatch[1];
    const rawTitle = linkMatch[2];

    if (gameLinkExamples.length < 10) {
      gameLinkExamples.push(sourcePath);
    }

    const title = decodeHtml(rawTitle);

    if (titleExamples.length < 10) {
      titleExamples.push(title);
    }

    const sourceUrl =
      `https://www.pricecharting.com${sourcePath}`;

    if (seen.has(sourceUrl)) {
      continue;
    }

    /**
     * On retrouve la ligne <tr> contenant ce lien.
     */
    const rowStart =
      html.lastIndexOf("<tr", linkMatch.index);

    const rowEnd =
      html.indexOf("</tr>", linkMatch.index);

    if (rowStart === -1 || rowEnd === -1) {
      continue;
    }

    const rowHtml =
      html.slice(rowStart, rowEnd + 5);

    const card =
      parseCardTitle(title);

    if (!card) {
      continue;
    }

    const setName =
      extractSetName(rowHtml);

    const prices =
      extractPrices(rowHtml);

    const result: Result = {
      id: sourceUrl,
      cardName: card.cardName,
      setName,
      cardNumber: card.cardNumber,
      imageUrl: "",
      sourceUrl,
      prices: {
        ungraded: prices[0] ?? 0,
        psa7: prices[1] ?? 0,
        psa8: prices[2] ?? 0,
        psa9: 0,
        psa9_5: undefined,
        psa10: 0,
      },
    };

    results.push(result);
    seen.add(sourceUrl);

    if (results.length >= 20) {
      break;
    }
  }

  return {
    results,
    debug: {
      htmlLength: html.length,
      trCount,
      gameLinkCount: gameLinkExamples.length,
      gameLinkExamples,
      titleExamples,
    },
  };
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
        `PriceCharting recherche HTTP ${response.status}`
      );
    }

    const html =
      await response.text();

    if (!html || html.length < 1000) {
      throw new Error(
        "Réponse PriceCharting vide ou invalide."
      );
    }

    const parsed =
      parseSearchResults(html);

    console.log(
      "PRICECHARTING DEBUG",
      parsed.debug
    );

    return NextResponse.json({
      success: true,
      source:
        "PriceCharting public search",
      query,
      count:
        parsed.results.length,
      searchUrl,
      results:
        parsed.results,

      /**
       * TEMPORAIRE :
       * diagnostic du HTML reçu par Vercel.
       */
      debug:
        parsed.debug,
    });
  } catch (error) {
    console.error(
      "PriceCharting search error:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Erreur inconnue";

    return NextResponse.json(
      {
        success: false,
        source:
          "PriceCharting public search",
        query,
        error:
          "Impossible de contacter la recherche publique PriceCharting depuis Vercel.",
        debug:
          process.env.NODE_ENV ===
          "development"
            ? message
            : undefined,
      },
      { status: 502 }
    );
  }
}
