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
  RefreshCw,
  ShieldAlert,
  Coins
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
  importBackup 
} from "../../lib/storage";
import { getCardById } from "../../lib/pokemon";
import { getMarketHistory, type PricePoint } from "../../lib/priceHistory";
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
          const card = await getCardById(id);
          if (!card) return null;
          return { ...card, qty: collection[id], history: getMarketHistory(id) };
        })
      );

      const valid = results.filter(Boolean) as unknown as CardWithMeta[];
      setCards(valid);

      let invested = 0;
      let currentPortfolio = 0;

      valid.forEach((card) => {
        const market = getMarketData(card);
        invested += getBuyPrice(card.id) * card.qty;
        currentPortfolio += market.average * card.qty;
      });

      setInvestedValue(invested);
      setPortfolioValue(currentPortfolio);
      setProfitValue(currentPortfolio - invested);

      let best: CardWithMeta | null = null;
      let worst: CardWithMeta | null = null;
      valid.forEach((card) => {
        const score = getInvestmentScore(card, card.history);
        if (!best || score > getInvestmentScore(best, best.history)) best = card;
        if (!worst || score < getInvestmentScore(worst, worst.history)) worst = card;
      });

      setBestCard(best);
      setWorstCard(worst);
    } catch (error) {
      console.error("[King_TCG] Erreur rafraîchissement dashboard :", error);
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
  
  const toggleDetails = (id: string) => setExpandedCardId(expandedCardId === id ? null : id);

  // Gestion Import JSON
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const success = importBackup(content, "merge");
        if (success) {
          setImportStatus("Sauvegarde importée et fusionnée avec succès !");
          loadDashboardData();
        } else {
          setImportStatus("Erreur : Fichier de sauvegarde invalide.");
        }
        setTimeout(() => setImportStatus(null), 4000);
      }
    };
    reader.readAsText(file);
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-black text-white pb-20 selection:bg-cyan-500/10">
        <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
          
          <div className="flex items-center justify-between">
            <BackButton />
            
            {/* Outils Export / Import de Sauvegarde V3.9 */}
            <div className="flex items-center gap-2">
              <button
                onClick={exportBackup}
                className="flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-neutral-900 px-3 py-1.5 text-[11px] font-bold text-zinc-300 hover:border-cyan-500/50 hover:text-cyan-400 transition-all"
                title="Télécharger une sauvegarde de la collection"
              >
                <Download className="w-3.5 h-3.5" /> Export Backup
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-neutral-900 px-3 py-1.5 text-[11px] font-bold text-zinc-300 hover:border-cyan-500/50 hover:text-cyan-400 transition-all"
                title="Importer un fichier de sauvegarde JSON"
              >
                <Upload className="w-3.5 h-3.5" /> Import
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
            <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/20 p-3 text-center text-xs font-bold text-cyan-400">
              {importStatus}
            </div>
          )}

          {/* En-tête Technique */}
          <section className="rounded-xl border border-zinc-900 bg-neutral-950/40 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[9px] font-black uppercase tracking-wider text-zinc-500">Dashboard Investissement V3.9</span>
              <h1 className="mt-0.5 text-lg font-black uppercase tracking-tight text-white">Suivi Collection Actif</h1>
            </div>

            {/* Total Investi & Profit Net */}
            <div className="flex items-center gap-4 border-t sm:border-t-0 sm:border-l border-zinc-900 pt-3 sm:pt-0 sm:pl-5 text-xs">
              <div>
                <span className="text-zinc-500 text-[10px] block font-bold uppercase">Investissement</span>
                <span className="font-black text-white tabular-nums">{investedValue.toFixed(2)} €</span>
              </div>
              <div>
                <span className="text-zinc-500 text-[10px] block font-bold uppercase">Profit Net</span>
                <span className={`font-black tabular-nums ${profitValue >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {profitValue >= 0 ? "+" : ""}{profitValue.toFixed(2)} €
                </span>
              </div>
            </div>
          </section>

          {/* Métriques KPI Uniformisées */}
          <section className="grid gap-3 grid-cols-2 lg:grid-cols-4">
            
            <div className="rounded-xl border border-zinc-900 bg-neutral-950/40 p-4 flex flex-col justify-between min-h-[95px]">
              <div className="flex justify-between items-start">
                <span className="text-zinc-500 text-[10px] font-black uppercase tracking-wider">Valeur Actuelle</span>
                <Wallet className="w-3.5 h-3.5 text-cyan-400" />
              </div>
              <div className="text-xl font-black text-white tabular-nums mt-2">{portfolioValue.toFixed(2)} €</div>
            </div>

            <div className="rounded-xl border border-zinc-900 bg-neutral-950/40 p-4 flex flex-col justify-between min-h-[95px]">
              <div className="flex justify-between items-start">
                <span className="text-zinc-500 text-[10px] font-black uppercase tracking-wider">Rendement Global</span>
                <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
              </div>
              <div className={`text-xl font-black tabular-nums mt-2 ${isRoiPositive ? "text-emerald-400" : "text-rose-400"}`}>
                {isRoiPositive ? "+" : ""}{roi.toFixed(2)} %
              </div>
            </div>

            <div className="rounded-xl border border-zinc-900 bg-neutral-950/40 p-4 flex flex-col justify-between min-h-[95px]">
              <div className="flex justify-between items-start">
                <span className="text-zinc-500 text-[10px] font-black uppercase tracking-wider">Score Stratégique</span>
                <Zap className="w-3.5 h-3.5 text-cyan-400" />
              </div>
              <div className="text-xl font-black text-white tabular-nums mt-2">
                {averageScore.toFixed(1)} <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-wider">/ 10</span>
              </div>
            </div>

            <div className="rounded-xl border border-zinc-900 bg-neutral-950/40 p-4 flex flex-col justify-between min-h-[95px]">
              <div className="flex justify-between items-start">
                <span className="text-zinc-500 text-[10px] font-black uppercase tracking-wider">Actif Phare</span>
                <Trophy className="w-3.5 h-3.5 text-cyan-400" />
              </div>
              <div className="text-xs font-bold text-white truncate mt-3">
                {bestCard ? bestCard.name : <span className="text-zinc-600 font-medium italic">Indexation vide</span>}
              </div>
            </div>

          </section>

          {/* Blocs d'analyses & Graphiques */}
          <div className="space-y-4">
            <h2 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-1.5">
              <BarChart3 className="w-3.5 h-3.5 text-cyan-400" /> Fluctuations & Courbes d'évolutions
            </h2>
            <div className="grid gap-4 xl:grid-cols-3">
              <div className="xl:col-span-2"><PortfolioChart /></div>
              <TopMovers />
            </div>
            
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <RecentAcquisitions cards={cards} />
              </div>
              <div className="grid gap-3 content-start">
                {bestCard && (
                  <div className="rounded-xl border border-zinc-900 bg-neutral-950/40 p-3.5">
                    <span className="text-[9px] font-black uppercase tracking-wider text-emerald-500 flex items-center gap-1">
                      <Trophy className="w-3 h-3" /> Plus fort potentiel
                    </span>
                    <h3 className="font-bold text-xs text-white truncate mt-0.5">{bestCard.name}</h3>
                  </div>
                )}
                {worstCard && (
                  <div className="rounded-xl border border-zinc-900 bg-neutral-950/40 p-3.5">
                    <span className="text-[9px] font-black uppercase tracking-wider text-rose-500 flex items-center gap-1">
                      <ShieldAlert className="w-3 h-3" /> Alerte volatilité / surveillance
                    </span>
                    <h3 className="font-bold text-xs text-white truncate mt-0.5">{worstCard.name}</h3>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Inventaire détaillé */}
          <div className="space-y-4 pt-2">
            <h2 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-cyan-400" /> Inventaire des Actifs Référencés ({cards.length})
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {cards.map((card) => {
                const isExpanded = expandedCardId === card.id;
                const marketData = getMarketData(card);
                const buyPrice = getBuyPrice(card.id);
                const netProfit = (marketData.average * card.qty) - (buyPrice * card.qty);
                const isProfitPositive = netProfit >= 0;
                
                return (
                  <div 
                    key={card.id} 
                    className={`rounded-xl border border-zinc-900 bg-neutral-950/40 transition-all duration-200 ${
                      isExpanded 
                        ? "col-span-1 md:col-span-2 xl:col-span-3 border-zinc-800 bg-neutral-950/70 p-4" 
                        : "p-3.5 hover:border-zinc-800"
                    }`}
                  >
                    <div 
                      onClick={() => toggleDetails(card.id)} 
                      className="cursor-pointer flex items-center justify-between gap-3 select-none"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-10 w-7 shrink-0 overflow-hidden rounded bg-black p-0.5 flex items-center justify-center border border-zinc-900">
                          <img src={card.images.small} alt={card.name} className="h-full object-contain" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-bold text-xs text-white truncate tracking-tight transition-colors group-hover:text-cyan-400">{card.name}</h3>
                          <p className="text-[10px] text-zinc-500 font-medium mt-0.5 tabular-nums">Unit. : {marketData.average.toFixed(2)} €</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-zinc-400">
                        <span className="text-[10px] font-black px-1.5 py-0.5 bg-neutral-950 border border-zinc-900 rounded text-zinc-300 tabular-nums">x{card.qty}</span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-cyan-400" /> : <ChevronDown className="w-3.5 h-3.5 text-zinc-600" />}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-zinc-900">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px]">
                          <div className="bg-neutral-950/60 rounded-lg p-2.5 border border-zinc-900">
                            <span className="text-zinc-500 font-medium block">Coût d'achat</span>
                            <span className="text-zinc-300 font-bold mt-0.5 block tabular-nums">{buyPrice.toFixed(2)} €</span>
                          </div>
                          <div className="bg-neutral-950/60 rounded-lg p-2.5 border border-zinc-900">
                            <span className="text-zinc-500 font-medium block">Valeur Actuelle</span>
                            <span className="text-white font-bold mt-0.5 block tabular-nums">{(marketData.average * card.qty).toFixed(2)} €</span>
                          </div>
                          <div className="bg-neutral-950/60 rounded-lg p-2.5 border border-zinc-900">
                            <span className="text-zinc-500 font-medium block">Plus-value nette</span>
                            <span className={`font-black mt-0.5 block tabular-nums ${isProfitPositive ? "text-emerald-400" : "text-rose-400"}`}>
                              {isProfitPositive ? "+" : ""}{netProfit.toFixed(2)} €
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </main>
    </>
  );
}
