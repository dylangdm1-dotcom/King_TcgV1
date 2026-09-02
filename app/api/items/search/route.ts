import { NextResponse } from "next/server";
import { boundedQuery, enforceRateLimit } from "@/lib/api/security";
import { ITEM_CATEGORIES, ITEM_LANGUAGES } from "@/lib/items/categories";
import { getServerItemBundleV296 } from "@/lib/items/catalog";
import { filterSealedItems } from "@/lib/items/filters";
import type { ItemCategory, ItemLanguage } from "@/lib/items/types";

export async function GET(request: Request) {
  const rateLimited = enforceRateLimit(request, "items-search", { limit: 120, windowMs: 60_000 });
  if (rateLimited) return rateLimited;

  const { searchParams } = new URL(request.url);
  const query = boundedQuery(searchParams.get("q"), 160);
  if ("error" in query) return query.error;
  const rawLanguage = String(searchParams.get("language") || "all");
  const rawCategory = String(searchParams.get("category") || "all");
  const language = rawLanguage === "all" || ITEM_LANGUAGES.includes(rawLanguage as ItemLanguage) ? rawLanguage : "all";
  const category = rawCategory === "all" || ITEM_CATEGORIES.includes(rawCategory as ItemCategory) ? rawCategory : "all";

  const bundle = await getServerItemBundleV296({ refreshFrench: true });
  const data = filterSealedItems(bundle.items, {
    query: query.value,
    language: language as ItemLanguage | "all",
    category: category as ItemCategory | "all",
    availability: "all",
    sort: "newest",
  });

  return NextResponse.json({
    success: true,
    data,
    count: data.length,
    status: data.length ? "available" : "empty",
    runtime: bundle.runtime,
  });
}
