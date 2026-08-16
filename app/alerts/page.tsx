"use client";

import { useEffect, useMemo, useState } from "react";
import {
Bell,
BellRing,
TrendingDown,
TrendingUp,
CheckCircle2,
Activity,
Sparkles,
ChevronDown,
Crown,
BadgeEuro,
BrainCircuit,
ChartNoAxesCombined,
SearchCheck,
ShieldAlert,
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
const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
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

const alertGroups = useMemo(() => {
  const sorted = [...alerts].sort(
    (left, right) => Math.abs(right.changePercent) - Math.abs(left.changePercent)
  );

  return [
    {
      key: "important",
      title: "Alertes importantes",
      subtitle: "Mouvements les plus forts détectés",
      tone: "rose",
      items: sorted.filter((alert) => Math.abs(alert.changePercent) >= 25),
    },
    {
      key: "watch",
      title: "À surveiller",
      subtitle: "Variations significatives à suivre",
      tone: "amber",
      items: sorted.filter(
        (alert) => Math.abs(alert.changePercent) >= 10 && Math.abs(alert.changePercent) < 25
      ),
    },
    {
      key: "info",
      title: "Informations marché",
      subtitle: "Signaux plus modérés",
      tone: "cyan",
      items: sorted.filter((alert) => Math.abs(alert.changePercent) < 10),
    },
  ].filter((group) => group.items.length > 0);
}, [alerts]);

const getPremiumAlertInsight = (alert: PriceAlert) => {
const magnitude = Math.abs(alert.changePercent);

if (alert.type === "RISE") {
  if (magnitude >= 100) {
    return {
      cause: "variation haussière exceptionnelle calculée sur les repères disponibles ; sa cause exacte n’est pas déduite",
      reading: "mouvement très volatil : poursuite et correction restent toutes deux possibles",
    };
  }

  if (magnitude >= 25) {
    return {
      cause: "progression nette mesurée entre les repères de prix disponibles",
      reading: "tendance haussière solide à court terme, à confirmer sur les prochaines mises à jour du marché",
    };
  }

  return {
    cause: "prix récents orientés à la hausse dans les données compatibles",
    reading: "dynamique positive mesurée, à confirmer lors des prochaines synchronisations",
  };
}

if (alert.type === "DROP") {
  if (magnitude >= 25) {
    return {
      cause: "recul rapide calculé entre les repères de prix disponibles ; sa cause exacte n’est pas déduite",
      reading: "baisse marquée : mieux vaut attendre une stabilisation avant de considérer le mouvement comme terminé",
    };
  }

  return {
    cause: "prix récents orientés à la baisse dans les données compatibles",
    reading: "repli à surveiller : le marché peut encore chercher un nouveau niveau d’équilibre",
  };
}

return {
  cause: "repli modéré par rapport au repère récent",
  reading: "signal d’observation uniquement ; un recul ne prouve pas qu’une carte est sous-évaluée",
};
};

const getAlertConfig = (type: PriceAlert["type"]) => {
switch (type) {
case "RISE":
return {
label: "Hausse détectée",
icon: ChartNoAxesCombined,
smallIcon: ChartNoAxesCombined,
accent: "#22c55e",
accentSoft: "rgba(34,197,94,0.12)",
border: "rgba(34,197,94,0.22)",
};

  case "DROP":
    return {
      label: "Baisse détectée",
      icon: ShieldAlert,
      smallIcon: ShieldAlert,
      accent: "#ef4444",
      accentSoft: "rgba(239,68,68,0.12)",
      border: "rgba(239,68,68,0.22)",
    };

  default:
    return {
      label: "Opportunité",
      icon: BadgeEuro,
      smallIcon: BadgeEuro,
      accent: "#eab308",
      accentSoft: "rgba(234,179,8,0.12)",
      border: "rgba(234,179,8,0.22)",
    };
}

};

return (
<> <Navbar />

  <main className="kt-premium-shell min-h-screen pb-28 text-white">
    <div className="kt-page-wrap space-y-5">

      {/* HERO */}
      <section className="kt-page-header kt-hero-surface relative overflow-hidden border">
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-cyan-400/[0.055] blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/3 h-px w-36 bg-cyan-300/55 shadow-[0_0_12px_rgba(34,211,238,.7)]" />

        <div className="relative flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center justify-between gap-3">
            <h1 className="kt-page-title flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-[15px] border border-cyan-400/25 bg-cyan-400/[0.07] text-cyan-300">
                <Bell className="h-5 w-5" />
              </span>
              Alertes
            </h1>
            <div className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-cyan-400/20 bg-cyan-400/[0.06] px-2.5 py-1.5 text-[8px] font-black uppercase tracking-[0.09em] text-cyan-300 sm:text-[9px]">
              <BellRing className="h-3 w-3" />
              Market Intelligence
            </div>
            </div>

            <p className="kt-page-subtitle mt-2">
              Mouvements importants détectés sur les cartes de votre collection et de vos favoris.
            </p>
          </div>

          <div className="kt-subpanel flex shrink-0 items-center gap-3 px-4 py-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/[0.07] text-cyan-300">
              <Activity className="h-5 w-5" />
            </div>

            <div>
              <p className="text-[20px] font-bold leading-none">
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
          <div className="kt-stat-card p-3 sm:p-4">
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

          <div className="kt-stat-card p-3 sm:p-4" data-tone="green">
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

          <div className="kt-stat-card p-3 sm:p-4" data-tone="gold">
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
      <section className="grid grid-cols-2 gap-2 text-[9px] font-bold">
        <span className="flex min-h-9 items-center justify-center gap-2 rounded-xl border border-emerald-300/[0.46] bg-emerald-400/[0.07] px-2.5 text-center text-emerald-300"><span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />Hausse positive</span>
        <span className="flex min-h-9 items-center justify-center gap-2 rounded-xl border border-rose-300/[0.46] bg-rose-400/[0.07] px-2.5 text-center text-rose-300"><span className="h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400" />Baisse / risque</span>
        <span className="flex min-h-9 items-center justify-center gap-2 rounded-xl border border-amber-300/[0.46] bg-amber-400/[0.07] px-2.5 text-center text-amber-300"><span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />Opportunité / surveillance</span>
        <span className="flex min-h-9 items-center justify-center gap-2 rounded-xl border border-cyan-300/[0.46] bg-cyan-400/[0.07] px-2.5 text-center text-cyan-300"><span className="h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400" />Information système</span>
      </section>

      {/* CONTENT */}
      <section>
        {loading ? (
          <div className="kt-empty-state-rich">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.05]">
              <Activity className="h-5 w-5 animate-pulse text-zinc-100" />
            </div>

            <h2 className="text-[12px] font-black text-white">
              Analyse du portefeuille
            </h2>

            <p className="text-[11px] text-zinc-300">
              Recherche des variations de marché...
            </p>
          </div>
        ) : alerts.length === 0 ? (
          <div className="kt-empty-state-rich py-10">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-green-500/10 text-green-400">
              <CheckCircle2 className="h-8 w-8" />
            </div>

            <h2 className="text-[14px] font-black text-white">
              Aucune alerte pour le moment
            </h2>

            <p className="mx-auto max-w-lg text-[11px] leading-5 text-zinc-300">
              Ton portefeuille ne présente actuellement aucune variation
              importante détectée par le moteur d&apos;alertes V5.
            </p>
            <div className="mt-2 grid w-full max-w-xl grid-cols-3 gap-2">
              <div className="kt-subpanel px-2 py-2 text-[9px] text-zinc-300">Collection analysée</div>
              <div className="kt-subpanel px-2 py-2 text-[9px] text-zinc-300">Favoris surveillés</div>
              <div className="kt-subpanel px-2 py-2 text-[9px] text-zinc-300">Variations importantes</div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {alertGroups.map((group) => {
              const showAll = Boolean(expandedGroups[group.key]);
              const visible = showAll ? group.items : group.items.slice(0, 5);
              const groupClasses =
                group.tone === "rose"
                  ? {
                      border: "border-rose-300/16",
                      bg: "bg-rose-400/[0.025]",
                      text: "text-rose-300",
                    }
                  : group.tone === "amber"
                    ? {
                        border: "border-amber-300/16",
                        bg: "bg-amber-400/[0.025]",
                        text: "text-amber-300",
                      }
                    : {
                        border: "border-cyan-300/16",
                        bg: "bg-cyan-400/[0.025]",
                        text: "text-cyan-300",
                      };

              return (
                <div
                  key={group.key}
                  className={`overflow-hidden rounded-[18px] border ${groupClasses.border} ${groupClasses.bg}`}
                >
                  <div className="flex items-center justify-between gap-3 px-3.5 py-3">
                    <div className="min-w-0">
                      <h2 className={`text-[10px] font-black uppercase tracking-[0.11em] ${groupClasses.text}`}>
                        {group.title}
                      </h2>
                      <p className="mt-0.5 truncate text-[9px] text-zinc-400">{group.subtitle}</p>
                    </div>
                    <span className={`shrink-0 rounded-full border px-2 py-1 text-[9px] font-black ${groupClasses.border} ${groupClasses.text}`}>
                      {group.items.length}
                    </span>
                  </div>

                  <div className="border-t border-white/[0.05] p-2">
                    {visible.map((alert, index) => {
                      const config = getAlertConfig(alert.type);
                      const premiumKey = `${alert.cardId}-${group.key}-${index}`;
                      const isOpen = Boolean(premiumOpen[premiumKey]);
                      const premiumInsight = getPremiumAlertInsight(alert);

                      return (
                        <div key={premiumKey} className="border-b border-white/[0.05] last:border-b-0">
                          <button
                            type="button"
                            onClick={() =>
                              setPremiumOpen((current) => ({
                                ...current,
                                [premiumKey]: !current[premiumKey],
                              }))
                            }
                            className="flex w-full items-center gap-2 px-2 py-2 text-left"
                          >
                            <span
                              className="h-1.5 w-1.5 shrink-0 rounded-full"
                              style={{ background: config.accent }}
                            />
                            <span className="min-w-0 flex-1 truncate text-[10px] font-black text-white">
                              {alert.cardName}
                              {alert.cardNumber ? (
                                <span className="ml-1 text-[9px] font-bold text-cyan-300">#{alert.cardNumber}</span>
                              ) : null}
                            </span>
                            <span
                              className="shrink-0 text-[10px] font-black tabular-nums"
                              style={{ color: config.accent }}
                            >
                              {alert.changePercent > 0 ? "+" : ""}{alert.changePercent.toFixed(1)} %
                            </span>
                            <ChevronDown className={`h-3 w-3 shrink-0 text-zinc-500 transition ${isOpen ? "rotate-180" : ""}`} />
                          </button>

                          {isOpen ? (
                            <div className="mx-2 mb-2 space-y-2 rounded-xl border border-white/[0.06] bg-black/10 px-3 py-2.5 text-[10px] leading-4">
                              <div>
                                <p className="text-[9px] font-black uppercase tracking-[0.1em] text-cyan-300">
                                  Lecture Standard
                                </p>
                                <p className="mt-1 text-zinc-300">
                                  {alert.type === "RISE"
                                    ? `Hausse de ${Math.abs(alert.changePercent).toFixed(2)} % sur 7 jours · signal positif à confirmer.`
                                    : alert.type === "DROP"
                                      ? `Baisse de ${Math.abs(alert.changePercent).toFixed(2)} % sur 7 jours · repli à surveiller.`
                                      : `Signal de ${Math.abs(alert.changePercent).toFixed(2)} % · observation recommandée.`}
                                </p>
                              </div>

                              <div className="border-t border-amber-300/10 pt-2">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/30 bg-amber-300/[0.07] px-2 py-1 text-[8px] font-black uppercase tracking-[0.09em] text-amber-300">
                                    <Crown className="h-3 w-3" />
                                    Analyse Premium
                                  </span>
                                  {!hasPremiumAccess ? (
                                    <span className="text-[8px] font-black uppercase text-zinc-500">Verrouillée</span>
                                  ) : null}
                                </div>

                                {hasPremiumAccess ? (
                                  <div className="mt-2 space-y-1.5">
                                    <p className="flex items-start gap-2 text-zinc-300">
                                      <SearchCheck className="mt-0.5 h-3 w-3 shrink-0 text-amber-300" />
                                      <span>Cause : <strong className="text-white">{premiumInsight.cause}</strong></span>
                                    </p>
                                    <p className="flex items-start gap-2 text-zinc-300">
                                      <BrainCircuit className="mt-0.5 h-3 w-3 shrink-0 text-amber-300" />
                                      <span>Lecture : <strong className="text-white">{premiumInsight.reading}</strong></span>
                                    </p>
                                    <p className="text-zinc-400">
                                      Couverture : <strong className="text-white">{alert.dataCoverage} % · {alert.dataQualityLabel}</strong>
                                    </p>
                                    <p className="text-[9px] text-zinc-500">Base : {alert.evidence.join(" · ")}.</p>
                                  </div>
                                ) : (
                                  <p className="mt-2 text-[9px] leading-4 text-zinc-500">
                                    Passez en Premium pour afficher la cause détaillée, la lecture King_TCG et la couverture des données.
                                  </p>
                                )}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      );
                    })}

                    {group.items.length > 5 ? (
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedGroups((current) => ({
                            ...current,
                            [group.key]: !current[group.key],
                          }))
                        }
                        className="mt-1 flex w-full items-center justify-center gap-1 rounded-lg border border-white/[0.05] bg-white/[0.02] py-1.5 text-[9px] font-black text-zinc-300"
                      >
                        {showAll ? "Réduire la liste" : `Voir les ${group.items.length - 5} autres`}
                        <ChevronDown className={`h-3 w-3 transition ${showAll ? "rotate-180" : ""}`} />
                      </button>
                    ) : null}
                  </div>
                </div>
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
