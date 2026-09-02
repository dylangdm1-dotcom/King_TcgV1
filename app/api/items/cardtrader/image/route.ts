import { NextResponse } from "next/server";
import {
  apiError,
  enforceRateLimit,
  readJsonBodyWithLimit,
  rejectOversizedContentLength,
} from "@/lib/api/security";
import { authorizeKingTcgDiagnostic } from "@/lib/api/privateToken";
import { safeCardTraderImage } from "@/lib/items/sources/cardtrader-catalog";

export const dynamic = "force-dynamic";

const MAX_IMAGE_BYTES = 6 * 1024 * 1024;

export async function POST(request: Request) {
  const limited = enforceRateLimit(request, "items-cardtrader-image", { limit: 80, windowMs: 60_000 });
  if (limited) return limited;
  const denied = authorizeKingTcgDiagnostic(request);
  if (denied) return denied;
  const oversized = rejectOversizedContentLength(request, 2_000);
  if (oversized) return oversized;
  const parsed = await readJsonBodyWithLimit<{ imageUrl?: unknown }>(request, 2_000);
  if ("error" in parsed) return parsed.error;
  const image = safeCardTraderImage(parsed.data.imageUrl);
  if (!image.url) return apiError("URL visuelle CardTrader invalide.", 400, "invalid_cardtrader_image_url");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const upstream = await fetch(image.url, {
      headers: { Accept: "image/avif,image/webp,image/jpeg,image/png,image/*", "User-Agent": "King_TCG/1.0" },
      cache: "no-store",
      signal: controller.signal,
    });
    if (!upstream.ok) return apiError("Visuel CardTrader indisponible.", 404, "cardtrader_image_not_found");
    const contentType = String(upstream.headers.get("content-type") || "").toLowerCase();
    if (!contentType.startsWith("image/")) return apiError("Réponse visuelle invalide.", 502, "invalid_cardtrader_image");
    const declared = Number(upstream.headers.get("content-length") || 0);
    if (declared > MAX_IMAGE_BYTES) return apiError("Visuel CardTrader trop volumineux.", 413, "cardtrader_image_too_large");
    const body = await upstream.arrayBuffer();
    if (!body.byteLength || body.byteLength > MAX_IMAGE_BYTES) return apiError("Visuel CardTrader invalide.", 502, "invalid_cardtrader_image_size");
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(body.byteLength),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return apiError("Source visuelle CardTrader indisponible.", 502, "cardtrader_image_upstream_error");
  } finally {
    clearTimeout(timeout);
  }
}
