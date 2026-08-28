import { NextResponse } from "next/server";
import { boundedQuery, enforceRateLimit } from "@/lib/api/security";

const API_URL = "https://api.pokemontcg.io/v2/cards";
const MAX_PAGE_SIZE = 250;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rateLimited = enforceRateLimit(request, "cards-search", { limit: 120, windowMs: 60_000 });
  if (rateLimited) return rateLimited;

  const boundedSearch = boundedQuery(searchParams.get("q"), 300);
  if ("error" in boundedSearch) return boundedSearch.error;
  const q = boundedSearch.value;
  const rawPage = Number(searchParams.get("page") ?? 1);
  const page = Number.isFinite(rawPage)
    ? Math.min(10_000, Math.max(1, Math.floor(rawPage)))
    : 1;
  const rawPageSize = Number(searchParams.get("pageSize") ?? MAX_PAGE_SIZE);
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Number.isFinite(rawPageSize) ? Math.floor(rawPageSize) : MAX_PAGE_SIZE)
  );

  if (!q) {
    return NextResponse.json({ success: true, data: [], status: "empty" });
  }

  const params = new URLSearchParams({
    q,
    page: String(page),
    pageSize: String(pageSize),
    orderBy: "-set.releaseDate",
  });

  const apiKey = process.env.POKEMON_TCG_API_KEY;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(`${API_URL}?${params.toString()}`, {
      next: { revalidate: 3600 },
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        ...(apiKey ? { "X-Api-Key": apiKey } : {}),
      },
    });

    if (response.status === 429) {
      return NextResponse.json(
        { success: false, data: [], status: "rate_limited" },
        { status: 429 }
      );
    }

    if (!response.ok) {
      return NextResponse.json(
        { success: false, data: [], status: "source_unavailable" },
        { status: 502 }
      );
    }

    const json = await response.json();
    return NextResponse.json({
      success: true,
      data: Array.isArray(json?.data) ? json.data : [],
      status: "available",
      page: json?.page,
      pageSize: json?.pageSize,
      count: json?.count,
      totalCount: json?.totalCount,
    });
  } catch {
    return NextResponse.json(
      { success: false, data: [], status: "source_unavailable" },
      { status: 504 }
    );
  } finally {
    clearTimeout(timeout);
  }
}
