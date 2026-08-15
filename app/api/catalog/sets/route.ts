import { NextRequest, NextResponse } from "next/server";
import {
  CHINESE_SET_CATALOG,
  JAPANESE_SET_CATALOG,
  chineseProviderCodeCandidates,
  hasVerifiedJapaneseCards,
  isSimplifiedChineseSetCode,
} from "../../../../lib/regionalSetCatalog";
import { isPhysicalBrowsableSet } from "../../../../lib/setCatalog";

const POKEWALLET = "https://api.pokewallet.io";
const TCGDEX = "https://api.tcgdex.net/v2";

type RegionalLanguage = "ja" | "zh-tw";

function providerLanguage(language: RegionalLanguage): "jap" | "chn" {
  return language === "ja" ? "jap" : "chn";
}

function normalizeCode(value: unknown): string {
  return String(value || "").trim().toUpperCase();
}

const CATALOG_CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=2592000",
};

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


async function fetchPublicChineseCards(setCode: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(
      `https://www.pokewallet.io/api/catalog/sets/${encodeURIComponent(setCode)}/cards?game=pokemon`,
      {
        cache: "no-store",
        signal: controller.signal,
        headers: { Accept: "application/json" },
      }
    );
    if (!response.ok) return { ok: false, status: response.status, data: null };
    const data = await response.json();
    const rows = Array.isArray(data?.data) ? data.data : [];
    if (!data?.success || rows.length === 0) {
      return { ok: false, status: response.status, data: null };
    }
    return { ok: true, status: response.status, data: rows };
  } catch {
    return { ok: false, status: 503, data: null };
  } finally {
    clearTimeout(timeout);
  }
}

async function includeNewJapaneseSetsWithCards(sets: any[]) {
  const stable = sets.filter((set) => hasVerifiedJapaneseCards(set?.id));
  const candidates = sets.filter((set) =>
    !hasVerifiedJapaneseCards(set?.id) &&
    Number(set?.total || set?.printedTotal || 0) > 0
  );
  const recovered: any[] = [];

  for (let index = 0; index < candidates.length; index += 8) {
    const batch = candidates.slice(index, index + 8);
    const details = await Promise.all(batch.map(async (set) => {
      try {
        const response = await fetch(
          `${TCGDEX}/ja/sets/${encodeURIComponent(set.id)}`,
          { cache: "no-store" }
        );
        if (!response.ok) return null;
        const detail = await response.json();
        const cards = Array.isArray(detail?.cards) ? detail.cards : [];
        if (!cards.length) return null;
        return {
          ...set,
          name: String(detail?.name || set.name),
          series: String(detail?.serie?.name || detail?.series?.name || set.series || "Pokémon TCG"),
          total: Number(detail?.cardCount?.total ?? cards.length),
          printedTotal: Number(detail?.cardCount?.official ?? cards.length),
          releaseDate: String(detail?.releaseDate || set.releaseDate || ""),
          images: {
            logo: detail?.logo ? `${detail.logo}.png` : set.images?.logo,
            symbol: detail?.symbol ? `${detail.symbol}.png` : set.images?.symbol,
          },
          availability: "available",
        };
      } catch {
        return null;
      }
    }));
    recovered.push(...details.filter(Boolean));
  }

  return [...stable, ...recovered];
}

function normalizePublicChineseCards(setCode: string, rows: any[]) {
  const catalogEntry = CHINESE_SET_CATALOG.find(
    (entry) => normalizeCode(entry.code) === normalizeCode(setCode)
  );
  const setName = catalogEntry?.name || setCode;
  const series = catalogEntry?.era || "Simplified Chinese";
  const total = rows.length;

  return rows.map((raw: any, index: number) => {
    const number = String(raw?.card_number || "").trim();
    const name = String(raw?.card_name || `Carte ${number}`).trim();
    // Public catalogue rows intentionally have no PokéWallet provider card id.
    // Keep a stable synthetic id so the UI can render the card list while the
    // authenticated API is rate-limited. Do not fabricate image/price ids.
    const stableId = `pokewallet-public-zh-tw-${normalizeCode(setCode)}-${number || index + 1}-${index}`;
    return {
      id: stableId,
      name,
      number,
      set: {
        id: normalizeCode(setCode),
        name: setName,
        series,
        total,
        printedTotal: total,
        releaseDate: "",
        images: {},
      },
      images: {},
      imageCandidates: [],
      dataLanguage: "zh-tw",
      publicCatalogFallback: true,
    };
  });
}

async function fetchSetByNumericId(setId: string, apiKey: string) {
  const first = await getJson(
    `${POKEWALLET}/sets/${encodeURIComponent(setId)}?page=1&limit=200`,
    apiKey
  );
  if (!first.ok) return first;

  const baseCards = Array.isArray(first.data?.cards) ? first.data.cards : [];
  const totalCards = Math.max(
    Number(first.data?.set?.total_cards || 0),
    baseCards.length
  );
  const totalPages = Math.max(1, Math.ceil(totalCards / 200));
  const allCards = [...baseCards];

  for (let page = 2; page <= totalPages; page += 1) {
    const next = await getJson(
      `${POKEWALLET}/sets/${encodeURIComponent(setId)}?page=${page}&limit=200`,
      apiKey
    );
    if (!next.ok) break;
    const rows = Array.isArray(next.data?.cards) ? next.data.cards : [];
    allCards.push(...rows);
    if (rows.length < 200) break;
  }

  const seen = new Set<string>();
  const cards = allCards.filter((card: any) => {
    const id = String(card?.id || "").trim();
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });

  return {
    ok: true,
    status: first.status,
    data: { ...first.data, cards },
  };
}

async function resolveChineseSet(setCode: string, apiKey: string) {
  const candidates = chineseProviderCodeCandidates(setCode);
  const wanted = new Set(candidates.map(normalizeCode));

  // Official path: /sets -> exact Simplified-Chinese set_code -> numeric set_id.
  const index = await getJson(`${POKEWALLET}/sets`, apiKey);
  if (index.ok) {
    const rows = Array.isArray(index.data?.data) ? index.data.data : [];
    const exact = rows.find((raw: any) =>
      wanted.has(normalizeCode(raw?.set_code)) &&
      String(raw?.language || "").toLowerCase() === "chn"
    );
    const setId = String(exact?.set_id || "").trim();
    if (setId) {
      const detail = await fetchSetByNumericId(setId, apiKey);
      if (detail.ok) return detail;
    }
  }

  // Fallback documented by PokéWallet: a set_code may be queried directly,
  // with language=chn to disambiguate shared codes.
  let direct: any = { ok: false, status: 404, data: null };
  for (const candidate of candidates) {
    direct = await getJson(
      `${POKEWALLET}/sets/${encodeURIComponent(candidate)}?language=chn&page=1&limit=200`,
      apiKey
    );
    if (direct.ok) break;
  }
  if (!direct.ok) return direct;

  if (direct.data?.disambiguation && Array.isArray(direct.data?.matches)) {
    const exact = direct.data.matches.find(
      (match: any) => String(match?.language || "").toLowerCase() === "chn"
    );
    const setId = String(exact?.set_id || "").trim();
    if (setId) return fetchSetByNumericId(setId, apiKey);
  }

  const directSetId = String(direct.data?.set?.set_id || "").trim();
  if (directSetId) return fetchSetByNumericId(directSetId, apiKey);

  return direct;
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const language = (params.get("lang") || "") as RegionalLanguage;
  if (language !== "ja" && language !== "zh-tw") {
    return NextResponse.json({ success: false, error: "invalid language" }, { status: 400 });
  }

  const providerLang = providerLanguage(language);
  const setCode = params.get("set");

  // V82: CN list uses the authenticated /sets index when available so
  // every displayed extension gets its canonical numeric set_id and real card_count.
  // A curated local list remains only as fallback later in this route.

  const apiKey = process.env.POKEWALLET_API_KEY;

  // V91 stability: Japanese catalogue/cards are fully independent from PokéWallet.
  // If this proxy is called by an older/stale client chunk, serve TCGdex directly
  // instead of returning a PokéWallet quota/auth 502.
  if (language === "ja") {
    try {
      if (!setCode) {
        const response = await fetch(`${TCGDEX}/ja/sets`, { cache: "no-store" });
        if (!response.ok) {
          return NextResponse.json({ success: true, sets: [], source: "tcgdex-ja-degraded" }, { headers: CATALOG_CACHE_HEADERS });
        }
        const rows = await response.json();
        let sets = Array.isArray(rows) ? rows.map((raw: any) => ({
          id: String(raw?.id || ""),
          name: String(raw?.name || raw?.id || ""),
          series: String(raw?.serie?.name || raw?.series?.name || raw?.serie || raw?.series || "Pokémon TCG"),
          total: Number(raw?.cardCount?.total ?? raw?.cardCount?.official ?? 0),
          printedTotal: Number(raw?.cardCount?.official ?? 0),
          releaseDate: String(raw?.releaseDate || ""),
          images: {
            logo: raw?.logo ? `${raw.logo}.png` : undefined,
            symbol: raw?.symbol ? `${raw.symbol}.png` : undefined,
          },
          availability: "available",
        })).filter((set: any) =>
          set.id &&
          !isSimplifiedChineseSetCode(set.id) &&
          isPhysicalBrowsableSet(set)
        ) : [];
        sets = await includeNewJapaneseSetsWithCards(sets);
        if (!sets.some((set: any) => normalizeCode(set.id) === "M6")) {
          const m6 = JAPANESE_SET_CATALOG.find((entry) => normalizeCode(entry.code) === "M6");
          sets.unshift({
            id: "M6",
            name: m6?.name || "Storm Emeralda",
            series: m6?.era || "Mega Evolution",
            total: 0,
            printedTotal: 0,
            releaseDate: "2026-07-31",
            images: { logo: undefined, symbol: undefined },
            availability: "announced",
          });
        }
        return NextResponse.json({ success: true, sets, source: "tcgdex-ja" }, { headers: CATALOG_CACHE_HEADERS });
      }

      const response = await fetch(`${TCGDEX}/ja/sets/${encodeURIComponent(setCode)}`, { cache: "no-store" });
      if (!response.ok) {
        if (normalizeCode(setCode) === "M6") {
          return NextResponse.json({
            success: true,
            set: { id: "M6", name: "Storm Emeralda", total: 0 },
            cards: [],
            source: "local-ja-announced",
            availability: "announced",
          }, { headers: CATALOG_CACHE_HEADERS });
        }
        return NextResponse.json({ success: false, error: "japanese set unavailable", upstream: response.status }, { status: response.status === 404 ? 404 : 502 });
      }
      const set = await response.json();
      const rows = Array.isArray(set?.cards) ? set.cards : [];
      const cards = rows.map((raw: any) => ({
        id: `tcgdex-ja-${String(raw?.id || "")}`,
        name: String(raw?.name || "Carte"),
        number: String(raw?.localId || ""),
        set: {
          id: String(set?.id || setCode),
          name: String(set?.name || setCode),
          series: String(set?.serie?.name || "Pokémon TCG"),
          total: Number(set?.cardCount?.total ?? rows.length),
          printedTotal: Number(set?.cardCount?.official ?? rows.length),
          releaseDate: String(set?.releaseDate || ""),
          images: {},
        },
        images: raw?.image ? { small: `${raw.image}/low.webp`, large: `${raw.image}/high.webp` } : { small: "", large: "" },
        dataLanguage: "ja",
      }));
      return NextResponse.json({ success: true, set: { id: set?.id || setCode, name: set?.name || setCode, total: rows.length }, cards, source: "tcgdex-ja" }, { headers: CATALOG_CACHE_HEADERS });
    } catch {
      return NextResponse.json({ success: true, sets: setCode ? undefined : [], cards: setCode ? [] : undefined, source: "tcgdex-ja-error-fallback" }, { headers: CATALOG_CACHE_HEADERS });
    }
  }

  // V91 stability: CN list must never become a 502/503 just because PokéWallet
  // is rate-limited. The curated catalogue is always a valid display fallback.
  if (language === "zh-tw" && !setCode && !apiKey) {
    const sets = CHINESE_SET_CATALOG.map((entry) => ({
      id: entry.code,
      name: entry.name,
      series: entry.era || "Simplified Chinese",
      total: Number(entry.officialCount || 0),
      printedTotal: Number(entry.officialCount || 0),
      releaseDate: entry.releaseDate || "",
      images: {},
      availability: "available",
    }));
    return NextResponse.json({ success: true, sets, source: "local-cn-no-key" }, { headers: CATALOG_CACHE_HEADERS });
  }

  // V82: resolve Simplified-Chinese sets through the canonical /sets index first.
  // This is the stable path documented by PokéWallet: set_code + language=chn -> numeric set_id -> /sets/{set_id}.
  // It also fixes codes that do not resolve correctly when queried directly.
  if (language === "zh-tw" && setCode) {
    if (apiKey) {
      const privateResult = await resolveChineseSet(setCode, apiKey);

      if (privateResult.ok && Array.isArray(privateResult.data?.cards) && privateResult.data.cards.length > 0) {
        const set = privateResult.data?.set || {};
        const cards = privateResult.data.cards;
        const canonicalRequestedCode = normalizeCode(setCode);
        const normalizedCards = cards.map((raw: any) => {
          const info = raw?.card_info || {};
          const number = String(info?.card_number || "").split("/")[0].trim();
          const rawId = String(raw?.id || "");
          return {
            id: `pokewallet-zh-tw-${rawId}`,
            providerId: rawId,
            name: String(info?.clean_name || info?.name || `Carte ${number}`),
            number,
            rarity: info?.rarity || undefined,
            set: {
              id: canonicalRequestedCode,
              providerSetId: String(set?.set_id || "") || undefined,
              name: String(set?.name || info?.set_name || canonicalRequestedCode),
              series: "Simplified Chinese",
              total: Number(set?.total_cards || cards.length || 0),
              printedTotal: Number(set?.total_cards || cards.length || 0),
              releaseDate: String(set?.release_date || ""),
              images: {},
            },
            images: {
              small: `/api/catalog/image?id=${encodeURIComponent(rawId)}&lang=zh-tw&size=low`,
              large: `/api/catalog/image?id=${encodeURIComponent(rawId)}&lang=zh-tw&size=high`,
            },
            imageCandidates: [
              `/api/catalog/image?id=${encodeURIComponent(rawId)}&lang=zh-tw&size=high`,
              `/api/catalog/image?id=${encodeURIComponent(rawId)}&lang=zh-tw&size=low`,
            ],
            dataLanguage: "zh-tw",
            cardmarket: raw?.cardmarket || undefined,
            tcgplayer: raw?.tcgplayer || undefined,
          };
        });

        return NextResponse.json({
          success: true,
          set: {
            id: canonicalRequestedCode,
            providerSetId: String(set?.set_id || "") || undefined,
            name: String(set?.name || canonicalRequestedCode),
            total: Number(set?.total_cards || normalizedCards.length),
            releaseDate: String(set?.release_date || ""),
          },
          cards: normalizedCards,
          source: "pokewallet-private-cn-v82-numeric-setid",
        }, { headers: CATALOG_CACHE_HEADERS });
      }
    }

    // Public catalogue remains a non-destructive fallback for card names/counts only.
    let publicCatalogue: any = { ok: false, status: 404, data: null };
    for (const candidate of chineseProviderCodeCandidates(setCode)) {
      publicCatalogue = await fetchPublicChineseCards(candidate);
      if (publicCatalogue.ok) break;
    }
    if (publicCatalogue.ok) {
      const publicCards = normalizePublicChineseCards(setCode, publicCatalogue.data);
      return NextResponse.json({
        success: true,
        set: {
          id: normalizeCode(setCode),
          name: CHINESE_SET_CATALOG.find((entry) => normalizeCode(entry.code) === normalizeCode(setCode))?.name || setCode,
          total: publicCards.length,
        },
        cards: publicCards,
        source: "pokewallet-public-cn-v82",
        degraded: true,
      }, { headers: CATALOG_CACHE_HEADERS });
    }

    if (!apiKey) {
      const announced = CHINESE_SET_CATALOG.find(
        (entry) => normalizeCode(entry.code) === normalizeCode(setCode)
      );
      if (announced) {
        return NextResponse.json({
          success: true,
          set: {
            id: normalizeCode(setCode),
            name: announced.name,
            total: Number(announced.officialCount || 0),
            printedTotal: Number(announced.officialCount || 0),
            releaseDate: announced.releaseDate || "",
          },
          cards: [],
          source: "local-cn-catalog",
          availability: "available",
        }, { headers: CATALOG_CACHE_HEADERS });
      }
    }
  }

  if (!apiKey) {
    return NextResponse.json(
      { success: false, error: "POKEWALLET_API_KEY missing" },
      { status: 503 }
    );
  }

  if (!setCode) {
    const result = await getJson(`${POKEWALLET}/sets`, apiKey);

    // CN keeps the curated list as a non-destructive fallback if the provider
    // index is temporarily unavailable. When /sets works, enrich that list
    // with the canonical numeric set_id and real card_count.
    if (language === "zh-tw") {
      const rows = result.ok && Array.isArray(result.data?.data) ? result.data.data : [];
      const cnRows = rows.filter(
        (raw: any) => String(raw?.language || "").toLowerCase() === "chn"
      );
      const byCode = new Map(
        cnRows.map((raw: any) => [normalizeCode(raw?.set_code), raw])
      );

      const sets = CHINESE_SET_CATALOG.map((entry) => {
        const providerCodes = chineseProviderCodeCandidates(entry.code);
        const raw: any = providerCodes.map((code) => byCode.get(normalizeCode(code))).find(Boolean);
        const total = Number(raw?.card_count || 0);
        return {
          id: entry.code,
          providerSetId: raw?.set_id ? String(raw.set_id) : undefined,
          providerCode: raw?.set_code ? String(raw.set_code) : undefined,
          name: raw?.name ? String(raw.name) : entry.name,
          series: entry.era || "Simplified Chinese",
          total: total || Number(entry.officialCount || 0),
          printedTotal: total || Number(entry.officialCount || 0),
          releaseDate: String(raw?.release_date || entry.releaseDate || ""),
          images: {},
          availability: "available",
        };
      });

      // Never hide provider CN sets that are not yet in our curated display list.
      const known = new Set(
        CHINESE_SET_CATALOG.flatMap((entry) => chineseProviderCodeCandidates(entry.code).map(normalizeCode))
      );
      for (const raw of cnRows) {
        const code = normalizeCode(raw?.set_code);
        if (!code || known.has(code)) continue;
        known.add(code);
        sets.push({
          id: code,
          providerSetId: String(raw?.set_id || "") || undefined,
          providerCode: String(raw?.set_code || "") || undefined,
          name: String(raw?.name || code),
          series: "À trier",
          total: Number(raw?.card_count || 0),
          printedTotal: Number(raw?.card_count || 0),
          releaseDate: String(raw?.release_date || ""),
          images: {},
          availability: Number(raw?.card_count || 0) > 0 ? "available" : "announced",
        });
      }

      return NextResponse.json({
        success: true,
        sets,
        source: result.ok ? "pokewallet-sets+local-cn" : "local-cn-fallback",
      });
    }

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

  let result: any;
  if (language === "zh-tw") {
    result = await resolveChineseSet(setCode, apiKey);
  } else {
    const encoded = encodeURIComponent(setCode);
    result = await getJson(
      `${POKEWALLET}/sets/${encoded}?language=${providerLang}&page=1&limit=200`,
      apiKey
    );
  }

  if (!result.ok) {
    if (language === "zh-tw" && CHINESE_SET_CATALOG.some((entry) => normalizeCode(entry.code) === normalizeCode(setCode))) {
      const announced = CHINESE_SET_CATALOG.find((entry) => normalizeCode(entry.code) === normalizeCode(setCode));
      return NextResponse.json({
        success: true,
        set: {
          id: normalizeCode(setCode),
          name: announced?.name || setCode,
          total: Number(announced?.officialCount || 0),
          printedTotal: Number(announced?.officialCount || 0),
          releaseDate: announced?.releaseDate || "",
        },
        cards: [],
        source: "local-cn-catalog",
        availability: "available",
      }, { headers: CATALOG_CACHE_HEADERS });
    }
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
      const retry = language === "zh-tw"
        ? await fetchSetByNumericId(String(exact.set_id), apiKey)
        : await getJson(
            `${POKEWALLET}/sets/${encodeURIComponent(String(exact.set_id))}?page=1&limit=200`,
            apiKey
          );
      if (retry.ok) result.data = retry.data;
    }
  }

  const set = result.data?.set;
  const cards = Array.isArray(result.data?.cards) ? result.data.cards : [];
  const canonicalRequestedCode = normalizeCode(setCode);
  const normalizedCards = cards.map((raw: any) => {
    const info = raw?.card_info || {};
    const number = String(info?.card_number || "").split("/")[0].trim();
    const rawId = String(raw?.id || "");
    // For CN the parent set is authoritative. card_info.set_code may contain
    // the numeric group_id instead of the public code (e.g. -15 vs CBB3C).
    const cardSetCode = language === "zh-tw"
      ? canonicalRequestedCode
      : normalizeCode(info?.set_code) || normalizeCode(set?.set_code) || canonicalRequestedCode;
    return {
      id: `pokewallet-${language}-${rawId}`,
      providerId: rawId,
      name: String(info?.clean_name || info?.name || `Carte ${number}`),
      number,
      rarity: info?.rarity || undefined,
      set: {
        id: cardSetCode,
        providerSetId: String(set?.set_id || "") || undefined,
        name: String(set?.name || info?.set_name || cardSetCode),
        series: language === "zh-tw" ? "Simplified Chinese" : "Pokémon TCG",
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
          id: canonicalRequestedCode,
          providerSetId: String(set?.set_id || "") || undefined,
          name: set?.name,
          total: set?.total_cards,
          releaseDate: set?.release_date,
        }
      : null,
    cards: normalizedCards,
  });
}
