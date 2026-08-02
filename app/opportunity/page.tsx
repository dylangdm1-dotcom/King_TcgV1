"use client";

import { useEffect, useState } from "react";

import Navbar from "../../components/Navbar";

import { getCollection } from "@/lib/storage";
import { getCardById } from "../../lib/pokemon";
import {
  rankPortfolio,
  type Opportunity,
} from "../../lib/opportunity";
import { getMarketHistory } from "../../lib/priceHistory";
import { getAlerts } from "../../lib/alertEngine";

import type { PokemonCard } from "../../lib/types";

// =====================================================
// TYPES
// =====================================================

type PortfolioCard = {
  card: PokemonCard;
  history: ReturnType<typeof getMarketHistory>;
};

// =====================================================
// PAGE
// =====================================================

export default function OpportunityPage() {
  const [loading, setLoading] = useState(true);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [alerts, setAlerts] = useState<ReturnType<typeof getAlerts>>([]);

  // =====================================================
  // LOAD PORTFOLIO
  // =====================================================

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);

      try {
        const collection = getCollection();
        const ids = Object.keys(collection);

        if (ids.length === 0) {
          if (!cancelled) {
            setOpportunities([]);
            setAlerts([]);
            setLoading(false);
          }

          return;
        }

        const results = await Promise.all(
          ids.map(async (id): Promise<PortfolioCard | null> => {
            try {
              const card = await getCardById(id);

              if (!card) {
                return null;
              }

              return {
                card,
                history: getMarketHistory(id),
              };
            } catch (error) {
              console.error(
                `[King_TCG] Erreur chargement carte ${id} :`,
                error
              );

              return null;
            }
          })
        );

        if (cancelled) {
          return;
        }

        const portfolio = results.filter(
          (item): item is PortfolioCard => item !== null
        );

        const ranking = rankPortfolio(portfolio);
        const alertList = getAlerts(ranking);

        setOpportunities(ranking);
        setAlerts(alertList);
      } catch (error) {
        console.error(
          "[King_TCG] Erreur analyse opportunités :",
          error
        );

        if (!cancelled) {
          setOpportunities([]);
          setAlerts([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <>
        <Navbar />

        <main className="min-h-screen bg-black text-white pb-20">
          <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
            <div className="h-14 w-full animate-pulse rounded-xl border border-zinc-900/50 bg-neutral-950/40" />

            <div className="h-[85px] w-full animate-pulse rounded-xl border border-zinc-900/50 bg-neutral-950/40" />

            <div className="grid grid-cols-1 gap-3 pt-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="h-[105px] animate-pulse rounded-xl border border-zinc-900/50 bg-neutral-950/40"
                />
              ))}
            </div>
          </div>
        </main>
      </>
    );
  }

  // =====================================================
  // GROUP OPPORTUNITIES
  // =====================================================

  const buy = opportunities.filter(
    (opportunity) => opportunity.recommendation === "BUY"
  );

  const hold = opportunities.filter(
    (opportunity) => opportunity.recommendation === "HOLD"
  );

  const sell = opportunities.filter(
    (opportunity) => opportunity.recommendation === "SELL"
  );

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-black pb-20 text-white selection:bg-cyan-500/10">
        <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">

          {/* =================================================
              HEADER
          ================================================= */}

          <section className="rounded-xl border border-zinc-900 bg-neutral-950/40 p-4 sm:p-5">
            <span className="text-[9px] font-black uppercase tracking-wider text-zinc-500">
              Moteur d&apos;arbitrage
            </span>

            <h1 className="mt-0.5 text-lg font-black uppercase tracking-tight text-white">
              Opportunity Engine
            </h1>
          </section>

          {/* =================================================
              ALERTES
          ================================================= */}

          <section className="space-y-3">
            <div className="border-b border-zinc-900 pb-2">
              <h2 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                Alertes Instantanées
              </h2>
            </div>

            <div className="flex flex-col gap-2">
              {alerts.length === 0 ? (
                <div className="rounded-xl border border-zinc-900 bg-neutral-950/10 p-4 text-xs font-medium italic text-zinc-600">
                  Aucune anomalie ou alerte majeure détectée sur vos actifs
                  actuellement.
                </div>
              ) : (
                alerts.map((alert, index) => {
                  const alertStyles =
                    alert.type === "BUY"
                      ? "border-emerald-500/10 bg-emerald-500/5 text-emerald-400"
                      : alert.type === "SELL"
                        ? "border-rose-500/10 bg-rose-500/5 text-rose-400"
                        : "border-amber-500/10 bg-amber-500/5 text-amber-400";

                  return (
                    <div
                      key={`${alert.type}-${index}`}
                      className={`rounded-xl border p-3 text-xs font-mono font-bold tracking-tight ${alertStyles}`}
                    >
                      {alert.message}
                    </div>
                  );
                })
              )}
            </div>
          </section>

          {/* =================================================
              OPPORTUNITIES
          ================================================= */}

          <div className="space-y-6 pt-2">

            {/* BUY */}

            {buy.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-center gap-2 border-b border-zinc-900 pb-2">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />

                  <h2 className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
                    Signaux d&apos;Achat (BUY)
                  </h2>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {buy.map((opportunity) => (
                    <OpportunityCard
                      key={opportunity.id}
                      op={opportunity}
                      borderClass="border-emerald-500/20"
                      scoreClass="text-emerald-400 bg-emerald-500/5 border-emerald-500/10"
                    />
                  ))}
                </div>
              </section>
            )}

            {/* HOLD */}

            {hold.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-center gap-2 border-b border-zinc-900 pb-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />

                  <h2 className="text-[10px] font-black uppercase tracking-widest text-amber-400">
                    Sous Observation (HOLD)
                  </h2>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {hold.map((opportunity) => (
                    <OpportunityCard
                      key={opportunity.id}
                      op={opportunity}
                      borderClass="border-zinc-900"
                      scoreClass="text-amber-400 bg-amber-500/5 border-amber-500/10"
                    />
                  ))}
                </div>
              </section>
            )}

            {/* SELL */}

            {sell.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-center gap-2 border-b border-zinc-900 pb-2">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-500" />

                  <h2 className="text-[10px] font-black uppercase tracking-widest text-rose-400">
                    Signaux de Vente (SELL)
                  </h2>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {sell.map((opportunity) => (
                    <OpportunityCard
                      key={opportunity.id}
                      op={opportunity}
                      borderClass="border-rose-500/20"
                      scoreClass="text-rose-400 bg-rose-500/5 border-rose-500/10"
                    />
                  ))}
                </div>
              </section>
            )}

            {/* EMPTY */}

            {opportunities.length === 0 && (
              <section className="rounded-xl border border-zinc-900 bg-neutral-950/20 p-8 text-center">
                <p className="text-xs font-black uppercase tracking-wider text-zinc-500">
                  Aucune opportunité disponible
                </p>

                <p className="mt-2 text-[11px] text-zinc-700">
                  Ajoutez des cartes à votre collection pour analyser les
                  opportunités de marché.
                </p>
              </section>
            )}

          </div>
        </div>
      </main>
    </>
  );
}

// =====================================================
// OPPORTUNITY CARD
// =====================================================

function OpportunityCard({
  op,
  borderClass,
  scoreClass,
}: {
  op: Opportunity;
  borderClass: string;
  scoreClass: string;
}) {
  const currentPrice = Number(op.currentPrice);
  const trend = Number(op.trend);
  const score = Number(op.score);

  return (
    <div
      className={`flex min-h-[105px] flex-col justify-between rounded-xl border bg-neutral-950/40 p-4 transition-all ${borderClass}`}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="truncate text-xs font-black uppercase tracking-tight text-white">
          {op.name}
        </h3>

        <span
          className={`shrink-0 rounded border px-1.5 py-0.5 text-[9px] font-black tracking-wider ${scoreClass}`}
        >
          {Number.isFinite(score) ? score : 0}/10
        </span>
      </div>

      <div className="mt-3 space-y-1 border-t border-zinc-900/60 pt-2 text-[11px]">

        {/* PRIX REEL V5 */}

        <div className="flex items-center justify-between">
          <span className="font-medium text-zinc-500">
            Prix actuel V5
          </span>

          <span className="font-bold tabular-nums text-zinc-300">
            {Number.isFinite(currentPrice)
              ? currentPrice.toFixed(2)
              : "0.00"}{" "}
            €
          </span>
        </div>

        {/* TENDANCE */}

        <div className="flex items-center justify-between">
          <span className="font-medium text-zinc-500">
            Tendance
          </span>

          <span
            className={`font-mono font-bold tabular-nums ${
              trend > 0
                ? "text-emerald-400"
                : trend < 0
                  ? "text-rose-400"
                  : "text-zinc-500"
            }`}
          >
            {trend > 0 ? "+" : ""}
            {Number.isFinite(trend) ? trend.toFixed(2) : "0.00"}%
          </span>
        </div>

      </div>
    </div>
  );
}