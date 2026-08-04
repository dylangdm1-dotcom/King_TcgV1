import { NextResponse } from "next/server";

type InputCard = {
  id: string;
  name?: string;
  number?: string;
  setId?: string;
  setName?: string;
  language?: "fr" | "en" | "ja" | "zh-tw";
};

type MarketPayload = {
  cardmarket?: {
    prices?: Record<string, number>;
    url?: string;
    updatedAt?: string;
  };
  tcgplayer?: {
    prices?: Record<string, any>;
    url?: string;
    updatedAt?: string;
  };
  sources?: {
    cardmarket: boolean;
    tcgplayer: boolean;
  };
};

const TCGDEX_BASE = "https://api.tcgdex.net/v2";
const JUSTTCG_BASE = "https://api.justtcg.com/v1";

function num(value: unknown): number | undefined {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Number(n.toFixed(2)) : undefined;
}

function cleanNumber(value?: string): string {
  return String(value ?? "").trim().split("/")[0].trim();
}

function normalizeName(value?: string): string {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function normalizeNumber(value?: string): string {
  return cleanNumber(value).toLowerCase().replace(/^0+/, "") || "0";
}

function tcgdexCandidates(card: InputCard): string[] {
  const setId = String(card.setId ?? "").trim().toLowerCase();
  const number = cleanNumber(card.number);
  if (!setId || !number) return [];

  const candidates = [
    `${setId}-${number}`,
    `${setId}${/^(gg|tg|sv|swsh)/i.test(number) ? "" : ""}-${number}`,
  ];

  // TCGdex uses dedicated gallery set IDs for TG/GG cards.
  const prefix = number.match(/^(GG|TG|SV)\s*/i)?.[1]?.toLowerCase();
  if (prefix && !setId.endsWith(prefix)) {
    candidates.unshift(`${setId}${prefix}-${number}`);
  }

  return Array.from(new Set(candidates));
}

async function fetchJson(url: string, init?: RequestInit): Promise<any | null> {
  try {
    const response = await fetch(url, {
      ...init,
      cache: "no-store",
      headers: {
        Accept: "application/json",
        ...(init?.headers ?? {}),
      },
    });

    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

async function fetchTcgdexCard(card: InputCard): Promise<any | null> {
  const lang = card.language === "ja" ? "ja" : card.language === "zh-tw" ? "zh-tw" : "en";

  for (const candidate of tcgdexCandidates(card)) {
    const data = await fetchJson(
      `${TCGDEX_BASE}/${lang}/cards/${encodeURIComponent(candidate)}`
    );
    if (data?.id) return data;
  }

  // Last-resort exact search by name, then match set + number before
  // fetching the detailed card (pricing is only present on card details).
  if (!card.name) return null;

  const list = await fetchJson(
    `${TCGDEX_BASE}/${lang}/cards?name=${encodeURIComponent(card.name)}`
  );

  if (!Array.isArray(list)) return null;

  const wantedName = normalizeName(card.name);
  const wantedNumber = normalizeNumber(card.number);
  const wantedSet = normalizeName(card.setName);

  const match =
    list.find((item: any) => {
      const itemNumber = normalizeNumber(item.localId);
      const itemName = normalizeName(item.name);
      return (
        itemNumber === wantedNumber &&
        itemName === wantedName
      );
    }) ??
    list.find((item: any) => {
      const itemNumber = normalizeNumber(item.localId);
      const itemSet = normalizeName(item.set?.name);
      return itemNumber === wantedNumber && (!wantedSet || itemSet.includes(wantedSet));
    });

  if (!match?.id) return null;

  return fetchJson(
    `${TCGDEX_BASE}/${lang}/cards/${encodeURIComponent(match.id)}`
  );
}

function mapTcgdexPricing(card: any): MarketPayload {
  const cm = card?.pricing?.cardmarket;
  const tcg = card?.pricing?.tcgplayer;

  if (!cm && !tcg) {
    return { sources: { cardmarket: false, tcgplayer: false } };
  }

  const cardmarketPrices: Record<string, number> = {};
  if (cm) {
    const avg = num(cm.avg);
    const low = num(cm.low);
    const trend = num(cm.trend);
    const avg1 = num(cm.avg1);
    const avg7 = num(cm.avg7);
    const avg30 = num(cm.avg30);
    const avgHolo = num(cm["avg-holo"]);
    const lowHolo = num(cm["low-holo"]);
    const trendHolo = num(cm["trend-holo"]);

    if (avg !== undefined) cardmarketPrices.averageSellPrice = avg;
    if (low !== undefined) cardmarketPrices.lowPrice = low;
    if (trend !== undefined) cardmarketPrices.trendPrice = trend;
    if (avg1 !== undefined) cardmarketPrices.avg1 = avg1;
    if (avg7 !== undefined) cardmarketPrices.avg7 = avg7;
    if (avg30 !== undefined) cardmarketPrices.avg30 = avg30;
    if (avgHolo !== undefined) cardmarketPrices.avgHolo = avgHolo;
    if (lowHolo !== undefined) cardmarketPrices.lowHolo = lowHolo;
    if (trendHolo !== undefined) cardmarketPrices.trendHolo = trendHolo;
  }

  const tcgPrices: Record<string, any> = {};
  if (tcg) {
    for (const [key, value] of Object.entries(tcg)) {
      if (!value || typeof value !== "object") continue;
      const v = value as Record<string, unknown>;
      const mapped: Record<string, number> = {};
      const low = num(v.lowPrice);
      const mid = num(v.midPrice);
      const high = num(v.highPrice);
      const market = num(v.marketPrice);
      const directLow = num(v.directLowPrice);
      if (low !== undefined) mapped.low = low;
      if (mid !== undefined) mapped.mid = mid;
      if (high !== undefined) mapped.high = high;
      if (market !== undefined) mapped.market = market;
      if (directLow !== undefined) mapped.directLow = directLow;
      if (Object.keys(mapped).length) tcgPrices[key] = mapped;
    }
  }

  return {
    cardmarket: Object.keys(cardmarketPrices).length
      ? {
          prices: cardmarketPrices,
          updatedAt: cm?.updated,
        }
      : undefined,
    tcgplayer: Object.keys(tcgPrices).length
      ? {
          prices: tcgPrices,
          updatedAt: tcg?.updated,
        }
      : undefined,
    sources: {
      cardmarket: Object.keys(cardmarketPrices).length > 0,
      tcgplayer: Object.keys(tcgPrices).length > 0,
    },
  };
}

async function fetchJustTcg(card: InputCard): Promise<MarketPayload | null> {
  const apiKey = process.env.JUSTTCG_API_KEY;
  if (!apiKey || !card.name) return null;

  const params = new URLSearchParams();
  params.set("q", card.name);
  params.set("game", "pokemon");
  params.set("limit", "20");
  if (card.number) params.set("number", cleanNumber(card.number));
  params.set("condition", "NM");

  const data = await fetchJson(`${JUSTTCG_BASE}/cards?${params.toString()}`, {
    headers: { "x-api-key": apiKey },
  });

  if (!Array.isArray(data?.data)) return null;

  const wantedName = normalizeName(card.name);
  const wantedNumber = normalizeNumber(card.number);
  const wantedSet = normalizeName(card.setName);

  const matched = data.data.find((item: any) => {
    const sameNumber =
      !wantedNumber || normalizeNumber(item.number) === wantedNumber;
    const sameName =
      normalizeName(item.name) === wantedName ||
      normalizeName(item.name).includes(wantedName) ||
      wantedName.includes(normalizeName(item.name));
    const sameSet =
      !wantedSet ||
      normalizeName(item.set_name).includes(wantedSet) ||
      wantedSet.includes(normalizeName(item.set_name));

    return sameNumber && sameName && sameSet;
  }) ?? data.data.find((item: any) => {
    return (
      normalizeNumber(item.number) === wantedNumber &&
      (normalizeName(item.name) === wantedName ||
        normalizeName(item.name).includes(wantedName) ||
        wantedName.includes(normalizeName(item.name)))
    );
  });

  if (!matched) return null;

  const variants = Array.isArray(matched.variants) ? matched.variants : [];
  const nm = variants.filter(
    (variant: any) => String(variant.condition).toLowerCase() === "near mint"
  );
  const usable = nm.filter((variant: any) => num(variant.price) !== undefined);

  if (!usable.length) return null;

  const prices = usable
    .map((variant: any) => num(variant.price))
    .filter((value: number | undefined): value is number => value !== undefined);

  if (!prices.length) return null;

  const marketUsd = Number(
    (prices.reduce((sum: number, value: number) => sum + value, 0) / prices.length).toFixed(2)
  );
  const market = Number((marketUsd * 0.92).toFixed(2));
  const low = Number((Math.min(...prices) * 0.92).toFixed(2));
  const high = Number((Math.max(...prices) * 0.92).toFixed(2));

  return {
    tcgplayer: {
      prices: {
        normal: {
          market,
          low,
          high,
        },
      },
      updatedAt: usable
        .map((variant: any) => variant.lastUpdated)
        .filter(Boolean)
        .sort()
        .pop()
        ? new Date(
            Number(
              usable
                .map((variant: any) => variant.lastUpdated)
                .filter(Boolean)
                .sort()
                .pop()
            ) * 1000
          ).toISOString()
        : undefined,
    },
    sources: {
      cardmarket: false,
      tcgplayer: true,
    },
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const cards = Array.isArray(body?.cards) ? (body.cards as InputCard[]) : [];

    if (!cards.length) {
      return NextResponse.json({ success: true, prices: {} });
    }

    const uniqueCards = cards
      .filter((card) => card?.id)
      .slice(0, 60);

    const results = await Promise.all(
      uniqueCards.map(async (card) => {
        const [tcgdexCard, justTcg] = await Promise.all([
          fetchTcgdexCard(card),
          fetchJustTcg(card),
        ]);

        const tcgdexMarket = tcgdexCard
          ? mapTcgdexPricing(tcgdexCard)
          : { sources: { cardmarket: false, tcgplayer: false } };

        const tcgplayer = justTcg?.tcgplayer ?? tcgdexMarket.tcgplayer;

        return [
          card.id,
          {
            cardmarket: tcgdexMarket.cardmarket,
            tcgplayer,
            sources: {
              cardmarket: Boolean(tcgdexMarket.cardmarket),
              tcgplayer: Boolean(tcgplayer),
            },
          } satisfies MarketPayload,
        ] as const;
      })
    );

    return NextResponse.json({
      success: true,
      prices: Object.fromEntries(results),
    });
  } catch (error) {
    console.error("[API /prices] Error:", error);
    return NextResponse.json(
      { success: false, error: "Impossible de récupérer les prix marché." },
      { status: 500 }
    );
  }
}
