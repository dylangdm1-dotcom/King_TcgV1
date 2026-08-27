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
  getEffectiveMarketHistory,
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
import { getCondition, getPrintingVariant } from "../../../lib/storage";
import type { CardCondition, CardPrintVariantKey, PokemonCard, PredictionResult } from "../../../lib/types";

type ChartPoint = {
  date: string;
  price: number;
  origin?: "observed" | "reconstructed";
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
  const [prediction, setPrediction] = useState<PredictionResult>({
    predictedPrice30d: 0,
    roi30d: 0,
    confidence: 0,
    rangeLow: 0,
    rangeHigh: 0,
    quality: "insufficient",
    qualityLabel: "Insuffisante",
    evidence: [] as string[],
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
      let catalogueLoaded = false;
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

        // V51: restore the user's selected physical printing before market sync.
        // The catalogue identity stays unchanged; only the pricing variant changes.
        const storedPrinting = getPrintingVariant(result.id) as CardPrintVariantKey;
        const availablePrintings = result.availablePrintVariants?.length
          ? result.availablePrintVariants
          : [{ key: "Normal" as CardPrintVariantKey, label: "Normal" }];
        const selectedPrintVariant = availablePrintings.some((variant) => variant.key === storedPrinting)
          ? storedPrinting
          : availablePrintings[0].key;
        const catalogueCard: PokemonCard = {
          ...result,
          selectedPrintVariant,
          condition: (getCondition(result.id) || "Near Mint") as CardCondition,
        };

        // Render catalogue data immediately. Market enrichment remains isolated.
        setCard(catalogueCard);
        catalogueLoaded = true;
        setIsLoadingStats(false);
        setIsLoadingMarket(true);

        let marketCard = catalogueCard;
        try {
          const [enriched] = await enrichAndCacheCards([catalogueCard]);
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
        const marketHistory = getEffectiveMarketHistory
          ? getEffectiveMarketHistory(marketCard) || []
          : getMarketHistory(marketCard.id) || [];
        const daysHistory = getMarketHistoryDays ? getMarketHistoryDays(marketCard, 7) || [] : [];
        const formattedGraph = formatHistoryForGraph ? formatHistoryForGraph(daysHistory) || [] : [];

        const graphHistory: ChartPoint[] = formattedGraph.map((point: any) => ({
          date: point?.day ?? "",
          price: point?.average ?? 0,
          origin: point?.origin,
        }));

        if (isMounted) setChartHistory(graphHistory);

        // Calculs d'investissement sécurisés
        const t = typeof getTrend === "function" ? getTrend(marketHistory) : "stable";
        const investmentHistory =
          marketCard.dataLanguage === "ja" || marketCard.dataLanguage === "zh-tw"
            ? []
            : marketHistory;
        const s = typeof getInvestmentScore === "function"
          ? getInvestmentScore(marketCard, investmentHistory, marketCard.condition || "Near Mint")
          : 5;
        const r = typeof getRecommendation === "function" ? getRecommendation(s) : "Conserver";

        if (isMounted) {
          setTrend(t);
          setScore(s);
          setRecommendation(r);

          if (typeof predictPrice === "function") {
            try {
              // V39 FR: the 30-day projection must start from the current
              // King_TCG quote, not from an older mixed-source local history.
              const pred =
                marketCard.dataLanguage === "fr" ||
                marketCard.dataLanguage === "ja" ||
                marketCard.dataLanguage === "zh-tw"
                  ? predictPrice([], s, marketCard)
                  : predictPrice(marketHistory, s, marketCard);
              if (pred) {
                setPrediction({
                  predictedPrice30d: pred.predictedPrice30d ?? 0,
                  roi30d: pred.roi30d ?? 0,
                  confidence: pred.confidence ?? 0,
                  rangeLow: pred.rangeLow ?? 0,
                  rangeHigh: pred.rangeHigh ?? 0,
                  quality: pred.quality ?? "insufficient",
                  qualityLabel: pred.qualityLabel ?? "Insuffisante",
                  evidence: pred.evidence ?? [],
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

          const liveMarket = getMarketData(marketCard);
          const useLiveMarket =
            marketCard.dataLanguage === "ja" ||
            marketCard.dataLanguage === "zh-tw";

         setPriceInfo({
  current: useLiveMarket
    ? (liveMarket.average ?? 0)
    : (typeof getCurrentPrice === "function" ? getCurrentPrice(marketHistory) : 0),

  lowest: useLiveMarket
    ? (liveMarket.minimum ?? 0)
    : (typeof getLowestPrice === "function" ? getLowestPrice(marketHistory) : 0),

  highest: useLiveMarket
    ? (liveMarket.maximum ?? 0)
    : (typeof getHighestPrice === "function" ? getHighestPrice(marketHistory) : 0),

  variation: useLiveMarket
    ? (liveMarket.priceTrend7d ?? 0)
    : (typeof getVariationPercent === "function" ? getVariationPercent(marketHistory) : 0),

  opportunity: useLiveMarket
    ? `Cote actuelle ${(liveMarket.average ?? 0).toFixed(2)} € · ${liveMarket.validSourceCount} source(s) compatible(s).`
    : opportunityResText,
});
        }
      } catch (err) {
        console.error("Erreur lors du chargement des données de la carte :", err);
        if (isMounted && !catalogueLoaded) {
          setError("Une erreur est survenue lors du chargement de la carte.");
        } else if (isMounted) {
          // The catalogue card is valid: a market/history/stat failure must never
          // replace the whole JP/CN detail page with a loading error.
          setIsLoadingMarket(false);
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
                <p className="mt-1 text-[11px] font-medium leading-5 text-zinc-200">
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

  const changePrintingVariant = async (variant: CardPrintVariantKey) => {
    if (!card) return;
    const baseCard: PokemonCard = { ...card, selectedPrintVariant: variant };
    setCard(baseCard);
    setIsLoadingMarket(true);
    try {
      const [enriched] = await enrichAndCacheCards([baseCard]);
      if (enriched) setCard(enriched);
    } catch (error) {
      console.warn("Échec du changement de version :", error);
    } finally {
      setIsLoadingMarket(false);
    }
  };

  const changeCondition = (condition: CardCondition) => {
    setCard((current) => current ? { ...current, condition } : current);
  };

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

      <main className="kt-app-shell kt-card-detail-page pb-32 text-white selection:bg-cyan-500/20">
        <div className="kt-grid-glow pointer-events-none fixed inset-0 opacity-30" />
        <div className="kt-page-wrap relative space-y-4">
          <div className="flex items-center justify-between gap-4">
            <BackButton />
            <span className="hidden rounded-full border border-cyan-400/15 bg-cyan-400/[0.045] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.12em] text-cyan-300 sm:inline-flex">
              Détails de la carte
            </span>
          </div>

          {isLoadingMarket ? (
            <div className="flex items-center gap-2 rounded-xl border border-cyan-400/15 bg-cyan-400/[0.05] px-3.5 py-2.5 text-[10px] font-bold text-cyan-200">
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-cyan-200/25 border-t-cyan-200" />
              Mise à jour des cotations en arrière-plan…
            </div>
          ) : null}

          <section className="relative">
            <div className="grid gap-4 xl:grid-cols-[.92fr_1.08fr]">
              <div className="space-y-4">
                <CardHero
                  image={card.images?.large || card.images?.small || "/placeholder.png"}
                  imageCandidates={card.imageCandidates || []}
                  name={card.name}
                  set={card.set?.name || "Extension inconnue"}
                  number={card.number}
                  rarity={card.rarity || "N/A"}
                  price={market?.average || 0}
                  score={score}
                  trend={trend}
                  recommendation={recommendation}
                />

                <div className="kt-subpanel p-4">
                  <CardActions cardId={card.id} />
                </div>

                <div className="kt-panel p-4">
                  <CardPortfolio
                    card={card}
                    currentValue={market?.average || 0}
                    onPrintingVariantChange={changePrintingVariant}
                    onConditionChange={changeCondition}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <section className="kt-panel p-4 sm:p-5">
                  <MarketPanel
                    cardmarket={market?.cardmarket}
                    cardmarketEurope={market?.cardmarketEurope}
                    ebay={market?.ebay}
                    tcgplayer={market?.tcgplayer}
                    justtcg={market?.justtcg}
                    average={market?.average || 0}
                    spread={spread}
                    quotes={card.marketQuotes || []}
                    debugCardmarketFr={card.debugCardmarketFr}
                    debugJustTcg={card.debugJustTcg}
                    language={card.dataLanguage || "en"}
                    onRefresh={refreshPrice}
                  />
                </section>

                <section className="kt-panel p-4 sm:p-5">
                  <PriceStats
                    current={priceInfo.current}
                    lowest={priceInfo.lowest}
                    highest={priceInfo.highest}
                    variation={priceInfo.variation}
                    opportunity={priceInfo.opportunity}
                    kingTcgPrice={market?.average || 0}
                    frenchMode={card.dataLanguage === "fr"}
                  />
                </section>
              </div>
            </div>
          </section>

          <section className="kt-info-note px-4 py-3.5 sm:px-5">
            <p className="text-[10px] font-medium leading-5 text-zinc-300">
              <span className="font-black text-cyan-300">Lecture des cotations :</span>{" "}
              les prix utilisent uniquement les sources réellement disponibles pour cette impression. Une source absente n’est jamais remplacée par une valeur inventée.
            </p>
          </section>

          <div className="grid gap-4 xl:grid-cols-[.8fr_1.2fr]">
            <section className="kt-panel p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/[0.06]">
                  <Zap className="h-4 w-4 text-cyan-300" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-[12px] font-black uppercase tracking-[0.10em] text-white">Analyse de marché</h2>
                  <p className="mt-1 text-[10px] leading-4 text-zinc-400">Tendance, score et recommandation King_TCG.</p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="kt-metric-cell rounded-[14px] border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[9px] font-black uppercase tracking-[0.10em] text-zinc-400">Tendance</span>
                    <TrendingUp className="h-4 w-4 text-cyan-300" />
                  </div>
                  <p className={`mt-2 text-lg font-black ${trend === "up" ? "text-emerald-300" : trend === "down" ? "text-rose-300" : "text-white"}`}>
                    {trend === "up" ? "Hausse" : trend === "down" ? "Baisse" : "Stable"}
                  </p>
                </div>

                <div className="kt-metric-cell rounded-[14px] border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[9px] font-black uppercase tracking-[0.10em] text-zinc-400">Score stratégique</span>
                    <Zap className="h-4 w-4 text-cyan-300" />
                  </div>
                  <p className="mt-2 text-lg font-black text-white tabular-nums">{score}<span className="text-[11px] text-zinc-400"> / 10</span></p>
                </div>

                <div className="col-span-2 rounded-[14px] border border-cyan-400/12 bg-cyan-400/[0.035] px-3 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[9px] font-black uppercase tracking-[0.10em] text-cyan-300">Indicateur King_TCG</span>
                    <HelpCircle className="h-4 w-4 text-cyan-300" />
                  </div>
                  <p className="mt-1.5 text-[10px] font-semibold leading-4 text-zinc-200">{recommendation}</p>
                </div>
              </div>
            </section>

            <section className="kt-panel p-4 sm:p-5">
              <PredictionPanel
                predictedPrice30d={prediction.predictedPrice30d}
                roi30d={prediction.roi30d}
                confidence={prediction.confidence}
                rangeLow={prediction.rangeLow}
                rangeHigh={prediction.rangeHigh}
                qualityLabel={prediction.qualityLabel}
                evidence={prediction.evidence}
              />
            </section>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <section className="kt-panel p-4 sm:p-5">
              <PriceChart history={chartHistory} />
            </section>

            <section className="kt-panel p-4 sm:p-5">
              <PriceGraph card={card} />
            </section>
          </div>
        </div>
      </main>
    </>
  );
}
