"use client";

import { Crown, RefreshCw, ShoppingCart } from "lucide-react";
import MarketSourceBadge, {
  type MarketSource,
} from "@/components/market/MarketSourceBadge";
import type { MarketQuote } from "@/lib/types";

const euro = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0
    ? `${parsed.toFixed(2)} €`
    : "—";
};

type FreshnessLevel = "fresh" | "aging" | "stale" | "unknown";

function quoteFreshness(updatedAt?: string): {
  level: FreshnessLevel;
  label: string;
  ageLabel: string;
} {
  if (!updatedAt) {
    return { level: "unknown", label: "date inconnue", ageLabel: "Màj inconnue" };
  }

  const timestamp = Date.parse(updatedAt);
  if (!Number.isFinite(timestamp)) {
    return { level: "unknown", label: "date inconnue", ageLabel: "Màj inconnue" };
  }

  const ageMs = Math.max(0, Date.now() - timestamp);
  const hours = ageMs / (60 * 60 * 1000);
  const days = hours / 24;

  const ageLabel =
    hours < 1
      ? "Màj < 1 h"
      : hours < 24
        ? `Màj ${Math.max(1, Math.round(hours))} h`
        : `Màj ${Math.max(1, Math.round(days))} j`;

  if (hours <= 24) return { level: "fresh", label: "fraîche", ageLabel };
  if (days <= 7) return { level: "aging", label: "à surveiller", ageLabel };
  return { level: "stale", label: "ancienne", ageLabel };
}

function freshnessClass(level: FreshnessLevel): string {
  if (level === "fresh") return "text-emerald-300";
  if (level === "aging") return "text-amber-300";
  if (level === "stale") return "text-orange-300";
  return "text-zinc-600";
}

function classificationLabel(value?: MarketQuote["classification"]): string {
  if (value === "exact") return "Exacte";
  if (value === "comparable") return "Comparable";
  if (value === "estimated") return "Estimée";
  return "Indicative";
}

type Props = {
  cardmarket?: number | null;
  cardmarketEurope?: number | null;
  ebay?: number | null;
  tcgplayer?: number | null;
  justtcg?: number | null;
  average?: number | null;
  spread?: number | null;
  quotes?: MarketQuote[];
  debugCardmarketFr?: {
    url?: string;
    fetchStatus?: string;
    articleRows: number;
    frNmPrices: number[];
    htmlHas210: boolean;
    htmlHas27899: boolean;
    stage?: string;
    searchQueries?: string[];
    identitySource?: string;
    cardmarketProductId?: string;
    cardmarketVariant?: string;
    cardmarketFoil?: string;
  };
  debugJustTcg?: {
    keyConfigured: boolean;
    stage: string;
    status?: "ok" | "not_found" | "rate_limited" | "unavailable";
    lookup?: string;
    candidateCount?: number;
    matchingVariantCount?: number;
    tcgplayerId?: string;
    selectedPriceUsd?: number;
    selectedPriceEur?: number;
    language?: string;
    printing?: string;
    condition?: string;
    cardUuid?: string;
    variantUuid?: string;
    variantId?: string;
    lastUpdated?: number;
    priceChange7d?: number;
    avgPrice7d?: number;
    tcgdexIdentityStage?: string;
    tcgdexCardId?: string;
    tcgdexLocale?: string;
    availablePrintings?: string[];
    availableLanguages?: string[];
    availableConditions?: string[];
    selectedPrinting?: string;
    totalVariantCount?: number;
    positivePriceVariantCount?: number;
    selectedLanguage?: string;
    languageComparable?: boolean;
  };
  language?: "fr" | "en" | "ja" | "zh-tw";
  onRefresh?: () => void;
};

export default function MarketPanel({
  cardmarket = 0,
  cardmarketEurope = 0,
  ebay = 0,
  tcgplayer = 0,
  justtcg = 0,
  average = 0,
  spread = 0,
  quotes = [],
  debugCardmarketFr,
  debugJustTcg,
  language = "fr",
  onRefresh,
}: Props) {
  const ebayQuote = quotes.find(
    (quote) => quote.source === "ebay" && quote.price > 0
  );
  const cardmarketEurope7dQuote = quotes.find(
    (quote) =>
      quote.source === "cardmarket" &&
      quote.metric === "average_7d_europe" &&
      quote.language === "multi" &&
      quote.price > 0
  );
  const cardmarketFrExactQuote = quotes.find(
    (quote) =>
      quote.source === "cardmarket" &&
      quote.language === "fr" &&
      quote.metric === "lowest_listing" &&
      quote.condition === "Near Mint" &&
      quote.price > 0
  );
  const cardmarketOneDayQuote = quotes.find(
    (quote) =>
      quote.source === "cardmarket" &&
      quote.language === "multi" &&
      quote.metric === "average_1d_europe" &&
      quote.price > 0
  );
  const cardmarketCurrentQuote =
    cardmarketFrExactQuote ??
    quotes.find(
      (quote) =>
        quote.source === "cardmarket" &&
        quote.metric === "trend_europe" &&
        quote.price > 0
    ) ??
    cardmarketOneDayQuote;
  const tcgplayerQuote = quotes.find(
    (quote) => quote.source === "tcgplayer" && quote.price > 0
  );
  const justTcgQuote = quotes.find(
    (quote) => quote.source === "justtcg" && quote.price > 0
  );

  const sources = [
    {
      title: language === "fr"
        ? cardmarketFrExactQuote
          ? "1re offre Cardmarket FR · NM"
          : "Moyenne Cardmarket FR · NM"
        : language === "ja" || language === "zh-tw"
          ? "Tendance Cardmarket"
          : "Cardmarket Europe · tendance",
      subtitle: language === "fr"
        ? cardmarketFrExactQuote
          ? "Première annonce vendeur réellement listée"
          : "Moyenne annonce vendeur réellement listée · repère provisoire 1 jour"
        : language === "ja" || language === "zh-tw"
          ? "Marché occidental · impression exacte"
          : "Tendance actuelle du marché européen",
      source: "cardmarket" as MarketSource,
      value: language === "fr" && !cardmarketFrExactQuote
        ? cardmarketOneDayQuote?.price ?? cardmarket ?? 0
        : cardmarket ?? 0,
      quote: language === "fr" && !cardmarketFrExactQuote
        ? cardmarketOneDayQuote
        : cardmarketCurrentQuote,
    },
    {
      title: language === "fr"
        ? "Cardmarket Europe · moyenne 7 jours"
        : language === "ja" || language === "zh-tw"
          ? "Moyenne occidentale 7j"
          : "Cardmarket Europe",
      subtitle: language === "fr"
        ? "Prix moyen du marché européen sur 7 jours"
        : language === "ja" || language === "zh-tw"
          ? "Moyenne Cardmarket sur 7 jours"
          : "Référence européenne indicative",
      source: "cardmarket" as MarketSource,
      value: language === "fr"
        ? cardmarketEurope7dQuote?.price ?? 0
        : cardmarketEurope ?? 0,
      quote: cardmarketEurope7dQuote,
    },
    {
      title: language === "ja"
        ? "TCGPlayer Japan"
        : language === "fr"
          ? "TCGPlayer · marché anglais"
          : "TCGPlayer",
      subtitle: language === "ja"
        ? "Pokemon Japan · USD converti EUR"
        : language === "fr"
          ? "Prix anglais comparable · converti en EUR · hors cote FR"
          : "Market anglais comparable",
      source: "tcgplayer" as MarketSource,
      value: tcgplayer ?? 0,
      quote: tcgplayerQuote,
    },
    {
      title: "JustTCG",
      subtitle: "Near Mint · langue exacte ou comparable",
      source: "justtcg" as MarketSource,
      value: justtcg ?? 0,
      quote: justTcgQuote,
    },
    {
      title: "eBay",
      subtitle: ebayQuote?.condition === "Near Mint"
        ? `${ebayQuote.sampleSize ?? 0} annonces actives · langue + NM`
        : ebayQuote
          ? `${ebayQuote.sampleSize ?? 0} annonces actives · non gradées`
          : "Aucune annonce eBay compatible trouvée",
      source: "ebay" as MarketSource,
      value: ebay ?? 0,
      quote: ebayQuote,
    },
  ];

  return (
    <div className="space-y-2.5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="kt-detail-section-title flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-emerald-300" />
            Marchés disponibles
          </div>
          <p className="mt-1 max-w-xl text-[10px] font-medium leading-4 text-zinc-400">
            Chaque valeur garde sa vraie source. Une cotation comparable d’une autre langue
            reste signalée comme telle et ne contribue qu’avec un poids réduit lorsqu’elle correspond à la même impression et au même état.
          </p>
        </div>
        {onRefresh ? (
          <button
            onClick={onRefresh}
            className="kt-secondary-button shrink-0 px-3 text-[11px]"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Actualiser</span>
          </button>
        ) : null}
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {sources.map((item) => (
          <div
            key={item.title}
            className="kt-source-row rounded-[14px] border px-3 py-2.5 transition duration-200 hover:-translate-y-0.5"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-zinc-300">
                  {item.title}
                </p>
                <p className="mt-0.5 min-h-0 text-[10px] font-medium leading-3 text-zinc-500">
                  {item.subtitle}
                </p>
              </div>
              <MarketSourceBadge source={item.source} compact />
            </div>
            <p className="mt-1.5 text-base font-black tracking-tight text-white tabular-nums">
              {euro(item.value)}
            </p>
            {item.quote ? (
              (() => {
                const freshness = quoteFreshness(item.quote.updatedAt);
                return (
                  <p className={`mt-1 text-[9px] font-bold ${freshnessClass(freshness.level)}`}>
                    {freshness.ageLabel} · {freshness.label}
                  </p>
                );
              })()
            ) : Number(item.value) > 0 ? (
              <p className="mt-1 text-[9px] font-bold text-zinc-600">
                Màj inconnue
              </p>
            ) : null}
          </div>
        ))}
      </div>

      {quotes.length ? (
        <details className="rounded-[14px] bg-[#111923] px-3 py-2.5">
          <summary className="cursor-pointer text-[10px] font-black uppercase tracking-[0.15em] text-zinc-500">
            Voir les détails marché
          </summary>
          <div className="mt-2 space-y-1.5">
            {quotes.map((quote, index) => (
              <div
                key={`${quote.source}-${quote.metric}-${quote.language}-${index}`}
                className="flex items-center justify-between gap-3 text-[10px]"
              >
                <div className="min-w-0">
                  <p className="truncate font-bold text-zinc-300">{quote.label}</p>
                  {(() => {
                    const freshness = quoteFreshness(quote.updatedAt);
                    return (
                      <p className="text-[10px] text-zinc-600">
                        {quote.condition || "Unknown"} · {String(quote.language || "multi").toUpperCase()} · {quote.metric || "market"}
                        {" · "}
                        {classificationLabel(quote.classification)}
                        {quote.compatible ? " · incluse" : " · hors cote"}
                        {" · "}
                        <span className={freshnessClass(freshness.level)}>
                          {freshness.ageLabel} · {freshness.label}
                        </span>
                      </p>
                    );
                  })()}
                </div>
                <span className={quote.compatible ? "font-black text-white" : "font-bold text-zinc-500"}>
                  {euro(quote.price)}
                </span>
              </div>
            ))}
          </div>
        </details>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-[1.35fr_.65fr]">
        <div className="relative overflow-hidden rounded-[17px] border border-cyan-300/18 bg-[linear-gradient(135deg,rgba(34,211,238,.10),rgba(21,29,39,.96)_48%)] p-3">
          <div className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-cyan-300/10 blur-3xl" />
          <div className="relative flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-200/80">
                Cote King_TCG
              </p>
              <p className="mt-1 text-[11px] font-medium text-zinc-400">
                {language === "fr"
                  ? "Cote King_TCG : Cardmarket + eBay compatible, avec pondération anti-outliers."
                  : "Cote King_TCG calculée uniquement avec les sources compatibles à cette langue."}
              </p>
            </div>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cyan-200/18 bg-cyan-200/[0.08] text-cyan-200">
              <Crown className="h-4 w-4" />
            </span>
          </div>
          <p className="relative mt-2 text-xl font-black tracking-[-0.035em] text-white tabular-nums">
            {euro(average ?? 0)}
          </p>
        </div>

        <div className="kt-metric-cell rounded-[17px] border p-3">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">
            Écart marchés
          </p>
          <p className="mt-1 text-[10px] leading-4 text-zinc-500">
            Amplitude entre les cotations compatibles.
          </p>
          <p className="mt-2 text-lg font-black text-white tabular-nums">
            {Number(spread) > 0 ? "+" : ""}
            {Number.isFinite(Number(spread))
              ? Number(spread).toFixed(2)
              : "0.00"}{" "}
            €
          </p>
        </div>
      </div>
    </div>
  );
}
