"use client";

import { useEffect, useMemo, useState } from "react";
import Navbar from "../../components/Navbar";
import BackButton from "../../components/BackButton";
import CardResult from "@/components/cards/CardResult";

import { getFavorites } from "../../lib/storage";
import { getCardById } from "../../lib/pokemon";
import { calculateRealMarketPrices } from "../../lib/priceTracker";
import { PokemonCard } from "../../lib/types";

export default function FavorisPage() {
  const [cards, setCards] = useState<PokemonCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

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

  const filteredCards = useMemo(() => {
    return cards.filter(card =>
      card.name?.toLowerCase().includes(search.toLowerCase())
    );
  }, [cards, search]);

  const activeMonitoredCount = useMemo(() => {
    return cards.filter((c) => {
      const prices = calculateRealMarketPrices(c);
      return (prices.average ?? 0) > 0;
    }).length;
  }, [cards]);

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-black text-white pb-20 selection:bg-cyan-500/10">
        <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
          
          <div className="flex items-center justify-between">
            <BackButton />
          </div>

          {/* En-tête Technique */}
          <section className="rounded-xl border border-zinc-900 bg-neutral-950/40 p-4 sm:p-5">
            <span className="text-[9px] font-black uppercase tracking-wider text-zinc-500">Flux de surveillance</span>
            <h1 className="mt-0.5 text-lg font-black uppercase tracking-tight text-white">Mes Favoris d'Actifs</h1>
          </section>

          {/* KPIs Resserres de Suivi */}
          {!loading && cards.length > 0 && (
            <section className="grid gap-3 grid-cols-2">
              <div className="rounded-xl border border-zinc-900 bg-neutral-950/40 p-4 flex flex-col justify-between min-h-[85px]">
                <span className="text-zinc-500 text-[10px] font-black uppercase tracking-wider">Actifs Surveillés</span>
                <div className="text-xl font-black text-white tabular-nums mt-1">{cards.length}</div>
              </div>
              <div className="rounded-xl border border-zinc-900 bg-neutral-950/40 p-4 flex flex-col justify-between min-h-[85px]">
                <span className="text-zinc-500 text-[10px] font-black uppercase tracking-wider">Indexations Actives</span>
                <div className="text-xl font-black text-rose-400 tabular-nums mt-1">{activeMonitoredCount}</div>
              </div>
            </section>
          )}

          {/* Barre de Recherche Technique */}
          <section className="w-full">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filtrer par désignation d'actif..."
              className="w-full rounded-xl border border-zinc-900 bg-neutral-950/40 px-4 py-3 text-xs font-medium text-white outline-none focus:border-zinc-800 focus:bg-neutral-950/80 transition-all placeholder:text-zinc-600"
            />
          </section>

          {/* Grille de Résultats Unifiée */}
          {loading ? (
            <div className="grid grid-cols-3 gap-3 md:grid-cols-4 xl:grid-cols-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="aspect-[0.72] animate-pulse rounded-xl bg-neutral-950/40 border border-zinc-900/50" />
              ))}
            </div>
          ) : filteredCards.length === 0 ? (
            <div className="rounded-xl border border-zinc-900 bg-neutral-950/10 p-12 text-center">
              <p className="text-zinc-600 text-xs font-medium italic">
                {search ? `Aucun actif référencé pour "${search}"` : "Aucun actif en surveillance dans la watchlist."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3 md:grid-cols-4 xl:grid-cols-6">
              {filteredCards.map(card => (
                <CardResult key={card.id} card={card} />
              ))}
            </div>
          )}

        </div>
      </main>
    </>
  );
}