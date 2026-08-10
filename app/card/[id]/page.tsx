// app/card/[id]/page.tsx

"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Zap, TrendingUp, HelpCircle, AlertCircle } from "lucide-react";
import BackButton from "../../../components/BackButton";
import Navbar from "../../../components/Navbar";
import PriceGraph from "../../../components/PriceGraph";
import PriceChart from "../../../components/PriceChart";
import CardHero from "../../../components/CardHero";
import MarketPanel from "../../../components/MarketPanel";
import PriceStats from "../../../components/PriceStats";
import CardActions from "../../../components/CardActions";
import CardPortfolio from "../../../components/CardPortfolio";
import PredictionPanel from "../../../components/PredictionPanel";

import { enrichAndCacheCards, getCardById } from "../../../lib/pokemon";
import { trackCardPrice } from "../../../lib/priceTracker";
import {
  getMarketHistory,
  getMarketHistoryDays,
  formatHistoryForGraph,
} from "../../../lib/priceHistory";
import {
  getTrend,
  getInvestmentScore,
  getRecommendation,
} from "../../../lib/investment";
import { getMarketData, getMarketSpread } from "../../../lib/marketEngine";
import { predictPrice } from "../../../lib/predictionEngine";
import {
  getCurrentPrice,
  getLowestPrice,
  getHighestPrice,
  getVariationPercent,
  getPriceOpportunity,
} from "../../../lib/priceIntelligence";
import type { PokemonCard } from "../../../lib/types";

type ChartPoint = {
  date: string;
  price: number;
};

export default function CardPage() {
  const routeParams = useParams();
  const rawParamId =
    typeof routeParams?.id === "string"
      ? routeParams.id
      : Array.isArray(routeParams?.id)
      ? routeParams.id[0]
      : "";

  const rawId = rawParamId ? decodeURIComponent(rawParamId) : "";

  const [card, setCard] = useState<PokemonCard | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [isLoadingMarket, setIsLoadingMarket] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [score, setScore] = useState(0);
  const [trend, setTrend] = useState<"up" | "down" | "stable">("stable");
  const [recommendation, setRecommendation] = useState("");
  const [prediction, setPrediction] = useState({
    predictedPrice30d: 0,
    roi30d: 0,
    confidence: 0,
  });
  const [priceInfo, setPriceInfo] = useState({
    current: 0,
    lowest: 0,
    highest: 0,
    variation: 0,
    opportunity: "",
  });
  const [chartHistory, setChartHistory] = useState<ChartPoint[]>([]);

  useEffect(() => {
    if (!rawId) return;

    let isMounted = true;

    const load = async () => {
      try {
        setIsLoadingStats(true);
        setError(null);

        // Récupération de la carte (mémoire, local storage ou API)
        const result = await getCardById(rawId);

        if (!result) {
          if (isMounted) {
            setError("Carte introuvable. Veuillez réessayer le scan.");
            setIsLoadingStats(false);
          }
          return;
        }

        if (!isMounted) return;

        // V37: render the catalogue card immediately. Market enrichment is
        // deliberately isolated so a slow/unavailable price provider can
        // never block the card detail page itself.
        setCard(result);
        setIsLoadingStats(false);
        setIsLoadingMarket(true);

        let marketCard = result;
        try {
          const [enriched] = await enrichAndCacheCards([result]);
          if (enriched) marketCard = enriched;
          if (isMounted) setCard(marketCard);
        } catch (marketError) {
          console.warn("Échec de la synchronisation marché :", marketError);
        } finally {
          if (isMounted) setIsLoadingMarket(false);
        }

        // Suivi des prix sécurisé
        try {
          if (typeof trackCardPrice === "function") {
            trackCardPrice(marketCard);
          }
        } catch (e) {
          console.warn("Échec du suivi des prix :", e);
        }

        // Historique marché local
        const marketHistory = getMarketHistory ? getMarketHistory(marketCard.id) || [] : [];
        const daysHistory = getMarketHistoryDays ? getMarketHistoryDays(marketCard, 7) || [] : [];
        const formattedGraph = formatHistoryForGraph ? formatHistoryForGraph(daysHistory) || [] : [];

        const graphHistory: ChartPoint[] = formattedGraph.map((point: any) => ({
          date: point?.day ?? "",
          price: point?.average ?? 0,
        }));

        if (isMounted) setChartHistory(graphHistory);

        // Calculs d'investissement sécurisés
        const t = typeof getTrend === "function" ? getTrend(marketHistory) : "stable";
        const s = typeof getInvestmentScore === "function" ? getInvestmentScore(marketCard, marketHistory) : 5;
        const r = typeof getRecommendation === "function" ? getRecommendation(s) : "Conserver";

        if (isMounted) {
          setTrend(t);
          setScore(s);
          setRecommendation(r);

          if (typeof predictPrice === "function") {
            try {
              // V39 FR: the 30-day projection must start from the current
              // King_TCG quote, not from an older mixed-source local history.
              const pred = marketCard.dataLanguage === "fr"
                ? predictPrice([], s, marketCard)
                : predictPrice(marketHistory, s, marketCard);
              if (pred) {
                setPrediction({
                  predictedPrice30d: pred.predictedPrice30d ?? 0,
                  roi30d: pred.roi30d ?? 0,
                  confidence: pred.confidence ?? 0,
                });
              }
            } catch (pErr) {
              console.warn("Erreur prédiction:", pErr);
            }
          }

          let opportunityResText = "Indisponible";
          try {
            if (typeof getPriceOpportunity === "function") {
              const opportunityRes = getPriceOpportunity(marketHistory);
              opportunityResText = opportunityRes?.text ?? "Indisponible";
            }
          } catch {}

          setPriceInfo({
            current: typeof getCurrentPrice === "function" ? getCurrentPrice(marketHistory) : 0,
            lowest: typeof getLowestPrice === "function" ? getLowestPrice(marketHistory) : 0,
            highest: typeof getHighestPrice === "function" ? getHighestPrice(marketHistory) : 0,
            variation: typeof getVariationPercent === "function" ? getVariationPercent(marketHistory) : 0,
            opportunity: opportunityResText,
          });
        }
      } catch (err) {
        console.error("Erreur lors du chargement des données de la carte :", err);
        if (isMounted) {
          setError("Une erreur est survenue lors du chargement de la carte.");
        }
      } finally {
        if (isMounted) setIsLoadingStats(false);
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, [rawId]);

  // Écran de chargement
  if (isLoadingStats) {
    return (
      <>
        <Navbar />
        <main className="kt-app-shell flex min-h-screen items-center justify-center px-4">
          <div className="kt-premium-card w-full max-w-md p-6 sm:p-8">
            <div className="flex items-center gap-4">
              <div className="relative h-14 w-14 shrink-0 rounded-2xl border border-cyan-400/14 bg-cyan-400/[0.04]">
                <div className="absolute inset-3 animate-spin rounded-full border-2 border-zinc-800 border-t-cyan-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-black text-white">Préparation de la fiche premium</p>
                <p className="mt-1 text-[11px] font-medium leading-5 text-zinc-500">
                  Synchronisation des cotations, de l’historique et des indicateurs King_TCG.
                </p>
              </div>
            </div>
            <div className="mt-6 space-y-3">
              <div className="kt-skeleton h-3 w-3/4 rounded-full" />
              <div className="kt-skeleton h-3 w-full rounded-full" />
              <div className="kt-skeleton h-3 w-5/6 rounded-full" />
            </div>
          </div>
        </main>
      </>
    );
  }

  // Écran d'erreur
  if (error || !card) {
    return (
      <>
        <Navbar />
        <main className="kt-app-shell flex min-h-screen items-center justify-center px-4">
          <div className="glass-card max-w-sm w-full rounded-2xl p-8 text-center space-y-4 border border-red-500/20 shadow-xl">
            <AlertCircle className="mx-auto h-10 w-10 text-red-400" />
            <p className="text-sm font-bold tracking-wide text-zinc-300">
              {error || "Carte introuvable."}
            </p>
            <div className="pt-2">
              <BackButton />
            </div>
          </div>
        </main>
      </>
    );
  }

  const market = typeof getMarketData === "function"
    ? getMarketData(card)
    : { cardmarket: 0, cardmarketEurope: 0, ebay: 0, tcgplayer: 0, justtcg: 0, average: 0, priceTrend7d: 0, priceTrend30d: 0 };

  const spread = typeof getMarketSpread === "function" ? getMarketSpread(card) : 0;

  const refreshPrice = () => {
    try {
      if (typeof trackCardPrice === "function") {
        trackCardPrice(card, true);
      }
    } catch {}
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  return (
    <>
      <Navbar />

      <main className="kt-app-shell pb-32 text-white selection:bg-cyan-500/20">
        <div className="kt-grid-glow pointer-events-none fixed inset-0 opacity-40" />
        <div className="relative mx-auto max-w-7xl space-y-5 px-4 py-5 sm:space-y-6 sm:px-6 sm:py-6 lg:px-8">
          <div className="flex items-center justify-between">
            <BackButton />
          </div>

          {isLoadingMarket ? (
            <div className="flex items-center gap-2 rounded-xl border border-cyan-400/15 bg-cyan-400/[0.05] px-3.5 py-2.5 text-[10px] font-bold text-cyan-200">
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-cyan-200/25 border-t-cyan-200" />
              Mise à jour des cotations en arrière-plan…
            </div>
          ) : null}

          {/* Section Vitrine de la Carte */}
          <section className="kt-premium-card kt-rise-in overflow-hidden p-4 sm:p-5 lg:p-6">
            <div className="relative z-10 space-y-6">
              <CardHero
                image={
                  card.images?.large || card.images?.small || "/placeholder.png"
                }
                name={card.name}
                set={card.set?.name || "Extension inconnue"}
                number={card.number}
                rarity={card.rarity || "N/A"}
              />
              <div className="grid grid-cols-1 gap-4 border-t border-white/[0.06] pt-6 sm:grid-cols-2">
                <CardActions cardId={card.id} />
                <CardPortfolio
                  card={card}
                  currentValue={market?.average || 0}
                />
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-white/[0.08] bg-[#18202a] px-4 py-3.5 sm:px-5">
            <p className="text-[11px] font-medium leading-5 text-zinc-400">
              <span className="font-black text-white">Comprendre cette fiche :</span>{" "}
              les prix ci-dessous correspondent aux sources actuellement disponibles en état de référence Near Mint. La moyenne utilise uniquement les sources réellement trouvées ; une source absente n’est jamais remplacée par un prix inventé.
            </p>
          </section>

          {/* Grille de Données Marché & Statistiques */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.18fr_.82fr]">
            <div className="kt-premium-card p-4 sm:p-5">
              <MarketPanel
                cardmarket={market?.cardmarket}
                cardmarketEurope={market?.cardmarketEurope}
                ebay={market?.ebay}
                tcgplayer={market?.tcgplayer}
                justtcg={market?.justtcg}
                average={market?.average || 0}
                spread={spread}
                quotes={card.marketQuotes || []}
                language={card.dataLanguage || "en"}
                onRefresh={refreshPrice}
              />
            </div>

            <div className="kt-premium-card p-4 sm:p-5">
              <PriceStats
                current={priceInfo.current}
                lowest={priceInfo.lowest}
                highest={priceInfo.highest}
                variation={priceInfo.variation}
                opportunity={priceInfo.opportunity}
                kingTcgPrice={market?.average || 0}
                frenchMode={card.dataLanguage === "fr"}
              />
            </div>
          </div>

          {/* Section Analyse Investissement */}
          <section className="kt-premium-card space-y-3 overflow-hidden p-3.5 sm:p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-violet-300/15 bg-violet-300/[0.07]">
                <Zap className="h-4 w-4 text-violet-200" />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-black uppercase tracking-widest text-white">
                  Analyse Investissement
                </h2>
                <p className="mt-1 text-[11px] font-medium leading-5 text-zinc-500">
                  Indicateurs de volatilité et aides à la décision calculés en temps réel.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-white/[0.08] bg-[#1a222c] p-2 flex flex-col justify-between min-h-[58px]">
                <div className="flex items-start justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500">
                    Tendance
                  </span>
                  <TrendingUp className="h-4 w-4 text-cyan-400" />
                </div>
                <span className="mt-1 text-sm font-black text-white">
                  {trend === "up"
                    ? "Hausse"
                    : trend === "down"
                    ? "Baisse"
                    : "Stable"}
                </span>
              </div>

              <div className="rounded-xl border border-white/[0.08] bg-[#1a222c] p-2 flex flex-col justify-between min-h-[58px]">
                <div className="flex items-start justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500">
                    Score IA
                  </span>
                  <Zap className="h-4 w-4 text-cyan-400" />
                </div>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-lg font-black text-white tabular-nums">
                    {score}
                  </span>
                  <span className="text-xs font-bold text-zinc-500">/ 10</span>
                </div>
              </div>

              <div className="col-span-2 rounded-xl border border-white/[0.08] bg-[#1a222c] px-3 py-2.5">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[9px] font-black uppercase tracking-wider text-zinc-500">
                    Conseil d'Arbitrage
                  </span>
                  <HelpCircle className="h-4 w-4 text-cyan-400" />
                </div>
                <p className="mt-1.5 text-[10px] font-bold leading-snug text-white">{recommendation}</p>
              </div>
            </div>
          </section>

          {/* Section Prédictions */}
          <section className="kt-premium-card p-4 sm:p-5">
            <PredictionPanel
              predictedPrice30d={prediction.predictedPrice30d}
              roi30d={prediction.roi30d}
              confidence={prediction.confidence}
            />
          </section>

          {/* Graphiques */}
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <PriceChart history={chartHistory} />

            <section className="kt-premium-card p-4 sm:p-5">
              <PriceGraph card={card} />
            </section>
          </div>
        </div>
      </main>
    </>
  );
}