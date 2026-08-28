import { NextRequest } from "next/server";
import { apiError, enforceRateLimit, safeIdentifier } from "@/lib/api/security";

const POKEWALLET = "https://api.pokewallet.io";

export async function GET(request: NextRequest) {
  const rateLimited = enforceRateLimit(request, "catalog-image", { limit: 300, windowMs: 60_000 });
  if (rateLimited) return rateLimited;

  const apiKey = process.env.POKEWALLET_API_KEY;
  const rawId = request.nextUrl.searchParams.get("id");
  const language = request.nextUrl.searchParams.get("lang");
  const rawSize = request.nextUrl.searchParams.get("size");

  if (!rawId) return new Response(null, { status: 404 });
  const id = safeIdentifier(rawId, 160);
  if ("error" in id) return id.error;
  if (language && language !== "ja" && language !== "zh-tw") {
    return apiError("Langue d’image invalide.", 400, "invalid_language");
  }
  if (rawSize && rawSize !== "low" && rawSize !== "high") {
    return apiError("Taille d’image invalide.", 400, "invalid_size");
  }
  const size = rawSize === "low" ? "low" : "high";

  if (!apiKey) return new Response(null, { status: 404 });

  const providerLang = language === "ja" ? "ja" : undefined;

  const params = new URLSearchParams({ size });
  // PokéWallet localized image languages are EU-only. Simplified Chinese
  // cards must use the card's original/default image with no lang parameter.
  if (providerLang && language !== "zh-tw") params.set("lang", providerLang);

  try {
    const response = await fetch(
      `${POKEWALLET}/images/${encodeURIComponent(id.value)}?${params.toString()}`,
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
