import { NextResponse } from "next/server";
import { apiError, enforceRateLimit, safeIdentifier } from "@/lib/api/security";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export async function GET(request: Request) {
  const rateLimited = enforceRateLimit(request, "items-image", { limit: 300, windowMs: 60_000 });
  if (rateLimited) return rateLimited;

  const { searchParams } = new URL(request.url);
  const product = safeIdentifier(searchParams.get("product"), 12, /^\d{1,12}$/);
  if ("error" in product) return product.error;
  const size = searchParams.get("size") === "small" ? "small" : "large";
  const suffix = size === "small" ? "200w" : "in_1000x1000";
  const upstreamUrl = `https://tcgplayer-cdn.tcgplayer.com/product/${product.value}_${suffix}.jpg`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const upstream = await fetch(upstreamUrl, {
      headers: { Accept: "image/jpeg,image/webp,image/*", "User-Agent": "King_TCG/1.0" },
      next: { revalidate: 604_800 },
      signal: controller.signal,
    });
    if (!upstream.ok) return apiError("Visuel Item indisponible.", 404, "item_image_not_found");
    const contentType = upstream.headers.get("content-type") || "";
    if (!contentType.startsWith("image/")) return apiError("Réponse visuelle invalide.", 502, "invalid_item_image");
    const bytes = await upstream.arrayBuffer();
    if (!bytes.byteLength || bytes.byteLength > MAX_IMAGE_BYTES) {
      return apiError("Visuel Item invalide.", 502, "invalid_item_image_size");
    }
    return new NextResponse(bytes, {
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(bytes.byteLength),
        "Cache-Control": "public, s-maxage=604800, stale-while-revalidate=2592000",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return apiError("Source visuelle temporairement indisponible.", 502, "item_image_upstream_error");
  } finally {
    clearTimeout(timeout);
  }
}
