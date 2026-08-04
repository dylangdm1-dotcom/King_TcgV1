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
   * Fiche individuelle connue grâce au résultat
   * validé précédemment pour Charizard VMAX #20.
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
     * Toutes les occurrences de "Grade"
     * dans le HTML.
     */
    const gradeMatches =
      html.match(/.{0,300}Grade.{0,700}/gi) ?? [];

    /**
     * Toutes les occurrences de "PSA".
     */
    const psaMatches =
      html.match(/.{0,300}PSA.{0,700}/gi) ?? [];

    /**
     * Contexte précis autour des termes recherchés.
     */
    const targets = [
      "Grade 9",
      "Grade 9.5",
      "PSA 10",
      "PSA10",
      "grade9",
      "grade9.5",
      "psa10",
    ];

    const contexts: Record<string, string[]> = {};

    for (const target of targets) {
      const matches: string[] = [];

      const regex = new RegExp(
        `.{0,1000}${target.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}.{0,2000}`,
        "gi"
      );

      let match: RegExpExecArray | null;

      while ((match = regex.exec(html)) !== null) {
        matches.push(
          match[0]
        );

        if (matches.length >= 5) {
          break;
        }
      }

      contexts[target] = matches;
    }

    /**
     * Quelques tableaux HTML.
     */
    const trMatches =
      html.match(
        /<tr\b[^>]*>[\s\S]*?<\/tr>/gi
      ) ?? [];

    const relevantRows =
      trMatches
        .filter((row) =>
          /Grade|PSA|price|Price/i.test(row)
        )
        .slice(0, 30)
        .map((row, index) => ({
          index,
          raw: row,
          decoded: decodeHtml(row),
        }));

    /**
     * Recherche des éléments contenant
     * explicitement les valeurs monétaires.
     */
    const priceMatches =
      html.match(
        /.{0,300}\$[0-9,]+(?:\.[0-9]+)?.{0,700}/gi
      ) ?? [];

    return NextResponse.json({
      success: true,

      productUrl,

      htmlLength:
        html.length,

      gradeMatchCount:
        gradeMatches.length,

      psaMatchCount:
        psaMatches.length,

      gradeExamples:
        gradeMatches.slice(0, 20),

      psaExamples:
        psaMatches.slice(0, 20),

      contexts,

      relevantRows,

      priceExamples:
        priceMatches.slice(0, 30),
    });
  } catch (error) {
    console.error(
      "PriceCharting product diagnostic error:",
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
