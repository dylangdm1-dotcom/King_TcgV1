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
  Filter
} from "lucide-react";

import Navbar from "../../components/Navbar";
import BackButton from "../../components/BackButton";
import CardResult from "@/components/cards/CardResult";

import { getFavorites } from "../../lib/storage";
import { getCardById } from "../../lib/pokemon";
import { calculateRealMarketPrices } from "../../lib/priceTracker";
import { PokemonCard } from "../../lib/types";

type SortOption = "value_desc" | "value_asc" | "name_asc" | "rarity";

export default function FavorisPage() {
  const [cards, setCards] = useState<PokemonCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("value_desc");
  const [filterRarity, setFilterRarity] = useState<string>("all");

  const loadFavorites = () => {
    setLoading(true);
    const favoriteIds = getFavorites();

    if (favoriteIds.length === 0) {
      setCards([]);
      setLoading(false);
      return;
    }

    Promise.all(
      favoriteIds.map(async (id: string) => {
        try {
          const card = await getCardById(id);
          return card || null;
        } catch (error) {
          console.error("[King_TCG] Erreur chargement carte favori :", id, error);
          return null;
        }
      })
    ).then((results) => {
      setCards(results.filter((c): c is PokemonCard => c !== null));
      setLoading(false);
    });
  };

  useEffect(() => {
    loadFavorites();

    const refresh = () => {
      loadFavorites();
    };

    window.addEventListener("storage_favorites_update", refresh);
    window.addEventListener("king_tcg_update", refresh);

    return () => {
      window.removeEventListener("storage_favorites_update", refresh);
      window.removeEventListener("king_tcg_update", refresh);
    };
  }, []);

  // Raretés uniques pour le filtre
  const availableRarities = useMemo(() => {
    const setRarities = new Set<string>();
    cards.forEach((c) => {
      if (c.rarity) setRarities.add(c.rarity);
    });
    return Array.from(setRarities);
  }, [cards]);

  // Filtrage et tri des favoris
  const processedCards = useMemo(() => {
    return cards
      .filter((card) => {
        const matchesSearch =
          card.name?.toLowerCase().includes(search.toLowerCase()) ||
          card.number?.toLowerCase().includes(search.toLowerCase()) ||
          card.set?.name?.toLowerCase().includes(search.toLowerCase());

        const matchesRarity =
          filterRarity === "all" || card.rarity === filterRarity;

        return matchesSearch && matchesRarity;
      })
      .sort((a, b) => {
        const priceA = calculateRealMarketPrices(a).average ?? 0;
        const priceB = calculateRealMarketPrices(b).average ?? 0;

        switch (sortBy) {
          case "value_desc":
            return priceB - priceA;
          case "value_asc":
            return priceA - priceB;
          case "name_asc":
            return a.name.localeCompare(b.name);
          case "rarity":
            return (b.rarity || "").localeCompare(a.rarity || "");
          default:
            return 0;
        }
      });
  }, [cards, search, filterRarity, sortBy]);

  // Métriques financières de la Watchlist
  const totalWatchlistValue = useMemo(() => {
    return processedCards.reduce((sum, card) => {
      const price = calculateRealMarketPrices(card).average ?? 0;
      return sum + price;
    }, 0);
  }, [processedCards]);

  const activeMonitoredCount = useMemo(() => {
    return cards.filter((c) => {
      const prices = calculateRealMarketPrices(c);
      return (prices.average ?? 0) > 0;
    }).length;
  }, [cards]);

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-black text-white pb-24 selection:bg-cyan-500/10">
        <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6 lg:px-8">
          
          <div className="flex items-center justify-between">
            <BackButton />
          </div>

          {/* En-tête Technique V3.8 */}
          <section className="rounded-2xl border border-zinc-900 bg-gradient-to-br from-neutral-950 via-black to-neutral-950 p-5 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-500/5 rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-yellow-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" /> Flux de Surveillance V3.8
                </span>
                <h1 className="mt-0.5 text-xl font-black uppercase tracking-tight text-white flex items-center gap-2">
                  <Bookmark className="w-5 h-5 text-yellow-400 fill-yellow-400/20" /> Watchlist d'Actifs
                </h1>
              </div>

              {!loading && cards.length > 0 && (
                <div className="px-3.5 py-1.5 rounded-xl bg-neutral-900/90 border border-zinc-800 flex items-center gap-2">
                  <TrendingUp className="w-3.5 h-3.5 text-yellow-400" />
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                    Valeur Suivie :
                  </span>
                  <span className="text-sm font-black text-yellow-400 tabular-nums">
                    {totalWatchlistValue.toFixed(2)} €
                  </span>
                </div>
              )}
            </div>
          </section>

          {/* KPIs Resserres de Suivi V3.8 */}
          {!loading && cards.length > 0 && (
            <section className="grid gap-3 grid-cols-2 lg:grid-cols-3">
              <div className="rounded-xl border border-zinc-900 bg-neutral-950/60 p-3.5 flex flex-col justify-between min-h-[85px]">
                <span className="text-zinc-500 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                  <Bookmark className="w-3 h-3 text-yellow-400" /> Actifs Surveillés
                </span>
                <div className="text-xl font-black text-white tabular-nums mt-1">{cards.length}</div>
              </div>

              <div className="rounded-xl border border-zinc-900 bg-neutral-950/60 p-3.5 flex flex-col justify-between min-h-[85px]">
                <span className="text-zinc-500 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                  <Activity className="w-3 h-3 text-emerald-400" /> Indexations Actives
                </span>
                <div className="text-xl font-black text-emerald-400 tabular-nums mt-1">{activeMonitoredCount}</div>
              </div>

              <div className="hidden lg:flex rounded-xl border border-zinc-900 bg-neutral-950/60 p-3.5 flex-col justify-between min-h-[85px]">
                <span className="text-zinc-500 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 text-cyan-400" /> Cotation Moyenne
                </span>
                <div className="text-xl font-black text-cyan-400 tabular-nums mt-1">
                  {(cards.length > 0 ? totalWatchlistValue / cards.length : 0).toFixed(2)} €
                </div>
              </div>
            </section>
          )}

          {/* Barre de Recherche, Tri & Filtres */}
          <section className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-2.5">
              
              {/* Recherche */}
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filtrer par désignation, extension..."
                  className="w-full rounded-xl border border-zinc-900 bg-neutral-950/60 pl-10 pr-4 py-2.5 text-xs font-medium text-white outline-none focus:border-yellow-500/50 focus:bg-neutral-950 transition-all placeholder:text-zinc-600"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Sélection du Tri */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1 sm:w-48">
                  <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-yellow-400 pointer-events-none" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="w-full appearance-none rounded-xl border border-zinc-900 bg-neutral-950/60 pl-9 pr-8 py-2.5 text-xs font-bold uppercase tracking-wider text-white outline-none focus:border-yellow-500/50 cursor-pointer"
                  >
                    <option value="value_desc">Valeur (Fort → Faible)</option>
                    <option value="value_asc">Valeur (Faible → Fort)</option>
                    <option value="name_asc">Nom (A → Z)</option>
                    <option value="rarity">Rareté</option>
                  </select>
                </div>

                {/* Filtre Rareté */}
                {availableRarities.length > 0 && (
                  <div className="relative flex-1 sm:w-40">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
                    <select
                      value={filterRarity}
                      onChange={(e) => setFilterRarity(e.target.value)}
                      className="w-full appearance-none rounded-xl border border-zinc-900 bg-neutral-950/60 pl-9 pr-8 py-2.5 text-xs font-bold uppercase tracking-wider text-white outline-none focus:border-yellow-500/50 cursor-pointer"
                    >
                      <option value="all">Toutes raretés</option>
                      {availableRarities.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

            </div>

            {/* Badges d'état des filtres */}
            {(search || filterRarity !== "all") && (
              <div className="flex items-center gap-2 pt-1 text-[10px] text-zinc-500">
                <span>Résultats : <strong className="text-white">{processedCards.length}</strong> cartes surveillées</span>
                <button
                  onClick={() => {
                    setSearch("");
                    setFilterRarity("all");
                  }}
                  className="text-yellow-400 underline hover:text-yellow-300 ml-2"
                >
                  Réinitialiser les filtres
                </button>
              </div>
            )}
          </section>

          {/* Grille de Résultats Unifiée */}
          {loading ? (
            <div className="grid grid-cols-3 gap-3 md:grid-cols-4 xl:grid-cols-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="aspect-[0.72] animate-pulse rounded-xl bg-neutral-950/60 border border-zinc-900/80" />
              ))}
            </div>
          ) : processedCards.length === 0 ? (
            <div className="rounded-xl border border-zinc-900 bg-neutral-950/40 p-12 text-center">
              <p className="text-zinc-600 text-xs font-medium italic">
                {search || filterRarity !== "all"
                  ? "Aucun actif de la watchlist ne correspond aux critères de recherche."
                  : "Aucun actif en surveillance sous votre Watchlist."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3 md:grid-cols-4 xl:grid-cols-6">
              {processedCards.map((card) => (
                <CardResult key={card.id} card={card} />
              ))}
            </div>
          )}

        </div>
      </main>
    </>
  );
}
