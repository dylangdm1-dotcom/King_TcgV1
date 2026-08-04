import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface PriceChartingPrices {
  ungraded: number;
  psa7: number;
  psa8: number;
  psa9: number;
  psa10: number;
}

interface PriceChartingResult {
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

function parsePrice(value: string | undefined): number {
  if (!value) return 0;

  const cleaned = value
    .replace(/[$,]/g, "")
    .replace(/[^\d.]/g, "");

  const number = Number(cleaned);

  return Number.isFinite(number) ? number : 0;
}

function absoluteUrl(url: string): string {
  if (!url) return "";

  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }

  if (url.startsWith("//")) {
    return `https:${url}`;
  }

  if (url.startsWith("/")) {
    return `https://www.pricecharting.com${url}`;
  }

  return `https://www.pricecharting.com/${url}`;
}

/**
 * Extrait une valeur située dans le HTML autour
 * d'un terme donné.
 */
function extractPrice(
  html: string,
  labels: string[]
): number {
  for (const label of labels) {
    const escaped = label.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );

    const regex = new RegExp(
      `${escaped}[\\s\\S]{0,1200}?\\$([0-9,]+(?:\\.[0-9]+)?)`,
      "i"
    );

    const match = html.match(regex);

    if (match?.[1]) {
      return parsePrice(match[1]);
    }
  }

  return 0;
}

/**
 * Extrait les prix connus de la fiche PriceCharting.
 */
function extractPrices(html: string): PriceChartingPrices {
  return {
    ungraded: extractPrice(html, [
      "Ungraded",
      "Ungraded Price",
      "Loose Price",
    ]),

    psa7: extractPrice(html, [
      "Grade 7",
      "PSA 7",
    ]),

    psa8: extractPrice(html, [
      "Grade 8",
      "PSA 8",
    ]),

    psa9: extractPrice(html, [
      "Grade 9",
      "PSA 9",
    ]),

    psa10: extractPrice(html, [
      "PSA 10",
      "Grade 10",
    ]),
  };
}

/**
 * Extrait l'URL de l'image principale.
 */
function extractImageUrl(html: string): string {
  const patterns = [
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
    /<img[^>]+src=["']([^"']+)["'][^>]*>/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);

    if (match?.[1]) {
      return absoluteUrl(match[1]);
    }
  }

  return "";
}

/**
 * Extrait le titre de la fiche.
 */
function extractTitle(html: string): string {
  const ogTitle =
    html.match(
      /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i
    )?.[1] ??
    html.match(
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i
    )?.[1];

  if (ogTitle) {
    return decodeHtml(ogTitle);
  }

  const title =
    html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];

  return title ? decodeHtml(title) : "";
}

/**
 * Extrait quelques informations textuelles de la fiche.
 */
function extractCardInfo(
  html: string,
  query: string
): {
  cardName: string;
  setName: string;
  cardNumber: string;
} {
  const title = extractTitle(html);

  let cardName = title
    .replace(/\s*\|\s*PriceCharting.*$/i, "")
    .trim();

  if (!cardName) {
    cardName = query;
  }

  let cardNumber = "";

  const numberPatterns = [
    /\b(\d{1,3}\/\d{1,3})\b/,
    /#(\d{1,3})\b/,
  ];

  for (const pattern of numberPatterns) {
    const match = html.match(pattern);

    if (match?.[1]) {
      cardNumber = match[1];
      break;
    }
  }

  let setName = "";

  const pokemonSets = [
    "Base Set",
    "Jungle",
    "Fossil",
    "Team Rocket",
    "Gym Heroes",
    "Gym Challenge",
    "Neo Genesis",
    "Neo Discovery",
    "Neo Revelation",
    "Neo Destiny",
    "EX Ruby & Sapphire",
    "EX Sandstorm",
    "EX Dragon",
    "EX Team Magma vs Team Aqua",
    "EX Hidden Legends",
    "EX FireRed & LeafGreen",
    "EX Team Rocket Returns",
    "EX Deoxys",
    "EX Emerald",
    "EX Unseen Forces",
    "EX Delta Species",
    "EX Legend Maker",
    "EX Holon Phantoms",
    "EX Crystal Guardians",
    "EX Dragon Frontiers",
    "EX Power Keepers",
    "Diamond & Pearl",
    "Mysterious Treasures",
    "Secret Wonders",
    "Great Encounters",
    "Majestic Dawn",
    "Legends Awakened",
    "Stormfront",
    "Platinum",
    "Rising Rivals",
    "Supreme Victors",
    "Arceus",
    "HeartGold & SoulSilver",
    "Unleashed",
    "Undaunted",
    "Triumphant",
    "Black & White",
    "Emerging Powers",
    "Noble Victories",
    "Next Destinies",
    "Dark Explorers",
    "Dragons Exalted",
    "Boundaries Crossed",
    "Plasma Storm",
    "Plasma Freeze",
    "Plasma Blast",
    "Legendary Treasures",
    "XY",
    "Flashfire",
    "Furious Fists",
    "Phantom Forces",
    "Primal Clash",
    "Roaring Skies",
    "Ancient Origins",
    "BREAKthrough",
    "BREAKpoint",
    "Generations",
    "Steam Siege",
    "Evolutions",
    "Sun & Moon",
    "Guardians Rising",
    "Burning Shadows",
    "Shining Legends",
    "Crimson Invasion",
    "Ultra Prism",
    "Forbidden Light",
    "Celestial Storm",
    "Lost Thunder",
    "Team Up",
    "Unbroken Bonds",
    "Unified Minds",
    "Hidden Fates",
    "Cosmic Eclipse",
    "Sword & Shield",
    "Rebel Clash",
    "Darkness Ablaze",
    "Champion's Path",
    "Vivid Voltage",
    "Shining Fates",
    "Battle Styles",
    "Chilling Reign",
    "Evolving Skies",
    "Celebrations",
    "Fusion Strike",
    "Brilliant Stars",
    "Astral Radiance",
    "Pokémon GO",
    "Lost Origin",
    "Silver Tempest",
    "Crown Zenith",
    "Scarlet & Violet",
    "Paldea Evolved",
    "Obsidian Flames",
    "151",
    "Paradox Rift",
    "Temporal Forces",
    "Twilight Masquerade",
    "Shrouded Fable",
    "Stellar Crown",
    "Surging Sparks",
    "Prismatic Evolutions",
  ];

  const lowerHtml = html.toLowerCase();

  for (const set of pokemonSets) {
    if (lowerHtml.includes(set.toLowerCase())) {
      setName = set;
      break;
    }
  }

  return {
    cardName,
    setName,
    cardNumber,
  };
}

/**
 * Construit l'identifiant d'une fiche.
 */
function createId(url: string): string {
  return url
    .replace(/^https?:\/\//i, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
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
   * Pour le moment, on conserve la fiche PriceCharting
   * qui a déjà été validée et dont l'extraction des prix
   * fonctionne correctement.
   *
   * La recherche générale sera branchée ensuite sur les
   * résultats de recherche PriceCharting.
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

    const prices = extractPrices(html);

    const info = extractCardInfo(html, query);

    const imageUrl = extractImageUrl(html);

    const card: PriceChartingResult = {
      id: createId(productUrl),

      cardName:
        info.cardName || "Charizard VMAX",

      setName:
        info.setName || "Darkness Ablaze",

      cardNumber:
        info.cardNumber || "020/189",

      imageUrl,

      prices,

      sourceUrl: productUrl,
    };

    /**
     * IMPORTANT :
     *
     * On retourne uniquement les prix actuels.
     * Aucun historicalPrices.
     * Aucun recentSales.
     */
    return NextResponse.json({
      success: true,

      query,

      results: [card],
    });
  } catch (error) {
    console.error(
      "PriceCharting search error:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        query,

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
