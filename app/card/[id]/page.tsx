"use client";

import { useEffect, useState } from "react";
import { Zap, TrendingUp, HelpCircle } from "lucide-react";
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
import { getFreePriceHistory, type FreePricePoint } from "../../../lib/freePriceHistory";
import { getMarketHistory } from "../../../lib/priceHistory";
import { getTrend, getInvestmentScore, getRecommendation } from "../../../lib/investment";
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

type Props = {
  params: {
    id: string;
  };
};

type ChartPoint = {
  date: string;
  price: number;
};

export default function CardPage({ params }: Props) {
  const [card, setCard] = useState<PokemonCard | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
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
  const [externalHistory, setExternalHistory] = useState<FreePricePoint[]>([]);

  useEffect(() => {
    if (!params?.id) return;

    const load = async () => {
      try {
        setIsLoadingStats(true);
        const result = await getCardById(params.id);
        if (!result) return;

        setCard(result);
        trackCardPrice(result);

        const marketHistory = getMarketHistory(result.id);
        const graphHistory = marketHistory.map((point) => ({
          date: new Date(point.date).toLocaleDateString("fr-FR"),
          price: point.average,
        }));

        setChartHistory(graphHistory);

        const freeHistory = await getFreePriceHistory(result.id, 30);
        setExternalHistory(freeHistory);

        const t = getTrend(marketHistory);
        const s = getInvestmentScore(result, marketHistory);
        const r = getRecommendation(s);

        setTrend(t);
        setScore(s);
        setRecommendation(r);
        setPrediction(predictPrice(marketHistory, s));

        setPriceInfo({
          current: getCurrentPrice(marketHistory),
          lowest: getLowestPrice(marketHistory),
          highest: getHighestPrice(marketHistory),
          variation: getVariationPercent(marketHistory),
          opportunity: getPriceOpportunity (marketHistory).text,
        });
        
        // Tout est calculé, on libère l'affichage
        setIsLoadingStats(false);
      } catch (error) {
        console.error("Erreur lors du chargement des données de la carte :", error);
        setIsLoadingStats(false);
      }
    };

    load();
  }, [params.id]);

  // Écran d'attente pro : évite le flash des valeurs à 0.00 €
  if (!card || isLoadingStats) {
    return (
      <>
        <Navbar />
        <main className="flex min-h-screen items-center justify-center bg-neutral-950 px-4">
          <div className="glass-card rounded-2xl p-8 text-center max-w-sm w-full space-y-4">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-zinc-800 border-t-cyan-400" />
            <p className="text-zinc-400 font-bold text-xs tracking-wide">Calcul des indices financiers King_TCG...</p>
          </div>
        </main>
      </>
    );
  }

  const market = getMarketData(card);
  const spread = getMarketSpread(card);

  const refreshPrice = () => {
    trackCardPrice(card, true);
    window.location.reload();
  };

  const chartData = externalHistory.length > 0
    ? externalHistory.map((point) => ({
        date: new Date(point.date).toLocaleDateString("fr-FR"),
        price: point.price,
      }))
    : chartHistory;

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-neutral-950 text-white pb-24 selection:bg-cyan-500/20">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
          
          <div className="flex items-center justify-between">
            <BackButton />
          </div>

          {/* 🃏 Section Vitrine de la Carte */}
          <section className="glass-card rounded-2xl p-6 sm:p-8">
            <div className="relative z-10 space-y-6">
              <CardHero
                image={card.images.large}
                name={card.name}
                set={card.set.name}
                rarity={card.rarity}
              />
              <div className="grid grid-cols-1 gap-4 pt-4 border-t border-zinc-900 sm:grid-cols-2">
                <CardActions cardId={card.id} />
                <CardPortfolio card={card} currentValue={market.average} />
              </div>
            </div>
          </section>

          {/* 📊 Grille de Données Marché & Statistiques */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="glass-card rounded-xl p-6">
              <MarketPanel
                cardmarket={market.cardmarket}
                ebay={market.ebay}
                tcgplayer={market.tcgplayer}
                average={market.average}
                spread={spread}
                onRefresh={refreshPrice}
              />
            </div>

            <div className="glass-card rounded-xl p-6">
              <PriceStats
                current={priceInfo.current}
                lowest={priceInfo.lowest}
                highest={priceInfo.highest}
                variation={priceInfo.variation}
                opportunity={priceInfo.opportunity}
              />
            </div>
          </div>

          {/* 🧠 Section Analyse Investissement & Intelligence Artificielle */}
          <section className="glass-card rounded-2xl p-6 sm:p-8 space-y-6">
            <div>
              <h2 className="text-xl font-black tracking-tight text-white">
                🧠 Analyse Investissement
              </h2>
              <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 mt-1">
                Indicateurs de volatilité et aides à la décision calculés en temps réel.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="glass-card bg-neutral-950/40 rounded-xl p-5 flex flex-col justify-between min-h-[100px]">
                <div className="flex justify-between items-start">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Tendance</span>
                  <TrendingUp className="w-4 h-4 text-cyan-400" />
                </div>
                <span className="text-lg font-black text-white mt-3">
                  {trend === "up" ? "Hausse" : trend === "down" ? "Baisse" : "Stable"}
                </span>
              </div>

              <div className="glass-card bg-neutral-950/40 rounded-xl p-5 flex flex-col justify-between min-h-[100px]">
                <div className="flex justify-between items-start">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Score IA</span>
                  <Zap className="w-4 h-4 text-cyan-400" />
                </div>
                <span className="text-2xl font-black text-white mt-3">
                  {score}<span className="text-xs text-zinc-500 font-normal"> / 10</span>
                </span>
              </div>

              <div className="glass-card bg-neutral-950/40 rounded-xl p-5 flex flex-col justify-between min-h-[100px]">
                <div className="flex justify-between items-start">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Conseil d'Arbitrage</span>
                  <HelpCircle className="w-4 h-4 text-cyan-400" />
                </div>
                <span className="text-xs font-bold text-white mt-3 leading-relaxed">
                  {recommendation}
                </span>
              </div>
            </div>
          </section>

          {/* 🔮 Section Prédictions futures */}
          <section className="glass-card rounded-2xl p-6">
            <PredictionPanel
              predictedPrice30d={prediction.predictedPrice30d}
              roi30d={prediction.roi30d}
              confidence={prediction.confidence}
            />
          </section>

          {/* 📈 Graphiques historiques des prix */}
          <div className="grid grid-cols-1 gap-6">
            <section className="glass-card rounded-2xl p-6">
              <h2 className="mb-6 text-sm font-bold uppercase tracking-widest text-zinc-400">
                📈 Évolution des cours (30 derniers jours)
              </h2>
              <div className="overflow-hidden rounded-xl bg-black/20 border border-zinc-900 p-2">
                <PriceChart history={chartData} />
              </div>
            </section>

            <section className="glass-card rounded-2xl p-6">
              <PriceGraph cardId={card.id} />
            </section>
          </div>

        </div>
      </main>
    </>
  );
}