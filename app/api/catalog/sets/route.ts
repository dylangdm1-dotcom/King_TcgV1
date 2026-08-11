import { NextRequest, NextResponse } from "next/server";
import { CHINESE_SET_CATALOG } from "../../../../lib/regionalSetCatalog";

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
    // V72: Simplified Chinese must not depend on PokéWallet /sets.
    // That global endpoint can be temporarily unavailable (502) even while
    // direct /sets/:code and /search requests still work. Keep the curated
    // technical CN catalogue local so one upstream listing outage never turns
    // every Chinese extension into 0 cards.
    if (language === "zh-tw") {
      const sets = CHINESE_SET_CATALOG.map((entry) => ({
        id: entry.code,
        name: entry.name,
        series: entry.era || "Pokémon TCG",
        total: 0,
        printedTotal: 0,
        releaseDate: "",
        images: {},
      }));
      return NextResponse.json({ success: true, sets, source: "local-cn-catalogue" });
    }

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

  // V73: Simplified Chinese uses PokéWallet /search as the canonical card
  // discovery path. /sets/:code can return HTTP 200 with an empty card list,
  // which previously prevented the fallback from running and made every CN
  // extension look empty. /search?q=SETCODE is documented for exact set-code
  // lookup and returns the card IDs plus Cardmarket/TCGPlayer payloads.
  let result: any;
  if (language === "zh-tw") {
    const collected: any[] = [];
    let totalPages = 1;
    for (let page = 1; page <= totalPages && page <= 10; page += 1) {
      const search = await getJson(
        `${POKEWALLET}/search?q=${encodeURIComponent(setCode)}&page=${page}&limit=100`,
        apiKey
      );
      if (!search.ok) {
        if (page === 1) result = search;
        break;
      }
      const rows = Array.isArray(search.data?.results) ? search.data.results : [];
      const exactRows = rows.filter((raw: any) =>
        normalizeCode(raw?.card_info?.set_code) === normalizeCode(setCode)
      );
      collected.push(...exactRows);
      totalPages = Math.max(1, Number(search.data?.pagination?.total_pages || 1));
      if (rows.length < 100) break;
    }

    if (collected.length) {
      result = {
        ok: true,
        status: 200,
        data: {
          set: {
            set_code: normalizeCode(setCode),
            name: CHINESE_SET_CATALOG.find((entry) => normalizeCode(entry.code) === normalizeCode(setCode))?.name || setCode,
            total_cards: collected.length,
            language: "chn",
          },
          cards: collected,
        },
      };
    } else if (!result) {
      // Last-resort compatibility path: some provider set codes can still be
      // served by /sets/:code. Accept it only when it actually contains cards.
      const direct = await getJson(
        `${POKEWALLET}/sets/${encoded}?language=${providerLang}&page=1&limit=200`,
        apiKey
      );
      const directCards = Array.isArray(direct.data?.cards) ? direct.data.cards : [];
      result = direct.ok && directCards.length
        ? direct
        : { ok: false, status: direct.status || 404, data: null };
    }
  } else {
    const url =
      `${POKEWALLET}/sets/${encoded}?language=${providerLang}&page=1&limit=200`;
    result = await getJson(url, apiKey);
  }

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
