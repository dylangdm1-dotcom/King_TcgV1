import { NextResponse } from "next/server";

type EbayPsaListing = {
  id: string;
  title: string;
  grade: number;
  price: number;
  currency: "EUR";
  imageUrl?: string;
  url: string;
  listedAt?: string;
  languageSignal:
    | "explicit_en" | "structured_en"
    | "explicit_fr" | "structured_fr"
    | "explicit_ja" | "structured_ja"
    | "unknown";
  languageLabel: string;
};

const CACHE_TTL = 30 * 60 * 1000;
const cache = new Map<string, { expiresAt: number; results: EbayPsaListing[] }>();
let tokenCache: { value: string; expiresAt: number } | null = null;

function normalizeText(value: unknown): string {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function parseGrade(text: string): number | null {
  const match =
    text.match(/\bPSA\s*(?:GEM\s*MINT\s*)?(10|9|8|7|6|5|4|3|2|1)\b/i) ||
    text.match(/\b(?:GRADE|NOTE)\s*(10|9|8|7|6|5|4|3|2|1)\b/i);

  if (!match) return null;
  const grade = Number(match[1]);
  return Number.isInteger(grade) && grade >= 1 && grade <= 10 ? grade : null;
}

function aspectEntries(item: any): Array<{ name: string; value: string }> {
  const raw = Array.isArray(item?.localizedAspects) ? item.localizedAspects : [];
  return raw.flatMap((aspect: any) => {
    const name = String(aspect?.name ?? "").trim();
    const value = String(aspect?.value ?? "").trim();
    return name && value ? [{ name, value }] : [];
  });
}

type SearchLanguage = "en" | "fr" | "ja";

function explicitLanguageFromText(text: string): SearchLanguage | "other" | null {
  if (/[\u3040-\u30ff]/u.test(text)) return "ja";
  if (/\b(?:jp|jpn|japanese|japonais|japonaise)\b/i.test(text)) return "ja";
  if (/\b(?:fr|french|fran[cç]ais|fran[cç]aise)\b/i.test(text)) return "fr";
  if (/\b(?:en|eng|english|anglais|anglaise)\b/i.test(text)) return "en";
  if (/\b(?:cn|chinese|chinois|german|allemand|deutsch|spanish|espagnol|italian|italien|korean)\b/i.test(text)) return "other";
  return null;
}

function languageSignal(
  item: any,
  requested: SearchLanguage
): EbayPsaListing["languageSignal"] | null {
  const title = String(item?.title ?? "");
  const explicit = explicitLanguageFromText(title);
  if (explicit && explicit !== requested) return null;
  if (explicit === requested) {
    return requested === "fr"
      ? "explicit_fr"
      : requested === "ja"
        ? "explicit_ja"
        : "explicit_en";
  }

  for (const aspect of aspectEntries(item)) {
    const name = normalizeText(aspect.name);
    if (
      !name.includes("langue") &&
      !name.includes("language") &&
      !name.includes("sprache")
    ) continue;

    const structured = explicitLanguageFromText(String(aspect.value ?? ""));
    if (structured && structured !== requested) return null;
    if (structured === requested) {
      return requested === "fr"
        ? "structured_fr"
        : requested === "ja"
          ? "structured_ja"
          : "structured_en";
    }
  }

  // PSA search must remain language-pure. If the selected language cannot
  // be verified from title/aspects, reject the listing instead of guessing.
  return null;
}

function languageLabel(
  signal: EbayPsaListing["languageSignal"],
  requested: SearchLanguage
): string {
  if (requested === "fr") {
    return signal === "structured_fr" ? "Français vérifié" : "Français explicite";
  }
  if (requested === "ja") {
    return signal === "structured_ja" ? "Japonais vérifié" : "Japonais explicite";
  }
  return signal === "unknown"
    ? "Anglais probable"
    : signal === "structured_en"
      ? "Anglais vérifié"
      : "Anglais explicite";
}

function looksLikeNonSingleCard(title: string): boolean {
  return /\b(lot|bundle|booster|display|box|proxy|custom|fan\s*art|digital|code|online)\b/i.test(title);
}

function titleMatchesQuery(title: string, query: string): boolean {
  const wanted = normalizeText(query);
  if (!wanted) return true;
  const haystack = normalizeText(title);
  const tokens = query
    .split(/\s+/)
    .map((token) => normalizeText(token))
    .filter((token) => token.length >= 2);

  if (haystack.includes(wanted)) return true;
  return tokens.length > 0 && tokens.every((token) => haystack.includes(token));
}

async function getAccessToken(): Promise<string | null> {
  if (tokenCache && tokenCache.expiresAt > Date.now()) {
    return tokenCache.value;
  }

  const clientId = process.env.EBAY_CLIENT_ID;
  const clientSecret = process.env.EBAY_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const response = await fetch("https://api.ebay.com/identity/v1/oauth2/token", {
      method: "POST",
      cache: "no-store",
      signal: controller.signal,
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        scope: "https://api.ebay.com/oauth/api_scope",
      }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    const token = String(data?.access_token ?? "");
    const expiresIn = Number(data?.expires_in ?? 7200);
    if (!token) return null;

    tokenCache = {
      value: token,
      expiresAt: Date.now() + Math.max(300, expiresIn - 120) * 1000,
    };

    return token;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = String(searchParams.get("q") || "").trim();
  const requestedLanguageParam = searchParams.get("lang");
  const language: SearchLanguage =
    requestedLanguageParam === "fr" || requestedLanguageParam === "ja"
      ? requestedLanguageParam
      : "en";

  if (!query) {
    return NextResponse.json(
      { success: false, error: "Recherche eBay PSA vide." },
      { status: 400 }
    );
  }

  const cacheKey = `${language}:${normalizeText(query)}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json({
      success: true,
      source: "ebay",
      marketplace: language === "ja" ? "EBAY_US" : "EBAY_FR",
      listingType: "active",
      cached: true,
      results: cached.results,
    });
  }

  const token = await getAccessToken();
  if (!token) {
    return NextResponse.json(
      { success: false, error: "eBay PSA indisponible : configuration OAuth absente ou invalide." },
      { status: 503 }
    );
  }

  const languageTerms =
    language === "fr"
      ? ["FR", "French"]
      : language === "ja"
        ? ["Japanese", "Japan", "JP"]
        : ["English", "EN"];

  const searchQueries = Array.from(
    new Set([
      ...languageTerms.map((term) => `Pokemon ${query} PSA ${term}`),
      ...(language === "en" ? [`Pokemon ${query} PSA`] : []),
    ])
  );

  const responses = await Promise.all(
    searchQueries.map(async (searchQuery) => {
      const params = new URLSearchParams({
        q: searchQuery,
        limit: "100",
        fieldgroups: "EXTENDED",
      });

      const response = await fetch(
        `https://api.ebay.com/buy/browse/v1/item_summary/search?${params.toString()}`,
        {
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${token}`,
            "X-EBAY-C-MARKETPLACE-ID": "EBAY_FR",
            "Accept-Language":
              language === "fr" ? "fr-FR" :
              language === "ja" ? "ja-JP" :
              "en-US",
          },
        }
      );

      if (!response.ok) return [];
      const data = await response.json();
      return Array.isArray(data?.itemSummaries) ? data.itemSummaries : [];
    })
  );

  const byId = new Map<string, any>();
  responses.flat().forEach((item: any) => {
    const key = String(item?.itemId || item?.itemWebUrl || item?.title || "");
    if (key && !byId.has(key)) byId.set(key, item);
  });

  const candidates = Array.from(byId.values())
    .map((item: any) => {
      const title = String(item?.title ?? "").trim();
      const grade = parseGrade(title);
      const signal = languageSignal(item, language);
      if (!signal) return null;
      const price = Number(item?.price?.value ?? 0);
      const currency = String(item?.price?.currency ?? "").toUpperCase();

      if (!title || !grade || !Number.isFinite(price) || price <= 0) return null;
      if (looksLikeNonSingleCard(title)) return null;
      if (!titleMatchesQuery(title, query)) return null;
      if (currency !== "EUR") return null;

      const imageUrl =
        String(
          item?.image?.imageUrl ||
          item?.thumbnailImages?.[0]?.imageUrl ||
          ""
        ).trim() || undefined;

      return {
        id: String(item?.itemId || item?.itemWebUrl || title),
        title,
        grade,
        price: Number(price.toFixed(2)),
        currency: "EUR" as const,
        imageUrl,
        url: String(item?.itemWebUrl || ""),
        listedAt: String(item?.itemCreationDate || item?.itemOriginDate || "").trim() || undefined,
        languageSignal: signal,
        language: language,
        languageLabel: languageLabel(signal, language),
      } satisfies EbayPsaListing;
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  // Structured language evidence first, then explicit title evidence.
  candidates.sort((a, b) => {
    const rank = (value: EbayPsaListing["languageSignal"]) =>
      value.startsWith("structured_") ? 0 :
      value.startsWith("explicit_") ? 1 : 2;
    return rank(a.languageSignal) - rank(b.languageSignal) || b.grade - a.grade;
  });

  const results = candidates.slice(0, 60);

  cache.set(cacheKey, {
    expiresAt: Date.now() + CACHE_TTL,
    results,
  });

  return NextResponse.json({
    success: true,
    source: "ebay",
    marketplace: language === "ja" ? "EBAY_US" : "EBAY_FR",
    listingType: "active",
    cached: false,
    candidateCount: candidates.length,
    returnedCount: results.length,
    queryCount: searchQueries.length,
    language,
    results,
  });
}
