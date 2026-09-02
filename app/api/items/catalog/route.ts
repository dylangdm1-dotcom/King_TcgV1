import { NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/api/security";
import { getServerItemCatalog, getServerItemManifest } from "@/lib/items/catalog";

const CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
};

export async function GET(request: Request) {
  const rateLimited = enforceRateLimit(request, "items-catalog", { limit: 180, windowMs: 60_000 });
  if (rateLimited) return rateLimited;

  return NextResponse.json(
    {
      success: true,
      data: getServerItemCatalog(),
      manifest: getServerItemManifest(),
      status: "foundation",
    },
    { headers: CACHE_HEADERS }
  );
}
