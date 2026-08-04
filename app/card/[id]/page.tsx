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

import { getCardById } from "../../../lib/pokemon";
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
        setCard(result);

        // Suivi des prix sécurisé
        try {
          if (typeof trackCardPrice === "function") {
            trackCardPrice(result);
          }
        } catch (e) {
          console.warn("Échec du suivi des prix :", e);
        }

        // Historique marché local
        const marketHistory = getMarketHistory ? getMarketHistory(result.id) || [] : [];
        const daysHistory = getMarketHistoryDays ? getMarketHistoryDays(result.id, 30) || [] : [];
        const formattedGraph = formatHistoryForGraph ? formatHistoryForGraph(daysHistory) || [] : [];

        const graphHistory: ChartPoint[] = formattedGraph.map((point: any) => ({
          date: point?.day ?? "",
          price: point?.average ?? 0,
        }));

        if (isMounted) setChartHistory(graphHistory);

        // Calculs d'investissement sécurisés
        const t = typeof getTrend === "function" ? getTrend(marketHistory) : "stable";
        const s = typeof getInvestmentScore === "function" ? getInvestmentScore(result, marketHistory) : 5;
        const r = typeof getRecommendation === "function" ? getRecommendation(s) : "Conserver";

        if (isMounted) {
          setTrend(t);
          setScore(s);
          setRecommendation(r);

          if (typeof predictPrice === "function") {
            try {
              const pred = predictPrice(marketHistory, s);
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
        <main className="flex min-h-screen items-center justify-center bg-neutral-950 px-4">
          <div className="glass-card max-w-sm w-full rounded-2xl p-8 text-center space-y-4 shadow-xl">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-zinc-800 border-t-cyan-400" />
            <p className="text-xs font-bold tracking-wide text-zinc-400">
              Calcul des indices financiers King_TCG...
            </p>
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
        <main className="flex min-h-screen items-center justify-center bg-neutral-950 px-4">
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
    : { cardmarket: 0, ebay: 0, tcgplayer: 0, average: 0, priceTrend7d: 0, priceTrend30d: 0 };

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

      <main className="min-h-screen bg-neutral-950 pb-32 text-white selection:bg-cyan-500/20">
        <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <BackButton />
          </div>

          {/* Section Vitrine de la Carte */}
          <section className="rounded-2xl border border-zinc-900 bg-neutral-900/40 p-5 sm:p-6 shadow-xl">
            <div className="relative z-10 space-y-6">
              <CardHero
                image={
                  card.images?.large || card.images?.small || "/placeholder.png"
                }
                name={card.name}
                set={card.set?.name || "Extension Inconnue"}
                rarity={card.rarity || "N/A"}
              />
              <div className="grid grid-cols-1 gap-4 border-t border-zinc-900 pt-5 sm:grid-cols-2">
                <CardActions cardId={card.id} />
                <CardPortfolio
                  card={card}
                  currentValue={market?.average || 0}
                />
              </div>
            </div>
          </section>

          {/* Grille de Données Marché & Statistiques */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-zinc-900 bg-neutral-900/40 p-5 sm:p-6 shadow-xl">
              <MarketPanel
                cardmarket={market?.cardmarket}
                ebay={market?.ebay}
                tcgplayer={market?.tcgplayer}
                average={market?.average || 0}
                spread={spread}
                onRefresh={refreshPrice}
              />
            </div>

            <div className="rounded-2xl border border-zinc-900 bg-neutral-900/40 p-5 sm:p-6 shadow-xl">
              <PriceStats
                current={priceInfo.current}
                lowest={priceInfo.lowest}
                highest={priceInfo.highest}
                variation={priceInfo.variation}
                opportunity={priceInfo.opportunity}
              />
            </div>
          </div>

          {/* Section Analyse Investissement */}
          <section className="rounded-2xl border border-zinc-900 bg-neutral-900/40 p-5 sm:p-6 shadow-xl space-y-5">
            <div>
              <h2 className="text-sm font-black uppercase tracking-widest text-white">
                🧠 Analyse Investissement
              </h2>
              <p className="mt-0.5 text-[11px] font-medium text-zinc-400">
                Indicateurs de volatilité et aides à la décision calculés en
                temps réel.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-zinc-900 bg-neutral-900/40 p-4 sm:p-5 flex flex-col justify-between min-h-[105px] shadow-xl">
                <div className="flex items-start justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500">
                    Tendance
                  </span>
                  <TrendingUp className="h-4 w-4 text-cyan-400" />
                </div>
                <span className="mt-2 text-lg font-black text-white">
                  {trend === "up"
                    ? "Hausse"
                    : trend === "down"
                    ? "Baisse"
                    : "Stable"}
                </span>
              </div>

              <div className="rounded-2xl border border-zinc-900 bg-neutral-900/40 p-4 sm:p-5 flex flex-col justify-between min-h-[105px] shadow-xl">
                <div className="flex items-start justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500">
                    Score IA
                  </span>
                  <Zap className="h-4 w-4 text-cyan-400" />
                </div>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-2xl font-black text-white tabular-nums">
                    {score}
                  </span>
                  <span className="text-xs font-bold text-zinc-500">
                    / 10
                  </span>
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-900 bg-neutral-900/40 p-4 sm:p-5 flex flex-col justify-between min-h-[105px] shadow-xl">
                <div className="flex items-start justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500">
                    Conseil d'Arbitrage
                  </span>
                  <HelpCircle className="h-4 w-4 text-cyan-400" />
                </div>
                <span className="mt-2 text-xs font-bold leading-relaxed text-white">
                  {recommendation}
                </span>
              </div>
            </div>
          </section>

          {/* Section Prédictions */}
          <section className="rounded-2xl border border-zinc-900 bg-neutral-900/40 p-5 sm:p-6 shadow-xl">
            <PredictionPanel
              predictedPrice30d={prediction.predictedPrice30d}
              roi30d={prediction.roi30d}
              confidence={prediction.confidence}
            />
          </section>

          {/* Graphiques */}
          <div className="grid grid-cols-1 gap-6">
            <section className="rounded-2xl border border-zinc-900 bg-neutral-900/40 p-5 sm:p-6 shadow-xl">
              <h2 className="mb-4 text-xs font-black uppercase tracking-widest text-zinc-400">
                📈 Évolution des cours (30 derniers jours)
              </h2>
              <div className="overflow-hidden rounded-2xl border border-zinc-900 bg-black/40 p-3 shadow-xl">
                <PriceChart history={chartHistory} />
              </div>
            </section>

            <section className="rounded-2xl border border-zinc-900 bg-neutral-900/40 p-5 sm:p-6 shadow-xl">
              <PriceGraph cardId={card.id} />
            </section>
          </div>
        </div>
      </main>
    </>
  );
}