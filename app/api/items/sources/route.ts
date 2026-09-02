import { NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/api/security";
import { ITEM_SOURCE_REGISTRY } from "@/lib/items/sources/registry";
import { cardTraderStatus } from "@/lib/items/sources/cardtrader";

export async function GET(request: Request) {
  const rateLimited = enforceRateLimit(request, "items-sources", { limit: 120, windowMs: 60_000 });
  if (rateLimited) return rateLimited;

  return NextResponse.json(
    {
      success: true,
      sources: ITEM_SOURCE_REGISTRY,
      cardtrader: cardTraderStatus(),
    },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}
