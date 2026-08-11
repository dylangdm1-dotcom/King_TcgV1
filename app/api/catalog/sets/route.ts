import { NextRequest, NextResponse } from "next/server";
import { getSetDisplayMeta } from "@/lib/setDisplayCatalog";

const POKEWALLET = "https://api.pokewallet.io";
const SET_INDEX_TTL = 6 * 60 * 60 * 1000;
let setIndexCache: { expiresAt: number; rows: any[] } | null = null;

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


async function getSetIndex(apiKey: string): Promise<any[]> {
  if (setIndexCache && setIndexCache.expiresAt > Date.now()) return setIndexCache.rows;
  const result = await getJson(`${POKEWALLET}/sets`, apiKey);
  if (!result.ok) return [];
  const rows = Array.isArray(result.data?.data) ? result.data.data : [];
  setIndexCache = { rows, expiresAt: Date.now() + SET_INDEX_TTL };
  return rows;
}

function providerSetFromIndex(rows: any[], setCode: string, setName: string, language: RegionalLanguage): any | null {
  const providerLang = providerLanguage(language);
  const display = getSetDisplayMeta(language, setCode, setName);
  const wantedNames = new Set(
    [setName, display?.name, ...(display?.aliases || [])]
      .map((value) => normalizeText(value))
      .filter(Boolean)
  );
  const wantedCodes = new Set(
    [setCode, ...(display?.sourceIds || [])]
      .map((value) => normalizeCode(value))
      .filter(Boolean)
  );

  const candidates = rows.filter((raw: any) => {
    const lang = String(raw?.language || '').toLowerCase();
    if (lang && lang !== providerLang) return false;
    const code = normalizeCode(raw?.set_code);
    const name = normalizeText(raw?.name);
    const codeMatch = Boolean(code && wantedCodes.has(code));
    const nameMatch = Boolean(name && Array.from(wantedNames).some((wanted) =>
      name === wanted || name.includes(wanted) || wanted.includes(name)
    ));
    return codeMatch || nameMatch;
  });

  // Prefer a provider row explicitly tagged with the requested language, then
  // an exact display-name match, then the first compatible row.
  return candidates.find((raw: any) => String(raw?.language || '').toLowerCase() === providerLang && wantedNames.has(normalizeText(raw?.name)))
    || candidates.find((raw: any) => wantedNames.has(normalizeText(raw?.name)))
    || candidates.find((raw: any) => String(raw?.language || '').toLowerCase() === providerLang)
    || candidates[0]
    || null;
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

async function fetchSearchPages(apiKey: string, query: string) {
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
  return [...firstRows, ...rest.flatMap((part) => Array.isArray(part.data?.results) ? part.data.results : [])];
}

async function searchSetCards(apiKey: string, setName: string, setCode: string, language: RegionalLanguage) {
  const display = getSetDisplayMeta(language, setCode, setName);
  const wantedNames = new Set(
    [setName, display?.name, ...(display?.aliases || [])]
      .map((value) => normalizeText(value))
      .filter(Boolean)
  );
  const wantedCodes = new Set(
    [setCode, ...(display?.sourceIds || [])]
      .map((value) => normalizeCode(value))
      .filter(Boolean)
  );

  // Query every known provider identity for the display set. This matters for
  // historical JP and Simplified-Chinese products where the public King_TCG
  // code is only a label and one visible release can aggregate several source
  // sets (for example Brave Stars or Storming Emergence).
  const queries = Array.from(new Set(
    [setCode, ...(display?.sourceIds || []), setName, display?.name, ...(display?.aliases || [])]
      .map((value) => String(value || "").trim())
      .filter(Boolean)
  ));

  const allRows: any[] = [];
  for (const query of queries) {
    const rows = await fetchSearchPages(apiKey, query);
    allRows.push(...rows);
    // Do not stop after the first code hit: several CN display releases map to
    // multiple provider set codes and all of them must be collected.
  }

  const seen = new Set<string>();
  return allRows.filter((raw: any) => {
    const info = raw?.card_info || raw || {};
    const code = normalizeCode(info?.set_code || raw?.set_code);
    const name = normalizeText(info?.set_name || raw?.set_name || raw?.cardmarket?.product_name || "");
    const languageField = String(info?.language || raw?.language || "").toLowerCase();
    if (languageField && language === "ja" && languageField !== "jap") return false;
    if (languageField && language === "zh-tw" && languageField !== "chn") return false;

    const codeMatch = Boolean(code && wantedCodes.has(code));
    const nameMatch = Boolean(name && Array.from(wantedNames).some((wanted) =>
      name === wanted || name.includes(wanted) || wanted.includes(name)
    ));
    if (!codeMatch && !nameMatch) return false;

    const id = String(raw?.id || info?.id || `${code}:${info?.card_number || ""}:${raw?.cardmarket?.product_url || ""}`);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
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
    const rows = await getSetIndex(apiKey);
    if (!rows.length) {
      return NextResponse.json({ success: true, sets: [], degraded: true });
    }
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

  // TCGdex does not currently expose a continuous Japanese catalogue for the
  // Black & White / Platinum / Diamond & Pearl period. Resolve those display
  // entries through PokéWallet's authoritative set index and numeric set_id.
  if ((!result.ok || !Array.isArray(result.data?.cards) || !result.data.cards.length) && setName) {
    const indexRows = await getSetIndex(apiKey);
    const providerSet = providerSetFromIndex(indexRows, setCode, setName, language);
    if (providerSet?.set_id) {
      const retry = await getJson(`${POKEWALLET}/sets/${encodeURIComponent(String(providerSet.set_id))}?page=1&limit=200`, apiKey);
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
