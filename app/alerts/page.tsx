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

  <main className="min-h-screen bg-[#07090d] text-white">
    <div className="mx-auto w-full max-w-[1250px] px-4 py-6 sm:px-6 lg:px-8">

      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl border border-white/[0.07] bg-gradient-to-br from-[#11151d] via-[#0d1118] to-[#090b10] p-6 shadow-2xl sm:p-8">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-red-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-yellow-500/[0.06] blur-3xl" />

        <div className="relative flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-400">
              <BellRing className="h-3.5 w-3.5" />
              MARKET ALERTS V5
            </div>

            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Centre des alertes
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400 sm:text-base">
              Surveille les mouvements importants de ta collection et de tes favoris avec les mêmes tendances que le Dashboard, et identifie rapidement les cartes qui méritent ton attention.
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.035] px-5 py-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-500/10 text-red-400">
              <Bell className="h-5 w-5" />
            </div>

            <div>
              <p className="text-2xl font-bold leading-none">
                {loading ? "—" : stats.total}
              </p>

              <p className="mt-1 text-xs text-zinc-500">
                alerte{stats.total > 1 ? "s" : ""} active
                {stats.total > 1 ? "s" : ""}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* NOTIFICATIONS */}
      <section className="mt-5">
        <div className="mb-2.5 flex items-center gap-2 px-1">
          <BellRing className="h-3.5 w-3.5 text-cyan-400" />
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">
            Notifications
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3 sm:p-4">
            <div className="flex flex-col items-center gap-1.5 text-center sm:flex-row sm:text-left">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/[0.05] text-zinc-300 sm:h-10 sm:w-10">
                <Activity className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-black uppercase tracking-wider text-zinc-500 sm:text-xs">
                  Total
                </p>
                <p className="mt-0.5 text-lg font-black text-white sm:text-xl">
                  {loading ? "—" : stats.total}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-cyan-400/10 bg-cyan-400/[0.025] p-3 sm:p-4">
            <div className="flex flex-col items-center gap-1.5 text-center sm:flex-row sm:text-left">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-cyan-400/[0.07] text-cyan-400 sm:h-10 sm:w-10">
                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-black uppercase tracking-wider text-zinc-500 sm:text-xs">
                  Hausses
                </p>
                <p className="mt-0.5 text-lg font-black text-cyan-400 sm:text-xl">
                  {loading ? "—" : stats.rises}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3 sm:p-4">
            <div className="flex flex-col items-center gap-1.5 text-center sm:flex-row sm:text-left">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/[0.05] text-zinc-300 sm:h-10 sm:w-10">
                <TrendingDown className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-black uppercase tracking-wider text-zinc-500 sm:text-xs">
                  Baisses
                </p>
                <p className="mt-0.5 text-lg font-black text-white sm:text-xl">
                  {loading ? "—" : stats.drops}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CONTENT */}
      <section className="mt-6">
        {loading ? (
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-12 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.05]">
              <Activity className="h-5 w-5 animate-pulse text-zinc-400" />
            </div>

            <h2 className="text-base font-semibold">
              Analyse du portefeuille
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              Recherche des variations de marché...
            </p>
          </div>
        ) : alerts.length === 0 ? (
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] px-6 py-14 text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-green-500/10 text-green-400">
              <CheckCircle2 className="h-8 w-8" />
            </div>

            <h2 className="text-xl font-bold">
              Aucune alerte pour le moment
            </h2>

            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-zinc-500">
              Ton portefeuille ne présente actuellement aucune variation
              importante détectée par le moteur d'alertes V5.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {alerts.map((alert, index) => {
              const config = getAlertConfig(alert.type);
              const Icon = config.icon;
              const SmallIcon = config.smallIcon;

              return (
                <article
                  key={`${alert.cardName}-${index}`}
                  className="group relative overflow-hidden rounded-2xl border bg-[#0d1117] p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-white/[0.14] hover:shadow-xl"
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
                    <div className="flex items-start justify-between gap-4">
                      <div
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                        style={{
                          background: config.accentSoft,
                          color: config.accent,
                        }}
                      >
                        <Icon className="h-5 w-5" />
                      </div>

                      <div
                        className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold"
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

                    <div className="mt-5">
                      <h2 className="text-lg font-bold tracking-tight text-white">
                        {alert.cardName}
                      </h2>

                      <p className="mt-2 text-sm leading-6 text-zinc-400">
                        {alert.message}
                      </p>
                    </div>

                    <div className="mt-5 flex items-end justify-between border-t border-white/[0.06] pt-4">
                      <div>
                        <p className="text-[11px] uppercase tracking-wider text-zinc-500">
                          Variation détectée
                        </p>

                        <p className="mt-1 text-xs text-zinc-500">
                          Analyse Market V5
                        </p>
                      </div>

                      <div
                        className="text-xl font-bold"
                        style={{
                          color: config.accent,
                        }}
                      >
                        {alert.changePercent > 0 ? "+" : ""}
                        {alert.changePercent.toFixed(2)}%
                      </div>
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