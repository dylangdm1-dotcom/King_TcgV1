// app/dashboard/page.tsx
"use client";

import { useEffect, useState, useRef } from "react";
import {
  Wallet,
  TrendingUp,
  Zap,
  Trophy,
  Package,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Download,
  Upload,
  ShieldAlert,
  Sparkles,
} from "lucide-react";

import Navbar from "../../components/Navbar";
import PortfolioChart from "../../components/dashboard/PortfolioChart";
import TopMovers from "../../components/dashboard/TopMovers";
import RecentAcquisitions from "../../components/dashboard/RecentAcquisitions";
import BackButton from "../../components/BackButton";

import {
  getCollection,
  getBuyPrice,
  exportBackup,
  importBackup,
} from "../../lib/storage";

import { getCardById } from "../../lib/pokemon";
import {
  getMarketHistory,
  type PricePoint,
} from "../../lib/priceHistory";

import { getInvestmentScore } from "../../lib/investment";
import { getMarketData } from "../../lib/marketEngine";

import type { PokemonCard } from "../../lib/types";

type CardWithMeta = PokemonCard & {
  qty: number;
  history: PricePoint[];
};

export default function DashboardPage() {
  const [cards, setCards] = useState<CardWithMeta[]>([]);
  const [portfolioValue, setPortfolioValue] = useState(0);
  const [investedValue, setInvestedValue] = useState(0);
  const [profitValue, setProfitValue] = useState(0);
  const [bestCard, setBestCard] = useState<CardWithMeta | null>(null);
  const [worstCard, setWorstCard] = useState<CardWithMeta | null>(null);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadDashboardData = async () => {
    try {
      const collection = getCollection();
      const ids = Object.keys(collection);

      if (ids.length === 0) {
        setCards([]);
        setPortfolioValue(0);
        setInvestedValue(0);
        setProfitValue(0);
        setBestCard(null);
        setWorstCard(null);
        return;
      }

      const results = await Promise.all(
        ids.map(async (id) => {
          try {
            const card = await getCardById(id);
            if (!card) return null;
            return {
              ...card,
              qty: collection[id],
              history: getMarketHistory(id),
            };
          } catch (error) {
            console.error(`[King_TCG V5] Erreur récupération carte ${id}:`, error);
            return null;
          }
        })
      );

      const valid = results.filter((card): card is CardWithMeta => card !== null);
      setCards(valid);

      let invested = 0;
      let currentPortfolio = 0;

      valid.forEach((card) => {
        const market = getMarketData(card);
        const buyPrice = getBuyPrice(card.id);
        invested += buyPrice * card.qty;
        currentPortfolio += market.average * card.qty;
      });

      setInvestedValue(invested);
      setPortfolioValue(currentPortfolio);
      setProfitValue(currentPortfolio - invested);

      let best: CardWithMeta | null = null;
      let worst: CardWithMeta | null = null;

      valid.forEach((card) => {
        const score = getInvestmentScore(card, card.history);
        if (!best || score > getInvestmentScore(best, best.history)) {
          best = card;
        }
        if (!worst || score < getInvestmentScore(worst, worst.history)) {
          worst = card;
        }
      });

      setBestCard(best);
      setWorstCard(worst);
    } catch (error) {
      console.error("[King_TCG V5] Erreur rafraîchissement dashboard:", error);
    }
  };

  useEffect(() => {
    loadDashboardData();
    const refresh = () => loadDashboardData();
    window.addEventListener("king_tcg_update", refresh);
    return () => window.removeEventListener("king_tcg_update", refresh);
  }, []);

  const averageScore = cards.length > 0
    ? cards.reduce((sum, card) => sum + getInvestmentScore(card, card.history), 0) / cards.length
    : 0;

  const roi = investedValue > 0 ? ((portfolioValue - investedValue) / investedValue) * 100 : 0;
  const isRoiPositive = roi >= 0;

  const toggleDetails = (id: string) => {
    setExpandedCardId(expandedCardId === id ? null : id);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (!content) return;

      const success = importBackup(content, "merge");
      if (success) {
        setImportStatus("Sauvegarde importée et fusionnée avec succès !");
        loadDashboardData();
        window.dispatchEvent(new Event("king_tcg_update"));
      } else {
        setImportStatus("Erreur : fichier de sauvegarde invalide.");
      }

      setTimeout(() => setImportStatus(null), 4000);
    };

    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-neutral-950 text-white pb-32 selection:bg-cyan-500/20">
        <div className="mx-auto max-w-xl space-y-5 px-4 py-5">
          {/* Navigation + sauvegarde */}
          <div className="flex items-center justify-between">
            <BackButton />
            <div className="flex items-center gap-2">
              <button
                onClick={exportBackup}
                className="flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-neutral-900 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-zinc-300 transition-all hover:border-cyan-500/50 hover:text-cyan-400 active:scale-[0.98]"
                title="Exporter une sauvegarde"
              >
                <Download className="h-3.5 w-3.5 text-cyan-400" />
                Exporter
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-neutral-900 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-zinc-300 transition-all hover:border-cyan-500/50 hover:text-cyan-400 active:scale-[0.98]"
                title="Importer une sauvegarde JSON"
              >
                <Upload className="h-3.5 w-3.5 text-cyan-400" />
                Importer
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".json"
                className="hidden"
              />
            </div>
          </div>

          {/* Feedback import */}
          {importStatus && (
            <div className="animate-fadeIn rounded-xl border border-cyan-500/30 bg-cyan-950/20 p-3 text-center text-xs font-bold text-cyan-400">
              {importStatus}
            </div>
          )}

          {/* Header portefeuille */}
          <section className="flex flex-col gap-3 rounded-2xl border border-zinc-900 bg-neutral-900/40 p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-widest text-cyan-400">
                <Sparkles className="h-3 w-3" />
                Suivi Live V5
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                {cards.length} {cards.length > 1 ? "actifs" : "actif"}
              </span>
            </div>
            <div>
              <h1 className="text-lg font-black uppercase tracking-tight text-white">
                Tableau de bord
              </h1>
              <p className="mt-0.5 text-[11px] text-zinc-400">
                Pilote la valeur de ta collection et surveille les tendances du marché.
              </p>
            </div>
            {/* Investissement / Profit */}
            <div className="grid grid-cols-2 gap-3 border-t border-zinc-800/80 pt-3 text-xs">
              <div className="rounded-xl border border-zinc-800/60 bg-black/40 p-3">
                <span className="block text-[10px] font-black uppercase tracking-wider text-zinc-500">
                  Investissement
                </span>
                <span className="mt-0.5 block text-sm font-black tabular-nums text-white">
                  {investedValue.toFixed(2)} €
                </span>
              </div>
              <div className="rounded-xl border border-zinc-800/60 bg-black/40 p-3">
                <span className="block text-[10px] font-black uppercase tracking-wider text-zinc-500">
                  Profit Net
                </span>
                <span className={`mt-0.5 block text-sm font-black tabular-nums ${profitValue >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {profitValue >= 0 ? "+" : ""}{profitValue.toFixed(2)} €
                </span>
              </div>
            </div>
          </section>

          {/* KPI */}
          <section className="grid grid-cols-2 gap-3">
            <div className="flex min-h-[95px] flex-col justify-between rounded-xl border border-zinc-900 bg-neutral-900/40 p-4">
              <div className="flex items-start justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500">
                  Valeur actuelle
                </span>
                <Wallet className="h-4 w-4 text-cyan-400" />
              </div>
              <div className="mt-2 text-lg font-black tabular-nums text-white">
                {portfolioValue.toFixed(2)} €
              </div>
            </div>

            <div className="flex min-h-[95px] flex-col justify-between rounded-xl border border-zinc-900 bg-neutral-900/40 p-4">
              <div className="flex items-start justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500">
                  Rendement global
                </span>
                <TrendingUp className="h-4 w-4 text-cyan-400" />
              </div>
              <div className={`mt-2 text-lg font-black tabular-nums ${isRoiPositive ? "text-emerald-400" : "text-rose-400"}`}>
                {isRoiPositive ? "+" : ""}{roi.toFixed(2)} %
              </div>
            </div>

            <div className="flex min-h-[95px] flex-col justify-between rounded-xl border border-zinc-900 bg-neutral-900/40 p-4">
              <div className="flex items-start justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500">
                  Score stratégique
                </span>
                <Zap className="h-4 w-4 text-cyan-400" />
              </div>
              <div className="mt-2 text-lg font-black tabular-nums text-white">
                {averageScore.toFixed(1)}
                <span className="ml-1 text-[10px] font-bold uppercase text-zinc-500">/ 10</span>
              </div>
            </div>

            <div className="flex min-h-[95px] flex-col justify-between rounded-xl border border-zinc-900 bg-neutral-900/40 p-4">
              <div className="flex items-start justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500">
                  Actif phare
                </span>
                <Trophy className="h-4 w-4 text-cyan-400" />
              </div>
              <div className="mt-2 truncate text-xs font-bold text-white">
                {bestCard ? bestCard.name : <span className="font-medium italic text-zinc-600">Aucun actif</span>}
              </div>
            </div>
          </section>

          {/* Analyses */}
          <div className="space-y-4 pt-2">
            <h2 className="flex items-center gap-1.5 px-1 text-[10px] font-black uppercase tracking-widest text-zinc-500">
              <BarChart3 className="h-3.5 w-3.5 text-cyan-400" />
              Fluctuations & Analyses de Marché
            </h2>
            <div className="space-y-4">
              <PortfolioChart />
              <TopMovers />
            </div>
            <div className="space-y-3">
              <RecentAcquisitions cards={cards} />
              <div className="grid gap-3">
                {bestCard && (
                  <div className="flex items-center justify-between rounded-xl border border-zinc-900 bg-neutral-900/40 p-3.5">
                    <div>
                      <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-emerald-400">
                        <Trophy className="h-3 w-3" />
                        Plus fort potentiel
                      </span>
                      <h3 className="mt-0.5 truncate text-xs font-bold text-white">
                        {bestCard.name}
                      </h3>
                    </div>
                  </div>
                )}
                {worstCard && (
                  <div className="flex items-center justify-between rounded-xl border border-zinc-900 bg-neutral-900/40 p-3.5">
                    <div>
                      <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-rose-400">
                        <ShieldAlert className="h-3 w-3" />
                        Actif à surveiller
                      </span>
                      <h3 className="mt-0.5 truncate text-xs font-bold text-white">
                        {worstCard.name}
                      </h3>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Inventaire */}
          <div className="space-y-4 pt-2">
            <h2 className="flex items-center gap-1.5 px-1 text-[10px] font-black uppercase tracking-widest text-zinc-500">
              <Package className="h-3.5 w-3.5 text-cyan-400" />
              Inventaire des Actifs ({cards.length})
            </h2>
            <div className="space-y-2.5">
              {cards.length === 0 ? (
                <div className="rounded-xl border border-zinc-900 bg-neutral-900/40 p-6 text-center">
                  <Package className="mx-auto mb-2 h-6 w-6 text-zinc-700" />
                  <p className="text-xs font-bold text-zinc-500">
                    Aucune carte dans ta collection.
                  </p>
                  <p className="mt-1 text-[10px] text-zinc-700">
                    Ajoute des cartes via le scanner V5 ou la recherche.
                  </p>
                </div>
              ) : (
                cards.map((card) => {
                  const isExpanded = expandedCardId === card.id;
                  const marketData = getMarketData(card);
                  const buyPrice = getBuyPrice(card.id);
                  const netProfit = marketData.average * card.qty - buyPrice * card.qty;
                  const isProfitPositive = netProfit >= 0;

                  return (
                    <div
                      key={card.id}
                      className={`rounded-xl border border-zinc-900 bg-neutral-900/40 transition-all duration-200 ${
                        isExpanded
                          ? "border-cyan-500/30 bg-neutral-900/80 p-4 shadow-lg shadow-cyan-500/5"
                          : "p-3.5 hover:border-zinc-800"
                      }`}
                    >
                      <div
                        onClick={() => toggleDetails(card.id)}
                        className="flex cursor-pointer select-none items-center justify-between gap-3"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-10 w-7 shrink-0 items-center justify-center overflow-hidden rounded border border-zinc-800 bg-black p-0.5">
                            <img
                              src={card.images.small}
                              alt={card.name}
                              className="h-full object-contain"
                            />
                          </div>
                          <div className="min-w-0">
                            <h3 className="truncate text-xs font-bold tracking-tight text-white">
                              {card.name}
                            </h3>
                            <p className="mt-0.5 text-[10px] font-medium tabular-nums text-zinc-400">
                              Unit. : {marketData.average.toFixed(2)} €
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-zinc-400">
                          <span className="rounded border border-zinc-800 bg-black/60 px-2 py-0.5 text-[10px] font-black tabular-nums text-cyan-400">
                            x{card.qty}
                          </span>
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-cyan-400" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-zinc-600" />
                          )}
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="mt-3.5 border-t border-zinc-800/80 pt-3.5">
                          <div className="grid grid-cols-3 gap-2 text-[10px]">
                            <div className="rounded-lg border border-zinc-800/60 bg-black/60 p-2.5 text-center">
                              <span className="block font-medium uppercase tracking-wider text-zinc-500">
                                Achat
                              </span>
                              <span className="mt-1 block font-bold tabular-nums text-zinc-300">
                                {buyPrice.toFixed(2)} €
                              </span>
                            </div>
                            <div className="rounded-lg border border-zinc-800/60 bg-black/60 p-2.5 text-center">
                              <span className="block font-medium uppercase tracking-wider text-zinc-500">
                                Actuelle
                              </span>
                              <span className="mt-1 block font-bold tabular-nums text-white">
                                {(marketData.average * card.qty).toFixed(2)} €
                              </span>
                            </div>
                            <div className="rounded-lg border border-zinc-800/60 bg-black/60 p-2.5 text-center">
                              <span className="block font-medium uppercase tracking-wider text-zinc-500">
                                Profit Net
                              </span>
                              <span className={`mt-1 block font-black tabular-nums ${isProfitPositive ? "text-emerald-400" : "text-rose-400"}`}>
                                {isProfitPositive ? "+" : ""}{netProfit.toFixed(2)} €
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
