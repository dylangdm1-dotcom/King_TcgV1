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
  getCondition,
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
  condition: string;
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

  // =====================================================
  // 📊 CHARGEMENT DU DASHBOARD
  // =====================================================

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
          const card = await getCardById(id);

          if (!card) return null;

          const entry = collection[id];

          const qty =
            typeof entry === "number"
              ? entry
              : (entry as any)?.quantity || 0;

          const condition = getCondition(id);

          return {
            ...card,
            qty,
            condition,
            history: getMarketHistory(id),
          };
        })
      );

      const valid = results.filter(Boolean) as CardWithMeta[];

      setCards(valid);

      // =====================================================
      // 💰 VALEUR RÉELLE DU PORTEFEUILLE V5
      // =====================================================
      //
      // IMPORTANT :
      // - aucun coefficient de condition
      // - aucun prix estimé
      // - aucun prix basé sur la rareté
      // - aucun getAdjustedPriceByCondition()
      //
      // Le prix utilisé est le vrai prix minimum
      // disponible dans les sources V5 pour la condition.
      //
      // =====================================================

      let invested = 0;
      let currentPortfolio = 0;

      valid.forEach((card) => {
        const market = getMarketData(
          card,
          card.condition
        );

        const currentPrice =
          market.lowestPrice;

        invested +=
          getBuyPrice(card.id) *
          card.qty;

        currentPortfolio +=
          currentPrice *
          card.qty;
      });

      setInvestedValue(invested);
      setPortfolioValue(currentPortfolio);
      setProfitValue(
        currentPortfolio - invested
      );

      // =====================================================
      // 🧠 MEILLEUR / PIRE ACTIF
      // =====================================================

      let best: CardWithMeta | null = null;
      let worst: CardWithMeta | null = null;

      valid.forEach((card) => {
        const score = getInvestmentScore(
          card,
          card.history,
          card.condition
        );

        if (
          !best ||
          score >
            getInvestmentScore(
              best,
              best.history,
              best.condition
            )
        ) {
          best = card;
        }

        if (
          !worst ||
          score <
            getInvestmentScore(
              worst,
              worst.history,
              worst.condition
            )
        ) {
          worst = card;
        }
      });

      setBestCard(best);
      setWorstCard(worst);
    } catch (error) {
      console.error(
        "[King_TCG] Erreur rafraîchissement dashboard V5 :",
        error
      );
    }
  };

  // =====================================================
  // 🔄 RAFRAÎCHISSEMENT
  // =====================================================

  useEffect(() => {
    loadDashboardData();

    const refresh = () => {
      loadDashboardData();
    };

    window.addEventListener(
      "king_tcg_update",
      refresh
    );

    return () => {
      window.removeEventListener(
        "king_tcg_update",
        refresh
      );
    };
  }, []);

  // =====================================================
  // 📊 KPI
  // =====================================================

  const averageScore =
    cards.length > 0
      ? cards.reduce(
          (sum, card) =>
            sum +
            getInvestmentScore(
              card,
              card.history,
              card.condition
            ),
          0
        ) / cards.length
      : 0;

  const roi =
    investedValue > 0
      ? ((portfolioValue - investedValue) /
          investedValue) *
        100
      : 0;

  const isRoiPositive = roi >= 0;

  // =====================================================
  // 🔽 DÉTAILS CARTE
  // =====================================================

  const toggleDetails = (id: string) => {
    setExpandedCardId(
      expandedCardId === id
        ? null
        : id
    );
  };

  // =====================================================
  // 📥 IMPORT JSON
  // =====================================================

  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = (event) => {
      const content =
        event.target?.result as string;

      if (content) {
        const success =
          importBackup(
            content,
            "merge"
          );

        if (success) {
          setImportStatus(
            "Sauvegarde importée et fusionnée avec succès !"
          );

          loadDashboardData();
        } else {
          setImportStatus(
            "Erreur : Fichier de sauvegarde invalide."
          );
        }

        setTimeout(
          () =>
            setImportStatus(null),
          4000
        );
      }
    };

    reader.readAsText(file);

    // Permet de réimporter ensuite
    // le même fichier si nécessaire.
    e.target.value = "";
  };

  // =====================================================
  // 🖥️ UI
  // =====================================================

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-neutral-950 text-white pb-32 selection:bg-cyan-500/20">
        <div className="mx-auto max-w-xl space-y-5 px-4 py-5">

          {/* Navigation & Outils de sauvegarde */}
          <div className="flex items-center justify-between">
            <BackButton />

            <div className="flex items-center gap-2">
              <button
                onClick={exportBackup}
                className="flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-neutral-900 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-zinc-300 hover:border-cyan-500/50 hover:text-cyan-400 transition-all active:scale-[0.98]"
                title="Exporter une sauvegarde"
              >
                <Download className="w-3.5 h-3.5 text-cyan-400" />
                Exporter
              </button>

              <button
                onClick={() =>
                  fileInputRef.current?.click()
                }
                className="flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-neutral-900 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-zinc-300 hover:border-cyan-500/50 hover:text-cyan-400 transition-all active:scale-[0.98]"
                title="Importer un fichier de sauvegarde JSON"
              >
                <Upload className="w-3.5 h-3.5 text-cyan-400" />
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

          {/* Feedback Import */}
          {importStatus && (
            <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/20 p-3 text-center text-xs font-bold text-cyan-400 animate-fadeIn">
              {importStatus}
            </div>
          )}

          {/* En-tête du Portefeuille */}
          <section className="rounded-2xl border border-zinc-900 bg-neutral-900/40 p-4 sm:p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[9px] font-black uppercase tracking-widest">
                <Sparkles className="w-3 h-3" />
                Suivi Live V5
              </div>

              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                {cards.length}{" "}
                {cards.length > 1
                  ? "actifs"
                  : "actif"}
              </span>
            </div>

            <div>
              <h1 className="text-lg font-black uppercase tracking-tight text-white">
                Tableau de bord
              </h1>

              <p className="text-[11px] text-zinc-400 mt-0.5">
                Pilote la valeur de ton investissement et surveille les tendances du marché.
              </p>
            </div>

            {/* Total Investi & Profit Net */}
            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-zinc-800/80 text-xs">
              <div className="bg-black/40 rounded-xl p-3 border border-zinc-800/60">
                <span className="text-zinc-500 text-[10px] block font-black uppercase tracking-wider">
                  Investissement
                </span>

                <span className="font-black text-white text-sm tabular-nums mt-0.5 block">
                  {investedValue.toFixed(2)} €
                </span>
              </div>

              <div className="bg-black/40 rounded-xl p-3 border border-zinc-800/60">
                <span className="text-zinc-500 text-[10px] block font-black uppercase tracking-wider">
                  Profit Net
                </span>

                <span
                  className={`font-black text-sm tabular-nums mt-0.5 block ${
                    profitValue >= 0
                      ? "text-emerald-400"
                      : "text-rose-400"
                  }`}
                >
                  {profitValue >= 0
                    ? "+"
                    : ""}
                  {profitValue.toFixed(2)} €
                </span>
              </div>
            </div>
          </section>

          {/* Métriques KPI Mobile-First */}
          <section className="grid gap-3 grid-cols-2">

            <div className="rounded-xl border border-zinc-900 bg-neutral-900/40 p-4 flex flex-col justify-between min-h-[95px]">
              <div className="flex justify-between items-start">
                <span className="text-zinc-500 text-[10px] font-black uppercase tracking-wider">
                  Valeur Actuelle
                </span>

                <Wallet className="w-4 h-4 text-cyan-400" />
              </div>

              <div className="text-lg font-black text-white tabular-nums mt-2">
                {portfolioValue.toFixed(2)} €
              </div>
            </div>

            <div className="rounded-xl border border-zinc-900 bg-neutral-900/40 p-4 flex flex-col justify-between min-h-[95px]">
              <div className="flex justify-between items-start">
                <span className="text-zinc-500 text-[10px] font-black uppercase tracking-wider">
                  Rendement Global
                </span>

                <TrendingUp className="w-4 h-4 text-cyan-400" />
              </div>

              <div
                className={`text-lg font-black tabular-nums mt-2 ${
                  isRoiPositive
                    ? "text-emerald-400"
                    : "text-rose-400"
                }`}
              >
                {isRoiPositive
                  ? "+"
                  : ""}
                {roi.toFixed(2)} %
              </div>
            </div>

            <div className="rounded-xl border border-zinc-900 bg-neutral-900/40 p-4 flex flex-col justify-between min-h-[95px]">
              <div className="flex justify-between items-start">
                <span className="text-zinc-500 text-[10px] font-black uppercase tracking-wider">
                  Score Stratégique
                </span>

                <Zap className="w-4 h-4 text-cyan-400" />
              </div>

              <div className="text-lg font-black text-white tabular-nums mt-2">
                {averageScore.toFixed(1)}{" "}
                <span className="text-[10px] text-zinc-500 font-bold uppercase">
                  / 10
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-zinc-900 bg-neutral-900/40 p-4 flex flex-col justify-between min-h-[95px]">
              <div className="flex justify-between items-start">
                <span className="text-zinc-500 text-[10px] font-black uppercase tracking-wider">
                  Actif Phare
                </span>

                <Trophy className="w-4 h-4 text-cyan-400" />
              </div>

              <div className="text-xs font-bold text-white truncate mt-2">
                {bestCard ? (
                  bestCard.name
                ) : (
                  <span className="text-zinc-600 font-medium italic">
                    Aucun actif
                  </span>
                )}
              </div>
            </div>

          </section>

          {/* Analyses & Graphiques */}
          <div className="space-y-4 pt-2">
            <h2 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 px-1 flex items-center gap-1.5">
              <BarChart3 className="w-3.5 h-3.5 text-cyan-400" />
              Fluctuations & Analyses de Marché
            </h2>

            <div className="space-y-4">
              <PortfolioChart />
              <TopMovers />
            </div>

            <div className="space-y-3">
              <RecentAcquisitions
                cards={cards}
              />

              <div className="grid gap-3">

                {bestCard && (
                  <div className="rounded-xl border border-zinc-900 bg-neutral-900/40 p-3.5 flex items-center justify-between">
                    <div>
                      <span className="text-[9px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                        <Trophy className="w-3 h-3" />
                        Plus fort potentiel
                      </span>

                      <h3 className="font-bold text-xs text-white truncate mt-0.5">
                        {bestCard.name}
                      </h3>
                    </div>
                  </div>
                )}

                {worstCard && (
                  <div className="rounded-xl border border-zinc-900 bg-neutral-900/40 p-3.5 flex items-center justify-between">
                    <div>
                      <span className="text-[9px] font-black uppercase tracking-wider text-rose-400 flex items-center gap-1">
                        <ShieldAlert className="w-3 h-3" />
                        Actif à surveiller
                      </span>

                      <h3 className="font-bold text-xs text-white truncate mt-0.5">
                        {worstCard.name}
                      </h3>
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>

          {/* Inventaire détaillé */}
          <div className="space-y-4 pt-2">
            <h2 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 px-1 flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-cyan-400" />
              Inventaire des Actifs ({cards.length})
            </h2>

            <div className="space-y-2.5">

              {cards.map((card) => {
                const isExpanded =
                  expandedCardId ===
                  card.id;

                // =====================================================
                // 💰 PRIX V5 RÉEL
                // =====================================================
                //
                // On demande explicitement le marché pour la
                // condition de cette carte.
                //
                // lowestPrice = prix réel le moins cher parmi
                // les sources réellement disponibles.
                //
                // Aucun coefficient de condition.
                //
                // =====================================================

                const marketData =
                  getMarketData(
                    card,
                    card.condition
                  );

                const currentPrice =
                  marketData.lowestPrice;

                const buyPrice =
                  getBuyPrice(card.id);

                const netProfit =
                  currentPrice *
                    card.qty -
                  buyPrice *
                    card.qty;

                const isProfitPositive =
                  netProfit >= 0;

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
                      onClick={() =>
                        toggleDetails(
                          card.id
                        )
                      }
                      className="cursor-pointer flex items-center justify-between gap-3 select-none"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-10 w-7 shrink-0 overflow-hidden rounded bg-black p-0.5 flex items-center justify-center border border-zinc-800">
                          <img
                            src={
                              card.images
                                .small
                            }
                            alt={
                              card.name
                            }
                            className="h-full object-contain"
                          />
                        </div>

                        <div className="min-w-0">
                          <h3 className="font-bold text-xs text-white truncate tracking-tight">
                            {card.name}
                          </h3>

                          <p className="text-[10px] text-zinc-400 font-medium mt-0.5 tabular-nums">
                            Unit. :{" "}
                            {currentPrice.toFixed(
                              2
                            )}{" "}
                            €
                            {" · "}
                            {
                              card.condition
                            }
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-zinc-400">
                        <span className="text-[10px] font-black px-2 py-0.5 bg-black/60 border border-zinc-800 rounded text-cyan-400 tabular-nums">
                          x{card.qty}
                        </span>

                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-cyan-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-zinc-600" />
                        )}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="mt-3.5 pt-3.5 border-t border-zinc-800/80">

                        <div className="grid grid-cols-3 gap-2 text-[10px]">

                          <div className="bg-black/60 rounded-lg p-2.5 border border-zinc-800/60 text-center">
                            <span className="text-zinc-500 font-medium block uppercase tracking-wider">
                              Achat
                            </span>

                            <span className="text-zinc-300 font-bold mt-1 block tabular-nums">
                              {buyPrice.toFixed(
                                2
                              )}{" "}
                              €
                            </span>
                          </div>

                          <div className="bg-black/60 rounded-lg p-2.5 border border-zinc-800/60 text-center">
                            <span className="text-zinc-500 font-medium block uppercase tracking-wider">
                              Actuelle
                            </span>

                            <span className="text-white font-bold mt-1 block tabular-nums">
                              {(
                                currentPrice *
                                card.qty
                              ).toFixed(
                                2
                              )}{" "}
                              €
                            </span>
                          </div>

                          <div className="bg-black/60 rounded-lg p-2.5 border border-zinc-800/60 text-center">
                            <span className="text-zinc-500 font-medium block uppercase tracking-wider">
                              Profit Net
                            </span>

                            <span
                              className={`font-black mt-1 block tabular-nums ${
                                isProfitPositive
                                  ? "text-emerald-400"
                                  : "text-rose-400"
                              }`}
                            >
                              {isProfitPositive
                                ? "+"
                                : ""}
                              {netProfit.toFixed(
                                2
                              )}{" "}
                              €
                            </span>
                          </div>

                        </div>

                        {/* Informations V5 */}
                        <div className="mt-2 grid grid-cols-2 gap-2 text-[10px]">

                          <div className="bg-black/40 rounded-lg p-2 border border-zinc-800/50">
                            <span className="text-zinc-600 font-medium block uppercase tracking-wider">
                              État
                            </span>

                            <span className="text-zinc-300 font-bold mt-0.5 block">
                              {
                                card.condition
                              }
                            </span>
                          </div>

                          <div className="bg-black/40 rounded-lg p-2 border border-zinc-800/50">
                            <span className="text-zinc-600 font-medium block uppercase tracking-wider">
                              Sources
                            </span>

                            <span className="text-cyan-400 font-bold mt-0.5 block">
                              {
                                marketData.sourceCount
                              }{" "}
                              source
                              {marketData.sourceCount >
                              1
                                ? "s"
                                : ""}
                            </span>
                          </div>

                        </div>

                      </div>
                    )}
                  </div>
                );
              })}

              {cards.length === 0 && (
                <div className="rounded-xl border border-zinc-900 bg-neutral-900/40 p-8 text-center">
                  <Package className="w-8 h-8 text-zinc-700 mx-auto mb-3" />

                  <p className="text-xs font-bold text-zinc-500">
                    Aucun actif dans ton portefeuille.
                  </p>

                  <p className="text-[10px] text-zinc-700 mt-1">
                    Ajoute des cartes depuis la section Scanner ou Recherche.
                  </p>
                </div>
              )}

            </div>
          </div>

        </div>
      </main>
    </>
  );
}