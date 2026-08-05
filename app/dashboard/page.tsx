"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Download,
  Upload,
  Wallet,
  Sparkles,
  Trophy,
  ShieldAlert,
  Package,
  History,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

import Navbar from "@/components/Navbar";
import {
  getCollection,
  getBuyPrice,
  getCondition,
  getCardQuantity,
} from "@/lib/storage";
import { getCardById } from "@/lib/pokemon";
import {
  getMarketData,
  type MarketPrices,
} from "@/lib/marketEngine";
import type {
  CardCondition,
  PokemonCard,
} from "@/lib/types";

type DashboardCard = {
  id: string;
  name: string;
  number: string;
  rarity?: string;
  images: {
    small: string;
    large: string;
  };
  condition: CardCondition;
  qty: number;
  buyPrice: number;
  currentPrice: number;
  priceTrend7d: number;
  priceTrend30d: number;
  score: number;
};

function formatEuro(value: number): string {
  return value.toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function getStrategicScore(
  card: PokemonCard,
  currentPrice: number
): number {
  let score = 5;

  const rarity = (card.rarity || "").toLowerCase();

  if (
    rarity.includes("illustration") ||
    rarity.includes("alternative") ||
    rarity.includes("alt art") ||
    rarity.includes("secret")
  ) {
    score += 1.5;
  } else if (
    rarity.includes("ultra") ||
    rarity.includes("vmax") ||
    rarity.includes("vstar") ||
    rarity.includes("ex")
  ) {
    score += 0.5;
  } else if (rarity.includes("rare")) {
    score += 0.25;
  }

  if (currentPrice > 250) {
    score -= 0.5;
  }

  if (currentPrice > 0 && currentPrice < 25) {
    score += 0.5;
  }

  return Math.max(
    0,
    Math.min(10, Number(score.toFixed(1)))
  );
}

/**
 * Construit une projection sur 7 jours.
 *
 * IMPORTANT :
 * Ces valeurs sont des projections calculées à partir
 * du prix actuel et de la tendance réelle 7j.
 * Ce ne sont PAS des données historiques.
 */
function buildSevenDayProjection(
  currentPrice: number,
  trend7d: number
): number[] {
  if (
    currentPrice <= 0 ||
    !Number.isFinite(currentPrice)
  ) {
    return [];
  }

  const weeklyMultiplier =
    1 + trend7d / 100;

  const safeMultiplier =
    Number.isFinite(weeklyMultiplier) &&
    weeklyMultiplier > 0
      ? weeklyMultiplier
      : 1;

  return Array.from(
    { length: 7 },
    (_, index) => {
      const progress = index / 6;

      const value =
        currentPrice *
        (1 +
          (safeMultiplier - 1) *
            progress);

      return Number(
        value.toFixed(2)
      );
    }
  );
}

/**
 * Graphique moderne de projection 7 jours.
 */
function SevenDayChart({
  values,
}: {
  values: number[];
}) {
  if (!values.length) {
    return (
      <div className="flex h-56 items-center justify-center text-[11px] font-bold text-zinc-600">
        Données de marché insuffisantes.
      </div>
    );
  }

  const width = 700;
  const height = 260;
  const paddingX = 30;
  const paddingTop = 28;
  const paddingBottom = 34;

  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const range = maxValue - minValue || 1;

  const points = values.map((value, index) => {
    const x =
      paddingX +
      (index / Math.max(values.length - 1, 1)) *
        (width - paddingX * 2);

    const y =
      paddingTop +
      (1 - (value - minValue) / range) *
        (height - paddingTop - paddingBottom);

    return { x, y, value };
  });

  // Courbe Bézier continue : les 7 valeurs sont conservées,
  // sans donner l'impression de simples points reliés.
  const linePath = points.reduce((path, point, index) => {
    if (index === 0) {
      return `M ${point.x} ${point.y}`;
    }

    const previous = points[index - 1];
    const midpoint = (previous.x + point.x) / 2;

    return (
      `${path} ` +
      `C ${midpoint} ${previous.y}, ` +
      `${midpoint} ${point.y}, ` +
      `${point.x} ${point.y}`
    );
  }, "");

  const baseline = height - paddingBottom;
  const areaPath =
    `${linePath} ` +
    `L ${points[points.length - 1].x} ${baseline} ` +
    `L ${points[0].x} ${baseline} Z`;

  const first = values[0];
  const last = values[values.length - 1];
  const variation = first > 0 ? ((last - first) / first) * 100 : 0;
  const currentPoint = points[points.length - 1];
  const dayLabels = ["Auj.", "+1j", "+2j", "+3j", "+4j", "+5j", "+6j"];

  return (
    <div className="relative w-full">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-400/15 bg-cyan-400/[0.06]">
            <span className="text-sm">📈</span>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
              Évolution projetée
            </p>
            <p className="text-[9px] font-medium text-zinc-600">
              Valeur estimée • 7 jours
            </p>
          </div>
        </div>

        <div className="rounded-full border border-cyan-400/10 bg-cyan-400/[0.05] px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-cyan-400">
          J+6
        </div>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0b0f14] px-2 pt-3 shadow-inner sm:px-4">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-cyan-400/[0.025]" />

        <div className="relative h-56 w-full sm:h-64">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            preserveAspectRatio="none"
            className="h-full w-full overflow-visible"
            aria-label="Courbe d'évolution projetée sur 7 jours"
            role="img"
          >
            <defs>
              <linearGradient
                id="sevenDayGradient"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="0%"
                  stopColor="rgb(34 211 238)"
                  stopOpacity="0.22"
                />
                <stop
                  offset="100%"
                  stopColor="rgb(34 211 238)"
                  stopOpacity="0"
                />
              </linearGradient>
            </defs>

            {[0, 1, 2, 3].map((line) => {
              const y =
                paddingTop +
                (line / 3) * (height - paddingTop - paddingBottom);

              return (
                <line
                  key={line}
                  x1={paddingX}
                  x2={width - paddingX}
                  y1={y}
                  y2={y}
                  stroke="currentColor"
                  className="text-zinc-900"
                  strokeWidth="1"
                />
              );
            })}

            <path d={areaPath} fill="url(#sevenDayGradient)" />

            <path
              d={linePath}
              fill="none"
              stroke="rgb(34 211 238)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            <circle
              cx={currentPoint.x}
              cy={currentPoint.y}
              r="10"
              fill="rgb(34 211 238)"
              fillOpacity="0.07"
            />
            <circle
              cx={currentPoint.x}
              cy={currentPoint.y}
              r="4.5"
              fill="rgb(9 9 11)"
              stroke="rgb(34 211 238)"
              strokeWidth="2"
            />

            <text
              x={currentPoint.x}
              y={currentPoint.y - 13}
              textAnchor="middle"
              className="fill-white text-[8px] font-black"
            >
              {formatEuro(last)}€
            </text>

            {points.map((point, index) => (
              <text
                key={`label-${index}`}
                x={point.x}
                y={height - 10}
                textAnchor="middle"
                className="fill-zinc-600 text-[9px] font-bold"
              >
                {dayLabels[index]}
              </text>
            ))}
          </svg>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3">
        <div>
          <p className="text-[8px] font-black uppercase tracking-widest text-zinc-600">
            Départ
          </p>
          <p className="mt-1 text-xs font-bold tabular-nums text-zinc-400">
            {formatEuro(first)} €
          </p>
        </div>

        <div className="text-center">
          <p className="text-[8px] font-black uppercase tracking-widest text-zinc-600">
            Projection
          </p>
          <p
            className={`mt-1 text-sm font-black tabular-nums ${
              variation >= 0 ? "text-emerald-400" : "text-rose-400"
            }`}
          >
            {variation >= 0 ? "+" : ""}
            {variation.toFixed(1)} %
          </p>
        </div>

        <div className="text-right">
          <p className="text-[8px] font-black uppercase tracking-widest text-zinc-600">
            J+6
          </p>
          <p className="mt-1 text-xs font-bold tabular-nums text-white">
            {formatEuro(last)} €
          </p>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [cards, setCards] =
    useState<DashboardCard[]>([]);

  const [message, setMessage] =
    useState<string | null>(null);

  const [expanded, setExpanded] =
    useState<string | null>(null);

  const [loading, setLoading] =
    useState(true);

  const fileRef =
    useRef<HTMLInputElement>(null);

  const refresh = async () => {
    try {
      setLoading(true);

      const collection =
        getCollection();

      const ids =
        Object.keys(collection);

      if (!ids.length) {
        setCards([]);
        return;
      }

      const loadedCards =
        await Promise.all(
          ids.map(
            async (
              id
            ): Promise<DashboardCard | null> => {
              try {
                const entry =
                  collection[id];

                if (!entry) {
                  return null;
                }

                const card =
                  await getCardById(id);

                if (!card) {
                  console.warn(
                    `[King_TCG] Carte introuvable pour ${id}`
                  );

                  return null;
                }

                /*
                 * IMPORTANT :
                 *
                 * La quantité vient de COLLECTION_KEY.
                 * Le prix d'achat et l'état viennent
                 * de COLLECTION_INFO_KEY.
                 *
                 * On ne lit donc PAS buyPrice depuis
                 * collection[id].
                 */
                const qty =
                  getCardQuantity(id);

                const buyPrice =
                  getBuyPrice(id);

                const condition =
                  getCondition(id);

                const market: MarketPrices =
                  getMarketData(
                    card
                  );

                const currentPrice =
                  Number.isFinite(
                    market.average
                  ) &&
                  market.average >
                    0
                    ? market.average
                    : 0;

                const score =
                  getStrategicScore(
                    card,
                    currentPrice
                  );

                return {
                  id: card.id,
                  name: card.name,
                  number:
                    card.number,
                  rarity:
                    card.rarity,
                  images: {
                    small:
                      card.images
                        ?.small ||
                      "",
                    large:
                      card.images
                        ?.large ||
                      "",
                  },
                  condition:
                    condition as CardCondition,
                  qty,
                  buyPrice,
                  currentPrice,
                  priceTrend7d:
                    Number.isFinite(
                      market.priceTrend7d
                    )
                      ? market.priceTrend7d
                      : 0,
                  priceTrend30d:
                    Number.isFinite(
                      market.priceTrend30d
                    )
                      ? market.priceTrend30d
                      : 0,
                  score,
                };
              } catch (error) {
                console.error(
                  `[King_TCG] Dashboard card error ${id}:`,
                  error
                );

                return null;
              }
            }
          )
        );

      const validCards =
        loadedCards.filter(
          (
            card
          ): card is DashboardCard =>
            card !== null
        );

      setCards(
        validCards
      );
    } catch (error) {
      console.error(
        "[King_TCG] Dashboard refresh error:",
        error
      );

      setCards([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();

    const handler =
      () => {
        void refresh();
      };

    window.addEventListener(
      "king_tcg_update",
      handler
    );

    window.addEventListener(
      "storage",
      handler
    );

    return () => {
      window.removeEventListener(
        "king_tcg_update",
        handler
      );

      window.removeEventListener(
        "storage",
        handler
      );
    };
  }, []);

  const stats =
    useMemo(() => {
      let investment = 0;
      let current = 0;

      for (const card of cards) {
        investment +=
          card.buyPrice *
          card.qty;

        current +=
          card.currentPrice *
          card.qty;
      }

      const profit =
        current -
        investment;

      const performance =
        investment > 0
          ? (profit /
              investment) *
            100
          : 0;

      return {
        investment,
        current,
        profit,
        performance,
      };
    }, [cards]);

  const scoredCards =
    useMemo(() => {
      return [
        ...cards,
      ].sort(
        (a, b) =>
          b.score -
          a.score
      );
    }, [cards]);

  const strategicScoreGlobal =
    useMemo(() => {
      if (!cards.length) {
        return 0;
      }

      return Number(
        (
          cards.reduce(
            (
              sum,
              card
            ) =>
              sum +
              card.score,
            0
          ) /
          cards.length
        ).toFixed(1)
      );
    }, [cards]);

  const featured =
    scoredCards[0] ||
    null;

  const topPerformances =
    useMemo(() => {
      return [
        ...cards,
      ]
        .sort(
          (a, b) => {
            const gainA =
              a.buyPrice >
              0
                ? ((a.currentPrice -
                    a.buyPrice) /
                    a.buyPrice) *
                  100
                : 0;

            const gainB =
              b.buyPrice >
              0
                ? ((b.currentPrice -
                    b.buyPrice) /
                    b.buyPrice) *
                  100
                : 0;

            return (
              gainB -
              gainA
            );
          }
        )
        .slice(0, 3);
    }, [cards]);

  const averageTrend7d =
    useMemo(() => {
      if (!cards.length) {
        return 0;
      }

      const cardsWithTrend =
        cards.filter(
          (card) =>
            Number.isFinite(
              card.priceTrend7d
            )
        );

      if (
        !cardsWithTrend.length
      ) {
        return 0;
      }

      return Number(
        (
          cardsWithTrend.reduce(
            (
              sum,
              card
            ) =>
              sum +
              card.priceTrend7d,
            0
          ) /
          cardsWithTrend.length
        ).toFixed(1)
      );
    }, [cards]);

  const exportData =
    () => {
      try {
        const data =
          JSON.stringify(
            {
              version:
                "King_TCG_V5",
              exportedAt:
                new Date().toISOString(),
              cards,
            },
            null,
            2
          );

        const blob =
          new Blob(
            [data],
            {
              type: "application/json",
            }
          );

        const url =
          URL.createObjectURL(
            blob
          );

        const link =
          document.createElement(
            "a"
          );

        link.href = url;

        link.download =
          `king_tcg_v5_dashboard_${new Date()
            .toISOString()
            .slice(
              0,
              10
            )}.json`;

        link.click();

        URL.revokeObjectURL(
          url
        );

        setMessage(
          "Sauvegarde exportée avec succès."
        );

        setTimeout(
          () =>
            setMessage(
              null
            ),
          4000
        );
      } catch (error) {
        console.error(
          error
        );

        setMessage(
          "Erreur lors de l'export."
        );
      }
    };

  const importData =
    (file: File) => {
      const reader =
        new FileReader();

      reader.onload =
        () => {
          try {
            const raw =
              reader.result;

            if (
              typeof raw !==
              "string"
            ) {
              throw new Error(
                "Fichier invalide"
              );
            }

            const parsed =
              JSON.parse(raw);

            if (
              !parsed ||
              typeof parsed !==
                "object"
            ) {
              throw new Error(
                "Format invalide"
              );
            }

            /*
             * L'import Dashboard reste
             * séparé de la collection réelle.
             */
            if (
              Array.isArray(
                parsed.cards
              )
            ) {
              localStorage.setItem(
                "king_tcg_dashboard_import",
                JSON.stringify(
                  parsed.cards
                )
              );
            }

            setMessage(
              "Sauvegarde importée."
            );

            void refresh();

            setTimeout(
              () =>
                setMessage(
                  null
                ),
              4000
            );
          } catch (error) {
            console.error(
              error
            );

            setMessage(
              "Erreur : fichier de sauvegarde invalide."
            );

            setTimeout(
              () =>
                setMessage(
                  null
                ),
              4000
            );
          }
        };

      reader.readAsText(
        file
      );
    };

  return (
    <>
      <Navbar />

      <main className="kt-app-shell pb-32 selection:bg-cyan-500/20">
        <div className="kt-page max-w-xl space-y-5">

          {/* HEADER */}
          <div className="flex items-center justify-between">
            <div />

            <div className="flex items-center gap-2">
              <button
                onClick={
                  exportData
                }
                className="flex items-center gap-1.5 kt-secondary-button px-3 py-2 text-[10px] font-black uppercase tracking-wider text-zinc-300 hover:border-cyan-500/50 hover:text-cyan-400 transition-all"
              >
                <Download className="w-3.5 h-3.5 text-cyan-400" />
                Exporter
              </button>

              <button
                onClick={() =>
                  fileRef.current?.click()
                }
                className="flex items-center gap-1.5 kt-secondary-button px-3 py-2 text-[10px] font-black uppercase tracking-wider text-zinc-300 hover:border-cyan-500/50 hover:text-cyan-400 transition-all"
              >
                <Upload className="w-3.5 h-3.5 text-cyan-400" />
                Importer
              </button>

              <input
                ref={fileRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={(
                  event
                ) => {
                  const file =
                    event.target
                      .files?.[0];

                  if (file) {
                    importData(
                      file
                    );
                  }

                  event.currentTarget.value =
                    "";
                }}
              />
            </div>
          </div>

          {message && (
            <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/20 p-3 text-center text-xs font-bold text-cyan-400">
              {message}
            </div>
          )}

          {/* MAIN HEADER */}
          <section className="kt-premium-card kt-rise-in flex flex-col gap-3 p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[9px] font-black uppercase tracking-widest">
                <Sparkles className="w-3 h-3" />
                Suivi portefeuille
              </div>

              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                {cards.length}{" "}
                {cards.length >
                1
                  ? "actifs"
                  : "actif"}
              </span>
            </div>

            <div>
              <h1 className="text-lg font-black uppercase tracking-tight text-white">
                Tableau de bord
              </h1>

              <p className="text-[11px] text-zinc-400 mt-0.5">
                Visualisez la valeur de votre collection, votre investissement et les principales tendances du marché en un coup d’œil.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-zinc-800/80">
              <div className="kt-premium-card-soft rounded-xl p-3">
                <span className="text-zinc-500 text-[10px] block font-black uppercase tracking-wider">
                  Investissement
                </span>

                <span className="font-black text-white text-sm tabular-nums mt-0.5 block">
                  {formatEuro(
                    stats.investment
                  )}{" "}
                  €
                </span>
              </div>

              <div className="kt-premium-card-soft rounded-xl p-3">
                <span className="text-zinc-500 text-[10px] block font-black uppercase tracking-wider">
                  Profit Net
                </span>

                <span
                  className={`font-black text-sm tabular-nums mt-0.5 block ${
                    stats.profit >=
                    0
                      ? "text-emerald-400"
                      : "text-rose-400"
                  }`}
                >
                  {stats.profit >=
                  0
                    ? "+"
                    : ""}
                  {formatEuro(
                    stats.profit
                  )}{" "}
                  €
                </span>
              </div>
            </div>
          </section>

          {/* KPI */}
          <section className="grid gap-3 grid-cols-2">
            <div className="kt-premium-card kt-interactive-card flex min-h-[104px] flex-col justify-between rounded-[18px] p-4">
              <div className="flex justify-between items-start">
                <span className="text-zinc-500 text-[10px] font-black uppercase tracking-wider">
                  Valeur Actuelle
                </span>

                <Wallet className="w-4 h-4 text-cyan-400" />
              </div>

              <div className="text-lg font-black text-white tabular-nums mt-2">
                {formatEuro(
                  stats.current
                )}{" "}
                €
              </div>
            </div>

            <div className="kt-premium-card kt-interactive-card flex min-h-[104px] flex-col justify-between rounded-[18px] p-4">
              <div className="flex justify-between items-start">
                <span className="text-zinc-500 text-[10px] font-black uppercase tracking-wider">
                  Rendement Global
                </span>

                <Sparkles className="w-4 h-4 text-cyan-400" />
              </div>

              <div
                className={`text-lg font-black tabular-nums mt-2 ${
                  stats.performance >=
                  0
                    ? "text-emerald-400"
                    : "text-rose-400"
                }`}
              >
                {stats.performance >=
                0
                  ? "+"
                  : ""}
                {stats.performance.toFixed(
                  2
                )}{" "}
                %
              </div>
            </div>

            <div className="kt-premium-card kt-interactive-card flex min-h-[104px] flex-col justify-between rounded-[18px] p-4">
              <div className="flex justify-between items-start">
                <span className="text-zinc-500 text-[10px] font-black uppercase tracking-wider">
                  Score Stratégique
                </span>

                <ShieldAlert className="w-4 h-4 text-cyan-400" />
              </div>

              <div className="text-lg font-black text-white tabular-nums mt-2">
                {strategicScoreGlobal.toFixed(
                  1
                )}
                <span className="text-[10px] text-zinc-500 font-bold uppercase">
                  {" "}
                  / 10
                </span>
              </div>
            </div>

            <div className="kt-premium-card kt-interactive-card flex min-h-[104px] flex-col justify-between rounded-[18px] p-4">
              <div className="flex justify-between items-start">
                <span className="text-zinc-500 text-[10px] font-black uppercase tracking-wider">
                  Actif Phare
                </span>

                <Trophy className="w-4 h-4 text-cyan-400" />
              </div>

              <div className="text-xs font-bold text-white truncate mt-2">
                {featured?.name || (
                  <span className="text-zinc-600 font-medium italic">
                    Aucun actif
                  </span>
                )}
              </div>
            </div>
          </section>

          {/* ANALYSES */}
          <div className="space-y-4 pt-2">
            <h2 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 px-1 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              Fluctuations & analyses de marché
            </h2>

            {/* COURBE 7 JOURS */}
            <section className="kt-premium-card rounded-[18px] p-5 sm:p-6">
              <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-zinc-500">
                    Projection du prix
                    sur 7 jours
                  </p>

                  <h2 className="mt-1 text-2xl sm:text-3xl font-black tracking-tight text-white tabular-nums">
                    {formatEuro(
                      stats.current
                    )}{" "}
                    €
                  </h2>

                  <p className="mt-0.5 text-xs font-bold flex items-center gap-1">
                    <span
                      className={
                        averageTrend7d >=
                        0
                          ? "text-emerald-400"
                          : "text-rose-400"
                      }
                    >
                      {averageTrend7d >=
                      0
                        ? "+"
                        : ""}
                      {averageTrend7d.toFixed(
                        1
                      )}{" "}
                      %
                    </span>

                    <span className="text-[10px] font-medium text-zinc-600 uppercase tracking-wide">
                      Tendance réelle 7j
                    </span>
                  </p>
                </div>

                <div className="self-start sm:self-center rounded-xl border border-cyan-500/20 bg-cyan-500/5 px-3 py-2 text-right">
                  <p className="text-[8px] font-black uppercase tracking-widest text-cyan-500/60">
                    Modèle
                  </p>

                  <p className="text-[10px] font-black uppercase text-cyan-400">
                    Projection V5
                  </p>
                </div>
              </div>

              {cards.length >
                0 &&
              stats.current >
                0 ? (
                <div className="rounded-2xl border border-zinc-900 bg-black/40 p-4 sm:p-5">
                  <SevenDayChart
                    values={buildSevenDayProjection(
                      stats.current,
                      averageTrend7d
                    )}
                  />

                  <div className="mt-5 flex items-center justify-between border-t border-zinc-900 pt-4">
                    <div>
                      <p className="text-[8px] font-black uppercase tracking-widest text-zinc-600">
                        Tendance marché
                      </p>

                      <p
                        className={`mt-1 text-xs font-black ${
                          averageTrend7d >=
                          0
                            ? "text-emerald-400"
                            : "text-rose-400"
                        }`}
                      >
                        {averageTrend7d >=
                        0
                          ? "+"
                          : ""}
                        {averageTrend7d.toFixed(
                          1
                        )}{" "}
                        %
                      </p>
                    </div>

                    <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-right">
                      <p className="text-[8px] font-black uppercase tracking-widest text-zinc-600">
                        Base
                      </p>

                      <p className="text-[10px] font-black uppercase text-zinc-400">
                        Marché réel 7j
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-56 flex items-center justify-center rounded-2xl border border-zinc-900 bg-black/40">
                  <p className="text-[11px] text-zinc-600 font-bold">
                    Aucune donnée de marché
                    disponible.
                  </p>
                </div>
              )}

              <p className="mt-4 text-[9px] text-zinc-700 text-center uppercase tracking-wider">
                Les valeurs futures sont
                des projections et non des
                prix historiques réels.
              </p>
            </section>

            {/* TOP PERFORMANCES */}
            <section className="kt-premium-card rounded-[18px] p-4 sm:p-5">
              <div className="flex items-center gap-2 mb-4">
                <Trophy className="w-4 h-4 text-cyan-400" />

                <h2 className="text-xs font-black uppercase tracking-widest text-zinc-400">
                  Top Performances V5
                </h2>
              </div>

              <div className="space-y-2">
                {topPerformances.length >
                0 ? (
                  topPerformances.map(
                    (
                      card
                    ) => {
                      const gain =
                        card.buyPrice >
                        0
                          ? ((card.currentPrice -
                              card.buyPrice) /
                              card.buyPrice) *
                            100
                          : 0;

                      return (
                        <div
                          key={
                            card.id
                          }
                          className="flex items-center justify-between rounded-lg border border-zinc-900/60 bg-neutral-950/50 p-3"
                        >
                          <div className="min-w-0 flex-1 pr-3">
                            <div className="font-bold text-white text-xs truncate">
                              {card.name ||
                                card.id}
                            </div>

                            <div className="text-[10px] text-zinc-500 font-medium mt-0.5">
                              Achat :{" "}
                              {formatEuro(
                                card.buyPrice
                              )}{" "}
                              €
                              {" · "}
                              Cours :{" "}
                              {formatEuro(
                                card.currentPrice
                              )}{" "}
                              €
                            </div>
                          </div>

                          <div
                            className={`font-black text-[10px] uppercase tracking-wider px-2 py-0.5 rounded ${
                              gain >=
                              0
                                ? "text-emerald-400 bg-emerald-500/5 border border-emerald-500/10"
                                : "text-rose-400 bg-rose-500/5 border border-rose-500/10"
                            }`}
                          >
                            {gain >=
                            0
                              ? "+"
                              : ""}
                            {gain.toFixed(
                              1
                            )}{" "}
                            %
                          </div>
                        </div>
                      );
                    }
                  )
                ) : (
                  <p className="text-zinc-600 font-bold text-[11px] py-1 italic">
                    Aucune fluctuation
                    d'actif à signaler.
                  </p>
                )}
              </div>
            </section>

            {/* HISTORIQUE */}
            <section className="kt-premium-card rounded-[18px] p-4 sm:p-5">
              <div className="flex items-center gap-2 mb-4">
                <History className="w-4 h-4 text-zinc-400" />

                <h2 className="text-xs font-black uppercase tracking-widest text-zinc-400">
                  Historique d'acquisition
                </h2>
              </div>

              <p className="text-[11px] font-bold text-zinc-600 py-1 italic">
                {cards.length
                  ? `${cards.length} carte${
                      cards.length >
                      1
                        ? "s"
                        : ""
                    } actuellement enregistrée${
                      cards.length >
                      1
                        ? "s"
                        : ""
                    } dans ta collection.`
                  : "Aucune entrée récente enregistrée."}
              </p>
            </section>
          </div>

          {/* INVENTAIRE */}
          <div className="space-y-4 pt-2">
            <h2 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 px-1 flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-cyan-400" />
              Inventaire des actifs
              ({cards.length})
            </h2>

            <div className="space-y-2.5">
              {scoredCards.map(
                (
                  card
                ) => {
                  const isExpanded =
                    expanded ===
                    card.id;

                  const totalCurrent =
                    card.currentPrice *
                    card.qty;

                  const totalBuy =
                    card.buyPrice *
                    card.qty;

                  const profit =
                    totalCurrent -
                    totalBuy;

                  return (
                    <div
                      key={
                        card.id
                      }
                      className={`kt-premium-card transition-all ${
                        isExpanded
                          ? "border-cyan-500/30 bg-neutral-900/80 p-4"
                          : "p-3.5 hover:border-zinc-800"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setExpanded(
                            isExpanded
                              ? null
                              : card.id
                          )
                        }
                        className="w-full text-left cursor-pointer flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-10 w-7 shrink-0 overflow-hidden rounded bg-black p-0.5 flex items-center justify-center border border-zinc-800">
                            {card.images
                              ?.small ? (
                              <img
                                src={
                                  card.images
                                    .small
                                }
                                alt={
                                  card.name ||
                                  "Carte"
                                }
                                className="h-full object-contain"
                              />
                            ) : (
                              <Package className="w-4 h-4 text-zinc-700" />
                            )}
                          </div>

                          <div className="min-w-0">
                            <h3 className="font-bold text-xs text-white truncate tracking-tight">
                              {card.name ||
                                card.id}
                            </h3>

                            <p className="text-[10px] text-zinc-400 font-medium mt-0.5 tabular-nums">
                              Unit. :{" "}
                              {formatEuro(
                                card.currentPrice
                              )}{" "}
                              €
                              {" · "}
                              {card.condition}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-zinc-400">
                          <span className="text-[10px] font-black px-2 py-0.5 bg-black/60 border border-zinc-800 rounded text-cyan-400">
                            x
                            {
                              card.qty
                            }
                          </span>

                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-cyan-400" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-zinc-600" />
                          )}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="mt-3.5 pt-3.5 border-t border-zinc-800/80">
                          <div className="grid grid-cols-3 gap-2 text-[10px]">
                            <div className="kt-premium-card-soft rounded-xl p-2.5 text-center">
                              <span className="text-zinc-500 font-medium block uppercase tracking-wider">
                                Achat
                              </span>

                              <span className="text-zinc-300 font-bold mt-1 block">
                                {formatEuro(
                                  totalBuy
                                )}{" "}
                                €
                              </span>
                            </div>

                            <div className="kt-premium-card-soft rounded-xl p-2.5 text-center">
                              <span className="text-zinc-500 font-medium block uppercase tracking-wider">
                                Actuelle
                              </span>

                              <span className="text-white font-bold mt-1 block">
                                {formatEuro(
                                  totalCurrent
                                )}{" "}
                                €
                              </span>
                            </div>

                            <div className="kt-premium-card-soft rounded-xl p-2.5 text-center">
                              <span className="text-zinc-500 font-medium block uppercase tracking-wider">
                                Profit Net
                              </span>

                              <span
                                className={`font-black mt-1 block ${
                                  profit >=
                                  0
                                    ? "text-emerald-400"
                                    : "text-rose-400"
                                }`}
                              >
                                {profit >=
                                0
                                  ? "+"
                                  : ""}
                                {formatEuro(
                                  profit
                                )}{" "}
                                €
                              </span>
                            </div>
                          </div>

                          <div className="mt-2 grid grid-cols-2 gap-2 text-[10px]">
                            <div className="kt-premium-card-soft rounded-xl p-2">
                              <span className="text-zinc-600 font-medium block uppercase tracking-wider">
                                Prix d'achat
                                unitaire
                              </span>

                              <span className="text-zinc-300 font-bold mt-0.5 block">
                                {formatEuro(
                                  card.buyPrice
                                )}{" "}
                                €
                              </span>
                            </div>

                            <div className="kt-premium-card-soft rounded-xl p-2">
                              <span className="text-zinc-600 font-medium block uppercase tracking-wider">
                                Rendement
                              </span>

                              <span
                                className={`font-bold mt-0.5 block ${
                                  card.buyPrice >
                                    0 &&
                                  card.currentPrice >=
                                    card.buyPrice
                                    ? "text-emerald-400"
                                    : "text-rose-400"
                                }`}
                              >
                                {card.buyPrice >
                                0
                                  ? `${(
                                      ((card.currentPrice -
                                        card.buyPrice) /
                                        card.buyPrice) *
                                      100
                                    ).toFixed(
                                      2
                                    )} %`
                                  : "N/A"}
                              </span>
                            </div>
                          </div>

                          <div className="mt-2 grid grid-cols-3 gap-2 text-[10px]">
                            <div className="kt-premium-card-soft rounded-xl p-2">
                              <span className="text-zinc-600 font-medium block uppercase tracking-wider">
                                Tendance 7j
                              </span>

                              <span
                                className={`font-bold mt-0.5 block ${
                                  card.priceTrend7d >=
                                  0
                                    ? "text-emerald-400"
                                    : "text-rose-400"
                                }`}
                              >
                                {card.priceTrend7d >=
                                0
                                  ? "+"
                                  : ""}
                                {
                                  card.priceTrend7d
                                }{" "}
                                %
                              </span>
                            </div>

                            <div className="kt-premium-card-soft rounded-xl p-2">
                              <span className="text-zinc-600 font-medium block uppercase tracking-wider">
                                Tendance 30j
                              </span>

                              <span
                                className={`font-bold mt-0.5 block ${
                                  card.priceTrend30d >=
                                  0
                                    ? "text-emerald-400"
                                    : "text-rose-400"
                                }`}
                              >
                                {card.priceTrend30d >=
                                0
                                  ? "+"
                                  : ""}
                                {
                                  card.priceTrend30d
                                }{" "}
                                %
                              </span>
                            </div>

                            <div className="kt-premium-card-soft rounded-xl p-2">
                              <span className="text-zinc-600 font-medium block uppercase tracking-wider">
                                Score
                              </span>

                              <span className="text-cyan-400 font-bold mt-0.5 block">
                                {card.score.toFixed(
                                  1
                                )}
                                /10
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                }
              )}

              {loading && (
                <div className="rounded-xl border border-zinc-900 bg-neutral-900/40 p-8 text-center">
                  <p className="text-xs font-bold text-zinc-500">
                    Chargement de la
                    collection...
                  </p>
                </div>
              )}

              {!loading &&
                cards.length ===
                  0 && (
                  <div className="rounded-xl border border-zinc-900 bg-neutral-900/40 p-8 text-center">
                    <Package className="w-8 h-8 text-zinc-700 mx-auto mb-3" />

                    <p className="text-xs font-bold text-zinc-500">
                      Aucun actif dans ton
                      portefeuille.
                    </p>

                    <p className="text-[10px] text-zinc-700 mt-1">
                      Ajoute des cartes depuis
                      la section Scanner ou
                      Recherche.
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
