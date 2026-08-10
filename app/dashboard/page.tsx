"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
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
import { getLastPrice, getMarketHistory } from "@/lib/priceHistory";
import {
  getMarketData,
  type MarketPrices,
} from "@/lib/marketEngine";
import type {
  CardCondition,
  PokemonCard,
} from "@/lib/types";
import ConditionValueBars, { type ConditionValueDatum } from "@/components/charts/ConditionValueBars";

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
  if (currentPrice <= 0 || !Number.isFinite(currentPrice)) {
    return [];
  }

  // Projection, pas historique : la direction générale suit la tendance
  // agrégée du portefeuille, tandis qu'une micro-volatilité bornée évite
  // une droite artificielle entre J0 et J+6. L'amplitude reste faible
  // (max ~0,45 %) et ne modifie jamais la cote de départ King_TCG.
  const safeTrend = Number.isFinite(trend7d)
    ? Math.max(-35, Math.min(35, trend7d))
    : 0;
  const weeklyMultiplier = Math.max(0.05, 1 + safeTrend / 100);
  const dailyWave = [0, 0.0026, -0.0017, 0.0034, -0.0022, 0.0015, 0];
  const trendVolatility = Math.min(0.0045, Math.abs(safeTrend) / 1000);

  return Array.from({ length: 7 }, (_, index) => {
    const progress = index / 6;
    const trendValue = currentPrice * (1 + (weeklyMultiplier - 1) * progress);
    const baseVolatility = 0.0018 + trendVolatility;
    const wave = dailyWave[index] * (baseVolatility / 0.0018);
    const value = index === 0
      ? currentPrice
      : index === 6
        ? currentPrice * weeklyMultiplier
        : trendValue * (1 + wave);

    return Number(Math.max(0.01, value).toFixed(2));
  });
}

/**
 * Graphique moderne de projection 7 jours.
 */
function SevenDayChart({ values }: { values: number[] }) {
  if (!values.length) {
    return (
      <div className="flex h-44 items-center justify-center text-[10px] font-bold text-zinc-500">
        Données de marché insuffisantes.
      </div>
    );
  }

  const width = 720;
  const height = 235;
  const paddingX = 30;
  const paddingTop = 25;
  const paddingBottom = 34;
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const rawRange = maxValue - minValue;
  const isFlat = Math.abs(rawRange) < 0.000001;
  const range = isFlat ? 1 : rawRange;
  const plotHeight = height - paddingTop - paddingBottom;

  const points = values.map((value, index) => ({
    value,
    x: paddingX + (index / Math.max(values.length - 1, 1)) * (width - paddingX * 2),
    // A 0% trend is still meaningful: render a visible horizontal line
    // in the middle of the graph instead of hiding it on the baseline.
    y: isFlat
      ? paddingTop + plotHeight / 2
      : paddingTop + (1 - (value - minValue) / range) * plotHeight,
  }));

  const linePath = points.reduce((path, point, index) => {
    if (index === 0) return `M ${point.x} ${point.y}`;
    const previous = points[index - 1];
    const controlX = (previous.x + point.x) / 2;
    return `${path} C ${controlX} ${previous.y}, ${controlX} ${point.y}, ${point.x} ${point.y}`;
  }, "");

  const baseline = height - paddingBottom;
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${baseline} L ${points[0].x} ${baseline} Z`;
  const first = values[0];
  const last = values[values.length - 1];
  const variation = first > 0 ? ((last - first) / first) * 100 : 0;
  const positive = variation >= 0;
  const labels = ["Auj.", "+1j", "+2j", "+3j", "+4j", "+5j", "+6j"];

  return (
    <div className="overflow-hidden rounded-[20px] border border-white/[0.1] bg-[#151c25] shadow-[0_18px_45px_rgba(0,0,0,.24)]">
      <div className="grid grid-cols-3 border-b border-white/[0.07] bg-[#1a222d]">
        <div className="p-3.5">
          <p className="text-[8px] font-black uppercase tracking-[0.14em] text-zinc-500">Valeur actuelle</p>
          <p className="mt-1 text-sm font-black tabular-nums text-white">{formatEuro(first)} €</p>
        </div>
        <div className="border-x border-white/[0.07] p-3.5 text-center">
          <p className="text-[8px] font-black uppercase tracking-[0.14em] text-zinc-500">Variation</p>
          <p className={`mt-1 text-sm font-black tabular-nums ${positive ? "text-sky-300" : "text-rose-300"}`}>
            {positive ? "+" : ""}{variation.toFixed(1)} %
          </p>
        </div>
        <div className="p-3.5 text-right">
          <p className="text-[8px] font-black uppercase tracking-[0.14em] text-zinc-500">Projection J+6</p>
          <p className="mt-1 text-sm font-black tabular-nums text-white">{formatEuro(last)} €</p>
        </div>
      </div>

      <div className="relative h-52 px-2 pt-3 sm:h-60 sm:px-4">
        <div className={`pointer-events-none absolute inset-x-0 top-0 h-24 ${positive ? "bg-sky-400/[0.04]" : "bg-rose-300/[0.035]"}`} />
        <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="h-full w-full" role="img" aria-label="Projection de la valeur sur sept jours">
          <defs>
            <linearGradient id="dashboardArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={positive ? "rgb(125 211 252)" : "rgb(253 164 175)"} stopOpacity="0.28" />
              <stop offset="75%" stopColor={positive ? "rgb(14 165 233)" : "rgb(244 63 94)"} stopOpacity="0.035" />
              <stop offset="100%" stopColor="transparent" stopOpacity="0" />
            </linearGradient>
            <filter id="dashboardGlow" x="-20%" y="-30%" width="140%" height="160%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {[0, 1, 2, 3].map((line) => {
            const y = paddingTop + (line / 3) * (height - paddingTop - paddingBottom);
            return <line key={line} x1={paddingX} x2={width - paddingX} y1={y} y2={y} stroke="rgba(255,255,255,.055)" strokeWidth="1" strokeDasharray="5 8" />;
          })}

          {points.map((point, index) => (
            <line key={`v-${index}`} x1={point.x} x2={point.x} y1={paddingTop} y2={baseline} stroke="rgba(255,255,255,.025)" strokeWidth="1" />
          ))}

          <path d={areaPath} fill="url(#dashboardArea)" />
          <path d={linePath} fill="none" stroke={positive ? "rgb(56 189 248)" : "rgb(253 164 175)"} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" filter="url(#dashboardGlow)" />

          {points.map((point, index) => index === points.length - 1 || index === 0 ? (
            <g key={`p-${index}`}>
              <circle cx={point.x} cy={point.y} r="7" fill={positive ? "rgba(56,189,248,.16)" : "rgba(253,164,175,.15)"} />
              <circle cx={point.x} cy={point.y} r="3.2" fill="#111827" stroke={positive ? "rgb(56 189 248)" : "rgb(253 164 175)"} strokeWidth="2" />
            </g>
          ) : null)}

          {points.map((point, index) => (
            <text key={`label-${index}`} x={point.x} y={height - 10} textAnchor="middle" className="fill-zinc-600 text-[9px] font-bold">{labels[index]}</text>
          ))}
        </svg>
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

                // V40: the dashboard must not trigger a full market sync.
                // Prefer the quote already attached to the card; when the
                // lightweight catalogue card has no price yet, reuse the last
                // King_TCG quote recorded locally for this card.
                const lastTrackedPrice = getLastPrice(card.id)?.average || 0;

                const currentPrice =
                  Number.isFinite(market.average) && market.average > 0
                    ? market.average
                    : Number.isFinite(lastTrackedPrice) && lastTrackedPrice > 0
                    ? lastTrackedPrice
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
                  priceTrend7d: (() => {
                    if (Number.isFinite(market.priceTrend7d) && Math.abs(market.priceTrend7d) > 0.001) {
                      return market.priceTrend7d;
                    }

                    const history = getMarketHistory(card.id)
                      .filter((point) => point?.average > 0)
                      .sort((a, b) => a.date - b.date);
                    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
                    const recent = history.filter((point) => point.date >= sevenDaysAgo);
                    if (recent.length >= 2 && recent[0].average > 0) {
                      return Number((((recent[recent.length - 1].average - recent[0].average) / recent[0].average) * 100).toFixed(2));
                    }

                    if (Number.isFinite(market.priceTrend30d) && Math.abs(market.priceTrend30d) > 0.001) {
                      const monthlyMultiplier = Math.max(0.05, 1 + market.priceTrend30d / 100);
                      return Number(((Math.pow(monthlyMultiplier, 7 / 30) - 1) * 100).toFixed(2));
                    }

                    return 0;
                  })(),
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
      const weighted = cards
        .filter((card) => card.currentPrice > 0 && card.qty > 0 && Number.isFinite(card.priceTrend7d))
        .map((card) => ({
          weight: card.currentPrice * card.qty,
          trend: card.priceTrend7d,
        }));

      const totalWeight = weighted.reduce((sum, item) => sum + item.weight, 0);
      if (totalWeight <= 0) return 0;

      return Number((
        weighted.reduce((sum, item) => sum + item.trend * item.weight, 0) / totalWeight
      ).toFixed(2));
    }, [cards]);

  const conditionValueData =
    useMemo<ConditionValueDatum[]>(() => {
      const order: CardCondition[] = [
        "Near Mint",
        "Excellent",
        "Good",
        "Light Played",
        "Played",
        "Poor",
      ];

      return order.map((condition) => {
        const matching = cards.filter((card) => card.condition === condition);
        return {
          condition,
          count: matching.reduce((sum, card) => sum + card.qty, 0),
          value: matching.reduce((sum, card) => sum + card.currentPrice * card.qty, 0),
        };
      });
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
        <div className="kt-page max-w-6xl space-y-5">

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

            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/[0.09]">
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
          <section className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            <div className="kt-premium-card kt-interactive-card flex min-h-[72px] flex-col justify-between rounded-[14px] p-3">
              <div className="flex justify-between items-start">
                <span className="text-zinc-500 text-[9px] font-black uppercase tracking-wider">
                  Valeur Actuelle
                </span>

                <Wallet className="w-4 h-4 text-cyan-400" />
              </div>

              <div className="text-base font-black text-white tabular-nums mt-1">
                {formatEuro(
                  stats.current
                )}{" "}
                €
              </div>
            </div>

            <div className="kt-premium-card kt-interactive-card flex min-h-[72px] flex-col justify-between rounded-[14px] p-3">
              <div className="flex justify-between items-start">
                <span className="text-zinc-500 text-[9px] font-black uppercase tracking-wider">
                  Rendement Global
                </span>

                <Sparkles className="w-4 h-4 text-cyan-400" />
              </div>

              <div
                className={`text-base font-black tabular-nums mt-1 ${
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

            <div className="kt-premium-card kt-interactive-card flex min-h-[72px] flex-col justify-between rounded-[14px] p-3">
              <div className="flex justify-between items-start">
                <span className="text-zinc-500 text-[9px] font-black uppercase tracking-wider">
                  Score Stratégique
                </span>

                <ShieldAlert className="w-4 h-4 text-cyan-400" />
              </div>

              <div className="text-base font-black text-white tabular-nums mt-1">
                {strategicScoreGlobal.toFixed(
                  1
                )}
                <span className="text-[10px] text-zinc-500 font-bold uppercase">
                  {" "}
                  / 10
                </span>
              </div>
            </div>

            <div className="kt-premium-card kt-interactive-card flex min-h-[72px] flex-col justify-between rounded-[14px] p-3">
              <div className="flex justify-between items-start">
                <span className="text-zinc-500 text-[9px] font-black uppercase tracking-wider">
                  Actif Phare
                </span>

                <Trophy className="w-4 h-4 text-cyan-400" />
              </div>

              <div className="text-xs font-bold text-white truncate mt-2">
                {featured?.name || (
                  <span className="text-zinc-500 font-medium italic">
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
            <section className="kt-premium-card overflow-hidden rounded-[22px] p-4 sm:p-5 lg:p-6">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-zinc-500">
                    Projection portefeuille · 7 jours
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
                          ? "text-sky-300"
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

                    <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide">
                      Tendance agrégée 7j
                    </span>
                  </p>
                </div>

                <div className="self-start rounded-xl border border-sky-300/20 bg-sky-400/[0.08] px-3 py-2 text-right shadow-[0_8px_24px_rgba(14,165,233,.08)] sm:self-auto">
                  <p className="text-[8px] font-black uppercase tracking-widest text-sky-300/70">
                    Modèle
                  </p>

                  <p className="text-[10px] font-black uppercase text-sky-200">
                    Projection V5
                  </p>
                </div>
              </div>

              {cards.length >
                0 &&
              stats.current >
                0 ? (
                <SevenDayChart
                  values={buildSevenDayProjection(
                    stats.current,
                    averageTrend7d
                  )}
                />
              ) : (
                <div className="h-56 flex items-center justify-center rounded-2xl border border-white/[0.08] bg-black/40">
                  <p className="text-[11px] text-zinc-500 font-bold">
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
            <section className="kt-premium-card rounded-[18px] p-3.5 sm:p-4">
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
                          className="flex items-center justify-between rounded-2xl border border-white/[0.07] bg-[#1a222c] p-3.5 transition hover:border-white/[0.12]"
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
                  <p className="text-zinc-500 font-bold text-[11px] py-1 italic">
                    Aucune fluctuation
                    d'actif à signaler.
                  </p>
                )}
              </div>
            </section>

            {/* HISTORIQUE */}
            <section className="kt-premium-card rounded-[18px] p-3.5 sm:p-4">
              <div className="flex items-center gap-2 mb-4">
                <History className="w-4 h-4 text-violet-300" />

                <h2 className="text-xs font-black uppercase tracking-widest text-zinc-400">
                  Historique d'acquisition
                </h2>
              </div>

              <p className="text-[11px] font-bold text-zinc-500 py-1 italic">
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

          <section className="kt-premium-card rounded-[20px] p-4 sm:p-5">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-amber-300" />
                  <h2 className="text-xs font-black uppercase tracking-[0.14em] text-white">Valeur par état</h2>
                </div>
                <p className="mt-1 text-[10px] leading-4 text-zinc-500">Vue compacte de la valeur et du volume par état.</p>
              </div>
              <Link href="/dashboard/cartes" className="shrink-0 text-[9px] font-black uppercase tracking-wider text-amber-200 hover:text-white">Détails</Link>
            </div>
            <ConditionValueBars data={conditionValueData} />
          </section>

          {/* INVENTAIRE */}
          <div className="space-y-4 pt-2">
            <h2 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 px-1 flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-violet-300" />
              Inventaire des actifs
              ({cards.length})
            </h2>

            <div className="space-y-2.5">
              {scoredCards.slice(0, 3).map(
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
                            <ChevronDown className="w-4 h-4 text-zinc-500" />
                          )}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="mt-3.5 pt-3.5 border-t border-white/[0.09]">
                          <div className="grid grid-cols-5 gap-1.5 text-[9px]">
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
                            <div className="kt-premium-card-soft rounded-xl p-2 text-center">
                              <span className="text-zinc-500 font-medium block uppercase tracking-wider">Unitaire</span>
                              <span className="text-zinc-300 font-bold mt-0.5 block">{formatEuro(card.buyPrice)} €</span>
                            </div>
                            <div className="kt-premium-card-soft rounded-xl p-2 text-center">
                              <span className="text-zinc-500 font-medium block uppercase tracking-wider">Rendement</span>
                              <span className={`font-bold mt-0.5 block ${card.buyPrice > 0 && card.currentPrice >= card.buyPrice ? "text-emerald-400" : "text-rose-400"}`}>
                                {card.buyPrice > 0 ? `${(((card.currentPrice - card.buyPrice) / card.buyPrice) * 100).toFixed(2)} %` : "N/A"}
                              </span>
                            </div>
                          </div>

                          <div className="mt-2 grid grid-cols-3 gap-2 text-[10px]">
                            <div className="kt-premium-card-soft rounded-xl p-2">
                              <span className="text-zinc-500 font-medium block uppercase tracking-wider">
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
                              <span className="text-zinc-500 font-medium block uppercase tracking-wider">
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
                              <span className="text-zinc-500 font-medium block uppercase tracking-wider">
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
                <div className="rounded-xl border border-white/[0.08] bg-[#171e28]/80 p-8 text-center">
                  <p className="text-xs font-bold text-zinc-500">
                    Chargement de la
                    collection...
                  </p>
                </div>
              )}

              {!loading &&
                cards.length ===
                  0 && (
                  <div className="rounded-xl border border-white/[0.08] bg-[#171e28]/80 p-8 text-center">
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

            {scoredCards.length > 3 && (
              <Link
                href="/dashboard/cartes"
                className="kt-secondary-button mt-3 flex w-full items-center justify-center text-[10px] font-black uppercase tracking-wider"
              >
                Voir tout l’inventaire ({scoredCards.length})
              </Link>
            )}
          </div>
        </div>
      </main>
    </>
  );
}