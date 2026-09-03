import { NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/api/security";
import { getServerItemBundleV298 } from "@/lib/items/catalog";

export async function GET(request: Request) {
  const rateLimited = enforceRateLimit(request, "items-catalog", { limit: 180, windowMs: 60_000 });
  if (rateLimited) return rateLimited;
  const bundle = await getServerItemBundleV298({ refreshFrench: true });

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
