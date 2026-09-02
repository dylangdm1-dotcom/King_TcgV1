import { NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/api/security";
import { getServerItemBundleV296 } from "@/lib/items/catalog";

const CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
};

export async function GET(request: Request) {
  const rateLimited = enforceRateLimit(request, "items-catalog", { limit: 180, windowMs: 60_000 });
  if (rateLimited) return rateLimited;
  const bundle = await getServerItemBundleV296({ refreshFrench: true });

  return NextResponse.json(
    {
      success: true,
      data: bundle.items,
      manifest: bundle.manifest,
      runtime: bundle.runtime,
      status: bundle.runtime.state === "preview" ? "fr_preview" : "foundation",
    },
    { headers: CACHE_HEADERS }
  );
}
