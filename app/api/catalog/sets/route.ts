import { NextRequest, NextResponse } from "next/server";

const POKEWALLET = "https://api.pokewallet.io";

type RegionalLanguage = "ja" | "zh-tw";

function providerLanguage(language: RegionalLanguage): "jap" | "chn" {
  return language === "ja" ? "jap" : "chn";
}

function normalizeCode(value: unknown): string {
  return String(value || "").trim().toUpperCase();
}

function normalizeText(value: unknown): string {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function isMainlandChineseSet(raw: any): boolean {
  const language = String(raw?.language || "").toLowerCase();
  if (language) return language === "chn";
  const code = normalizeCode(raw?.set_code);
  return /^(?:CBB|CSV|CS|CSM|151)/.test(code);
}

async function getJson(url: string, apiKey: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(url, {
      cache: "no-store",
      signal: controller.signal,
      headers: { Accept: "application/json", "X-API-Key": apiKey },
    });
    if (!response.ok) return { ok: false, status: response.status, data: null };
    return { ok: true, status: response.status, data: await response.json() };
  } catch {
    return { ok: false, status: 503, data: null };
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeCard(raw: any, language: RegionalLanguage, parentSet: any, requestedCode: string) {
  // /sets/:code currently returns flattened cards while /search returns card_info.
  // Support both shapes so provider response changes do not create empty cards.
  const info = raw?.card_info || raw || {};
  const number = String(info?.card_number || info?.number || "").split("/")[0].trim();
  const rawId = String(raw?.id || info?.id || "");
  const cardSetCode = normalizeCode(info?.set_code) || normalizeCode(parentSet?.set_code) || normalizeCode(requestedCode);
  return {
    id: `pokewallet-${language}-${rawId}`,
    providerId: rawId,
    name: String(info?.clean_name || info?.name || `Carte ${number}`),
    number,
    rarity: info?.rarity || undefined,
    set: {
      id: cardSetCode,
      name: String(info?.set_name || parentSet?.name || cardSetCode),
      series: "Pokémon TCG",
      total: Number(parentSet?.total_cards || parentSet?.card_count || 0),
      printedTotal: Number(parentSet?.total_cards || parentSet?.card_count || 0),
      releaseDate: String(parentSet?.release_date || ""),
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
}

async function searchSetCards(apiKey: string, setName: string, setCode: string, language: RegionalLanguage) {
  const query = setName || setCode;
  if (!query) return [];

  const first = await getJson(`${POKEWALLET}/search?q=${encodeURIComponent(query)}&page=1&limit=100`, apiKey);
  if (!first.ok) return [];
  const firstRows = Array.isArray(first.data?.results) ? first.data.results : [];
  const totalPages = Math.min(6, Math.max(1, Number(first.data?.pagination?.total_pages || 1)));
  const rest = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, i) => i + 2).map((page) =>
      getJson(`${POKEWALLET}/search?q=${encodeURIComponent(query)}&page=${page}&limit=100`, apiKey)
    )
  );
  const rows = [...firstRows, ...rest.flatMap((part) => Array.isArray(part.data?.results) ? part.data.results : [])];
  const wantedName = normalizeText(setName);
  const wantedCode = normalizeCode(setCode);

  return rows.filter((raw: any) => {
    const info = raw?.card_info || raw || {};
    const code = normalizeCode(info?.set_code);
    const name = normalizeText(info?.set_name || raw?.cardmarket?.product_name || "");
    const languageField = String(info?.language || raw?.language || "").toLowerCase();
    if (languageField && language === "ja" && languageField !== "jap") return false;
    if (languageField && language === "zh-tw" && languageField !== "chn") return false;
    if (wantedCode && code === wantedCode) return true;
    if (wantedName && name && (name === wantedName || name.includes(wantedName))) return true;
    return false;
  });
}

export async function GET(request: NextRequest) {
  const apiKey = process.env.POKEWALLET_API_KEY;
  if (!apiKey) return NextResponse.json({ success: false, error: "POKEWALLET_API_KEY missing" }, { status: 503 });

  const params = request.nextUrl.searchParams;
  const language = (params.get("lang") || "") as RegionalLanguage;
  if (language !== "ja" && language !== "zh-tw") {
    return NextResponse.json({ success: false, error: "invalid language" }, { status: 400 });
  }

  const providerLang = providerLanguage(language);
  const setCode = params.get("set");
  const setName = params.get("name") || "";

  if (!setCode) {
    const result = await getJson(`${POKEWALLET}/sets`, apiKey);
    if (!result.ok) {
      return NextResponse.json({ success: false, error: "regional set catalogue unavailable", upstream: result.status }, { status: 502 });
    }

    const rows = Array.isArray(result.data?.data) ? result.data.data : [];
    const seen = new Set<string>();
    const sets = rows.flatMap((raw: any) => {
      const languageField = String(raw?.language || "").toLowerCase();
      if (language === "ja" && languageField && languageField !== providerLang) return [];
      if (language === "zh-tw" && !isMainlandChineseSet(raw)) return [];

      const code = normalizeCode(raw?.set_code);
      const setId = String(raw?.set_id || "").trim();
      if (!code) return [];
      const key = `${providerLang}:${setId || code}:${normalizeText(raw?.name)}`;
      if (seen.has(key)) return [];
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
  let result = await getJson(`${POKEWALLET}/sets/${encoded}?language=${providerLang}&page=1&limit=200`, apiKey);

  if (result.ok && result.data?.disambiguation && Array.isArray(result.data?.matches)) {
    const exact = result.data.matches.find((match: any) => {
      const languageField = String(match?.language || "").toLowerCase();
      const nameMatch = setName && normalizeText(match?.name) === normalizeText(setName);
      return (languageField ? languageField === providerLang : true) && (nameMatch || !setName);
    });
    if (exact?.set_id) {
      const retry = await getJson(`${POKEWALLET}/sets/${encodeURIComponent(String(exact.set_id))}?page=1&limit=200`, apiKey);
      if (retry.ok) result = retry;
    }
  }

  const directCards = result.ok && Array.isArray(result.data?.cards) ? result.data.cards : [];
  const set = result.ok ? result.data?.set : null;
  let cards = directCards;

  // Display codes such as VSU/PTG/IAC are not necessarily provider IDs.
  // Resolve older JP and any missing CN set by its curated display name.
  if (!cards.length && setName) {
    cards = await searchSetCards(apiKey, setName, setCode, language);
  }

  const normalizedCards = cards.map((raw: any) => normalizeCard(raw, language, set, setCode));
  return NextResponse.json({
    success: true,
    set: set ? {
      id: normalizeCode(set?.set_code) || normalizeCode(setCode),
      name: set?.name || setName,
      total: set?.total_cards || normalizedCards.length,
      releaseDate: set?.release_date,
    } : { id: normalizeCode(setCode), name: setName || setCode, total: normalizedCards.length },
    cards: normalizedCards,
  });
}
