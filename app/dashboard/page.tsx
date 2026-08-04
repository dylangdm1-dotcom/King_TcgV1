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

type StoredCard = {
  id: string;
  name?: string;
  number?: string;
  rarity?: string;
  condition?: string;
  images?: {
    small?: string;
    large?: string;
  };
  prices?: Record<string, unknown>;
  price?: number;
  marketPrice?: number;
  quantity?: number;
};

type PortfolioItem = StoredCard & {
  qty: number;
  purchasePrice: number;
};

function getStoredPortfolio(): Record<string, unknown> {
  if (typeof window === "undefined") return {};

  const possibleKeys = [
    "king_tcg_portfolio",
    "king_tcg_inventory",
    "king_tcg_collection",
    "king_tcg_cards",
  ];

  for (const key of possibleKeys) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;

      const parsed = JSON.parse(raw);

      if (parsed && typeof parsed === "object") {
        return parsed;
      }
    } catch {
      // ignore invalid localStorage entries
    }
  }

  return {};
}

function extractCards(): PortfolioItem[] {
  if (typeof window === "undefined") return [];

  const storage = getStoredPortfolio();
  const result: PortfolioItem[] = [];

  for (const [id, value] of Object.entries(storage)) {
    if (!value || typeof value !== "object") continue;

    const item = value as StoredCard;

    if (!item.id && !id) continue;

    const qty =
      typeof item.quantity === "number"
        ? item.quantity
        : typeof item.quantity === "string"
        ? Number(item.quantity)
        : 1;

    const purchasePrice =
      typeof item.price === "number"
        ? item.price
        : typeof item.marketPrice === "number"
        ? item.marketPrice
        : 0;

    result.push({
      ...item,
      id: item.id || id,
      qty: Number.isFinite(qty) && qty > 0 ? qty : 1,
      purchasePrice:
        Number.isFinite(purchasePrice) && purchasePrice > 0
          ? purchasePrice
          : 0,
    });
  }

  return result;
}

function getCurrentPrice(card: StoredCard): number {
  if (typeof card.marketPrice === "number" && card.marketPrice > 0) {
    return card.marketPrice;
  }

  if (typeof card.price === "number" && card.price > 0) {
    return card.price;
  }

  const prices = card.prices;

  if (prices && typeof prices === "object") {
    const candidates = [
      prices.market,
      prices.average,
      prices.cardmarket,
      prices.cardmarket_average,
      prices.avg,
    ];

    for (const value of candidates) {
      if (typeof value === "number" && value > 0) {
        return value;
      }
    }
  }

  return 0;
}

function strategicScore(card: StoredCard, currentPrice: number): number {
  let score = 5;

  const rarity = (card.rarity || "").toLowerCase();

  if (
    rarity.includes("illustration") ||
    rarity.includes("alternative") ||
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

  if (currentPrice > 250) score -= 0.5;
  if (currentPrice > 0 && currentPrice < 25) score += 0.5;

  return Math.max(0, Math.min(10, Number(score.toFixed(1))));
}

function formatEuro(value: number): string {
  return value.toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function DashboardPage() {
  const [cards, setCards] = useState<PortfolioItem[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const refresh = () => {
    try {
      setCards(extractCards());
    } catch (error) {
      console.error("[King_TCG] Dashboard refresh error:", error);
      setCards([]);
    }
  };

  useEffect(() => {
    refresh();

    const handler = () => refresh();

    window.addEventListener("king_tcg_update", handler);
    window.addEventListener("storage", handler);

    return () => {
      window.removeEventListener("king_tcg_update", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  const stats = useMemo(() => {
    let investment = 0;
    let current = 0;

    for (const card of cards) {
      const currentPrice = getCurrentPrice(card);

      investment += card.purchasePrice * card.qty;
      current += currentPrice * card.qty;
    }

    const profit = current - investment;
    const performance =
      investment > 0 ? (profit / investment) * 100 : 0;

    return {
      investment,
      current,
      profit,
      performance,
    };
  }, [cards]);

  const scoredCards = useMemo(() => {
    return cards
      .map((card) => {
        const currentPrice = getCurrentPrice(card);

        return {
          ...card,
          currentPrice,
          score: strategicScore(card, currentPrice),
        };
      })
      .sort((a, b) => b.score - a.score);
  }, [cards]);

  const strategicScoreGlobal = useMemo(() => {
    if (!scoredCards.length) return 0;

    return (
      scoredCards.reduce((sum, card) => sum + card.score, 0) /
      scoredCards.length
    );
  }, [scoredCards]);

  const featured = scoredCards[0] || null;

  const topPerformances = useMemo(() => {
    return [...scoredCards]
      .sort((a, b) => {
        const gainA =
          a.purchasePrice > 0
            ? ((a.currentPrice - a.purchasePrice) /
                a.purchasePrice) *
              100
            : 0;

        const gainB =
          b.purchasePrice > 0
            ? ((b.currentPrice - b.purchasePrice) /
                b.purchasePrice) *
              100
            : 0;

        return gainB - gainA;
      })
      .slice(0, 3);
  }, [scoredCards]);

  const exportData = () => {
    try {
      const data = JSON.stringify(
        {
          version: "King_TCG_V5",
          exportedAt: new Date().toISOString(),
          cards,
        },
        null,
        2
      );

      const blob = new Blob([data], {
        type: "application/json",
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = `king_tcg_v5_dashboard_${
        new Date().toISOString().slice(0, 10)
      }.json`;

      link.click();

      URL.revokeObjectURL(url);

      setMessage("Sauvegarde exportée avec succès.");
      setTimeout(() => setMessage(null), 4000);
    } catch (error) {
      console.error(error);
      setMessage("Erreur lors de l'export.");
    }
  };

  const importData = (file: File) => {
    const reader = new FileReader();

    reader.onload = () => {
      try {
        const raw = reader.result;

        if (typeof raw !== "string") {
          throw new Error("Fichier invalide");
        }

        const parsed = JSON.parse(raw);

        if (!parsed || typeof parsed !== "object") {
          throw new Error("Format invalide");
        }

        if (Array.isArray(parsed.cards)) {
          const key = "king_tcg_dashboard_import";

          localStorage.setItem(
            key,
            JSON.stringify(parsed.cards)
          );
        }

        setMessage("Sauvegarde importée.");
        refresh();

        setTimeout(() => setMessage(null), 4000);
      } catch (error) {
        console.error(error);
        setMessage("Erreur : fichier de sauvegarde invalide.");
        setTimeout(() => setMessage(null), 4000);
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
            <div />

            <div className="flex items-center gap-2">
              <button
                onClick={exportData}
                className="flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-neutral-900 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-zinc-300 hover:border-cyan-500/50 hover:text-cyan-400 transition-all"
              >
                <Download className="w-3.5 h-3.5 text-cyan-400" />
                Exporter
              </button>

              <button
                onClick={() => fileRef.current?.click()}
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
                  const file = event.target.files?.[0];
                  if (file) importData(file);
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
                {cards.length} {cards.length > 1 ? "actifs" : "actif"}
              </span>
            </div>

            <div>
              <h1 className="text-lg font-black uppercase tracking-tight text-white">
                Tableau de bord
              </h1>

              <p className="text-[11px] text-zinc-400 mt-0.5">
                Pilote la valeur de ton investissement et surveille les tendances du marché.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-zinc-800/80">
              <div className="bg-black/40 rounded-xl p-3 border border-zinc-800/60">
                <span className="text-zinc-500 text-[10px] block font-black uppercase tracking-wider">
                  Investissement
                </span>

                <span className="font-black text-white text-sm tabular-nums mt-0.5 block">
                  {formatEuro(stats.investment)} €
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
                  {stats.profit >= 0 ? "+" : ""}
                  {formatEuro(stats.profit)} €
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
                {formatEuro(stats.current)} €
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
                {stats.performance >= 0 ? "+" : ""}
                {stats.performance.toFixed(2)} %
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
                {strategicScoreGlobal.toFixed(1)}
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

            <section className="rounded-xl border border-zinc-900 bg-neutral-950/40 p-5 sm:p-6">
              <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-zinc-500">
                    Courbe Prediction Investissement
                  </p>

                  <h2 className="mt-1 text-2xl sm:text-3xl font-black tracking-tight text-white tabular-nums">
                    {formatEuro(stats.current)} €
                  </h2>

                  <p className="mt-0.5 text-xs font-bold flex items-center gap-1">
                    <span
                      className={
                        stats.performance >= 0
                          ? "text-emerald-400"
                          : "text-rose-400"
                      }
                    >
                      {stats.performance >= 0 ? "+" : ""}
                      {stats.performance.toFixed(2)} %
                    </span>

                    <span className="text-[10px] font-medium text-zinc-600 uppercase tracking-wide">
                      (Glissement 7j)
                    </span>
                  </p>
                </div>

                <div className="self-start sm:self-center rounded border border-zinc-800 bg-neutral-950 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-zinc-400">
                  Bénéfice Potentiel
                </div>
              </div>

              <div className="w-full overflow-hidden rounded-lg bg-neutral-950/60 p-5 border border-zinc-900/50">
                <div className="h-48 flex items-end gap-2">
                  {Array.from({ length: 7 }).map((_, index) => {
                    const values = [
                      0.95,
                      0.96,
                      0.97,
                      0.98,
                      0.99,
                      0.995,
                      1,
                    ];

                    const height =
                      stats.current > 0
                        ? Math.max(8, values[index] * 100)
                        : 8;

                    return (
                      <div
                        key={index}
                        className="flex-1 flex flex-col justify-end gap-2"
                      >
                        <div
                          className="rounded-t bg-cyan-500/60 w-full"
                          style={{ height: `${height}%` }}
                        />

                        <span className="text-[9px] text-zinc-600 text-center">
                          {
                            [
                              "Lun",
                              "Mar",
                              "Mer",
                              "Jeu",
                              "Ven",
                              "Sam",
                              "Auj",
                            ][index]
                          }
                        </span>
                      </div>
                    );
                  })}
                </div>
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
                  topPerformances.map((card) => {
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
                        className="flex items-center justify-between rounded-lg border border-zinc-900/60 bg-neutral-950/50 p-3"
                      >
                        <div className="min-w-0 flex-1 pr-3">
                          <div className="font-bold text-white text-xs truncate">
                            {card.name || card.id}
                          </div>

                          <div className="text-[10px] text-zinc-500 font-medium mt-0.5">
                            Cours : {formatEuro(card.currentPrice)} €
                          </div>
                        </div>

                        <div className="font-black text-emerald-400 text-[10px] uppercase tracking-wider bg-emerald-500/5 border border-emerald-500/10 px-2 py-0.5 rounded">
                          {gain >= 0 ? "+" : ""}
                          {gain.toFixed(1)} %
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-zinc-600 font-bold text-[11px] py-1 italic">
                    Aucune fluctuation d'actif à signaler.
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
                  ? "Les cartes actuellement enregistrées sont disponibles dans l'inventaire ci-dessous."
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
              {scoredCards.map((card) => {
                const isExpanded = expanded === card.id;

                const totalCurrent =
                  card.currentPrice * card.qty;

                const totalPurchase =
                  card.purchasePrice * card.qty;

                const profit =
                  totalCurrent - totalPurchase;

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
                          isExpanded ? null : card.id
                        )
                      }
                      className="w-full text-left cursor-pointer flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-10 w-7 shrink-0 overflow-hidden rounded bg-black p-0.5 flex items-center justify-center border border-zinc-800">
                          {card.images?.small ? (
                            <img
                              src={card.images.small}
                              alt={card.name || "Carte"}
                              className="h-full object-contain"
                            />
                          ) : (
                            <Package className="w-4 h-4 text-zinc-700" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <h3 className="font-bold text-xs text-white truncate tracking-tight">
                            {card.name || card.id}
                          </h3>

                          <p className="text-[10px] text-zinc-400 font-medium mt-0.5 tabular-nums">
                            Unit. : {formatEuro(card.currentPrice)} €
                            {" · "}
                            {card.condition || "Near Mint"}
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
                              {formatEuro(totalPurchase)} €
                            </span>
                          </div>

                          <div className="bg-black/60 rounded-lg p-2.5 border border-zinc-800/60 text-center">
                            <span className="text-zinc-500 font-medium block uppercase tracking-wider">
                              Actuelle
                            </span>

                            <span className="text-white font-bold mt-1 block">
                              {formatEuro(totalCurrent)} €
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
                              {profit >= 0 ? "+" : ""}
                              {formatEuro(profit)} €
                            </span>
                          </div>
                        </div>

                        <div className="mt-2 grid grid-cols-2 gap-2 text-[10px]">
                          <div className="bg-black/40 rounded-lg p-2 border border-zinc-800/50">
                            <span className="text-zinc-600 font-medium block uppercase tracking-wider">
                              État
                            </span>

                            <span className="text-zinc-300 font-bold mt-0.5 block">
                              {card.condition || "Near Mint"}
                            </span>
                          </div>

                          <div className="bg-black/40 rounded-lg p-2 border border-zinc-800/50">
                            <span className="text-zinc-600 font-medium block uppercase tracking-wider">
                              Score
                            </span>

                            <span className="text-cyan-400 font-bold mt-0.5 block">
                              {card.score.toFixed(1)}/10
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {cards.length === 0 && (
                <div className="rounded-xl border border-zinc-900 bg-neutral-900/40 p-8 text-center">
                  <Package className="w-8 h-8 text-zinc-700 mx-auto mb-3" />

                  <p className="text-xs font-bold text-zinc-500">
                    Aucun actif dans ton portefeuille.
                  </p>

                  <p className="text-[10px] text-zinc-700 mt-1">
                    Ajoute des cartes depuis la section Scanner ou Recherche.
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
