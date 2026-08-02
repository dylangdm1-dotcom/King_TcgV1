"use client";

import { useEffect, useState } from "react";

import Navbar from "../../components/Navbar";
import { getCollection } from "../../lib/storage";
import { getCardById } from "../../lib/pokemon";
import { getAlerts } from "../../lib/alertEngine";

import type { PokemonCard } from "../../lib/types";
import type { Opportunity } from "../../lib/opportunity";

type PortfolioCard = {
  card: PokemonCard;
  history: any[];
};

export default function AlertCenter() {
  const [alerts, setAlerts] = useState<ReturnType<typeof getAlerts>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadAlerts = async () => {
      setLoading(true);

      try {
        const collection = getCollection();

        if (!collection || typeof collection !== "object") {
          if (!cancelled) {
            setAlerts([]);
            setLoading(false);
          }
          return;
        }

        const ids = Object.keys(collection);

        if (ids.length === 0) {
          if (!cancelled) {
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
                history: [],
              };
            } catch (error) {
              console.error(
                `[King_TCG V5.0] Erreur chargement carte alerte ${id} :`,
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

        /*
         * Le moteur V5 travaille à partir du classement
         * d'opportunités du portfolio.
         *
         * On importe volontairement Opportunity uniquement
         * pour conserver le contrat V5 et éviter toute dépendance
         * à l'ancien moteur priceAlerts.
         */
        const ranking: Opportunity[] = portfolio.map(({ card }) => ({
          id: card.id,
          name: card.name,
          currentPrice: 0,
          trend: 0,
          score: 0,
          recommendation: "HOLD",
          potential: 0,
          risk: "LOW",
          reason: "Données de marché insuffisantes pour établir une recommandation.",
        }));

        const generatedAlerts = getAlerts(ranking);

        setAlerts(generatedAlerts);
        setLoading(false);
      } catch (error) {
        console.error(
          "[King_TCG V5.0] Erreur globale du centre d'alertes :",
          error
        );

        if (!cancelled) {
          setAlerts([]);
          setLoading(false);
        }
      }
    };

    loadAlerts();

    const refresh = () => {
      loadAlerts();
    };

    window.addEventListener("king_tcg_update", refresh);
    window.addEventListener("storage_collection_update", refresh);

    return () => {
      cancelled = true;

      window.removeEventListener("king_tcg_update", refresh);
      window.removeEventListener("storage_collection_update", refresh);
    };
  }, []);

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-black text-white pb-24">
        <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">

          {/* HEADER */}
          <section className="rounded-2xl border border-zinc-900 bg-neutral-950/60 p-5 shadow-xl">
            <span className="text-[9px] font-black uppercase tracking-widest text-amber-400">
              Surveillance marché V5.0
            </span>

            <h1 className="mt-1 text-xl font-black uppercase tracking-tight text-white">
              Centre d'Alertes
            </h1>

            <p className="mt-1 text-xs text-zinc-500">
              Détection automatique des signaux importants sur votre portfolio.
            </p>
          </section>

          {/* CONTENT */}
          {loading ? (
            <section className="space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="h-24 animate-pulse rounded-2xl border border-zinc-900 bg-neutral-950/50"
                />
              ))}
            </section>
          ) : alerts.length === 0 ? (
            <section className="rounded-2xl border border-zinc-900 bg-neutral-950/40 p-10 text-center shadow-xl">
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900/50 text-amber-400">
                ✓
              </div>

              <h2 className="text-sm font-black uppercase tracking-wider text-white">
                Aucune alerte active
              </h2>

              <p className="mt-1 text-xs text-zinc-500">
                Aucun signal majeur n'a été détecté sur votre portfolio.
              </p>
            </section>
          ) : (
            <section className="space-y-3">
              {alerts.map((alert, index) => {
                const isBuy = alert.type === "BUY";
                const isSell = alert.type === "SELL";

                const containerClass = isBuy
                  ? "border-emerald-500/20 bg-emerald-500/5"
                  : isSell
                    ? "border-rose-500/20 bg-rose-500/5"
                    : "border-amber-500/20 bg-amber-500/5";

                const accentClass = isBuy
                  ? "text-emerald-400"
                  : isSell
                    ? "text-rose-400"
                    : "text-amber-400";

                return (
                  <article
                    key={`${alert.type}-${index}`}
                    className={`rounded-2xl border p-4 shadow-xl ${containerClass}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h2 className="truncate text-sm font-black uppercase tracking-tight text-white">
                          {alert.message}
                        </h2>

                        <div className="mt-2 flex items-center gap-2">
                          <span
                            className={`rounded-md border px-2 py-1 text-[9px] font-black uppercase tracking-widest ${accentClass}`}
                          >
                            {alert.type}
                          </span>
                        </div>
                      </div>

                      {"changePercent" in alert &&
                        typeof alert.changePercent === "number" && (
                          <span
                            className={`shrink-0 text-sm font-black tabular-nums ${accentClass}`}
                          >
                            {alert.changePercent > 0 ? "+" : ""}
                            {alert.changePercent.toFixed(2)}%
                          </span>
                        )}
                    </div>
                  </article>
                );
              })}
            </section>
          )}
        </div>
      </main>
    </>
  );
}

