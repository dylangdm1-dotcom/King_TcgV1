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

type Props = {
  cardmarket?: number | null;
  cardmarketEurope?: number | null;
  ebay?: number | null;
  tcgplayer?: number | null;
  justtcg?: number | null;
  average?: number | null;
  spread?: number | null;
  quotes?: MarketQuote[];
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
  language = "fr",
  onRefresh,
}: Props) {
  const safeQuotes = Array.isArray(quotes)
    ? quotes.filter((quote): quote is MarketQuote =>
        Boolean(quote) && Number.isFinite(Number(quote?.price)) && Number(quote.price) > 0
      )
    : [];

  const ebayQuote = safeQuotes.find(
    (quote) => quote.source === "ebay" && quote.price > 0
  );

  const localMarketLabel = language === "ja"
    ? "Estimation marché JP"
    : language === "zh-tw"
      ? "Estimation marché CN"
      : language === "en"
        ? "Cardmarket / marché EN"
        : "Estimation marché FR";
  const regionalLabel = language === "ja"
    ? "Référence marché JP"
    : language === "zh-tw"
      ? "Référence marché CN"
      : "Cardmarket Europe";

  const sources = [
    {
      title: localMarketLabel,
      subtitle: language === "en" ? "Marché occidental" : "Plus haute statistique du produit exact",
      source: "cardmarket" as MarketSource,
      value: cardmarket ?? 0,
    },
    {
      title: regionalLabel,
      subtitle: "Deuxième statistique la plus élevée disponible",
      source: "cardmarket" as MarketSource,
      value: cardmarketEurope ?? 0,
    },
    {
      title: "TCGPlayer",
      subtitle: "Market anglais comparable",
      source: "tcgplayer" as MarketSource,
      value: tcgplayer ?? 0,
    },
    {
      title: "JustTCG",
      subtitle: "Médiane Near Mint · langue exacte",
      source: "justtcg" as MarketSource,
      value: justtcg ?? 0,
    },
    {
      title: "eBay",
      subtitle: ebayQuote?.condition === "Near Mint"
        ? `${ebayQuote.sampleSize ?? 0} annonces actives · langue + NM`
        : ebayQuote
          ? `${ebayQuote.sampleSize ?? 0} annonces actives · non gradées`
          : "Clés eBay non configurées ou aucune annonce compatible",
      source: "ebay" as MarketSource,
      value: ebay ?? 0,
    },
  ];

  return (
    <div className="space-y-2.5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="kt-section-label">
            <ShoppingCart className="h-4 w-4 text-emerald-300" />
            Marchés disponibles
          </div>
          <p className="mt-1 max-w-xl text-[10px] font-medium leading-4 text-zinc-400">
            Chaque valeur garde sa vraie source. Une cotation d’une autre langue
            peut être visible, mais elle n’entre pas dans la cote King_TCG.
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
            className="rounded-[14px] border border-white/[0.09] bg-[#1b232e] px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,.035)] transition duration-200 hover:-translate-y-0.5 hover:border-white/[0.14]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-zinc-300">
                  {item.title}
                </p>
                <p className="mt-0.5 min-h-0 text-[8px] font-medium leading-3 text-zinc-500">
                  {item.subtitle}
                </p>
              </div>
              <MarketSourceBadge source={item.source} compact />
            </div>
            <p className="mt-1.5 text-base font-black tracking-tight text-white tabular-nums">
              {euro(item.value)}
            </p>
          </div>
        ))}
      </div>

      {safeQuotes.length ? (
        <details className="rounded-[14px] border border-white/[0.07] bg-[#171e27] px-3 py-2.5">
          <summary className="cursor-pointer text-[9px] font-black uppercase tracking-[0.15em] text-zinc-500">
            Voir les détails marché
          </summary>
          <div className="mt-2 space-y-1.5">
            {safeQuotes.map((quote, index) => (
              <div
                key={`${quote.source}-${quote.metric}-${quote.language}-${index}`}
                className="flex items-center justify-between gap-3 text-[10px]"
              >
                <div className="min-w-0">
                  <p className="truncate font-bold text-zinc-300">{quote.label}</p>
                  <p className="text-[8px] text-zinc-600">
                    {quote.condition || "Unknown"} · {String(quote.language || "multi").toUpperCase()} · {quote.metric || "market"}
                    {" · "}
                    {quote.classification === "exact"
                      ? "Exacte"
                      : quote.classification === "comparable"
                        ? "Comparable"
                        : "Indicative"}
                    {quote.compatible ? " · incluse" : " · hors cote"}
                  </p>
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
              <p className="text-[9px] font-black uppercase tracking-[0.16em] text-cyan-200/80">
                Cote King_TCG
              </p>
              <p className="mt-1 text-[11px] font-medium text-zinc-400">
                Cote locale si disponible, sinon estimation marché FR temporaire.
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

        <div className="rounded-[20px] border border-white/[0.09] bg-[#181f29] p-3">
          <p className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">
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
