import { NextResponse } from "next/server";
import {
  apiError,
  boundedQuery,
  enforceRateLimit,
  readJsonBodyWithLimit,
  rejectOversizedContentLength,
} from "@/lib/api/security";
import { authorizeKingTcgDiagnostic } from "@/lib/api/privateToken";
import { cardTraderStatus } from "@/lib/items/sources/cardtrader";
import {
  loadCardTraderPokemonReference,
  previewCardTraderFrenchExpansion,
} from "@/lib/items/sources/cardtrader-catalog";

export const dynamic = "force-dynamic";

function failure(error: unknown) {
  const code = error instanceof Error ? error.message : "cardtrader_unknown_error";
  if (code === "cardtrader_not_configured") return apiError("CardTrader non configuré sur cet environnement.", 503, code);
  if (code === "cardtrader_unauthorized") return apiError("Jeton CardTrader refusé.", 502, code);
  if (code === "cardtrader_rate_limited") return apiError("Quota CardTrader temporairement atteint.", 429, code, { "Retry-After": "10" });
  if (code === "cardtrader_expansion_not_found") return apiError("Extension CardTrader Pokémon introuvable.", 404, code);
  if (code.startsWith("cardtrader_http_")) return apiError("CardTrader temporairement indisponible.", 502, code);
  return apiError("Prévisualisation CardTrader impossible.", 502, "cardtrader_preview_failed");
}

export async function GET(request: Request) {
  const limited = enforceRateLimit(request, "items-cardtrader-reference", { limit: 10, windowMs: 60_000 });
  if (limited) return limited;
  const denied = authorizeKingTcgDiagnostic(request);
  if (denied) return denied;

  const query = boundedQuery(new URL(request.url).searchParams.get("q"), 80);
  if ("error" in query) return query.error;
  try {
    const reference = await loadCardTraderPokemonReference();
    const needle = query.value.toLocaleLowerCase("fr");
    const expansions = reference.expansions
      .filter((expansion) => !needle || `${expansion.code} ${expansion.name}`.toLocaleLowerCase("fr").includes(needle))
      .sort((a, b) => b.id - a.id)
      .slice(0, 100);
    return NextResponse.json({
      success: true,
      version: "items-cardtrader-preview-v294",
      cardtrader: cardTraderStatus(),
      game: reference.game,
      sealedCategories: reference.categories,
      expansions,
      count: expansions.length,
      publication: "review_required",
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request: Request) {
  const limited = enforceRateLimit(request, "items-cardtrader-preview", { limit: 8, windowMs: 60_000 });
  if (limited) return limited;
  const denied = authorizeKingTcgDiagnostic(request);
  if (denied) return denied;
  const oversized = rejectOversizedContentLength(request, 2_000);
  if (oversized) return oversized;
  const parsed = await readJsonBodyWithLimit<{ expansionId?: unknown }>(request, 2_000);
  if ("error" in parsed) return parsed.error;
  const expansionId = Number(parsed.data.expansionId);
  if (!Number.isInteger(expansionId) || expansionId <= 0) {
    return apiError("Identifiant d’extension CardTrader invalide.", 400, "invalid_expansion_id");
  }

  try {
    const preview = await previewCardTraderFrenchExpansion(expansionId);
    return NextResponse.json({
      success: true,
      version: "items-cardtrader-preview-v294",
      ...preview,
      publication: "review_required",
      note: "Aucun candidat n’est publié automatiquement dans le catalogue FR.",
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return failure(error);
  }
}
