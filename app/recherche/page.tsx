"use client";

import { useMemo, useState } from "react";
import Navbar from "../../components/Navbar";
import CardResult from "@/components/cards/CardResult";
import SearchFilters from "../../components/SearchFilters";
import { searchCards } from "../../lib/pokemon";
import { filterCards, type SearchFilters as SearchFiltersType } from "../../lib/search";
import type { PokemonCard } from "../../lib/types";

const PAGE_SIZE = 24;

export default function Recherche() {
  const [searchQuery, setSearchQuery] = useState("");
  const [query, setQuery] = useState("");

  const [cards, setCards] = useState<PokemonCard[]>([]);
  const [loading, setLoading] = useState(false);

  const [visible, setVisible] = useState(PAGE_SIZE);
  const [viewMode, setViewMode] = useState<"grid" | "large">("grid");

  const [filters, setFilters] = useState<SearchFiltersType>({
    category: "all",
    rarity: "all",
    set: "all",
    sort: "recent",
  });

  async function handleSearch() {
    const value = searchQuery.trim();
    setQuery(value);

    if (value.length < 2) {
      setCards([]);
      setVisible(PAGE_SIZE);
      return;
    }

    setLoading(true);

    try {
      const results = await searchCards(value);
      setCards(results);
      setVisible(PAGE_SIZE);
    } catch (error) {
      console.error("[King_TCG] Erreur recherche :", error);
    } finally {
      setLoading(false);
    }
  }

  const filteredCards = useMemo(
    () => filterCards(cards, filters),
    [cards, filters]
  );

  const displayedCards = filteredCards.slice(0, visible);

  const sets = useMemo(() => {
    return Array.from(
      new Set(
        cards
          .map((c) => c.set?.name)
          .filter(Boolean)
      )
    ) as string[];
  }, [cards]);

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-black">
        <div className="mx-auto max-w-7xl space-y-6 px-4 py-8">
          {/* Recherche */}
          <section className="rounded-xl border border-zinc-900 bg-neutral-950/40 p-4 md:p-6">
            <h1 className="text-s font-black uppercase tracking-widest text-white">
              Recherche de Carte Pokémon
            </h1>

            <p className="mt-1 text-[11px] font-medium text-zinc-500">
              Filtrez les bases TCG, analysez les cotations et recherchez vos Pokémon.
            </p>

            <div className="mt-5 space-y-3">
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSearch();
                  }
                }}
                placeholder="Saisir un nom de Pokémon, une extension..."
                className="w-full rounded-lg border border-zinc-900 bg-neutral-950/80 px-4 py-3 text-xs font-bold text-white placeholder-zinc-600 outline-none transition focus:border-cyan-500/30"
              />

              <button
                onClick={handleSearch}
                disabled={loading}
                className="w-full rounded-lg bg-cyan-500 py-3 text-xs font-black uppercase tracking-widest text-black transition hover:bg-cyan-400 disabled:opacity-50"
              >
                {loading ? "Recherche..." : "Rechercher"}
              </button>
            </div>

            <div className="mt-5">
              <SearchFilters
                filters={filters}
                onChange={setFilters}
                sets={sets}
              />
            </div>
          </section>

          {/* Barre outils */}
          <section className="flex items-center justify-between gap-4 border-b border-zinc-900/60 pb-3">
            <div className="rounded border border-zinc-900 bg-neutral-950 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-zinc-400">
              {filteredCards.length} Carte(s) trouvées
            </div>

            <div className="flex gap-1 rounded-lg border border-zinc-900 bg-neutral-950 p-1">
              <button
                onClick={() => setViewMode("grid")}
                className={`rounded px-3 py-1 text-[10px] font-black uppercase ${
                  viewMode === "grid"
                    ? "bg-zinc-900 text-cyan-400"
                    : "text-zinc-500"
                }`}
              >
                Grille
              </button>

              <button
                onClick={() => setViewMode("large")}
                className={`rounded px-3 py-1 text-[10px] font-black uppercase ${
                  viewMode === "large"
                    ? "bg-zinc-900 text-cyan-400"
                    : "text-zinc-500"
                }`}
              >
                Large
              </button>
            </div>
          </section>

          {loading && (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-[0.72] animate-pulse rounded-lg bg-neutral-950 border border-zinc-900"
                />
              ))}
            </div>
          )}

          {!loading && query.length >= 2 && filteredCards.length === 0 && (
            <div className="rounded-xl border border-zinc-900 bg-neutral-950/20 p-10 text-center">
              <p className="text-xs font-black uppercase text-zinc-400">
                Aucune correspondance trouvée
              </p>

              <p className="mt-1 text-[11px] text-zinc-500">
                Vérifiez l'orthographe ou modifiez les filtres.
              </p>
            </div>
          )}

          {!loading && (
            <div
              className={
                viewMode === "grid"
                  ? "grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6"
                  : "flex flex-col items-center gap-4"
              }
            >
              {displayedCards.map((card) => (
                <div
                  key={card.id}
                  className={
                    viewMode === "large" ? "w-full max-w-md" : "w-full"
                  }
                >
                  <CardResult card={card} />
                </div>
              ))}
            </div>
          )}

          {!loading && visible < filteredCards.length && (
            <div className="text-center pt-4">
              <button
                onClick={() => setVisible((v) => v + PAGE_SIZE)}
                className="rounded-lg border border-zinc-900 bg-neutral-950 px-6 py-2.5 text-[11px] font-black uppercase text-cyan-400"
              >
                Charger plus de références
              </button>
            </div>
          )}
        </div>
      </main>
    </>
  );
}