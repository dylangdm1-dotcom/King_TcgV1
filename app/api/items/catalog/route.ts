import { NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/api/security";
import { getServerItemBundleV301 } from "@/lib/items/catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const rateLimited = enforceRateLimit(request, "items-catalog", { limit: 180, windowMs: 60_000 });
  if (rateLimited) return rateLimited;
  const forceFrench = new URL(request.url).searchParams.get("refresh") === "1";
  if (forceFrench) {
    const refreshRateLimited = enforceRateLimit(request, "items-catalog-force", { limit: 2, windowMs: 10 * 60_000 });
    if (refreshRateLimited) return refreshRateLimited;
  }
  const bundle = await getServerItemBundleV301({ refreshFrench: true, forceFrench });

  return NextResponse.json(
    {
      success: true,
      data: bundle.items,
      manifest: bundle.manifest,
      runtime: bundle.runtime,
      status: `fr_${bundle.runtime.state}`,
    },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}
