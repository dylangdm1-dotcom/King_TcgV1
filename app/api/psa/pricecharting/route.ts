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
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function money(value: string | undefined): number {
  if (!value) return 0;
  const cleaned = value.replace(/[$,\s]/g, "");
  const number = Number.parseFloat(cleaned);
  return Number.isFinite(number) ? number : 0;
}

function extractPrice(text: string, label: string): number {
  const pattern = new RegExp(`${label}\\s*\\$([0-9,]+(?:\\.[0-9]+)?)`, "i");
  return money(text.match(pattern)?.[1]);
}

function parseSearchResults(html: string): Array<{ url: string; title: string }> {
  const results: Array<{ url: string; title: string }> = [];
  const seen = new Set<string>();

  const anchorRegex = /<a\s+[^>]*href=["'](\/game\/pokemon-[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;

  while ((match = anchorRegex.exec(html))) {
    const url = `https://www.pricecharting.com${match[1]}`;
    const title = decodeHtml(match[2]);

    if (!title || seen.has(url)) continue;
    seen.add(url);
    results.push({ url, title });

    if (results.length >= 8) break;
  }

  return results;
}

function parseDetail(html: string, sourceUrl: string, fallbackTitle: string): Result | null {
  const text = decodeHtml(html);
  const titleMatch = text.match(/Full Price Guide:\s*([^|]+?)\s*\((Pokemon[^)]*)\)/i);
  const heading = titleMatch?.[1]?.trim() || fallbackTitle;
  const setName = titleMatch?.[2]?.trim() || "Pokemon";

  const numberMatch = heading.match(/#([A-Za-z0-9./-]+)/);
  const cardNumber = numberMatch?.[1] || "";
  const cardName = heading.replace(/\s*#([A-Za-z0-9./-]+).*$/, "").trim() || heading;

  const prices = {
    ungraded: extractPrice(text, "Ungraded"),
    psa7: extractPrice(text, "Grade 7"),
    psa8: extractPrice(text, "Grade 8"),
    psa9: extractPrice(text, "Grade 9"),
    psa9_5: extractPrice(text, "Grade 9\.5"),
    psa10: extractPrice(text, "PSA 10"),
  };

  if (!prices.ungraded && !prices.psa7 && !prices.psa8 && !prices.psa9 && !prices.psa10) {
    return null;
  }

  return {
    id: sourceUrl,
    cardName,
    setName,
    cardNumber,
    imageUrl: "",
    sourceUrl,
    prices,
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();

  if (!query) {
    return NextResponse.json(
      { success: false, error: "Recherche vide." },
      { status: 400 }
    );
  }

  try {
    const searchUrl = `https://www.pricecharting.com/search-products?type=prices&view=grid&q=${encodeURIComponent(query)}`;

    const searchResponse = await fetch(searchUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; King_TCG/5.0; +https://www.pricecharting.com/)"
      },
      cache: "no-store",
    });

    if (!searchResponse.ok) {
      throw new Error(`PriceCharting recherche HTTP ${searchResponse.status}`);
    }

    const searchHtml = await searchResponse.text();
    const candidates = parseSearchResults(searchHtml);

    const results = (
      await Promise.all(
        candidates.map(async (candidate) => {
          try {
            const response = await fetch(candidate.url, {
              headers: {
                "User-Agent": "Mozilla/5.0 (compatible; King_TCG/5.0; +https://www.pricecharting.com/)"
              },
              cache: "no-store",
            });

            if (!response.ok) return null;
            return parseDetail(await response.text(), candidate.url, candidate.title);
          } catch {
            return null;
          }
        })
      )
    ).filter((item): item is Result => item !== null);

    return NextResponse.json({
      success: true,
      source: "PriceCharting public pages",
      results,
    });
  } catch (error) {
    console.error("PriceCharting public retrieval error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Impossible de récupérer les données publiques PriceCharting pour le moment.",
      },
      { status: 502 }
    );
  }
}
