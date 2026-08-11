import { NextRequest, NextResponse } from "next/server";

const POKEWALLET = "https://api.pokewallet.io";

type RegionalLanguage = "ja" | "zh-tw";

function providerLanguage(language: RegionalLanguage): "jap" | "chn" {
  return language === "ja" ? "jap" : "chn";
}

function normalizeCode(value: unknown): string {
  return String(value || "").trim().toUpperCase();
}

async function getJson(url: string, apiKey: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(url, {
      cache: "no-store",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "X-API-Key": apiKey,
      },
    });
    if (!response.ok) {
      return { ok: false, status: response.status, data: null };
    }
    return { ok: true, status: response.status, data: await response.json() };
  } catch {
    return { ok: false, status: 503, data: null };
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET(request: NextRequest) {
  const apiKey = process.env.POKEWALLET_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { success: false, error: "POKEWALLET_API_KEY missing" },
      { status: 503 }
    );
  }

  const params = request.nextUrl.searchParams;
  const language = (params.get("lang") || "") as RegionalLanguage;
  if (language !== "ja" && language !== "zh-tw") {
    return NextResponse.json({ success: false, error: "invalid language" }, { status: 400 });
  }

  const providerLang = providerLanguage(language);
  const setCode = params.get("set");

  if (!setCode) {
    const result = await getJson(`${POKEWALLET}/sets`, apiKey);
    if (!result.ok) {
      return NextResponse.json(
        { success: false, error: "regional set catalogue unavailable", upstream: result.status },
        { status: 502 }
      );
    }

    const rows = Array.isArray(result.data?.data) ? result.data.data : [];
    const seen = new Set<string>();
    const sets = rows.flatMap((raw: any) => {
      if (String(raw?.language || "").toLowerCase() !== providerLang) return [];
      const code = normalizeCode(raw?.set_code);
      const setId = String(raw?.set_id || "").trim();
      const key = `${providerLang}:${code || setId}`;
      if (!code || seen.has(key)) return [];
      seen.add(key);
      return [{
        id: code,
        providerSetId: setId || undefined,
        name: String(raw?.name || code),
        series: "Pokémon TCG",
        total: Number(raw?.card_count || 0),
        printedTotal: Number(raw?.card_count || 0),
        releaseDate: String(raw?.release_date || ""),
        images: {},
      }];
    });

    return NextResponse.json({ success: true, sets });
  }

  const encoded = encodeURIComponent(setCode);
  const url =
    `${POKEWALLET}/sets/${encoded}?language=${providerLang}&page=1&limit=200`;
  const result = await getJson(url, apiKey);
  if (!result.ok) {
    return NextResponse.json(
      { success: false, error: "regional set unavailable", upstream: result.status },
      { status: 502 }
    );
  }

  if (result.data?.disambiguation && Array.isArray(result.data?.matches)) {
    const exact = result.data.matches.find(
      (match: any) => String(match?.language || "").toLowerCase() === providerLang
    );
    if (exact?.set_id) {
      const retry = await getJson(
        `${POKEWALLET}/sets/${encodeURIComponent(String(exact.set_id))}?page=1&limit=200`,
        apiKey
      );
      if (retry.ok) result.data = retry.data;
    }
  }

  const set = result.data?.set;
  const cards = Array.isArray(result.data?.cards) ? result.data.cards : [];
  const normalizedCards = cards.map((raw: any) => {
    const info = raw?.card_info || {};
    const number = String(info?.card_number || "").split("/")[0].trim();
    const rawId = String(raw?.id || "");
    const cardSetCode =
      normalizeCode(info?.set_code) ||
      normalizeCode(set?.set_code) ||
      normalizeCode(setCode);
    return {
      id: `pokewallet-${language}-${rawId}`,
      providerId: rawId,
      name: String(info?.clean_name || info?.name || `Carte ${number}`),
      number,
      rarity: info?.rarity || undefined,
      set: {
        id: cardSetCode,
        name: String(info?.set_name || set?.name || cardSetCode),
        series: "Pokémon TCG",
        total: Number(set?.total_cards || cards.length || 0),
        printedTotal: Number(set?.total_cards || cards.length || 0),
        releaseDate: String(set?.release_date || ""),
        images: {},
      },
      images: {
        small: `/api/catalog/image?id=${encodeURIComponent(rawId)}&lang=${encodeURIComponent(language)}&size=low`,
        large: `/api/catalog/image?id=${encodeURIComponent(rawId)}&lang=${encodeURIComponent(language)}&size=high`,
      },
      imageCandidates: [
        `/api/catalog/image?id=${encodeURIComponent(rawId)}&lang=${encodeURIComponent(language)}&size=high`,
        `/api/catalog/image?id=${encodeURIComponent(rawId)}&lang=${encodeURIComponent(language)}&size=low`,
      ],
      dataLanguage: language,
      cardmarket: raw?.cardmarket || undefined,
      tcgplayer: raw?.tcgplayer || undefined,
    };
  });

  return NextResponse.json({
    success: true,
    set: set
      ? {
          id: normalizeCode(set?.set_code) || normalizeCode(setCode),
          name: set?.name,
          total: set?.total_cards,
          releaseDate: set?.release_date,
        }
      : null,
    cards: normalizedCards,
  });
}
