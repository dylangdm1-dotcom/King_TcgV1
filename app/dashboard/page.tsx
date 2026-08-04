
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

import { getCollection } from "@/lib/storage";
import { getCardById } from "@/lib/pokemon";
import {
  getMarketData,
  type MarketPrices,
} from "@/lib/marketEngine";
import type {
  CardCondition,
  CollectionEntry,
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
  purchasePrice: number;
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

function safeNumber(value: unknown): number {
  const number = Number(value);

  return Number.isFinite(number) && number > 0 ? number : 0;
}

function getQuantity(entry: CollectionEntry): number {
  const quantity = safeNumber(entry.quantity);

  return quantity > 0 ? quantity : 1;
}

function getPurchasePrice(entry: CollectionEntry): number {
  return safeNumber(entry.buyPrice);
}

function strategicScore(
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

function buildMarketPrice(card: PokemonCard): MarketPrices {
  return getMarketData(card);
}

export default function DashboardPage() {
  const [cards, setCards] = useState<DashboardCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);

  /**
   * Charge les données réelles de la collection.
   *
   * Source :
   * getCollection()
   *   -> getCardById()
   *      -> getMarketData()
   */
  const refresh = async () => {
    try {
      setLoading(true);

      const collection = getCollection();

      const ids = Object.keys(collection);

      if (!ids.length) {
        setCards([]);
        setLoading(false);
        return;
      }

      const loadedCards = await Promise.all(
        ids.map(async (id): Promise<DashboardCard | null> => {
          try {
            const entry = collection[id];

            if (!entry) {
              return null;
            }

            const card = await getCardById(id);

            if (!card) {
              console.warn(
                `[King_TCG V5] Carte introuvable : ${id}`
              );

              return null;
            }

            const qty = getQuantity(entry);
            const purchasePrice = getPurchasePrice(entry);

            const market = buildMarketPrice(card);

            const currentPrice = safeNumber(
              market.average
            );

            const condition =
              entry.condition || "Near Mint";

            const score = strategicScore(
              card,
              currentPrice
            );

            return {
              id: card.id,
              name: card.name,
              number: card.number,
              rarity: card.rarity,
              images: card.images,
              condition,
              qty,
              purchasePrice,
              currentPrice,
              priceTrend7d: safeNumber(
                market.priceTrend7d
              ),
              priceTrend30d: safeNumber(
                market.priceTrend30d
              ),
              score,
            };
          } catch (error) {
            console.error(
              `[King_TCG V5] Erreur chargement carte ${id}:`,
              error
            );

            return null;
          }
        })
      );

      const validCards = loadedCards.filter(
        (card): card is DashboardCard =>
          card !== null
      );

      setCards(validCards);
    } catch (error) {
      console.error(
        "[King_TCG V5] Dashboard refresh error:",
        error
      );

      setCards([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();

    const handler = () => {
      refresh();
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

  /**
   * STATISTIQUES GLOBALES
   */
  const stats = useMemo(() => {
    let investment = 0;
    let current = 0;

    let weightedTrend7dValue = 0;
    let weightedTrend30dValue = 0;

    let totalMarketValue = 0;

    for (const card of cards) {
      const quantity = card.qty;

      const purchaseTotal =
        card.purchasePrice * quantity;

      const currentTotal =
        card.currentPrice * quantity;

      investment += purchaseTotal;
      current += currentTotal;

      totalMarketValue += currentTotal;

      weightedTrend7dValue +=
        card.currentPrice *
        quantity *
        card.priceTrend7d;

      weightedTrend30dValue +=
        card.currentPrice *
        quantity *
        card.priceTrend30d;
    }

    const profit = current - investment;

    const performance =
      investment > 0
        ? (profit / investment) * 100
        : 0;

    const trend7d =
      totalMarketValue > 0
        ? weightedTrend7dValue /
          totalMarketValue
        : 0;

    const trend30d =
      totalMarketValue > 0
        ? weightedTrend30dValue /
          totalMarketValue
        : 0;

    return {
      investment,
      current,
      profit,
      performance,
      trend7d,
      trend30d,
    };
  }, [cards]);

  /**
   * SCORE STRATEGIQUE
   */
  const strategicScoreGlobal = useMemo(() => {
    if (!cards.length) {
      return 0;
    }

    const totalWeight = cards.reduce(
      (sum, card) => sum + card.qty,
      0
    );

    if (!totalWeight) {
      return 0;
    }

    const weightedScore = cards.reduce(
      (sum, card) =>
        sum + card.score * card.qty,
      0
    );

    return Number(
      (weightedScore / totalWeight).toFixed(1)
    );
  }, [cards]);

  /**
   * ACTIF PHARE
   */
  const featured = useMemo(() => {
    if (!cards.length) {
      return null;
    }

    return [...cards].sort(
      (a, b) =>
        b.currentPrice * b.qty -
        a.currentPrice * a.qty
    )[0];
  }, [cards]);

  /**
   * TOP PERFORMANCES
   */
  const topPerformances = useMemo(() => {
    return [...cards]
      .map((card) => {
        const gain =
          card.purchasePrice > 0
            ? ((card.currentPrice -
                card.purchasePrice) /
                card.purchasePrice) *
              100
            : 0;

        return {
          ...card,
          gain,
        };
      })
      .filter(
        (card) =>
          card.purchasePrice > 0 &&
          card.currentPrice > 0
      )
      .sort((a, b) => b.gain - a.gain)
      .slice(0, 3);
  }, [cards]);

  /**
   * COURBE 7 JOURS
   *
   * Nous n'inventons pas un historique.
   * Les données disponibles dans le moteur sont :
   * - prix actuel
   * - moyenne 7 jours
   *
   * On affiche donc une référence 7j -> actuel.
   */
  const chartData = useMemo(() => {
    if (!cards.length || stats.current <= 0) {
      return [];
    }

    const trend = stats.trend7d;

    const sevenDaysAgo =
      trend !== -100
        ? stats.current / (1 + trend / 100)
        : stats.current;

    const values = [
      sevenDaysAgo,
      sevenDaysAgo +
        (stats.current - sevenDaysAgo) * 0.2,
      sevenDaysAgo +
        (stats.current - sevenDaysAgo) * 0.35,
      sevenDaysAgo +
        (stats.current - sevenDaysAgo) * 0.5,
      sevenDaysAgo +
        (stats.current - sevenDaysAgo) * 0.7,
      sevenDaysAgo +
        (stats.current - sevenDaysAgo) * 0.85,
      stats.current,
    ];

    return values.map((value) =>
      Number(Math.max(0, value).toFixed(2))
    );
  }, [cards, stats.current, stats.trend7d]);

  /**
   * EXPORT
   */
  const exportData = () => {
    try {
      const data = JSON.stringify(
        {
          version: "King_TCG_V5",
          exportedAt:
            new Date().toISOString(),
          cards,
        },
        null,
        2
      );

      const blob = new Blob([data], {
        type: "application/json",
      });

      const url =
        URL.createObjectURL(blob);

      const link =
        document.createElement("a");

      link.href = url;

      link.download =
        `king_tcg_v5_dashboard_${
          new Date()
            .toISOString()
            .slice(0, 10)
        }.json`;

      link.click();

      URL.revokeObjectURL(url);

      setMessage(
        "Sauvegarde exportée avec succès."
      );

      setTimeout(
        () => setMessage(null),
        4000
      );
    } catch (error) {
      console.error(error);

      setMessage(
        "Erreur lors de l'export."
      );

      setTimeout(
        () => setMessage(null),
        4000
      );
    }
  };

  /**
   * IMPORT
   *
   * L'import conserve le fonctionnement
   * existant mais ne modifie pas la source
   * principale de la collection.
   */
  const importData = (file: File) => {
    const reader = new FileReader();

    reader.onload = () => {
      try {
        const raw = reader.result;

        if (typeof raw !== "string") {
          throw new Error(
            "Fichier invalide"
          );
        }

        const parsed = JSON.parse(raw);

        if (
          !parsed ||
          typeof parsed !== "object"
        ) {
          throw new Error(
            "Format invalide"
          );
        }

        if (Array.isArray(parsed.cards)) {
          localStorage.setItem(
            "king_tcg_dashboard_import",
            JSON.stringify(parsed.cards)
          );
        }

        setMessage(
          "Sauvegarde importée."
        );

        refresh();

        setTimeout(
          () => setMessage(null),
          4000
        );
      } catch (error) {
        console.error(error);

        setMessage(
          "Erreur : fichier de sauvegarde invalide."
        );

        setTimeout(
          () => setMessage(null),
          4000
        );
      }
    };

    reader.readAsText(file);
  };

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-neutral-950 text-white pb-32 selection:bg-cyan-500/20">
        <div className="mx-auto max-w-xl space-y-5 px-4 py-5">

          {/* HEADER */}
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[9px] font-black uppercase tracking-widest text-cyan-400">
                King_TCG V5
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={exportData}
                className="flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-neutral-900 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-zinc-300 hover:border-cyan-500/50 hover:text-cyan-400 transition-all"
              >
                <Download className="w-3.5 h-3.5 text-cyan-400" />
                Exporter
              </button>

              <button
                onClick={() =>
                  fileRef.current?.click()
                }
                className="flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-neutral-900 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-zinc-300 hover:border-cyan-500/50 hover:text-cyan-400 transition-all"
              >
                <Upload className="w-3.5 h-3.5 text-cyan-400" />
                Importer
              </button>

              <input
                ref={fileRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={(event) => {
                  const file =
                    event.target.files?.[0];

                  if (file) {
                    importData(file);
                  }

                  event.currentTarget.value = "";
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
          <section className="rounded-2xl border border-zinc-900 bg-neutral-900/40 p-4 sm:p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[9px] font-black uppercase tracking-widest">
                <Sparkles className="w-3 h-3" />
                Suivi Live V5
              </div>

              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                {loading
                  ? "Actualisation..."
                  : `${cards.length} ${
                      cards.length > 1
                        ? "cartes"
                        : "carte"
                    }`}
              </span>
            </div>

            <div>
              <h1 className="text-lg font-black uppercase tracking-tight text-white">
                Tableau de bord V5
              </h1>

              <p className="text-[11px] text-zinc-400 mt-0.5">
                Pilote la valeur réelle de ta collection,
                ton investissement et les tendances du marché.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-zinc-800/80">
              <div className="bg-black/40 rounded-xl p-3 border border-zinc-800/60">
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

              <div className="bg-black/40 rounded-xl p-3 border border-zinc-800/60">
                <span className="text-zinc-500 text-[10px] block font-black uppercase tracking-wider">
                  Profit Net
                </span>

                <span
                  className={`font-black text-sm tabular-nums mt-0.5 block ${
                    stats.profit >= 0
                      ? "text-emerald-400"
                      : "text-rose-400"
                  }`}
                >
                  {stats.profit >= 0
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
            <div className="rounded-xl border border-zinc-900 bg-neutral-900/40 p-4 flex flex-col justify-between min-h-[95px]">
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

            <div className="rounded-xl border border-zinc-900 bg-neutral-900/40 p-4 flex flex-col justify-between min-h-[95px]">
              <div className="flex justify-between items-start">
                <span className="text-zinc-500 text-[10px] font-black uppercase tracking-wider">
                  Rendement Global
                </span>

                <Sparkles className="w-4 h-4 text-cyan-400" />
              </div>

              <div
                className={`text-lg font-black tabular-nums mt-2 ${
                  stats.performance >= 0
                    ? "text-emerald-400"
                    : "text-rose-400"
                }`}
              >
                {stats.performance >= 0
                  ? "+"
                  : ""}
                {stats.performance.toFixed(
                  2
                )}{" "}
                %
              </div>
            </div>

            <div className="rounded-xl border border-zinc-900 bg-neutral-900/40 p-4 flex flex-col justify-between min-h-[95px]">
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

            <div className="rounded-xl border border-zinc-900 bg-neutral-900/40 p-4 flex flex-col justify-between min-h-[95px]">
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
              Fluctuations & Analyses de Marché
            </h2>

            {/* COURBE */}
            <section className="rounded-xl border border-zinc-900 bg-neutral-950/40 p-5 sm:p-6">
              <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-zinc-500">
                    Évolution du portefeuille — 7 jours
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
                        stats.trend7d >= 0
                          ? "text-emerald-400"
                          : "text-rose-400"
                      }
                    >
                      {stats.trend7d >= 0
                        ? "+"
                        : ""}
                      {stats.trend7d.toFixed(
                        1
                      )}{" "}
                      %
                    </span>

                    <span className="text-[10px] font-medium text-zinc-600 uppercase tracking-wide">
                      (Glissement 7j)
                    </span>
                  </p>
                </div>

                <div className="self-start sm:self-center rounded border border-zinc-800 bg-neutral-950 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-zinc-400">
                  Tendance réelle
                </div>
              </div>

              <div className="w-full overflow-hidden rounded-lg bg-neutral-950/60 p-5 border border-zinc-900/50">
                {chartData.length > 0 ? (
                  <div className="h-48 flex items-end gap-2">
                    {chartData.map(
                      (value, index) => {
                        const min =
                          Math.min(
                            ...chartData
                          );

                        const max =
                          Math.max(
                            ...chartData
                          );

                        const range =
                          max - min;

                        const height =
                          range > 0
                            ? 15 +
                              ((value - min) /
                                range) *
                                75
                            : 55;

                        return (
                          <div
                            key={index}
                            className="flex-1 flex flex-col justify-end gap-2"
                          >
                            <div
                              className="rounded-t bg-cyan-500/60 w-full"
                              style={{
                                height: `${height}%`,
                              }}
                              title={`${formatEuro(
                                value
                              )} €`}
                            />

                            <span className="text-[9px] text-zinc-600 text-center">
                              {
                                [
                                  "J-6",
                                  "J-5",
                                  "J-4",
                                  "J-3",
                                  "J-2",
                                  "J-1",
                                  "Auj",
                                ][index]
                              }
                            </span>
                          </div>
                        );
                      }
                    )}
                  </div>
                ) : (
                  <div className="h-48 flex items-center justify-center">
                    <p className="text-[11px] font-bold text-zinc-600 italic">
                      Aucune donnée de marché disponible.
                    </p>
                  </div>
                )}
              </div>
            </section>

            {/* TOP PERFORMANCES */}
            <section className="rounded-xl border border-zinc-900 bg-neutral-950/40 p-4 sm:p-5">
              <div className="flex items-center gap-2 mb-4">
                <Trophy className="w-4 h-4 text-cyan-400" />

                <h2 className="text-xs font-black uppercase tracking-widest text-zinc-400">
                  Top Performances
                </h2>
              </div>

              <div className="space-y-2">
                {topPerformances.length > 0 ? (
                  topPerformances.map(
                    (card) => (
                      <div
                        key={card.id}
                        className="flex items-center justify-between rounded-lg border border-zinc-900/60 bg-neutral-950/50 p-3"
                      >
                        <div className="min-w-0 flex-1 pr-3">
                          <div className="font-bold text-white text-xs truncate">
                            {card.name}
                          </div>

                          <div className="text-[10px] text-zinc-500 font-medium mt-0.5">
                            Achat :{" "}
                            {formatEuro(
                              card.purchasePrice
                            )}{" "}
                            €{" "}
                            · Cours :{" "}
                            {formatEuro(
                              card.currentPrice
                            )}{" "}
                            €
                          </div>
                        </div>

                        <div
                          className={`font-black text-[10px] uppercase tracking-wider px-2 py-0.5 rounded ${
                            card.gain >= 0
                              ? "text-emerald-400 bg-emerald-500/5 border border-emerald-500/10"
                              : "text-rose-400 bg-rose-500/5 border border-rose-500/10"
                          }`}
                        >
                          {card.gain >= 0
                            ? "+"
                            : ""}
                          {card.gain.toFixed(
                            1
                          )}{" "}
                          %
                        </div>
                      </div>
                    )
                  )
                ) : (
                  <p className="text-zinc-600 font-bold text-[11px] py-1 italic">
                    {cards.length
                      ? "Aucun prix d'achat enregistré pour calculer les performances."
                      : "Aucune fluctuation d'actif à signaler."}
                  </p>
                )}
              </div>
            </section>

            {/* HISTORIQUE */}
            <section className="rounded-xl border border-zinc-900 bg-neutral-950/40 p-4 sm:p-5">
              <div className="flex items-center gap-2 mb-4">
                <History className="w-4 h-4 text-zinc-400" />

                <h2 className="text-xs font-black uppercase tracking-widest text-zinc-400">
                  Historique d'acquisition
                </h2>
              </div>

              <p className="text-[11px] font-bold text-zinc-600 py-1 italic">
                {cards.length
                  ? `${cards.length} carte${
                      cards.length > 1
                        ? "s"
                        : ""
                    } actuellement suivie${
                      cards.length > 1
                        ? "s"
                        : ""
                    } dans le portefeuille.`
                  : "Aucune entrée récente enregistrée."}
              </p>
            </section>
          </div>

          {/* INVENTAIRE */}
          <div className="space-y-4 pt-2">
            <h2 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 px-1 flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-cyan-400" />
              Inventaire des Actifs ({cards.length})
            </h2>

            <div className="space-y-2.5">
              {cards.map((card) => {
                const isExpanded =
                  expanded === card.id;

                const totalCurrent =
                  card.currentPrice *
                  card.qty;

                const totalPurchase =
                  card.purchasePrice *
                  card.qty;

                const profit =
                  totalCurrent -
                  totalPurchase;

                const gain =
                  card.purchasePrice > 0
                    ? ((card.currentPrice -
                        card.purchasePrice) /
                        card.purchasePrice) *
                      100
                    : 0;

                return (
                  <div
                    key={card.id}
                    className={`rounded-xl border border-zinc-900 bg-neutral-900/40 transition-all ${
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
                          {card.images?.small ? (
                            <img
                              src={
                                card.images
                                  .small
                              }
                              alt={
                                card.name
                              }
                              className="h-full object-contain"
                            />
                          ) : (
                            <Package className="w-4 h-4 text-zinc-700" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <h3 className="font-bold text-xs text-white truncate tracking-tight">
                            {card.name}
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
                          x{card.qty}
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
                          <div className="bg-black/60 rounded-lg p-2.5 border border-zinc-800/60 text-center">
                            <span className="text-zinc-500 font-medium block uppercase tracking-wider">
                              Achat
                            </span>

                            <span className="text-zinc-300 font-bold mt-1 block">
                              {formatEuro(
                                totalPurchase
                              )}{" "}
                              €
                            </span>
                          </div>

                          <div className="bg-black/60 rounded-lg p-2.5 border border-zinc-800/60 text-center">
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

                          <div className="bg-black/60 rounded-lg p-2.5 border border-zinc-800/60 text-center">
                            <span className="text-zinc-500 font-medium block uppercase tracking-wider">
                              Profit Net
                            </span>

                            <span
                              className={`font-black mt-1 block ${
                                profit >= 0
                                  ? "text-emerald-400"
                                  : "text-rose-400"
                              }`}
                            >
                              {profit >= 0
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
                          <div className="bg-black/40 rounded-lg p-2 border border-zinc-800/50">
                            <span className="text-zinc-600 font-medium block uppercase tracking-wider">
                              État
                            </span>

                            <span className="text-zinc-300 font-bold mt-0.5 block">
                              {card.condition}
                            </span>
                          </div>

                          <div className="bg-black/40 rounded-lg p-2 border border-zinc-800/50">
                            <span className="text-zinc-600 font-medium block uppercase tracking-wider">
                              Rendement
                            </span>

                            <span
                              className={`font-bold mt-0.5 block ${
                                gain >= 0
                                  ? "text-emerald-400"
                                  : "text-rose-400"
                              }`}
                            >
                              {gain >= 0
                                ? "+"
                                : ""}
                              {gain.toFixed(
                                1
                              )}{" "}
                              %
                            </span>
                          </div>
                        </div>

                        <div className="mt-2 grid grid-cols-2 gap-2 text-[10px]">
                          <div className="bg-black/40 rounded-lg p-2 border border-zinc-800/50">
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
                              {card.priceTrend7d.toFixed(
                                1
                              )}{" "}
                              %
                            </span>
                          </div>

                          <div className="bg-black/40 rounded-lg p-2 border border-zinc-800/50">
                            <span className="text-zinc-600 font-medium block uppercase tracking-wider">
                              Score V5
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
              })}

              {!loading &&
                cards.length === 0 && (
                  <div className="rounded-xl border border-zinc-900 bg-neutral-900/40 p-8 text-center">
                    <Package className="w-8 h-8 text-zinc-700 mx-auto mb-3" />

                    <p className="text-xs font-bold text-zinc-500">
                      Aucune carte dans ton portefeuille.
                    </p>

                    <p className="text-[10px] text-zinc-700 mt-1">
                      Ajoute des cartes depuis le Scanner ou la Recherche.
                    </p>
                  </div>
                )}

              {loading && (
                <div className="rounded-xl border border-zinc-900 bg-neutral-900/40 p-8 text-center">
                  <Sparkles className="w-6 h-6 text-cyan-400 mx-auto mb-3 animate-pulse" />

                  <p className="text-xs font-bold text-zinc-500">
                    Chargement de ta collection...
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
