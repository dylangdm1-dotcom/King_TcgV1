import { NextResponse } from "next/server";

const SETS_URL = "https://api.pokemontcg.io/v2/sets";

export async function GET() {
  const apiKey = process.env.POKEMON_TCG_API_KEY;
  const params = new URLSearchParams({ pageSize: "300", orderBy: "-releaseDate" });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(`${SETS_URL}?${params.toString()}`, {
      cache: "no-store",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        ...(apiKey ? { "X-Api-Key": apiKey } : {}),
      },
    });

    if (response.status === 429) {
      return NextResponse.json({ success: false, data: [], status: "rate_limited" }, { status: 429 });
    }
    if (!response.ok) {
      return NextResponse.json({ success: false, data: [], status: "source_unavailable" }, { status: 502 });
    }

    const json = await response.json();
    return NextResponse.json({ success: true, data: Array.isArray(json?.data) ? json.data : [] });
  } catch {
    return NextResponse.json({ success: false, data: [], status: "source_unavailable" }, { status: 504 });
  } finally {
    clearTimeout(timeout);
  }
}
