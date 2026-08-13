"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bookmark,
  Search,
  ArrowUpDown,
  TrendingUp,
  ShieldCheck,
  Activity,
  X,
  Filter,
  LayoutGrid,
  Maximize2,
} from "lucide-react";

import Navbar from "../../components/Navbar";
import BackButton from "../../components/BackButton";
import CardResult from "@/components/cards/CardResult";
import CollectionCardTile from "@/components/cards/CollectionCardTile";

import { getFavorites } from "../../lib/storage";
import { getCardById } from "../../lib/pokemon";
import { calculateRealMarketPrices } from "../../lib/priceTracker";
import { PokemonCard } from "../../lib/types";

// ======================================================
// KING TCG V5.0
// Watchlist / Favoris
// Optimisation auditée :
// - chargement sécurisé
// - gestion erreurs réseau/API
// - compatibilité future Price API
// ======================================================

type SortOption =
  | "value_desc"
  | "value_asc"
  | "name_asc"
  | "rarity";

// Cache interne pour éviter les recalculs inutiles
type PriceCache = {
  [id: string]: number;
};

export default function FavorisPage() {
  const [cards, setCards] = useState<PokemonCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("value_desc");
  const [filterRarity, setFilterRarity] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"compact" | "large">("compact");

  // ======================================================
  // Chargement favoris V5.0
  // ======================================================
  const loadFavorites = async () => {
    setLoading(true);
    try {
      const favoriteIds = getFavorites();

      if (!Array.isArray(favoriteIds) || favoriteIds.length === 0) {
        setCards([]);
        return;
      }

      const results = await Promise.all(
        favoriteIds.map(async (id: string) => {
          try {
            const card = await getCardById(id);
            return card ?? null;
          } catch (error) {
            console.error(
              "[King_TCG V5.0] Erreur chargement favori :",
              id,
              error
            );
            return null;
          }
        })
      );

      const validCards = results.filter(
        (card): card is PokemonCard => card !== null
      );

      setCards(validCards);
    } catch (error) {
      console.error(
        "[King_TCG V5.0] Erreur globale Watchlist :",
        error
      );
      setCards([]);
    } finally {
      setLoading(false);
    }
  };

  // ======================================================
  // Synchronisation stockage
  // ======================================================
  useEffect(() => {
    loadFavorites();

    const refresh = () => {
      loadFavorites();
    };

    window.addEventListener(
      "storage_favorites_update",
      refresh
    );
    window.addEventListener(
      "king_tcg_update",
      refresh
    );
    window.addEventListener(
      "king_tcg_market_price_update",
      refresh
    );

    return () => {
      window.removeEventListener(
        "storage_favorites_update",
        refresh
      );
      window.removeEventListener(
        "king_tcg_update",
        refresh
      );
      window.removeEventListener(
        "king_tcg_market_price_update",
        refresh
      );
    };
  }, []);

  // ======================================================
  // Cache prix marché V5.0
  // Évite plusieurs appels calculateRealMarketPrices
  // ======================================================
  const priceCache = useMemo<PriceCache>(() => {
    const cache: PriceCache = {};
    cards.forEach((card) => {
      const market = calculateRealMarketPrices(card);
      cache[card.id] = market.average ?? 0;
    });
    return cache;
  }, [cards]);

  // ======================================================
  // Liste des raretés disponibles
  // ======================================================
  const availableRarities = useMemo(() => {
    const rarities = new Set<string>();
    cards.forEach((card) => {
      if (card.rarity) {
        rarities.add(card.rarity);
      }
    });
    return Array.from(rarities);
  }, [cards]);

  // ======================================================
  // Recherche + filtres + tri V5.0
  // ======================================================
  const processedCards = useMemo(() => {
    const query = search.trim().toLowerCase();

    return [...cards]
      .filter((card) => {
        const searchable = [
          card.name,
          card.number,
          card.set?.name,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        const matchesSearch =
          !query || searchable.includes(query);
        const matchesRarity =
          filterRarity === "all" ||
          card.rarity === filterRarity;

        return matchesSearch && matchesRarity;
      })
      .sort((a, b) => {
        const priceA = priceCache[a.id] ?? 0;
        const priceB = priceCache[b.id] ?? 0;

        switch (sortBy) {
          case "value_desc":
            return priceB - priceA;
          case "value_asc":
            return priceA - priceB;
          case "name_asc":
            return a.name.localeCompare(b.name);
          case "rarity":
            return (b.rarity ?? "").localeCompare(
              a.rarity ?? ""
            );
          default:
            return 0;
        }
      });
  }, [cards, search, filterRarity, sortBy, priceCache]);

  // ======================================================
  // Statistiques Watchlist V5.0
  // ======================================================
  const totalWatchlistValue = useMemo(() => {
    return processedCards.reduce((sum, card) => {
      return sum + (priceCache[card.id] ?? 0);
    }, 0);
  }, [processedCards, priceCache]);

  const activeMonitoredCount = useMemo(() => {
    return cards.filter((card) => {
      return (priceCache[card.id] ?? 0) > 0;
    }).length;
  }, [cards, priceCache]);

  const averageMarketValue = useMemo(() => {
    if (cards.length === 0) {
      return 0;
    }
    return totalWatchlistValue / cards.length;
  }, [cards.length, totalWatchlistValue]);

  return (
    <>
      <Navbar />
      <main className="kt-premium-shell min-h-screen pb-32 text-white selection:bg-cyan-500/20">
        <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <BackButton />
          </div>

          {/* ======================================================
              HEADER V5.0
          ====================================================== */}
          <section className="relative overflow-hidden rounded-[22px] border border-cyan-400/24 bg-[#0a1118] p-5 shadow-[0_20px_52px_rgba(0,0,0,.26),0_0_34px_rgba(34,211,238,.04)] sm:p-6">
            <div className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-rose-400/[0.045] blur-3xl" />
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-[0.11em] text-cyan-300 bg-cyan-400/[0.06] border border-cyan-400/20 px-2.5 py-1 rounded-full flex items-center gap-1.5 w-fit mb-2">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Watchlist King_TCG
                </span>
                <h1 className="flex items-center gap-2 text-[22px] font-black tracking-tight text-white sm:text-[26px]">
                  <Bookmark className="h-5 w-5 fill-rose-400/15 text-rose-400" />
                  Favoris
                </h1>
                <p className="mt-1 text-[11px] text-zinc-300">
                  Retrouvez rapidement toutes les cartes que vous avez ajoutées à vos favoris.
                </p>
              </div>

              {!loading && cards.length > 0 && (
                <div className="flex items-center gap-2.5 rounded-[13px] border border-cyan-400/16 bg-cyan-400/[0.04] px-4 py-2.5">
                  <TrendingUp className="w-4 h-4 text-cyan-300" />
                  <span className="text-[10px] font-bold text-zinc-100 uppercase tracking-wider">
                    Valeur suivie :
                  </span>
                  <span className="text-sm font-black text-cyan-300 tabular-nums">
                    {totalWatchlistValue.toFixed(2)} €
                  </span>
                </div>
              )}
            </div>
          </section>

          {/* ======================================================
              KPI V5.0
          ====================================================== */}
          {!loading && cards.length > 0 && (
            <section className="grid gap-2">
              <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-[#171e28]/80 px-3 py-2">
                <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.11em] text-zinc-100"><Bookmark className="h-3.5 w-3.5 text-cyan-300" /> Cartes favorites</span>
                <span className="text-sm font-black text-white">{cards.length}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-[#171e28]/80 px-3 py-2">
                <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.11em] text-zinc-100"><Activity className="h-3.5 w-3.5 text-emerald-400" /> Suivez rapidement les cartes que vous avez mises en favoris.</span>
                <span className="text-sm font-black text-emerald-300">{activeMonitoredCount} · {averageMarketValue.toFixed(2)} €</span>
              </div>
            </section>
          )}

          {/* ======================================================
              RECHERCHE / TRI / FILTRES
          ====================================================== */}
          <section className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-200" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filtrer par nom, numéro, extension..."
                  className="w-full rounded-[15px] border border-cyan-400/16 bg-[#0a1118] py-3 pl-11 pr-10 text-xs font-medium text-white outline-none transition placeholder:text-zinc-500 focus:border-cyan-300/45"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-200 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setViewMode("compact")} title="Vue compacte 3×3" className={`rounded-xl border p-3 transition ${viewMode === "compact" ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-300" : "border-cyan-400/12 bg-[#0a1118] text-zinc-300"}`}>
                  <LayoutGrid className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => setViewMode("large")} title="Vue détaillée" className={`rounded-xl border p-3 transition ${viewMode === "large" ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-300" : "border-cyan-400/12 bg-[#0a1118] text-zinc-300"}`}>
                  <Maximize2 className="h-4 w-4" />
                </button>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="relative flex-1 sm:w-52">
                  <ArrowUpDown className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-cyan-300 pointer-events-none" />
                  <select
                    value={sortBy}
                    onChange={(e) =>
                      setSortBy(e.target.value as SortOption)
                    }
                    className="w-full appearance-none rounded-[15px] border border-cyan-400/14 bg-[#0a1118] py-3 pl-10 pr-9 text-xs font-bold uppercase tracking-wider text-white outline-none focus:border-cyan-300/40"
                  >
                    <option value="value_desc">Valeur (Fort → Faible)</option>
                    <option value="value_asc">Valeur (Faible → Fort)</option>
                    <option value="name_asc">Nom (A → Z)</option>
                    <option value="rarity">Rareté</option>
                  </select>
                </div>

                {/* Filtre Rareté */}
                {availableRarities.length > 0 && (
                  <div className="relative flex-1 sm:w-44">
                    <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-100 pointer-events-none" />
                    <select
                      value={filterRarity}
                      onChange={(e) =>
                        setFilterRarity(e.target.value)
                      }
                      className="w-full appearance-none rounded-[15px] border border-cyan-400/14 bg-[#0a1118] py-3 pl-10 pr-9 text-xs font-bold uppercase tracking-wider text-white outline-none focus:border-cyan-300/40"
                    >
                      <option value="all">Toutes raretés</option>
                      {availableRarities.map((rarity) => (
                        <option key={rarity} value={rarity}>
                          {rarity}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Etat filtres */}
            {(search || filterRarity !== "all") && (
              <div className="flex items-center gap-2.5 pt-1 text-xs text-zinc-100 px-1">
                <span>
                  Résultats :
                  <strong className="text-white ml-1">
                    {processedCards.length}
                  </strong>
                  {" "}cartes surveillées
                </span>
                <button
                  onClick={() => {
                    setSearch("");
                    setFilterRarity("all");
                  }}
                  className="text-cyan-300 underline hover:text-yellow-300 ml-2 font-medium"
                >
                  Réinitialiser
                </button>
              </div>
            )}
          </section>

          {/* ======================================================
              GRILLE CARTES V5.0
          ====================================================== */}
          {loading ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-[0.72] animate-pulse rounded-2xl bg-[#171e28]/80 border border-white/[0.06] p-3"
                />
              ))}
            </div>
          ) : processedCards.length === 0 ? (
            <div className="rounded-[18px] border border-cyan-400/12 bg-[#0a1118] p-12 text-center">
              <p className="text-zinc-200 text-xs font-medium italic">
                {search || filterRarity !== "all"
                  ? "Aucun actif de la Watchlist ne correspond aux critères."
                  : "Aucun actif actuellement surveillé."}
              </p>
            </div>
          ) : (
            <div className={viewMode === "compact" ? "grid grid-cols-3 gap-2.5 sm:gap-4" : "grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6"}>
              {processedCards.map((card) =>
                viewMode === "compact" ? (
                  <CollectionCardTile key={card.id} card={card} />
                ) : (
                  <CardResult key={card.id} card={card} />
                )
              )}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
