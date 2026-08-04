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

/**
 * Récupère les prix directement depuis les cellules
 * du tableau PriceCharting.
 *
 * Structure réelle :
 *
 * <td class="price numeric used_price">
 *   <span class="js-price">$40.00</span>
 * </td>
 *
 * <td class="price numeric cib_price">
 *   <span class="js-price">$31.86</span>
 * </td>
 *
 * <td class="price numeric new_price">
 *   <span class="js-price">$40.28</span>
 * </td>
 */
function extractColumnPrice(
  rowHtml: string,
  className: string
): number {
  const regex = new RegExp(
    `<td[^>]*class=["'][^"']*\\b${className}\\b[^"']*["'][^>]*>[\\s\\S]*?<span[^>]*class=["'][^"']*\\bjs-price\\b[^"']*["'][^>]*>\\s*([^<]+?)\\s*</span>[\\s\\S]*?</td>`,
    "i"
  );

  const match = rowHtml.match(regex);

  return money(match?.[1]);
}

/**
 * Extrait le lien principal de la carte.
 *
 * Structure réelle :
 *
 * <td class="title">
 *   <a href="https://www.pricecharting.com/game/...">
 *      Charizard VMAX #20
 *   </a>
 */
function extractCardLink(
  rowHtml: string
): {
  sourceUrl: string;
  cardName: string;
  cardNumber: string;
} | null {
  const regex =
    /<td[^>]*class=["'][^"']*\btitle\b[^"']*["'][^>]*>[\s\S]*?<a[^>]+href=["'](https:\/\/www\.pricecharting\.com\/game\/[^"']+)["'][^>]*>[\s\S]*?([^<]+?)\s*<\/a>/i;

  const match = rowHtml.match(regex);

  if (!match) {
    return null;
  }

  const sourceUrl = match[1];

  const title = decodeHtml(match[2]);

  /**
   * Exemple :
   *
   * Charizard VMAX #20
   * Charizard VMax #SWSH261
   * Charizard VMAX #SV107
   */
  const titleMatch = title.match(
    /^(.+?)\s+#([A-Za-z0-9./-]+)$/
  );

  if (!titleMatch) {
    return null;
  }

  return {
    sourceUrl,
    cardName: titleMatch[1].trim(),
    cardNumber: titleMatch[2].trim(),
  };
}

/**
 * Extrait le nom du set.
 *
 * PriceCharting expose :
 *
 * <td class="console phone-landscape-hidden">
 *   <a href="/console/pokemon-darkness-ablaze">
 *      Pokemon Darkness Ablaze
 *   </a>
 * </td>
 */
function extractSetName(
  rowHtml: string
): string {
  const regex =
    /<td[^>]*class=["'][^"']*\bconsole\b[^"']*["'][^>]*>[\s\S]*?<a[^>]*href=["']\/console\/[^"']+["'][^>]*>([\s\S]*?)<\/a>[\s\S]*?<\/td>/i;

  const match = rowHtml.match(regex);

  if (!match) {
    return "";
  }

  return decodeHtml(match[1]);
}

/**
 * Extrait l'image de la carte.
 */
function extractImageUrl(
  rowHtml: string
): string {
  const regex =
    /<td[^>]*class=["'][^"']*\bimage\b[^"']*["'][^>]*>[\s\S]*?<img[^>]+src=["']([^"']+)["']/i;

  const match = rowHtml.match(regex);

  return match?.[1] ?? "";
}

/**
 * Parse les résultats PriceCharting.
 *
 * Structure réelle confirmée :
 *
 * <tr id="product-..." data-product="...">
 *
 *     <td class="image">...</td>
 *
 *     <td class="title">
 *         <a href="https://www.pricecharting.com/game/...">
 *             Charizard VMAX #20
 *         </a>
 *     </td>
 *
 *     <td class="console ...">
 *         Pokemon Darkness Ablaze
 *     </td>
 *
 *     <td class="price numeric used_price">
 *         $40.00
 *     </td>
 *
 *     <td class="price numeric cib_price">
 *         $31.86
 *     </td>
 *
 *     <td class="price numeric new_price">
 *         $40.28
 *     </td>
 */
function parseSearchResults(
  html: string
): Result[] {
  const results: Result[] = [];

  const seen = new Set<string>();

  const rowRegex =
    /<tr\b[^>]*data-product=["'][^"']+["'][^>]*>[\s\S]*?<\/tr>/gi;

  let rowMatch: RegExpExecArray | null;

  while ((rowMatch = rowRegex.exec(html)) !== null) {
    const rowHtml = rowMatch[0];

    const card =
      extractCardLink(rowHtml);

    if (!card) {
      continue;
    }

    if (seen.has(card.sourceUrl)) {
      continue;
    }

    const setName =
      extractSetName(rowHtml);

    const imageUrl =
      extractImageUrl(rowHtml);

    /**
     * Colonnes confirmées par le HTML :
     *
     * used_price = Ungraded
     * cib_price  = Grade 7
     * new_price  = Grade 8
     */
    const ungraded =
      extractColumnPrice(
        rowHtml,
        "used_price"
      );

    const psa7 =
      extractColumnPrice(
        rowHtml,
        "cib_price"
      );

    const psa8 =
      extractColumnPrice(
        rowHtml,
        "new_price"
      );

    results.push({
      id: card.sourceUrl,

      cardName:
        card.cardName,

      setName,

      cardNumber:
        card.cardNumber,

      imageUrl,

      sourceUrl:
        card.sourceUrl,

      prices: {
        ungraded,
        psa7,
        psa8,

        /**
         * Pas encore récupérés.
         * On les ajoutera dans la prochaine étape.
         */
        psa9: 0,
        psa9_5: undefined,
        psa10: 0,
      },
    });

    seen.add(card.sourceUrl);

    if (results.length >= 20) {
      break;
    }
  }

  return results;
}

export async function GET(
  request: Request
) {
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
      response = await fetch(
        searchUrl,
        {
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

          signal:
            controller.signal,
        }
      );
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

    if (
      !html ||
      html.length < 1000
    ) {
      throw new Error(
        "Réponse PriceCharting vide ou invalide."
      );
    }

    const results =
      parseSearchResults(html);

    console.log(
      `PriceCharting: ${results.length} résultats`
    );

    return NextResponse.json({
      success: true,

      source:
        "PriceCharting public search",

      query,

      count:
        results.length,

      searchUrl,

      results,
    });
  } catch (error) {
    console.error(
      "PriceCharting search error:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        source:
          "PriceCharting public search",

        query,

        error:
          "Impossible de contacter la recherche publique PriceCharting depuis Vercel.",
      },
      {
        status: 502,
      }
    );
  }
}
