import { NextResponse } from "next/server";
import { enforceRateLimit, safeIdentifier } from "@/lib/api/security";
import { getServerItemByIdV300 } from "@/lib/items/catalog";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const rateLimited = enforceRateLimit(request, "items-by-id", { limit: 240, windowMs: 60_000 });
  if (rateLimited) return rateLimited;

  const identifier = safeIdentifier(params.id, 180, /^[a-zA-Z0-9._:+-]+$/);
  if ("error" in identifier) return identifier.error;
  const item = await getServerItemByIdV300(identifier.value);
  if (!item) {
    return NextResponse.json({ success: false, data: null, status: "not_found" }, { status: 404 });
  }
  return NextResponse.json(
    { success: true, data: item, status: "available" },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}
