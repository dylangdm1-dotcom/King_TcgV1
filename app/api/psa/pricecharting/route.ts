import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface PriceChartingPrices {
  ungraded: number;
  psa7: number;
  psa8: number;
  psa9: number;
  psa9_5?: number;
  psa10: number;
}

interface RecentSale {
  date: string;
  title: string;
  price: number;
  currency: "EUR";
  source: string;
}

interface PriceChartingCard {
  id: string;
  cardName: string;
  setName: string;
  cardNumber: string;
  imageUrl: string;
  prices: PriceChartingPrices;
  sourceUrl: string;
  language?: string;
  rarity?: string;
  releaseYear?: number;
  recentSales: RecentSale[];
}

const BASE = "https://www.pricecharting.com";
const FALLBACK_USD_TO_EUR = 0.86;

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

function absoluteUrl(url: string): string {
  if (!url) return "";

  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  if (url.startsWith("//")) {
    return `https:${url}`;
  }

  if (url.startsWith("/")) {
    return `${BASE}${url}`;
  }

  return `${BASE}/${url}`;
}

function parseNumber(value?: string): number {
  if (!value) return 0;

  const normalized = value
    .replace(/\s/g, "")
    .replace(/,/g, "");

  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : 0;
}

async function getUsdToEurRate(): Promise<number> {
  try {
    const controller = new AbortController();

    const timeout = setTimeout(
      () => controller.abort(),
      5000
    );

    try {
      const response = await fetch(
        "https://api.frankfurter.app/latest?from=USD&to=EUR",
        {
          cache: "no-store",
          signal: controller.signal,
        }
      );

      if (!response.ok) {
        return FALLBACK_USD_TO_EUR;
      }

      const data = await response.json();
      const rate = Number(data?.rates?.EUR);

      if (Number.isFinite(rate) && rate > 0) {
        return rate;
      }
    } finally {
      clearTimeout(timeout);
    }
  } catch {
    // Fallback.
  }

  return FALLBACK_USD_TO_EUR;
}

function usdToEur(
  value: number,
  rate: number
): number {
  if (!value) return 0;

  return Number(
    (value * rate).toFixed(2)
  );
}

function extractPrice(
  text: string,
  labels: string[]
): number {
  for (const label of labels) {
    const escaped = label.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );

    const regex = new RegExp(
      `${escaped}\\s*(?:\\||:)??\\s*\\$\\s*([0-9,.]+)`,
      "i"
    );

    const match = text.match(regex);

    if (match?.[1]) {
      return parseNumber(match[1]);
    }
  }

  return 0;
}

function extractPrices(
  html: string,
  rate: number
): PriceChartingPrices {
  // PriceCharting exposes a dedicated "Full Price Guide" block near the
  // bottom of the product page.  Parse that block only: parsing the whole
  // document makes labels from menus/filters collide with grade prices.
  const text = decodeHtml(html);
  const guideMatch = text.match(
    /(?:Full Price Guide|Guide Complet des Prix)\s*:\s*[\s\S]*?(?=All prices are the current market price|Les prix de .*? sont actualisés|$)/i
  );
  const guide = guideMatch?.[0] ?? text.slice(-12000);

  const readGuidePrice = (labels: string[]): number => {
    for (const label of labels) {
      const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const match = guide.match(
        new RegExp(`${escaped}\\s*\\$\\s*([0-9,.]+)`, "i")
      );
      if (match?.[1]) return parseNumber(match[1]);
    }
    return 0;
  };

  return {
    ungraded: usdToEur(readGuidePrice(["Ungraded", "Non Classé", "Non classe"]), rate),
    psa7: usdToEur(readGuidePrice(["Grade 7"]), rate),
    psa8: usdToEur(readGuidePrice(["Grade 8"]), rate),
    psa9: usdToEur(readGuidePrice(["Grade 9"]), rate),
    psa9_5: usdToEur(readGuidePrice(["Grade 9.5", "Grade 9,5"]), rate),
    psa10: usdToEur(readGuidePrice(["PSA 10"]), rate),
  };
}

function extractImageUrl(html: string): string {
  const candidates: string[] = [];

  const imageRegex =
    /<(?:img|source)\b[^>]*(?:src|data-src|data-original|data-lazy-src)=["']([^"']+)["'][^>]*>/gi;

  let match: RegExpExecArray | null;

  while ((match = imageRegex.exec(html)) !== null) {
    const url = absoluteUrl(match[1]);

    if (
      url &&
      !/logo|placeholder|avatar|icon|banner|adserver|sprite/i.test(
        url
      )
    ) {
      candidates.push(url);
    }
  }

  const ogImage =
    html.match(
      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i
    )?.[1] ??
    html.match(
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i
    )?.[1];

  if (ogImage) {
    candidates.unshift(
      absoluteUrl(ogImage)
    );
  }

  const storageImage = candidates.find(
    (url) =>
      /storage\.googleapis\.com|googleusercontent\.com/i.test(
        url
      )
  );

  return (
    storageImage ??
    candidates[0] ??
    ""
  );
}

function extractTitle(html: string): string {
  const title =
    html.match(
      /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i
    )?.[1] ??
    html.match(
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i
    )?.[1] ??
    html.match(
      /<title[^>]*>([\s\S]*?)<\/title>/i
    )?.[1];

  return title ? decodeHtml(title) : "";
}

function extractCardInfo(html: string) {
  const text = decodeHtml(html);

  let cardName = extractTitle(html)
    .replace(/\s*\|\s*(?:Prix|Prices).*$/i, "")
    .trim();

  const headingMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (headingMatch?.[1]) {
    const heading = decodeHtml(headingMatch[1]).trim();
    if (heading) cardName = heading;
  }

  // Never derive the set name from the whole page. The old implementation
  // captured the navigation menu between the first "Pokemon" and "Details".
  let setName = "";
  const titleSetMatch = cardName.match(/#\d{1,4}(?:\/\d{1,4})?\s+(.+?)(?:\s+Pokemon Cards)?$/i);
  if (titleSetMatch?.[1]) {
    setName = titleSetMatch[1]
      .replace(/^Pokemon\s+/i, "")
      .replace(/^Pokémon\s+/i, "")
      .replace(/\s+Pokemon Cards$/i, "")
      .trim();
  }

  if (!setName) {
    const breadcrumbMatch = text.match(
      /(?:Cartes de Pokemon|Pokemon Cards)\s+([^|]+?)\s+[^|]*#\d{1,4}(?:\/\d{1,4})?/i
    );
    if (breadcrumbMatch?.[1]) setName = breadcrumbMatch[1].trim();
  }

  let cardNumber = "";
  const numberMatch = text.match(
    /(?:Card Number|Numéro de carte)\s*[:|]?\s*#?\s*(\d{1,4}(?:\/\d{1,4})?)/i
  );
  if (numberMatch?.[1]) cardNumber = numberMatch[1];

  if (!cardNumber) {
    const fromTitle = cardName.match(/#(\d{1,4}(?:\/\d{1,4})?)/i);
    if (fromTitle?.[1]) cardNumber = fromTitle[1];
  }

  return { cardName, setName, cardNumber };
}

function extractRecentSales(
  html: string,
  rate: number
): RecentSale[] {
  // Restrict parsing to the first completed-sales table. This prevents
  // prices from the price guide, POP report, navigation and other tables
  // from being interpreted as sales.
  const saleStart = html.search(/Sale Date|Date de vente/i);
  if (saleStart < 0) return [];

  const afterSales = html.slice(saleStart);
  const saleEnd = afterSales.search(/Graded Population Report|Rapport de population/i);
  const salesHtml = saleEnd > 0 ? afterSales.slice(0, saleEnd) : afterSales;

  const rows = salesHtml.match(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi) ?? [];
  const sales: RecentSale[] = [];

  for (const row of rows) {
    const decoded = decodeHtml(row);
    const dateMatch = decoded.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
    if (!dateMatch) continue;

    const priceMatches = decoded.match(/\$\s*[0-9,.]+/g) ?? [];
    if (!priceMatches.length) continue;

    // A row can contain an original/list price followed by the actual sale
    // price. Use the last monetary value in that row.
    const priceUsd = parseNumber(priceMatches[priceMatches.length - 1].replace(/[^0-9,.]/g, ""));
    if (!priceUsd) continue;

    const cells = row.match(/<td\b[^>]*>[\s\S]*?<\/td>/gi) ?? [];
    const cellTexts = cells.map((cell) => decodeHtml(cell).trim()).filter(Boolean);
    const title = cellTexts.find((value) =>
      /\[(?:eBay|TCGPlayer)\]/i.test(value)
    ) ?? cellTexts.find((value) =>
      value.length > 10 && !/^\$[\d,.]+$/.test(value) && !/^20\d{2}-\d{2}-\d{2}$/.test(value)
    );

    if (!title) continue;

    const source = /\[TCGPlayer\]/i.test(title) ? "TCGPlayer" :
      /\[eBay\]/i.test(title) ? "eBay" : "PriceCharting";

    sales.push({
      date: dateMatch[1],
      title: title.replace(/\s+/g, " ").trim(),
      price: usdToEur(priceUsd, rate),
      currency: "EUR",
      source,
    });
  }

  sales.sort((a, b) => b.date.localeCompare(a.date));
  return sales.slice(0, 3);
}

function createId(url: string): string {
  return url
    .replace(/^https?:\/\//i, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

interface SearchProduct {
  url: string;
  title: string;
  setName: string;
  cardNumber: string;
}

function addSearchResult(
  results: SearchProduct[],
  url: string,
  title: string
) {
  const cleanUrl = absoluteUrl(url);
  const cleanTitle = decodeHtml(title);

  if (
    !cleanUrl ||
    !/\/game\//i.test(cleanUrl) ||
    !cleanTitle
  ) {
    return;
  }

  if (
    /collection|wishlist|ajouter|add to/i.test(
      cleanTitle
    )
  ) {
    return;
  }

  if (
    results.some(
      (item) => item.url === cleanUrl
    )
  ) {
    return;
  }

  const cardNumber =
    cleanTitle.match(
      /#(\d{1,4}(?:\/\d{1,4})?)/i
    )?.[1] ?? "";

  const pokemonMatch =
    cleanTitle.match(
      /(?:Pokemon|Pokémon)\s+(.+)$/i
    );

  const setName =
    pokemonMatch?.[1]?.trim() ?? "";

  results.push({
    url: cleanUrl,
    title: cleanTitle,
    setName,
    cardNumber,
  });
}

async function searchPriceCharting(
  query: string
): Promise<SearchProduct[]> {
  const urls = [
    `${BASE}/fr/search-products?q=${encodeURIComponent(
      query
    )}&type=prices`,
    `${BASE}/search-products?q=${encodeURIComponent(
      query
    )}&type=prices`,
  ];

  const results: SearchProduct[] = [];

  for (const searchUrl of urls) {
    try {
      const response = await fetch(
        searchUrl,
        {
          method: "GET",
          headers: {
            Accept:
              "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language":
              "fr-FR,fr;q=0.9,en;q=0.8",
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/150.0 Safari/537.36",
            "Cache-Control":
              "no-cache",
            Pragma: "no-cache",
          },
          cache: "no-store",
        }
      );

      if (!response.ok) {
        continue;
      }

      const html =
        await response.text();

      if (!html) {
        continue;
      }

      /*
       * Méthode 1 :
       * liens classiques <a href="/game/...">
       */
      const linkRegex =
        /<a\b[^>]*href=["']([^"']*\/game\/[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;

      let match: RegExpExecArray | null;

      while (
        (match =
          linkRegex.exec(html)) !== null
      ) {
        addSearchResult(
          results,
          match[1],
          match[2]
        );

        if (results.length >= 30) {
          break;
        }
      }

      /*
       * Méthode 2 :
       * si PriceCharting utilise un attribut data
       * ou une structure différente.
       */
      const rawUrlRegex =
        /(?:href|data-href|data-url)=["']([^"']*\/game\/[^"']+)["']/gi;

      while (
        (match =
          rawUrlRegex.exec(html)) !== null
      ) {
        const surrounding =
          html.slice(
            Math.max(
              0,
              match.index - 500
            ),
            Math.min(
              html.length,
              match.index + 1000
            )
          );

        const titleMatch =
          surrounding.match(
            /<(?:a|div|span|td)[^>]*>([^<]{3,150})<\/(?:a|div|span|td)>/i
          );

        addSearchResult(
          results,
          match[1],
          titleMatch?.[1] ??
            query
        );

        if (results.length >= 30) {
          break;
        }
      }

      if (results.length >= 30) {
        break;
      }
    } catch {
      // On tente l'URL suivante.
    }
  }

  /*
   * Fallback direct :
   * si la recherche ne donne aucun résultat,
   * on tente une URL de fiche connue via le moteur
   * interne PriceCharting en supprimant certains
   * caractères problématiques.
   */
  if (results.length === 0) {
    const simplifiedQuery = query
      .replace(/[^\p{L}\p{N}\s#/-]/gu, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (
      simplifiedQuery &&
      simplifiedQuery !== query
    ) {
      const fallbackUrl =
        `${BASE}/fr/search-products?q=${encodeURIComponent(
          simplifiedQuery
        )}&type=prices`;

      try {
        const response =
          await fetch(
            fallbackUrl,
            {
              headers: {
                Accept:
                  "text/html,application/xhtml+xml",
                "Accept-Language":
                  "fr-FR,fr;q=0.9,en;q=0.8",
                "User-Agent":
                  "Mozilla/5.0",
              },
              cache: "no-store",
            }
          );

        if (response.ok) {
          const html =
            await response.text();

          const linkRegex =
            /<a\b[^>]*href=["']([^"']*\/game\/[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;

          let match: RegExpExecArray | null;

          while (
            (match =
              linkRegex.exec(
                html
              )) !== null
          ) {
            addSearchResult(
              results,
              match[1],
              match[2]
            );

            if (
              results.length >= 30
            ) {
              break;
            }
          }
        }
      } catch {
        // Aucun résultat.
      }
    }
  }

  return results;
}

async function fetchProduct(
  product: SearchProduct,
  rate: number
): Promise<PriceChartingCard | null> {
  const controller =
    new AbortController();

  const timeout = setTimeout(
    () => controller.abort(),
    15000
  );

  try {
    const response = await fetch(
      product.url,
      {
        method: "GET",
        headers: {
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language":
            "fr-FR,fr;q=0.9,en;q=0.8",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/150.0 Safari/537.36",
          "Cache-Control":
            "no-cache",
          Pragma: "no-cache",
        },
        cache: "no-store",
        signal: controller.signal,
      }
    );

    if (!response.ok) {
      return null;
    }

    const html =
      await response.text();

    if (!html) {
      return null;
    }

    const prices =
      extractPrices(
        html,
        rate
      );

    const info =
      extractCardInfo(html);

    const imageUrl =
      extractImageUrl(html);

    const recentSales =
      extractRecentSales(
        html,
        rate
      );

    /*
     * On garde la fiche même si l'extraction
     * d'un prix particulier échoue.
     */
    return {
      id: createId(product.url),

      cardName:
        info.cardName ||
        product.title,

      setName:
        info.setName ||
        product.setName,

      cardNumber:
        info.cardNumber ||
        product.cardNumber,

      imageUrl,

      prices,

      sourceUrl:
        product.url,

      language: "fr",

      recentSales,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET(
  request: Request
) {
  const { searchParams } =
    new URL(request.url);

  const query =
    searchParams
      .get("q")
      ?.trim();

  if (!query) {
    return NextResponse.json(
      {
        success: false,
        error: "Recherche vide.",
      },
      { status: 400 }
    );
  }

  try {
    const rate =
      await getUsdToEurRate();

    const searchResults =
      await searchPriceCharting(
        query
      );

    console.log(
      `[PSA] PriceCharting query="${query}" results=${searchResults.length}`
    );

    if (
      searchResults.length === 0
    ) {
      return NextResponse.json({
        success: true,
        query,
        results: [],
        resultCount: 0,
        currency: "EUR",
        language: "fr",
        usdToEur: rate,
      });
    }

    /*
     * On teste jusqu'à 15 fiches.
     * Cela permet de gérer les recherches
     * ambiguës comme Charizard / Dracaufeu.
     */
    const products =
      searchResults.slice(
        0,
        15
      );

    const cards =
      await Promise.all(
        products.map(
          (product) =>
            fetchProduct(
              product,
              rate
            )
        )
      );

    const validCards =
      cards.filter(
        (
          card
        ): card is PriceChartingCard =>
          card !== null
      );

    /*
     * Évite les doublons exacts.
     */
    const uniqueCards =
      validCards.filter(
        (card, index, array) =>
          array.findIndex(
            (item) =>
              item.sourceUrl ===
              card.sourceUrl
          ) === index
      );

    return NextResponse.json({
      success: true,

      query,

      results:
        uniqueCards,

      resultCount:
        uniqueCards.length,

      currency: "EUR",

      language: "fr",

      usdToEur: rate,
    });
  } catch (error) {
    console.error(
      "PriceCharting PSA search error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        query,
        results: [],
        error:
          error instanceof Error
            ? error.message
            : "Erreur inconnue.",
      },
      { status: 502 }
    );
  }
}