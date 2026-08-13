"use client";

import { useEffect, useMemo, useState } from "react";
import {
Bell,
BellRing,
TrendingDown,
TrendingUp,
CheckCircle2,
Activity,
ArrowUpRight,
ArrowDownRight,
Sparkles,
ChevronDown,
Crown,
} from "lucide-react";

import Navbar from "../../components/Navbar";
import { getCollection, getFavorites } from "../../lib/storage";
import { getCardById } from "../../lib/pokemon";

import {
generateAlerts,
PriceAlert,
} from "../../lib/priceAlerts";

import type { PokemonCard } from "../../lib/types";
import { updateSignalSnapshot } from "../../lib/signalSnapshot";

export default function AlertCenter() {
const [alerts, setAlerts] = useState<PriceAlert[]>([]);
const [loading, setLoading] = useState(true);
const [premiumOpen, setPremiumOpen] = useState<Record<string, boolean>>({});
// Mode test V96 : accès Premium forcé jusqu’au branchement des vrais comptes.
const hasPremiumAccess = true;

useEffect(() => {
let cancelled = false;

const load = async () => {
  try {
    setLoading(true);

    const collection = getCollection();
    const favoriteIds = getFavorites();
    const ids = Array.from(new Set([...Object.keys(collection), ...favoriteIds]));

    if (ids.length === 0) {
      if (!cancelled) {
        setAlerts([]);
      }
      return;
    }

    const results = await Promise.all(
      ids.map(async (id) => {
        try {
          return await getCardById(id);
        } catch (error) {
          console.error(
            `[King_TCG V5] Erreur récupération carte ${id}:`,
            error
          );
          return null;
        }
      })
    );

    if (cancelled) return;

    const cards: PokemonCard[] = results.filter(
      (card): card is PokemonCard => card !== null
    );

    /*
     * generateAlerts() travaille avec les données marché
     * actuellement présentes sur les cartes.
     *
     * En rechargeant les cartes ici à chaque king_tcg_update,
     * les alertes sont recalculées avec les derniers prix.
     */
    const nextAlerts = generateAlerts(cards);
    setAlerts(nextAlerts);
    updateSignalSnapshot({ alerts: nextAlerts });
  } catch (error) {
    if (!cancelled) {
      console.error("Erreur Alert Center V5:", error);
      setAlerts([]);
    }
  } finally {
    if (!cancelled) {
      setLoading(false);
    }
  }
};

// Chargement initial
load();

// Actualisation lorsque les données/prix King_TCG sont modifiés
const handleUpdate = () => {
  load();
};

window.addEventListener("king_tcg_update", handleUpdate);

return () => {
  cancelled = true;
  window.removeEventListener("king_tcg_update", handleUpdate);
};

}, []);

const stats = useMemo(() => {
const rises = alerts.filter(
(alert) => alert.type === "RISE"
).length;

const drops = alerts.filter(
  (alert) => alert.type === "DROP"
).length;

return {
  total: alerts.length,
  rises,
  drops,
};

}, [alerts]);

const getPremiumAlertInsight = (alert: PriceAlert) => {
const magnitude = Math.abs(alert.changePercent);

if (alert.type === "RISE") {
  if (magnitude >= 100) {
    return {
      cause: "accélération exceptionnelle du prix, soutenue par un déséquilibre marqué entre offre et demande",
      reading: "mouvement très puissant : la hausse peut rester soutenue, mais une correction rapide devient aussi plus probable",
    };
  }

  if (magnitude >= 25) {
    return {
      cause: "progression nette des prix avec une pression acheteuse sensiblement plus forte",
      reading: "tendance haussière solide à court terme, à confirmer sur les prochaines mises à jour du marché",
    };
  }

  return {
    cause: "demande en progression et prix récents orientés à la hausse",
    reading: "dynamique positive, avec une hausse encore mesurée et potentiellement durable",
  };
}

if (alert.type === "DROP") {
  if (magnitude >= 25) {
    return {
      cause: "pression vendeuse importante et recul rapide des prix observés",
      reading: "baisse marquée : mieux vaut attendre une stabilisation avant de considérer le mouvement comme terminé",
    };
  }

  return {
    cause: "offre plus présente et prix récents orientés à la baisse",
    reading: "repli à surveiller : le marché peut encore chercher un nouveau niveau d’équilibre",
  };
}

return {
  cause: "prix revenu dans une zone plus attractive par rapport à sa dynamique récente",
  reading: "signal intéressant, mais l’opportunité mérite encore une confirmation avant d’être considérée comme forte",
};
};

const getAlertConfig = (type: PriceAlert["type"]) => {
switch (type) {
case "RISE":
return {
label: "Hausse détectée",
icon: TrendingUp,
smallIcon: ArrowUpRight,
accent: "#22c55e",
accentSoft: "rgba(34,197,94,0.12)",
border: "rgba(34,197,94,0.22)",
};

  case "DROP":
    return {
      label: "Baisse détectée",
      icon: TrendingDown,
      smallIcon: ArrowDownRight,
      accent: "#ef4444",
      accentSoft: "rgba(239,68,68,0.12)",
      border: "rgba(239,68,68,0.22)",
    };

  default:
    return {
      label: "Opportunité",
      icon: Sparkles,
      smallIcon: ArrowUpRight,
      accent: "#eab308",
      accentSoft: "rgba(234,179,8,0.12)",
      border: "rgba(234,179,8,0.22)",
    };
}

};

return (
<> <Navbar />

  <main className="kt-premium-shell min-h-screen pb-28 text-white">
    <div className="mx-auto w-full max-w-6xl space-y-5 px-4 py-6 sm:px-6 lg:px-8">

      {/* HERO */}
      <section className="relative overflow-hidden rounded-[22px] border border-cyan-400/25 bg-[#0a1118] p-5 shadow-[0_20px_52px_rgba(0,0,0,.27),0_0_34px_rgba(34,211,238,.045)] sm:p-6">
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-cyan-400/[0.055] blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/3 h-px w-36 bg-cyan-300/55 shadow-[0_0_12px_rgba(34,211,238,.7)]" />

        <div className="relative flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/[0.06] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.13em] text-cyan-300">
              <BellRing className="h-3.5 w-3.5" />
              Market Intelligence
            </div>

            <h1 className="flex items-center gap-3 text-[22px] font-black tracking-tight text-white sm:text-[26px]">
              <span className="flex h-11 w-11 items-center justify-center rounded-[15px] border border-cyan-400/25 bg-cyan-400/[0.07] text-cyan-300">
                <Bell className="h-5 w-5" />
              </span>
              Alertes
            </h1>

            <p className="mt-2 max-w-2xl text-[11px] leading-5 text-zinc-300 sm:text-xs">
              Mouvements importants détectés sur les cartes de votre collection et de vos favoris.
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-3 rounded-[15px] border border-cyan-400/16 bg-cyan-400/[0.04] px-5 py-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/[0.07] text-cyan-300">
              <Activity className="h-5 w-5" />
            </div>

            <div>
              <p className="text-2xl font-bold leading-none">
                {loading ? "—" : stats.total}
              </p>

              <p className="mt-1 text-xs text-zinc-200">
                alerte{stats.total > 1 ? "s" : ""} active
                {stats.total > 1 ? "s" : ""}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* NOTIFICATIONS */}
      <section>
        <div className="mb-2.5 flex items-center gap-2 px-1">
          <BellRing className="h-3.5 w-3.5 text-cyan-400" />
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300">
            Vue d’ensemble
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <div className="rounded-[16px] border border-cyan-400/12 bg-[#0a1118] p-3 shadow-[0_12px_30px_rgba(0,0,0,.18)] sm:p-4">
            <div className="flex flex-col items-center gap-1.5 text-center sm:flex-row sm:text-left">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/[0.05] text-zinc-300 sm:h-10 sm:w-10">
                <Activity className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.11em] text-zinc-200 sm:text-xs">
                  Total
                </p>
                <p className="mt-0.5 text-lg font-black text-white sm:text-xl">
                  {loading ? "—" : stats.total}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[16px] border border-emerald-400/18 bg-emerald-400/[0.035] p-3 shadow-[0_12px_30px_rgba(0,0,0,.18)] sm:p-4">
            <div className="flex flex-col items-center gap-1.5 text-center sm:flex-row sm:text-left">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-400/[0.08] text-emerald-400 sm:h-10 sm:w-10">
                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.11em] text-zinc-200 sm:text-xs">
                  Hausses
                </p>
                <p className="mt-0.5 text-lg font-black text-emerald-400 sm:text-xl">
                  {loading ? "—" : stats.rises}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[16px] border border-rose-400/18 bg-rose-400/[0.025] p-3 shadow-[0_12px_30px_rgba(0,0,0,.18)] sm:p-4">
            <div className="flex flex-col items-center gap-1.5 text-center sm:flex-row sm:text-left">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-rose-400/[0.08] text-rose-400 sm:h-10 sm:w-10">
                <TrendingDown className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.11em] text-zinc-200 sm:text-xs">
                  Baisses
                </p>
                <p className="mt-0.5 text-lg font-black text-rose-400 sm:text-xl">
                  {loading ? "—" : stats.drops}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* LÉGENDE COULEURS */}
      <section className="flex flex-wrap gap-2 rounded-[15px] border border-cyan-400/10 bg-[#0a1118] p-3 text-[9px] font-bold">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/15 bg-emerald-400/[0.05] px-2.5 py-1 text-emerald-300"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />Hausse positive</span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-400/15 bg-rose-400/[0.05] px-2.5 py-1 text-rose-300"><span className="h-1.5 w-1.5 rounded-full bg-rose-400" />Baisse / risque</span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/15 bg-amber-400/[0.05] px-2.5 py-1 text-amber-300"><span className="h-1.5 w-1.5 rounded-full bg-amber-400" />Opportunité / surveillance</span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/15 bg-cyan-400/[0.05] px-2.5 py-1 text-cyan-300"><span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />Information système</span>
      </section>

      {/* CONTENT */}
      <section>
        {loading ? (
          <div className="rounded-2xl border border-white/[0.055] bg-white/[0.025] p-12 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.05]">
              <Activity className="h-5 w-5 animate-pulse text-zinc-100" />
            </div>

            <h2 className="text-base font-semibold">
              Analyse du portefeuille
            </h2>

            <p className="mt-1 text-sm text-zinc-200">
              Recherche des variations de marché...
            </p>
          </div>
        ) : alerts.length === 0 ? (
          <div className="rounded-2xl border border-white/[0.055] bg-white/[0.025] px-6 py-14 text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-green-500/10 text-green-400">
              <CheckCircle2 className="h-8 w-8" />
            </div>

            <h2 className="text-xl font-bold">
              Aucune alerte pour le moment
            </h2>

            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-zinc-200">
              Ton portefeuille ne présente actuellement aucune variation
              importante détectée par le moteur d'alertes V5.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {alerts.map((alert, index) => {
              const config = getAlertConfig(alert.type);
              const SmallIcon = config.smallIcon;

              return (
                <article
                  key={`${alert.cardName}-${index}`}
                  className="group relative overflow-hidden rounded-[18px] border bg-[#0a1118] p-4 shadow-[0_16px_38px_rgba(0,0,0,.22)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_20px_44px_rgba(0,0,0,.28)] sm:p-5"
                  style={{
                    borderColor: config.border,
                  }}
                >
                  <div
                    className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full blur-3xl"
                    style={{
                      background: config.accentSoft,
                    }}
                  />

                  <div className="relative">
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="min-w-0 truncate text-left text-[15px] font-black tracking-tight text-white">
                        {alert.cardName}
                      </h2>

                      <div
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.08em]"
                        style={{
                          color: config.accent,
                          background: config.accentSoft,
                          borderColor: config.border,
                        }}
                      >
                        <SmallIcon className="h-3 w-3" />
                        {alert.type}
                      </div>
                    </div>

                    <div className="mt-2 flex items-end gap-3">
                      <p className="min-w-0 flex-1 text-left text-[11px] leading-5 text-zinc-300">
                        {alert.message}
                      </p>
                      <div className="shrink-0 rounded-lg border border-white/[0.06] bg-black/20 px-2 py-1 text-sm font-black" style={{ color: config.accent }}>
                        {alert.changePercent > 0 ? "+" : ""}{alert.changePercent.toFixed(2)}%
                      </div>
                    </div>

                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={() => hasPremiumAccess && setPremiumOpen((current) => ({ ...current, [alert.cardId]: !current[alert.cardId] }))}
                        aria-expanded={hasPremiumAccess ? Boolean(premiumOpen[alert.cardId]) : false}
                        className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-[10px] font-bold uppercase tracking-[0.11em] transition ${
                          hasPremiumAccess
                            ? "border-amber-400/20 bg-amber-400/[0.05] text-amber-300 hover:bg-amber-400/[0.09]"
                            : "cursor-not-allowed border-white/[0.06] bg-white/[0.02] text-zinc-200"
                        }`}
                      >
                        <span className="flex items-center gap-2"><Crown className="h-3.5 w-3.5" /> Analyse Premium</span>
                        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${premiumOpen[alert.cardId] ? "rotate-180" : ""}`} />
                      </button>

                      {hasPremiumAccess && premiumOpen[alert.cardId] && (() => {
                        const premiumInsight = getPremiumAlertInsight(alert);

                        return (
                          <div className="mt-2 space-y-2 rounded-xl border border-amber-400/10 bg-white/[0.035] px-3 py-2.5 text-[11px] leading-5">
                            <p className="text-zinc-300">🔎 Cause : <span className="font-bold text-white">{premiumInsight.cause}</span></p>
                            <p className="text-zinc-300">🧠 Lecture : <span className="font-bold text-white">{premiumInsight.reading}</span></p>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  </main>
</>
);
}
