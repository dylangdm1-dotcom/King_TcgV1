import { NextResponse } from "next/server";

type EbayPsaListing = {
  id: string;
  title: string;
  grade: number;
  price: number;
  currency: "EUR";
  imageUrl?: string;
  url: string;
  languageSignal: "explicit_fr" | "structured_fr" | "unknown";
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

function languageSignal(item: any): EbayPsaListing["languageSignal"] {
  const title = String(item?.title ?? "");
  if (/\b(fr|french|fran[cç]ais|fran[cç]aise)\b/i.test(title)) {
    return "explicit_fr";
  }

  for (const aspect of aspectEntries(item)) {
    const name = normalizeText(aspect.name);
    const value = normalizeText(aspect.value);
    const isLanguageField =
      name.includes("langue") ||
      name.includes("language") ||
      name.includes("sprache");

    if (
      isLanguageField &&
      (value === "francais" || value === "french" || value.includes("francais"))
    ) {
      return "structured_fr";
    }
  }

  return "unknown";
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

  if (!query) {
    return NextResponse.json(
      { success: false, error: "Recherche eBay PSA vide." },
      { status: 400 }
    );
  }

  const cacheKey = normalizeText(query);
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json({
      success: true,
      source: "ebay",
      marketplace: "EBAY_FR",
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

  const searchQueries = Array.from(
    new Set([
      `Pokemon ${query} PSA FR`,
      `Pokemon ${query} PSA French`,
      `Pokemon ${query} PSA`,
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
            "Accept-Language": "fr-FR",
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
      const signal = languageSignal(item);
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
        languageSignal: signal,
        languageLabel:
          signal === "explicit_fr"
            ? "Français explicite"
            : signal === "structured_fr"
              ? "Français vérifié"
              : "Langue à vérifier",
      } satisfies EbayPsaListing;
    })
    .filter((item): item is EbayPsaListing => Boolean(item));

  // Strong French evidence first. Unknown-language listings remain visible but
  // clearly labelled so we get broader coverage without pretending certainty.
  candidates.sort((a, b) => {
    const rank = (value: EbayPsaListing["languageSignal"]) =>
      value === "structured_fr" ? 0 : value === "explicit_fr" ? 1 : 2;
    return rank(a.languageSignal) - rank(b.languageSignal) || a.grade - b.grade;
  });

  const results = candidates.slice(0, 24);

  cache.set(cacheKey, {
    expiresAt: Date.now() + CACHE_TTL,
    results,
  });

  return NextResponse.json({
    success: true,
    source: "ebay",
    marketplace: "EBAY_FR",
    listingType: "active",
    cached: false,
    results,
  });
}
