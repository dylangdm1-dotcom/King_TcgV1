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

/**
 * Extrait le premier lien /game/ de la ligne.
 *
 * Exemple réel PriceCharting :
 *
 * /game/pokemon-darkness-ablaze/charizard-vmax-20
 */
function extractGameLink(
  rowHtml: string
): {
  sourceUrl: string;
  title: string;
} | null {
  const match = rowHtml.match(
    /<a[^>]+href=["'](\/game\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/i
  );

  if (!match) {
    return null;
  }

  return {
    sourceUrl: `https://www.pricecharting.com${match[1]}`,
    title: decodeHtml(match[2]),
  };
}

/**
 * Extrait le set.
 *
 * PriceCharting possède un deuxième lien dans la ligne :
 *
 * Pokemon Darkness Ablaze
 */
function extractSetName(rowHtml: string): string {
  const links: string[] = [];

  const linkRegex =
    /<a[^>]+href=["'][^"']+["'][^>]*>([\s\S]*?)<\/a>/gi;

  let match: RegExpExecArray | null;

  while ((match = linkRegex.exec(rowHtml)) !== null) {
    const text = decodeHtml(match[1]);

    if (text) {
      links.push(text);
    }
  }

  /**
   * On cherche explicitement le lien contenant Pokemon.
   */
  const pokemonSet = links.find((value) =>
    /^Pokemon\b/i.test(value)
  );

  return pokemonSet ?? "";
}

/**
 * Parse :
 *
 * Charizard VMAX #20
 *
 * en :
 *
 * cardName = Charizard VMAX
 * cardNumber = 20
 */
function parseCardTitle(
  title: string
): {
  cardName: string;
  cardNumber: string;
} | null {
  const cleanTitle = decodeHtml(title);

  const match = cleanTitle.match(
    /^(.+?)\s+#([A-Za-z0-9./-]+)$/i
  );

  if (!match) {
    return null;
  }

  return {
    cardName: match[1].trim(),
    cardNumber: match[2].trim(),
  };
}

/**
 * Parse les résultats de la page publique PriceCharting.
 *
 * Structure actuellement observée :
 *
 * Title | Set | Ungraded | Grade 7 | Grade 8
 *
 * Exemple :
 *
 * Charizard VMAX #20
 * Pokemon Darkness Ablaze
 * $40.00
 * $31.86
 * $40.28
 */
function parseSearchResults(html: string): Result[] {
  const results: Result[] = [];
  const seen = new Set<string>();

  const rowRegex =
    /<tr\b[^>]*>[\s\S]*?<\/tr>/gi;

  let rowMatch: RegExpExecArray | null;

  while ((rowMatch = rowRegex.exec(html)) !== null) {
    const rowHtml = rowMatch[0];

    /**
     * Une ligne de résultat Pokemon doit contenir
     * un lien /game/.
     */
    if (!/href=["']\/game\//i.test(rowHtml)) {
      continue;
    }

    const gameLink = extractGameLink(rowHtml);

    if (!gameLink) {
      continue;
    }

    const {
      sourceUrl,
      title,
    } = gameLink;

    if (seen.has(sourceUrl)) {
      continue;
    }

    const card = parseCardTitle(title);

    if (!card) {
      console.log(
        "PriceCharting: titre non reconnu:",
        title
      );

      continue;
    }

    const setName = extractSetName(rowHtml);

    /**
     * Si le set n'est pas trouvé, on ne rejette pas
     * le résultat : la carte reste exploitable.
     */
    const prices = extractPrices(rowHtml);

    const ungraded = prices[0] ?? 0;
    const psa7 = prices[1] ?? 0;
    const psa8 = prices[2] ?? 0;

    const result: Result = {
      id: sourceUrl,
      cardName: card.cardName,
      setName,
      cardNumber: card.cardNumber,
      imageUrl: "",
      sourceUrl,
      prices: {
        ungraded,
        psa7,
        psa8,
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

  return results;
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

  const searchUrl =
    `https://www.pricecharting.com/search-products` +
    `?type=prices` +
    `&view=table` +
    `&q=${encodeURIComponent(query)}`;

  try {
    const controller = new AbortController();

    const timeout = setTimeout(() => {
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

    const html = await response.text();

    if (!html || html.length < 1000) {
      throw new Error(
        "Réponse PriceCharting vide ou invalide."
      );
    }

    console.log(
      `PriceCharting HTML reçu: ${html.length} caractères`
    );

    const results = parseSearchResults(html);

    console.log(
      `PriceCharting résultats détectés: ${results.length}`
    );

    return NextResponse.json({
      success: true,
      source: "PriceCharting public search",
      query,
      count: results.length,
      searchUrl,
      results,
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
        source: "PriceCharting public search",
        query,
        error:
          "Impossible de contacter la recherche publique PriceCharting depuis Vercel.",
        debug:
          process.env.NODE_ENV === "development"
            ? message
            : undefined,
      },
      { status: 502 }
    );
  }
}
