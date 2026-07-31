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
  BrainCircuit,
  ShieldCheck
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

          return {
            ...card,
            qty: collection[id],
            history: getMarketHistory(id)
          };
        })
      );

      const valid = results.filter(Boolean) as unknown as CardWithMeta[];
      setCards(valid);

      let invested = 0;
      let currentPortfolio = 0;

      valid.forEach(card => {
        const market = getMarketData(card);
        invested += getBuyPrice(card.id) * card.qty;
        currentPortfolio += market.average * card.qty;
      });

      setInvestedValue(invested);
      setPortfolioValue(currentPortfolio);
      setProfitValue(currentPortfolio - invested);

      let best: CardWithMeta | null = null;
      let worst: CardWithMeta | null = null;

      valid.forEach(card => {
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
      console.error("[King_TCG] Erreur dashboard V5 :", error);
    }
  };

  useEffect(() => {
    loadDashboardData();

    const refresh = () => loadDashboardData();

    window.addEventListener("king_tcg_update", refresh);

    return () => {
      window.removeEventListener("king_tcg_update", refresh);
    };
  }, []);

  const averageScore = cards.length > 0
    ? cards.reduce((sum, card) => sum + getInvestmentScore(card, card.history), 0) / cards.length
    : 0;

  const roi = investedValue > 0
    ? ((portfolioValue - investedValue) / investedValue) * 100
    : 0;

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

      if (content) {
        const success = importBackup(content, "merge");

        if (success) {
          setImportStatus("Sauvegarde King_TCG V5.0 importée avec succès.");
          loadDashboardData();
        } else {
          setImportStatus("Erreur : fichier de sauvegarde invalide.");
        }

        setTimeout(() => setImportStatus(null), 4000);
      }
    };

    reader.readAsText(file);
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-neutral-950 text-white pb-32 selection:bg-cyan-500/20">
        <div className="mx-auto max-w-xl space-y-5 px-4 py-5">
          {/* Navigation & Sauvegarde */}
          <div className="flex items-center justify-between">
            <BackButton />
            <div className="flex items-center gap-2">
              <button
                onClick={exportBackup}
                className="flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-neutral-900 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-zinc-300 hover:border-cyan-500/50 hover:text-cyan-400 transition-all active:scale-[0.98]"
              >
                <Download className="w-3.5 h-3.5 text-cyan-400" />
                Exporter
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-neutral-900 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-zinc-300 hover:border-cyan-500/50 hover:text-cyan-400 transition-all active:scale-[0.98]"
              >
                <Upload className="w-3.5 h-3.5 text-cyan-400" />
                Importer
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          </div>

          {importStatus && (
            <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/20 p-3 text-center text-xs font-bold text-cyan-400">
              {importStatus}
            </div>
          )}

          {/* Header Dashboard V5 */}
          <section className="rounded-2xl border border-zinc-900 bg-neutral-900/40 p-4 sm:p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[9px] font-black uppercase tracking-widest">
                <Sparkles className="w-3 h-3" />
                King_TCG Dashboard v5.0
              </div>
              <span className="text-[10px] text-zinc-500 font-bold uppercase">
                {cards.length} actif(s)
              </span>
            </div>

            <div>
              <h1 className="text-lg font-black uppercase tracking-tight text-white">
                Tableau de bord Portfolio
              </h1>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Analysez la valeur de votre collection, les tendances du marché et vos performances d'investissement.
              </p>
            </div>

            {/* Modules actifs V5 */}
            <div className="grid grid-cols-2 gap-2 pt-2">
              <div className="rounded-xl bg-black/40 border border-zinc-800 p-3">
                <div className="flex items-center gap-1.5 text-[9px] font-black uppercase text-zinc-500">
                  <BrainCircuit className="w-3.5 h-3.5 text-cyan-400" />
                  Market Engine
                </div>
                <p className="text-[10px] font-bold text-cyan-400 mt-1">Actif</p>
              </div>
              <div className="rounded-xl bg-black/40 border border-zinc-800 p-3">
                <div className="flex items-center gap-1.5 text-[9px] font-black uppercase text-zinc-500">
                  <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                  Protection
                </div>
                <p className="text-[10px] font-bold text-cyan-400 mt-1">Local sécurisé</p>
              </div>
            </div>

            {/* Investissement / Profit */}
            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-zinc-800/80">
              <div className="bg-black/40 rounded-xl p-3 border border-zinc-800/60">
                <span className="text-zinc-500 text-[10px] block font-black uppercase">
                  Investissement
                </span>
                <span className="font-black text-white text-sm block mt-1">
                  {investedValue.toFixed(2)} €
                </span>
              </div>
              <div className="bg-black/40 rounded-xl p-3 border border-zinc-800/60">
                <span className="text-zinc-500 text-[10px] block font-black uppercase">
                  Profit Net
                </span>
                <span className={`font-black text-sm block mt-1 ${profitValue >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {profitValue >= 0 ? "+" : ""}{profitValue.toFixed(2)} €
                </span>
              </div>
            </div>
          </section>

          {/* KPI */}
          <section className="grid gap-3 grid-cols-2">
            <DashboardStat
              icon={<Wallet className="w-4 h-4 text-cyan-400" />}
              title="Valeur actuelle"
              value={`${portfolioValue.toFixed(2)} €`}
            />
            <DashboardStat
              icon={<TrendingUp className="w-4 h-4 text-cyan-400" />}
              title="Rendement Global"
              value={`${isRoiPositive ? "+" : ""}${roi.toFixed(2)} %`}
            />
            <DashboardStat
              icon={<Zap className="w-4 h-4 text-cyan-400" />}
              title="Score Stratégique"
              value={`${averageScore.toFixed(1)} / 10`}
            />
            <DashboardStat
              icon={<Trophy className="w-4 h-4 text-cyan-400" />}
              title="Actif Phare"
              value={bestCard ? bestCard.name : "Aucun"}
            />
          </section>

          {/* Graphiques */}
          <div className="space-y-4 pt-2">
            <h2 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 px-1 flex items-center gap-1.5">
              <BarChart3 className="w-3.5 h-3.5 text-cyan-400" />
              Intelligence Marché & Analyses V5
            </h2>
            <PortfolioChart />
            <TopMovers />
            <RecentAcquisitions cards={cards} />
          </div>

          {/* Analyse actifs */}
          <div className="space-y-3">
            {bestCard && (
              <div className="rounded-xl border border-zinc-900 bg-neutral-900/40 p-3.5">
                <span className="text-[9px] font-black uppercase text-emerald-400 flex gap-1 items-center">
                  <Trophy className="w-3 h-3" />
                  Meilleur potentiel
                </span>
                <p className="text-xs font-bold mt-1">{bestCard.name}</p>
              </div>
            )}
            {worstCard && (
              <div className="rounded-xl border border-zinc-900 bg-neutral-900/40 p-3.5">
                <span className="text-[9px] font-black uppercase text-rose-400 flex gap-1 items-center">
                  <ShieldAlert className="w-3 h-3" />
                  À surveiller
                </span>
                <p className="text-xs font-bold mt-1">{worstCard.name}</p>
              </div>
            )}
          </div>

          {/* Inventaire complet conservé */}
          <div className="space-y-4 pt-2">
            <h2 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 px-1 flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-cyan-400" />
              Inventaire Collection V5 ({cards.length})
            </h2>

            <div className="space-y-2.5">
              {cards.map((card) => {
                const expanded = expandedCardId === card.id;
                const marketData = getMarketData(card);
                const buyPrice = getBuyPrice(card.id);
                const netProfit = (marketData.average * card.qty) - (buyPrice * card.qty);

                return (
                  <div key={card.id} className="rounded-xl border border-zinc-900 bg-neutral-900/40 p-3.5">
                    <div
                      onClick={() => toggleDetails(card.id)}
                      className="cursor-pointer flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={card.images.small}
                          alt={card.name}
                          className="h-10 w-7 rounded object-contain bg-black border border-zinc-800"
                        />
                        <div>
                          <h3 className="text-xs font-bold">{card.name}</h3>
                          <p className="text-[10px] text-zinc-500">
                            x{card.qty} • {marketData.average.toFixed(2)} €
                          </p>
                        </div>
                      </div>
                      {expanded ? (
                        <ChevronUp className="w-4 h-4 text-cyan-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-zinc-500" />
                      )}
                    </div>

                    {expanded && (
                      <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-zinc-800">
                        <MiniValue title="Achat" value={`${buyPrice.toFixed(2)} €`} />
                        <MiniValue title="Actuel" value={`${(marketData.average * card.qty).toFixed(2)} €`} />
                        <MiniValue title="Profit" value={`${netProfit >= 0 ? "+" : ""}${netProfit.toFixed(2)} €`} />
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

function DashboardStat({ icon, title, value }: any) {
  return (
    <div className="rounded-xl border border-zinc-900 bg-neutral-900/40 p-4">
      <div className="flex justify-between">
        <span className="text-[10px] font-black uppercase text-zinc-500">{title}</span>
        {icon}
      </div>
      <p className="mt-2 text-lg font-black">{value}</p>
    </div>
  );
}

function MiniValue({ title, value }: any) {
  return (
    <div className="rounded-lg bg-black/50 border border-zinc-800 p-2 text-center">
      <span className="text-[9px] text-zinc-500 uppercase font-bold">{title}</span>
      <p className="text-xs font-black mt-1">{value}</p>
    </div>
  );
}
