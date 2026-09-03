import { NextRequest, NextResponse } from "next/server";
import { apiError, enforceRateLimit, safeIdentifier } from "@/lib/api/security";

const POKEWALLET = "https://api.pokewallet.io";
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export async function GET(request: NextRequest) {
  const rateLimited = enforceRateLimit(request, "catalog-image", { limit: 300, windowMs: 60_000 });
  if (rateLimited) return rateLimited;

  const provider = request.nextUrl.searchParams.get("provider");
  if (provider === "tcgplayer") {
    const product = safeIdentifier(request.nextUrl.searchParams.get("product"), 12, /^\d{1,12}$/);
    if ("error" in product) return product.error;
    const size = request.nextUrl.searchParams.get("size") === "low" ? "low" : "high";
    const suffix = size === "low" ? "200w" : "in_1000x1000";
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12_000);
    try {
      const response = await fetch(
        `https://tcgplayer-cdn.tcgplayer.com/product/${product.value}_${suffix}.jpg`,
        {
          headers: { Accept: "image/jpeg,image/webp,image/*", "User-Agent": "King_TCG/1.0" },
          next: { revalidate: 2_592_000 },
          signal: controller.signal,
        }
      );
      if (!response.ok) return new Response(null, { status: 404 });
      const contentType = response.headers.get("content-type") || "";
      if (!contentType.startsWith("image/")) return apiError("Réponse visuelle invalide.", 502, "invalid_catalog_image");
      const body = await response.arrayBuffer();
      if (!body.byteLength || body.byteLength > MAX_IMAGE_BYTES) return apiError("Taille visuelle invalide.", 502, "invalid_catalog_image_size");
      return new NextResponse(body, {
        status: 200,
        headers: {
          "Content-Type": contentType,
          "Content-Length": String(body.byteLength),
          "Cache-Control": "public, s-maxage=2592000, stale-while-revalidate=7776000",
          "X-Content-Type-Options": "nosniff",
        },
      });
    } catch {
      return apiError("Source visuelle temporairement indisponible.", 502, "catalog_image_upstream_error");
    } finally {
      clearTimeout(timeout);
    }
  }

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
