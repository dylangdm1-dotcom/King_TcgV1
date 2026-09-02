import { NextResponse } from "next/server";
import {
  apiError,
  enforceRateLimit,
  readJsonBodyWithLimit,
  rejectOversizedContentLength,
} from "@/lib/api/security";
import { authorizeKingTcgDiagnostic } from "@/lib/api/privateToken";
import { clearMemoryMarketHistoryV277, MARKET_HISTORY_MAX_POINTS_V277 } from "@/lib/market-cache/history";
import { getMarketCacheMetricsV277, resetMarketCacheMetricsV277 } from "@/lib/market-cache/metrics";
import {
  clearPersistentMarketCacheMemoryV277,
  getMarketCachePersistenceStatusV276,
  probeMarketRedisV277,
} from "@/lib/market-cache/persistent";
import { clearServerMarketCacheV275 } from "@/lib/market-cache/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const limited = enforceRateLimit(request, "market-cache-status", { limit: 20, windowMs: 60_000 });
  if (limited) return limited;
  const denied = authorizeKingTcgDiagnostic(request);
  if (denied) return denied;

  const probe = await probeMarketRedisV277();
  return NextResponse.json({
    success: true,
    version: "market-cache-status-v277",
    persistence: getMarketCachePersistenceStatusV276(),
    probe,
    metrics: getMarketCacheMetricsV277(),
    history: { maximumPointsPerMarketIdentity: MARKET_HISTORY_MAX_POINTS_V277 },
  }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const limited = enforceRateLimit(request, "market-cache-status-action", { limit: 5, windowMs: 60_000 });
  if (limited) return limited;
  const denied = authorizeKingTcgDiagnostic(request);
  if (denied) return denied;
  const oversized = rejectOversizedContentLength(request, 2_000);
  if (oversized) return oversized;
  const parsed = await readJsonBodyWithLimit<{ action?: string }>(request, 2_000);
  if ("error" in parsed) return parsed.error;
  if (parsed.data.action !== "simulate-cold-start") {
    return apiError("Action de diagnostic invalide.", 400, "invalid_action");
  }

  clearServerMarketCacheV275();
  clearPersistentMarketCacheMemoryV277();
  clearMemoryMarketHistoryV277();
  resetMarketCacheMetricsV277();
  return NextResponse.json({
    success: true,
    action: "simulate-cold-start",
    durableDataDeleted: false,
    message: "Miroirs mémoire vidés ; Redis durable conservé.",
  }, { headers: { "Cache-Control": "no-store" } });
}
