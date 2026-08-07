import { NextResponse } from "next/server";

const API_URL = "https://api.pokemontcg.io/v2/cards";
const MAX_PAGE_SIZE = 250;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const page = Math.max(1, Number(searchParams.get("page") ?? 1) || 1);
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Number(searchParams.get("pageSize") ?? MAX_PAGE_SIZE) || MAX_PAGE_SIZE)
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
      cache: "no-store",
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
