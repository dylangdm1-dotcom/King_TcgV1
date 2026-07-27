"use client";

import { useEffect, useState } from "react";
import Navbar from "../../components/Navbar";
import { getCollection } from "@/lib/storage"; 
import { getCardById } from "../../lib/pokemon";
import { rankPortfolio, Opportunity } from "../../lib/opportunity";
import { getMarketHistory } from "../../lib/priceHistory";
import { getAlerts } from "../../lib/alertEngine";
import type { PokemonCard as Card } from "../../lib/types";

type PortfolioCard = {
  card: Card;
  history: any[];
};

export default function OpportunityPage() {
  const [loading, setLoading] = useState(true);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [alerts, setAlerts] = useState<ReturnType<typeof getAlerts>>([]);

  useEffect(() => {
    const load = () => {
      setLoading(true);
      try {
        const collection = getCollection();
        const ids = Object.keys(collection);

        Promise.all(
          ids.map(async (id) => {
            try {
              const card = await getCardById(id);
              if (!card) return null;
              return {
                card,
                history: getMarketHistory(id),
              };
            } catch (err) {
              console.error(`[King_TCG] Erreur chargement carte ${id} :`, err);
              return null;
            }
          })
        ).then((results) => {
          const portfolio = results.filter((item): item is PortfolioCard => item !== null);
          const ranking = rankPortfolio(portfolio);
          const alertList = getAlerts(ranking);

          setOpportunities(ranking);
          setAlerts(alertList);
          setLoading(false);
        });
      } catch (error) {
        console.error("[King_TCG] Erreur analyse opportunités :", error);
        setLoading(false);
      }
    };

    load();
  }, []);

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-black text-white pb-20">
          <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
            <div className="h-14 w-full animate-pulse rounded-xl bg-neutral-950/40 border border-zinc-900/50" />
            <div className="h-[85px] w-full animate-pulse rounded-xl bg-neutral-950/40 border border-zinc-900/50" />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 pt-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-[105px] animate-pulse rounded-xl bg-neutral-950/40 border border-zinc-900/50" />
              ))}
            </div>
          </div>
        </main>
      </>
    );
  }

  const buy = opportunities.filter((o) => o.recommendation === "BUY");
  const hold = opportunities.filter((o) => o.recommendation === "HOLD");
  const sell = opportunities.filter((o) => o.recommendation === "SELL");

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-black text-white pb-20 selection:bg-cyan-500/10">
        <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
          
          {/* En-tête Technique */}
          <section className="rounded-xl border border-zinc-900 bg-neutral-950/40 p-4 sm:p-5">
            <span className="text-[9px] font-black uppercase tracking-wider text-zinc-500">Moteur d'arbitrage</span>
            <h1 className="mt-0.5 text-lg font-black uppercase tracking-tight text-white">Opportunity Engine</h1>
          </section>

          {/* Alertes de Marché Uniformisées */}
          <section className="space-y-3">
            <div className="border-b border-zinc-900 pb-2">
              <h2 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Alertes Instantanées</h2>
            </div>
            <div className="flex flex-col gap-2">
              {alerts.length === 0 ? (
                <div className="rounded-xl border border-zinc-900 bg-neutral-950/10 p-4 text-xs text-zinc-600 font-medium italic">
                  Aucune anomalie ou alerte majeure détectée sur vos actifs actuellement.
                </div>
              ) : (
                alerts.map((alert, index) => {
                  const alertStyles = 
                    alert.type === "BUY" ? "border-emerald-500/10 bg-emerald-500/5 text-emerald-400" :
                    alert.type === "SELL" ? "border-rose-500/10 bg-rose-500/5 text-rose-400" :
                    "border-amber-500/10 bg-amber-500/5 text-amber-400";
                  return (
                    <div key={index} className={`rounded-xl border p-3 text-xs font-mono font-bold tracking-tight ${alertStyles}`}>
                      {alert.message}
                    </div>
                  );
                })
              )}
            </div>
          </section>

          {/* Grilles de Signaux d'Arbitrage */}
          <div className="space-y-6 pt-2">
            
            {/* SIGNAL: BUY */}
            {buy.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-center gap-2 border-b border-zinc-900 pb-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <h2 className="text-[10px] font-black tracking-widest uppercase text-emerald-400">Signaux d'Achat (BUY)</h2>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {buy.map((op) => (
                    <OpportunityCard 
                      key={op.id} 
                      op={op} 
                      borderClass="border-emerald-500/20" 
                      scoreClass="text-emerald-400 bg-emerald-500/5 border-emerald-500/10" 
                    />
                  ))}
                </div>
              </section>
            )}

            {/* SIGNAL: HOLD */}
            {hold.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-center gap-2 border-b border-zinc-900 pb-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  <h2 className="text-[10px] font-black tracking-widest uppercase text-amber-400">Sous Observation (HOLD)</h2>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {hold.map((op) => (
                    <OpportunityCard 
                      key={op.id} 
                      op={op} 
                      borderClass="border-zinc-900" 
                      scoreClass="text-amber-400 bg-amber-500/5 border-amber-500/10" 
                    />
                  ))}
                </div>
              </section>
            )}

            {/* SIGNAL: SELL */}
            {sell.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-center gap-2 border-b border-zinc-900 pb-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
                  <h2 className="text-[10px] font-black tracking-widest uppercase text-rose-400">Signaux de Vente (SELL)</h2>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {sell.map((op) => (
                    <OpportunityCard 
                      key={op.id} 
                      op={op} 
                      borderClass="border-rose-500/20" 
                      scoreClass="text-rose-400 bg-rose-500/5 border-rose-500/10" 
                    />
                  ))}
                </div>
              </section>
            )}

          </div>
        </div>
      </main>
    </>
  );
}

function OpportunityCard({ op, borderClass, scoreClass }: { op: Opportunity; borderClass: string; scoreClass: string }) {
  return (
    <div className={`rounded-xl border bg-neutral-950/40 p-4 flex flex-col justify-between min-h-[105px] transition-all ${borderClass}`}>
      <div className="flex items-start justify-between gap-2">
        <h3 className="truncate text-xs font-black text-white uppercase tracking-tight">
          {op.name}
        </h3>
        <span className={`shrink-0 rounded text-[9px] font-black tracking-wider px-1.5 py-0.5 border ${scoreClass}`}>
          {op.score}/10
        </span>
      </div>

      <div className="mt-3 space-y-1 border-t border-zinc-900/60 pt-2 text-[11px]">
        <div className="flex justify-between items-center">
          <span className="text-zinc-500 font-medium">Cours actuel</span>
          <span className="font-bold text-zinc-300 tabular-nums">{op.currentPrice.toFixed(2)} €</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-zinc-500 font-medium">Tendance</span>
          <span className={`font-mono font-bold tabular-nums ${op.trend > 0 ? "text-emerald-400" : op.trend < 0 ? "text-rose-400" : "text-zinc-500"}`}>
            {op.trend > 0 ? "+" : ""}{op.trend.toFixed(2)}%
          </span>
        </div>
      </div>
    </div>
  );
}