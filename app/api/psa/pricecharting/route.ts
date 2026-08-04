
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

const PRICECHARTING_BASE =
  "https://www.pricecharting.com";

const FALLBACK_USD_TO_EUR = 0.86;

function decodeHtml(
  value: string
): string {
  return value
    .replace(
      /<script[\s\S]*?<\/script>/gi,
      " "
    )
    .replace(
      /<style[\s\S]*?<\/style>/gi,
      " "
    )
    .replace(
      /<br\s*\/?>/gi,
      " "
    )
    .replace(
      /<\/p>/gi,
      " "
    )
    .replace(
      /<\/div>/gi,
      " "
    )
    .replace(
      /<\/td>/gi,
      " "
    )
    .replace(
      /<\/th>/gi,
      " "
    )
    .replace(
      /<[^>]*>/g,
      " "
    )
    .replace(
      /&amp;/gi,
      "&"
    )
    .replace(
      /&quot;/gi,
      '"'
    )
    .replace(
      /&#39;/gi,
      "'"
    )
    .replace(
      /&nbsp;/gi,
      " "
    )
    .replace(
      /&lt;/gi,
      "<"
    )
    .replace(
      /&gt;/gi,
      ">"
    )
    .replace(
      /&#(\d+);/g,
      (_, code) =>
        String.fromCharCode(
          Number(code)
        )
    )
    .replace(
      /&#x([0-9a-f]+);/gi,
      (_, code) =>
        String.fromCharCode(
          parseInt(code, 16)
        )
    )
    .replace(
      /\s+/g,
      " "
    )
    .trim();
}

function absoluteUrl(
  url: string
): string {
  if (!url) return "";

  if (
    /^https?:\/\//i.test(url)
  ) {
    return url;
  }

  if (
    url.startsWith("//")
  ) {
    return `https:${url}`;
  }

  if (
    url.startsWith("/")
  ) {
    return `${PRICECHARTING_BASE}${url}`;
  }

  return `${PRICECHARTING_BASE}/${url}`;
}

function parseNumber(
  value?: string
): number {
  if (!value) return 0;

  const normalized =
    value
      .replace(/\s/g, "")
      .replace(/,/g, "");

  const number =
    Number(normalized);

  return Number.isFinite(number)
    ? number
    : 0;
}

/**
 * Récupération du taux USD -> EUR.
 *
 * On tente un taux public.
 * Si le service est indisponible,
 * on utilise un fallback.
 */
async function getUsdToEurRate(): Promise<number> {
  try {
    const controller =
      new AbortController();

    const timeout =
      setTimeout(
        () => controller.abort(),
        5000
      );

    try {
      const response =
        await fetch(
          "https://api.frankfurter.app/latest?from=USD&to=EUR",
          {
            cache: "no-store",
            signal:
              controller.signal,
          }
        );

      if (!response.ok) {
        return FALLBACK_USD_TO_EUR;
      }

      const data =
        await response.json();

      const rate =
        Number(data?.rates?.EUR);

      if (
        Number.isFinite(rate) &&
        rate > 0
      ) {
        return rate;
      }
    } finally {
      clearTimeout(timeout);
    }
  } catch {
    // Fallback volontaire.
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
    const escaped =
      label.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      );

    const regex =
      new RegExp(
        `${escaped}\\s*\\|?\\s*\\$\\s*([0-9,.]+)`,
        "i"
      );

    const match =
      text.match(regex);

    if (match?.[1]) {
      return parseNumber(
        match[1]
      );
    }
  }

  return 0;
}

function extractPrices(
  html: string,
  rate: number
): PriceChartingPrices {
  const text =
    decodeHtml(html);

  return {
    ungraded:
      usdToEur(
        extractPrice(
          text,
          [
            "Non Classé",
            "Ungraded",
          ]
        ),
        rate
      ),

    psa7:
      usdToEur(
        extractPrice(
          text,
          ["Grade 7"]
        ),
        rate
      ),

    psa8:
      usdToEur(
        extractPrice(
          text,
          ["Grade 8"]
        ),
        rate
      ),

    psa9:
      usdToEur(
        extractPrice(
          text,
          ["Grade 9"]
        ),
        rate
      ),

    psa9_5:
      usdToEur(
        extractPrice(
          text,
          [
            "Grade 9.5",
            "Grade 9,5",
          ]
        ),
        rate
      ),

    psa10:
      usdToEur(
        extractPrice(
          text,
          ["PSA 10"]
        ),
        rate
      ),
  };
}

/**
 * Extraction robuste de l'image principale.
 */
function extractImageUrl(
  html: string
): string {
  const candidates: string[] = [];

  const attributes = [
    "src",
    "data-src",
    "data-original",
    "data-lazy-src",
  ];

  for (const attribute of attributes) {
    const regex =
      new RegExp(
        `<img\\b[^>]*\\b${attribute}=["']([^"']+)["'][^>]*>`,
        "gi"
      );

    let match: RegExpExecArray | null;

    while (
      (match =
        regex.exec(html)) !== null
    ) {
      const url =
        absoluteUrl(
          match[1]
        );

      if (
        url &&
        !/logo|placeholder|avatar|icon|banner|adserver|sprite/i.test(
          url
        )
      ) {
        candidates.push(url);
      }
    }
  }

  /**
   * srcset.
   */
  const srcsetRegex =
    /\bsrcset=["']([^"']+)["']/gi;

  let srcsetMatch: RegExpExecArray | null;

  while (
    (srcsetMatch =
      srcsetRegex.exec(html)) !== null
  ) {
    const entries =
      srcsetMatch[1]
        .split(",")
        .map(
          (item) =>
            item
              .trim()
              .split(/\s+/)[0]
        );

    for (const entry of entries) {
      const url =
        absoluteUrl(entry);

      if (
        url &&
        !/logo|placeholder|avatar|icon|banner|adserver|sprite/i.test(
          url
        )
      ) {
        candidates.push(url);
      }
    }
  }

  /**
   * og:image.
   */
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

  /**
   * Images Google Storage utilisées
   * par PriceCharting.
   */
  const storageImage =
    candidates.find(
      (url) =>
        /storage\.googleapis\.com/i.test(
          url
        )
    );

  if (storageImage) {
    return storageImage;
  }

  return (
    candidates[0] ?? ""
  );
}

function extractTitle(
  html: string
): string {
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

  return title
    ? decodeHtml(title)
    : "";
}

function extractCardInfo(
  html: string
): {
  cardName: string;
  setName: string;
  cardNumber: string;
} {
  const text =
    decodeHtml(html);

  let cardName =
    extractTitle(html);

  cardName =
    cardName
      .replace(
        /\s*\|\s*Prix.*$/i,
        ""
      )
      .replace(
        /\s*\|\s*Prices.*$/i,
        ""
      )
      .trim();

  const headingMatch =
    html.match(
      /<h1[^>]*>\s*([\s\S]*?)\s*<\/h1>/i
    );

  if (headingMatch?.[1]) {
    const heading =
      decodeHtml(
        headingMatch[1]
      );

    if (heading) {
      cardName = heading;
    }
  }

  let setName = "";

  /**
   * Exemple :
   * Charizard VMAX #20
   * Pokemon Darkness Ablaze
   */
  const detailsMatch =
    text.match(
      /(?:Pokemon|Pokémon)\s+([A-Za-z0-9&'’.\- ]+?)\s+(?:Details|Détails)/i
    );

  if (detailsMatch?.[1]) {
    setName =
      detailsMatch[1].trim();
  }

  /**
   * Fallback à partir du titre.
   */
  if (!setName) {
    const titleMatch =
      cardName.match(
        /#(?:\d+|[A-Z0-9]+)\s+(?:Pokemon|Pokémon)\s+(.+)$/i
      );

    if (titleMatch?.[1]) {
      setName =
        titleMatch[1].trim();
    }
  }

  let cardNumber = "";

  const numberMatch =
    text.match(
      /(?:Numéro de carte|Card Number)\s*[:|]?\s*#?(\d{1,4}(?:\/\d{1,4})?)/i
    );

  if (numberMatch?.[1]) {
    cardNumber =
      numberMatch[1];
  }

  if (!cardNumber) {
    const genericNumber =
      cardName.match(
        /#(\d{1,4}(?:\/\d{1,4})?)/
      );

    if (genericNumber?.[1]) {
      cardNumber =
        genericNumber[1];
    }
  }

  if (!cardNumber) {
    const genericNumber =
      text.match(
        /\b(\d{1,4}\/\d{1,4})\b/
      );

    if (genericNumber?.[1]) {
      cardNumber =
        genericNumber[1];
    }
  }

  return {
    cardName,
    setName,
    cardNumber,
  };
}

/**
 * Détermine le grade à partir du bloc de vente.
 */
function detectSaleGrade(
  title: string
): 7 | 8 | 9 | 10 | undefined {
  if (
    /\bPSA\s*10\b/i.test(
      title
    )
  ) {
    return 10;
  }

  if (
    /\bPSA\s*9\b/i.test(
      title
    )
  ) {
    return 9;
  }

  if (
    /\bPSA\s*8\b/i.test(
      title
    )
  ) {
    return 8;
  }

  if (
    /\bPSA\s*7\b/i.test(
      title
    )
  ) {
    return 7;
  }

  return undefined;
}

/**
 * Extrait les 3 ventes les plus récentes.
 *
 * Important :
 * elles sont uniquement retournées à l'interface.
 * Aucun historique n'est enregistré.
 */
function extractRecentSales(
  html: string,
  rate: number
): RecentSale[] {
  const sales: RecentSale[] = [];

  const rowRegex =
    /<tr\b[^>]*>[\s\S]*?<\/tr>/gi;

  const rows =
    html.match(rowRegex) ?? [];

  for (const row of rows) {
    if (
      !/20\d{2}-\d{2}-\d{2}/.test(
        row
      ) ||
      !/\$[0-9,.]+/.test(
        row
      )
    ) {
      continue;
    }

    const decoded =
      decodeHtml(row);

    const dateMatch =
      decoded.match(
        /\b(20\d{2}-\d{2}-\d{2})\b/
      );

    const priceMatch =
      decoded.match(
        /\$([0-9,.]+)/
      );

    if (
      !dateMatch ||
      !priceMatch
    ) {
      continue;
    }

    const cells =
      row.match(
        /<td\b[^>]*>[\s\S]*?<\/td>/gi
      ) ?? [];

    let title = "";

    if (cells.length >= 3) {
      /**
       * PriceCharting place le titre
       * dans une cellule avant la cellule prix.
       */
      for (
        let i = 0;
        i < cells.length;
        i++
      ) {
        const cell =
          decodeHtml(
            cells[i]
          );

        if (
          cell &&
          !/^\d{4}-\d{2}-\d{2}$/.test(
            cell
          ) &&
          !/^\$[\d,.]+$/.test(
            cell
          ) &&
          cell.length > 8
        ) {
          if (
            /eBay|TCGPlayer|Pokemon|Pokémon|PSA/i.test(
              cell
            )
          ) {
            title = cell;
          }
        }
      }
    }

    if (!title) {
      title =
        decoded
          .replace(
            dateMatch[1],
            ""
          )
          .replace(
            priceMatch[0],
            ""
          )
          .replace(
            /\[eBay\]|\[TCGPlayer\]/gi,
            ""
          )
          .replace(
            /\bReport It\b/gi,
            ""
          )
          .trim();
    }

    const source =
      /\[TCGPlayer\]/i.test(
        decoded
      )
        ? "TCGPlayer"
        : "eBay";

    const priceUsd =
      parseNumber(
        priceMatch[1]
      );

    if (
      !priceUsd ||
      !title
    ) {
      continue;
    }

    const duplicate =
      sales.some(
        (sale) =>
          sale.date ===
            dateMatch[1] &&
          sale.title ===
            title &&
          sale.price ===
            usdToEur(
              priceUsd,
              rate
            )
      );

    if (duplicate) {
      continue;
    }

    sales.push({
      date: dateMatch[1],
      title,
      price:
        usdToEur(
          priceUsd,
          rate
        ),
      currency: "EUR",
      source,
    });

    if (
      sales.length >= 3
    ) {
      break;
    }
  }

  return sales;
}

function createId(
  url: string
): string {
  return url
    .replace(
      /^https?:\/\//i,
      ""
    )
    .replace(
      /[^a-zA-Z0-9]+/g,
      "-"
    )
    .replace(
      /^-+|-+$/g,
      ""
    )
    .toLowerCase();
}

/**
 * Recherche PriceCharting.
 *
 * On utilise volontairement la page FR.
 * PriceCharting retourne plusieurs fiches.
 */
async function searchPriceCharting(
  query: string
) {
  const searchUrl =
    `${PRICECHARTING_BASE}/fr/search-products?` +
    `q=${encodeURIComponent(
      query
    )}&type=prices`;

  const response =
    await fetch(
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

          Pragma:
            "no-cache",
        },

        cache: "no-store",
      }
    );

  if (!response.ok) {
    throw new Error(
      `Recherche PriceCharting HTTP ${response.status}`
    );
  }

  const html =
    await response.text();

  if (
    !html ||
    html.length < 1000
  ) {
    throw new Error(
      "Réponse de recherche PriceCharting invalide."
    );
  }

  const results: {
    url: string;
    title: string;
    setName: string;
    cardNumber: string;
  }[] = [];

  /**
   * PriceCharting peut retourner les liens
   * sous /fr/game/ ou /game/.
   */
  const linkRegex =
    /<a\b[^>]*href=["']((?:\/fr)?\/game\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;

  let match: RegExpExecArray | null;

  while (
    (match =
      linkRegex.exec(
        html
      )) !== null
  ) {
    const url =
      absoluteUrl(
        match[1]
      );

    const title =
      decodeHtml(
        match[2]
      );

    if (
      !title ||
      !/\/game\//i.test(
        url
      )
    ) {
      continue;
    }

    if (
      /add to collection|ajouter|wishlist|collection/i.test(
        title
      )
    ) {
      continue;
    }

    if (
      results.some(
        (item) =>
          item.url === url
      )
    ) {
      continue;
    }

    const cardNumber =
      title.match(
        /#([A-Z0-9]+(?:\/[A-Z0-9]+)?)/i
      )?.[1] ?? "";

    let setName = "";

    const pokemonMatch =
      title.match(
        /(?:Pokemon|Pokémon)\s+(.+)$/i
      );

    if (
      pokemonMatch?.[1]
    ) {
      setName =
        pokemonMatch[1]
          .trim();
    }

    results.push({
      url,
      title,
      setName,
      cardNumber,
    });

    /**
     * On laisse suffisamment de résultats
     * pour les recherches ambiguës.
     */
    if (
      results.length >= 20
    ) {
      break;
    }
  }

  return results;
}

async function fetchProduct(
  product: {
    url: string;
    title: string;
    setName: string;
    cardNumber: string;
  },
  rate: number
): Promise<PriceChartingCard | null> {
  const controller =
    new AbortController();

  const timeout =
    setTimeout(
      () =>
        controller.abort(),
      15000
    );

  try {
    const response =
      await fetch(
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

            Pragma:
              "no-cache",
          },

          cache: "no-store",

          signal:
            controller.signal,
        }
      );

    if (!response.ok) {
      return null;
    }

    const html =
      await response.text();

    if (
      !html ||
      html.length < 1000
    ) {
      return null;
    }

    const prices =
      extractPrices(
        html,
        rate
      );

    const info =
      extractCardInfo(
        html
      );

    const imageUrl =
      extractImageUrl(
        html
      );

    const recentSales =
      extractRecentSales(
        html,
        rate
      );

    /**
     * Une fiche sans aucun prix exploitable
     * n'est pas intéressante pour le module PSA.
     */
    const hasPrice =
      Object.values(
        prices
      ).some(
        (value) =>
          typeof value ===
            "number" &&
          value > 0
      );

    if (!hasPrice) {
      return null;
    }

    return {
      id:
        createId(
          product.url
        ),

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

      language:
        "fr",

      recentSales,
    };
  } finally {
    clearTimeout(
      timeout
    );
  }
}

export async function GET(
  request: Request
) {
  const {
    searchParams,
  } = new URL(
    request.url
  );

  const query =
    searchParams
      .get("q")
      ?.trim();

  if (!query) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Recherche vide.",
      },
      {
        status: 400,
      }
    );
  }

  try {
    /**
     * Taux de change utilisé pour
     * toute la recherche afin que
     * toutes les cartes soient cohérentes.
     */
    const rate =
      await getUsdToEurRate();

    const searchResults =
      await searchPriceCharting(
        query
      );

    if (
      searchResults.length ===
      0
    ) {
      return NextResponse.json({
        success: true,
        query,
        results: [],
        resultCount: 0,
        currency: "EUR",
        language: "fr",
      });
    }

    /**
     * On limite le nombre de fiches
     * récupérées en parallèle pour
     * éviter de surcharger PriceCharting.
     */
    const products =
      searchResults.slice(
        0,
        12
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

    return NextResponse.json({
      success: true,

      query,

      results:
        validCards,

      resultCount:
        validCards.length,

      currency:
        "EUR",

      language:
        "fr",

      usdToEur:
        rate,
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

        error:
          error instanceof Error
            ? error.message
            : "Erreur inconnue.",
      },
      {
        status: 502,
      }
    );
  }
}
