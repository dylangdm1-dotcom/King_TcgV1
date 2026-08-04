
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

function extractPrice(text: string, label: string): number {
  const pattern = new RegExp(
    `${label}\\s*\\$([0-9,]+(?:\\.[0-9]+)?)`,
    "i"
  );

  return money(text.match(pattern)?.[1]);
}

function extractCellPrice(
  rowText: string,
  label: string
): number {
  const pattern = new RegExp(
    `${label}\\s*:\\s*\\$([0-9,]+(?:\\.[0-9]+)?)`,
    "i"
  );

  const match = rowText.match(pattern);

  if (match?.[1]) {
    return money(match[1]);
  }

  return 0;
}

/**
 * Parse les résultats de la page publique :
 *
 * /search-products?type=prices&view=table&q=...
 *
 * PriceCharting affiche actuellement des lignes contenant :
 *
 * Charizard VMAX #20
 * Pokemon Darkness Ablaze
 * Ungraded
 * Grade 7
 * Grade 8
 *
 * On reste volontairement sur la page de recherche.
 * Aucun fetch individuel n'est effectué.
 */
function parseSearchResults(html: string): Result[] {
  const results: Result[] = [];
  const seen = new Set<string>();

  /**
   * Chaque résultat possède un lien /game/...
   *
   * On récupère le bloc HTML autour du lien afin
   * d'extraire toutes les informations du résultat.
   */
  const linkRegex =
    /<a[^>]+href=["'](\/game\/pokemon-[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;

  let match: RegExpExecArray | null;

  while ((match = linkRegex.exec(html)) !== null) {
    const sourceUrl = `https://www.pricecharting.com${match[1]}`;

    if (seen.has(sourceUrl)) continue;

    seen.add(sourceUrl);

    /**
     * Cherche une zone raisonnablement proche du lien.
     * Les résultats PriceCharting sont présentés sous forme
     * de lignes/blocs dans la page de recherche.
     */
    const start = Math.max(0, match.index - 1000);
    const end = Math.min(html.length, match.index + 5000);

    const blockHtml = html.slice(start, end);
    const blockText = decodeHtml(blockHtml);

    /**
     * Exemple attendu :
     *
     * Charizard VMAX #20
     * Pokemon Darkness Ablaze
     */
    const cardMatch = blockText.match(
      /([A-Za-zÀ-ÿ0-9'’.\-:()[\]\/+& ]+?)\s+#([A-Za-z0-9./-]+)\s+Pokemon\s+([^$]+?)(?=\s+Ungraded|\s+Grade\s+7|\s+Grade\s+8|$)/i
    );

    if (!cardMatch) {
      continue;
    }

    const cardName = cardMatch[1].trim();
    const cardNumber = cardMatch[2].trim();
    const setName = `Pokemon ${cardMatch[3].trim()}`;

    /**
     * Les résultats en mode table contiennent les prix
     * directement dans la recherche.
     */
    const ungraded =
      extractCellPrice(blockText, "Ungraded") ||
      extractPrice(blockText, "Ungraded");

    const psa7 =
      extractCellPrice(blockText, "Grade 7") ||
      extractPrice(blockText, "Grade 7");

    const psa8 =
      extractCellPrice(blockText, "Grade 8") ||
      extractPrice(blockText, "Grade 8");

    const psa9 =
      extractCellPrice(blockText, "Grade 9") ||
      extractPrice(blockText, "Grade 9");

    const psa9_5 =
      extractCellPrice(blockText, "Grade 9.5") ||
      extractPrice(blockText, "Grade 9\\.5");

    const psa10 =
      extractCellPrice(blockText, "PSA 10") ||
      extractPrice(blockText, "PSA 10");

    results.push({
      id: sourceUrl,
      cardName,
      setName,
      cardNumber,
      imageUrl: "",
      sourceUrl,
      prices: {
        ungraded,
        psa7,
        psa8,
        psa9,
        psa9_5: psa9_5 || undefined,
        psa10,
      },
    });

    /**
     * Prototype : maximum 20 résultats.
     */
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

  /**
   * IMPORTANT :
   *
   * On utilise uniquement la recherche publique.
   * Aucun accès aux fiches individuelles.
   */
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
          "Accept-Language": "en-US,en;q=0.9",
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
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

    const results = parseSearchResults(html);

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
