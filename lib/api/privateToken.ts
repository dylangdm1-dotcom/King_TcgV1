import { timingSafeEqual } from "crypto";
import { type NextResponse } from "next/server";
import { apiError } from "./security";

export function authorizeKingTcgDiagnostic(request: Request): NextResponse | null {
  const expected = String(process.env.KING_TCG_CACHE_STATUS_TOKEN || "").trim();
  if (!expected) return apiError("Diagnostic privé non configuré.", 503, "diagnostic_not_configured");

  const provided = String(request.headers.get("x-king-tcg-cache-token") || "").trim();
  const expectedBuffer = Buffer.from(expected);
  const providedBuffer = Buffer.from(provided);
  if (expectedBuffer.length !== providedBuffer.length || !timingSafeEqual(expectedBuffer, providedBuffer)) {
    return apiError("Accès refusé.", 401, "unauthorized");
  }
  return null;
}
