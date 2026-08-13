"use client";

import { useCallback, useEffect, useState } from "react";
import Navbar from "../../components/Navbar";
import { getCollection, getFavorites } from "@/lib/storage";
import { getCardById } from "../../lib/pokemon";
import {
  rankPortfolio,
  Opportunity,
} from "../../lib/opportunity";
import { getMarketHistoryDays } from "../../lib/priceHistory";
import { getAlerts } from "../../lib/alertEngine";
import { updateSignalSnapshot } from "../../lib/signalSnapshot";
import type { PokemonCard as Card } from "../../lib/types";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  Eye,
  ShoppingCart,
  Sparkles,
  TrendingDown,
  TrendingUp,
  ChevronDown,
  Crown,
} from "lucide-react";

type PortfolioCard = {
  card: Card;
  history: any[];
};

export default function OpportunityPage() {
  const [loading, setLoading] = useState(true);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [alerts, setAlerts] = useState<ReturnType<typeof getAlerts>>([]);

  const loadOpportunityData = useCallback(async () => {
    setLoading(true);

    try {
      const collection = getCollection();
      const favoriteIds = getFavorites();
      const ids = Array.from(new Set([...Object.keys(collection), ...favoriteIds]));

      if (ids.length === 0) {
        setOpportunities([]);
        setAlerts([]);
        return;
      }

      const results = await Promise.all(
        ids.map(async (id) => {
          try {
            const card = await getCardById(id);

            if (!card) return null;

            return {
              card,
              history: getMarketHistoryDays(card, 30),
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

      const portfolio = results.filter(
        (item): item is PortfolioCard => item !== null
      );

      const ranking = rankPortfolio(portfolio);
      const actionable = ranking.filter((item) => item.isActionable);
      const alertList = getAlerts(actionable);

      setOpportunities(actionable);
      setAlerts(alertList);
      updateSignalSnapshot({
        opportunities: actionable.map((item) => ({
          id: item.id,
          name: item.name,
          recommendation: item.recommendation,
          trend: item.trend,
          currentPrice: item.currentPrice,
        })),
      });
    } catch (error) {
      console.error(
        "[King_TCG] Erreur analyse opportunités :",
        error
      );

      setOpportunities([]);
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOpportunityData();

    const handleKingTCGUpdate = () => {
      loadOpportunityData();
    };

    window.addEventListener(
      "king_tcg_update",
      handleKingTCGUpdate
    );

    return () => {
      window.removeEventListener(
        "king_tcg_update",
        handleKingTCGUpdate
      );
    };
  }, [loadOpportunityData]);

  if (loading) {
    return (
      <>
        <Navbar />

        <main className="kt-premium-shell min-h-screen pb-24 text-white">
          <div className="mx-auto w-full max-w-7xl space-y-5 px-4 py-5 sm:px-6 lg:px-8">

            <section className="rounded-2xl border border-white/[0.07] bg-[#151c25] p-5">
              <div className="h-3 w-32 animate-pulse rounded bg-zinc-800" />
              <div className="mt-3 h-7 w-64 animate-pulse rounded bg-zinc-800" />
              <div className="mt-2 h-4 w-full max-w-xl animate-pulse rounded bg-zinc-900" />
            </section>

            <section className="grid grid-cols-3 gap-2.5">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="h-20 animate-pulse rounded-2xl border border-white/[0.06] bg-white/[0.025]"
                />
              ))}
            </section>

            <section className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="h-32 animate-pulse rounded-2xl border border-white/[0.06] bg-white/[0.025]"
                />
              ))}
            </section>

          </div>
        </main>
      </>
    );
  }

  const buy = opportunities.filter(
    (opportunity) => opportunity.recommendation === "BUY"
  );

  const hold = opportunities.filter(
    (opportunity) => opportunity.recommendation === "HOLD"
  );

  const sell = opportunities.filter(
    (opportunity) => opportunity.recommendation === "SELL"
  );

  return (
    <>
      <Navbar />

      <main className="kt-premium-shell min-h-screen pb-28 text-white selection:bg-cyan-500/10">
        <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-5 sm:px-6 sm:py-6 lg:px-8">

          {/* HERO */}
          <section className="relative overflow-hidden rounded-[22px] border border-cyan-400/25 bg-[#0a1118] p-5 shadow-[0_20px_52px_rgba(0,0,0,.27),0_0_34px_rgba(34,211,238,.045)] sm:p-6">
            <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-cyan-400/[0.055] blur-3xl" />
            <div className="pointer-events-none absolute bottom-0 left-1/3 h-px w-36 bg-cyan-300/55 shadow-[0_0_12px_rgba(34,211,238,.7)]" />

            <div className="relative">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/[0.06] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.13em] text-cyan-300">
                <Sparkles className="h-3.5 w-3.5" />
                Market Intelligence
              </div>

              <h1 className="mt-3 flex items-center gap-3 text-2xl font-black tracking-tight text-white sm:text-[30px]">
                <span className="flex h-11 w-11 items-center justify-center rounded-[15px] border border-cyan-400/25 bg-cyan-400/[0.07] text-cyan-300">
                  <Activity className="h-5 w-5" />
                </span>
                Opportunités
              </h1>

              <p className="mt-2 max-w-2xl text-[11px] leading-5 text-zinc-300 sm:text-xs">
                Classe les signaux exploitables de votre collection et de vos favoris selon leur recommandation et leur tendance.
              </p>
            </div>
          </section>

          {/* SUMMARY */}
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">

            <SummaryCard
              icon={<ShoppingCart className="h-5 w-5" />}
              label="Signaux d'achat"
              value={buy.length}
              description="Opportunités détectées"
              className="border-emerald-500/10 bg-emerald-500/[0.035]"
              iconClass="bg-emerald-500/10 text-emerald-400"
              valueClass="text-emerald-400"
            />

            <SummaryCard
              icon={<Eye className="h-5 w-5" />}
              label="Sous observation"
              value={hold.length}
              description="Signaux mesurables à surveiller"
              className="border-amber-500/10 bg-amber-500/[0.035]"
              iconClass="bg-amber-500/10 text-amber-400"
              valueClass="text-amber-400"
            />

            <SummaryCard
              icon={<TrendingDown className="h-5 w-5" />}
              label="Signaux de vente"
              value={sell.length}
              description="Cartes à arbitrer"
              className="border-rose-500/10 bg-rose-500/[0.035]"
              iconClass="bg-rose-500/10 text-rose-400"
              valueClass="text-rose-400"
            />

          </section>


          {/* LÉGENDE COULEURS */}
          <section className="flex flex-wrap gap-2 rounded-[15px] border border-cyan-400/10 bg-[#0a1118] p-3 text-[9px] font-bold">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/15 bg-emerald-400/[0.05] px-2.5 py-1 text-emerald-300"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />Achat / potentiel positif</span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/15 bg-amber-400/[0.05] px-2.5 py-1 text-amber-300"><span className="h-1.5 w-1.5 rounded-full bg-amber-400" />Sous observation</span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-400/15 bg-rose-400/[0.05] px-2.5 py-1 text-rose-300"><span className="h-1.5 w-1.5 rounded-full bg-rose-400" />Vente / risque</span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/15 bg-cyan-400/[0.05] px-2.5 py-1 text-cyan-300"><span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />Information marché</span>
          </section>

          {/* ALERTES */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 rounded-[15px] border border-cyan-400/10 bg-[#0a1118] px-4 py-3">
              <Bell className="h-4 w-4 text-cyan-300" />

              <div>
                <h2 className="text-xs font-black uppercase tracking-widest text-white">
                  Alertes instantanées
                </h2>

                <p className="mt-0.5 text-[10px] text-zinc-200">
                  Analyse Market V5
                </p>
              </div>
            </div>

            {alerts.length === 0 ? (
              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zinc-800/60 text-zinc-200">
                    <Activity className="h-4 w-4" />
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-zinc-300">
                      Aucune alerte majeure
                    </p>

                    <p className="mt-1 text-xs leading-5 text-zinc-200">
                      Aucune anomalie importante n'a été détectée
                      sur les actifs actuellement analysés.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {alerts.map((alert, index) => {
                  const alertStyles =
                    alert.type === "BUY"
                      ? "border-emerald-500/20 bg-emerald-500/[0.06] text-emerald-400"
                      : alert.type === "SELL"
                        ? "border-rose-500/20 bg-rose-500/[0.06] text-rose-400"
                        : "border-amber-500/20 bg-amber-500/[0.06] text-amber-400";

                  return (
                    <div
                      key={`${alert.type}-${index}`}
                      className={`rounded-[15px] border p-3.5 shadow-[0_12px_30px_rgba(0,0,0,.16)] sm:p-4 ${alertStyles}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 shrink-0">
                          {alert.type === "BUY" ? (
                            <ArrowUpRight className="h-4 w-4" />
                          ) : alert.type === "SELL" ? (
                            <ArrowDownRight className="h-4 w-4" />
                          ) : (
                            <Activity className="h-4 w-4" />
                          )}
                        </div>

                        <p className="min-w-0 text-xs font-semibold leading-5 sm:text-sm">
                          {alert.message}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* OPPORTUNITÉS */}
          <div className="space-y-7">

            {/* BUY */}
            {buy.length > 0 && (
              <OpportunitySection
                title="Signaux d'achat"
                subtitle="Cartes présentant les meilleures opportunités"
                color="emerald"
                dotClass="bg-emerald-500"
              >
                {buy.map((op) => (
                  <OpportunityCard
                    key={op.id}
                    op={op}
                    borderClass="border-emerald-500/20"
                    scoreClass="text-emerald-400 bg-emerald-500/[0.07] border-emerald-500/15"
                  />
                ))}
              </OpportunitySection>
            )}

            {/* HOLD */}
            {hold.length > 0 && (
              <OpportunitySection
                title="Sous observation"
                subtitle="Cartes avec un signal marché réel, mais sans décision forte"
                color="amber"
                dotClass="bg-amber-500"
              >
                {hold.map((op) => (
                  <OpportunityCard
                    key={op.id}
                    op={op}
                    borderClass="border-amber-500/10"
                    scoreClass="text-amber-400 bg-amber-500/[0.07] border-amber-500/15"
                  />
                ))}
              </OpportunitySection>
            )}

            {/* SELL */}
            {sell.length > 0 && (
              <OpportunitySection
                title="Signaux de vente"
                subtitle="Cartes présentant un signal de sortie"
                color="rose"
                dotClass="bg-rose-500"
              >
                {sell.map((op) => (
                  <OpportunityCard
                    key={op.id}
                    op={op}
                    borderClass="border-rose-500/20"
                    scoreClass="text-rose-400 bg-rose-500/[0.07] border-rose-500/15"
                  />
                ))}
              </OpportunitySection>
            )}

            {/* EMPTY */}
            {opportunities.length === 0 && (
              <section className="rounded-2xl border border-white/[0.07] bg-white/[0.025] px-5 py-12 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-400">
                  <Activity className="h-6 w-6" />
                </div>

                <h2 className="mt-4 text-lg font-bold">
                  Pas encore de signaux
                </h2>

                <p className="mx-auto mt-2 max-w-md text-xs leading-5 text-zinc-200 sm:text-sm">
                  Aucun signal exploitable pour le moment. Les cartes sans prix ou historique suffisant ne sont plus affichées comme de fausses opportunités.
                </p>
              </section>
            )}

          </div>
        </div>
      </main>
    </>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  description,
  className,
  iconClass,
  valueClass,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  description: string;
  className: string;
  iconClass: string;
  valueClass: string;
}) {
  return (
    <div
      className={`rounded-[16px] border p-3 shadow-[0_12px_30px_rgba(0,0,0,.18)] sm:p-4 ${className}`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconClass}`}
        >
          {icon}
        </div>

        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-200">
            {label}
          </p>

          <div className="mt-1 flex items-baseline gap-2">
            <span className={`text-2xl font-black ${valueClass}`}>
              {value}
            </span>

            <span className="truncate text-[10px] text-zinc-200">
              {description}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function OpportunitySection({
  title,
  subtitle,
  children,
  color,
  dotClass,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  color: "emerald" | "amber" | "rose";
  dotClass: string;
}) {
  const titleClass =
    color === "emerald"
      ? "text-emerald-400"
      : color === "amber"
        ? "text-amber-400"
        : "text-rose-400";

  return (
    <section className="space-y-3">
      <div className="flex items-start gap-2 border-b border-white/[0.07] pb-2.5">
        <span
          className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${dotClass} ${
            color !== "amber" ? "animate-pulse" : ""
          }`}
        />

        <div className="min-w-0">
          <h2
            className={`text-[11px] font-black uppercase tracking-[0.12em] ${titleClass}`}
          >
            {title}
          </h2>

          <p className="mt-1 text-[10px] leading-4 text-zinc-200">
            {subtitle}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {children}
      </div>
    </section>
  );
}

function OpportunityCard({
  op,
  borderClass,
  scoreClass,
}: {
  op: Opportunity;
  borderClass: string;
  scoreClass: string;
}) {
  const trendPositive = op.trend > 0;
  const trendNegative = op.trend < 0;
  const [premiumOpen, setPremiumOpen] = useState(false);

  // Mode test V96 : accès Premium forcé pour valider l’UI avant les vrais comptes.
  // Plus tard, remplacer par le statut réel du compte (ex: user.plan === "premium").
  const hasPremiumAccess = true;
  const potentialBase = Math.max(0, op.potential - 100);
  const potentialLow = Math.max(2, Math.round(potentialBase * 0.45));
  const potentialHigh = Math.max(potentialLow + 3, Math.round(potentialBase * 0.7));
  const confidence = Math.max(55, Math.min(96, Math.round(50 + op.score * 4 + Math.min(12, Math.abs(op.trend)) / 2)));

  return (
    <article
      className={`relative overflow-hidden rounded-[18px] border bg-[#0a1118] p-4 shadow-[0_16px_38px_rgba(0,0,0,.22)] transition duration-200 hover:-translate-y-0.5 hover:border-white/[0.16] hover:shadow-[0_20px_44px_rgba(0,0,0,.28)] sm:p-5 ${borderClass}`}
    >
      {/* NOM + SCORE */}
      <div className="flex items-start justify-between gap-3">
        <h3 className="min-w-0 flex-1 break-words text-[14px] font-black leading-5 tracking-tight text-white">
          {op.name}
        </h3>

        <span
          className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-black tracking-wider ${scoreClass}`}
        >
          {op.score}/10
        </span>
      </div>

      {/* INFOS */}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-white/[0.05] bg-white/[0.025] p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-200">
            Cours actuel
          </p>

          <p className="mt-1 text-base font-black tabular-nums text-white">
            {op.currentPrice.toFixed(2)} €
          </p>
        </div>

        <div className="rounded-xl border border-white/[0.05] bg-white/[0.025] p-3">
          <div className="flex items-center justify-between gap-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-200">
              Tendance
            </p>

            {trendPositive ? (
              <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
            ) : trendNegative ? (
              <TrendingDown className="h-3.5 w-3.5 text-rose-400" />
            ) : (
              <Activity className="h-3.5 w-3.5 text-zinc-200" />
            )}
          </div>

          <p
            className={`mt-1 text-base font-black tabular-nums ${
              trendPositive
                ? "text-emerald-400"
                : trendNegative
                  ? "text-rose-400"
                  : "text-zinc-200"
            }`}
          >
            {trendPositive ? "+" : ""}
            {op.trend.toFixed(2)}%
          </p>
        </div>
      </div>

      <div className="mt-3 border-t border-white/[0.06] pt-3">
        <button
          type="button"
          onClick={() => hasPremiumAccess && setPremiumOpen((value) => !value)}
          aria-expanded={hasPremiumAccess ? premiumOpen : false}
          className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-[10px] font-bold uppercase tracking-[0.11em] transition ${
            hasPremiumAccess
              ? "border-amber-400/20 bg-amber-400/[0.05] text-amber-300 hover:bg-amber-400/[0.09]"
              : "cursor-not-allowed border-white/[0.06] bg-white/[0.02] text-zinc-200"
          }`}
        >
          <span className="flex items-center gap-2"><Crown className="h-3.5 w-3.5" /> Analyse Premium</span>
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${premiumOpen ? "rotate-180" : ""}`} />
        </button>

        {hasPremiumAccess && premiumOpen && (
          <div className="mt-2 space-y-1.5 rounded-xl border border-amber-400/10 bg-white/[0.035] px-3 py-2.5 text-[11px]">
            <p className="text-zinc-300">📈 Potentiel : <span className="font-bold text-white">+{potentialLow} à +{potentialHigh} %</span></p>
            <p className="text-zinc-300">🎯 Confiance King_TCG : <span className="font-bold text-white">{confidence} %</span></p>
          </div>
        )}
      </div>
    </article>
  );
}
