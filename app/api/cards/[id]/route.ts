import { NextResponse } from "next/server";

const API_URL = "https://api.pokemontcg.io/v2/cards";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const apiKey = process.env.POKEMON_TCG_API_KEY;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(`${API_URL}/${encodeURIComponent(params.id)}`, {
      next: { revalidate: 86400 },
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        ...(apiKey ? { "X-Api-Key": apiKey } : {}),
      },
    });

    if (response.status === 404) {
      return NextResponse.json({ success: false, data: null, status: "not_found" }, { status: 404 });
    }
    if (response.status === 429) {
      return NextResponse.json({ success: false, data: null, status: "rate_limited" }, { status: 429 });
    }
    if (!response.ok) {
      return NextResponse.json({ success: false, data: null, status: "source_unavailable" }, { status: 502 });
    }

    const json = await response.json();
    return NextResponse.json({ success: true, data: json?.data ?? null, status: "available" });
  } catch {
    return NextResponse.json({ success: false, data: null, status: "source_unavailable" }, { status: 504 });
  } finally {
    clearTimeout(timeout);
  }
}
