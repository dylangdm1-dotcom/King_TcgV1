import { NextRequest } from "next/server";

const POKEWALLET = "https://api.pokewallet.io";

export async function GET(request: NextRequest) {
  const apiKey = process.env.POKEWALLET_API_KEY;
  const id = request.nextUrl.searchParams.get("id");
  const language = request.nextUrl.searchParams.get("lang");
  const size = request.nextUrl.searchParams.get("size") === "low" ? "low" : "high";

  if (!apiKey || !id) return new Response(null, { status: 404 });

  // PokéWallet serves the card's original artwork when no localized language
  // is requested. Its `lang` parameter is for European localized images only
  // (fr/it/de/es/pt), so never send synthetic `ja` or `zh` values here.
  const providerLang =
    language === "fr" || language === "it" || language === "de" || language === "es" || language === "pt"
      ? language
      : undefined;

  const params = new URLSearchParams({ size });
  if (providerLang) params.set("lang", providerLang);

  try {
    const response = await fetch(
      `${POKEWALLET}/images/${encodeURIComponent(id)}?${params.toString()}`,
      {
        cache: "force-cache",
        headers: { "X-API-Key": apiKey },
      }
    );
    if (!response.ok) return new Response(null, { status: response.status });

    const body = await response.arrayBuffer();
    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": response.headers.get("Content-Type") || "image/jpeg",
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  } catch {
    return new Response(null, { status: 503 });
  }
}
