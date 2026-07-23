"use client";

import { useEffect, useMemo, useState } from "react";
import Navbar from "../../../components/Navbar";
import BackButton from "../../../components/BackButton";
import CardResult from "@/components/cards/CardResult";

import { getCollection } from "../../../lib/storage";
import { getCardById } from "../../../lib/pokemon";
import { PokemonCard } from "../../../lib/types";

type CollectionCardType = PokemonCard & { qty: number };

export default function CollectionToutPage() {
  const [cards, setCards] = useState<CollectionCardType[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const loadCollection = async () => {
    setLoading(true);
    try {
      const collection = getCollection();
      const safeCollection = collection && typeof collection === "object" ? collection : {};
      const ids = Object.keys(safeCollection);

      if (ids.length === 0) {
        setCards([]);
        setLoading(false);
        return;
      }

      const results = await Promise.all(
        ids.map(async (id) => {
          try {
            const card = await getCardById(id);
            if (!card) return null;
            return {
              ...card,
              qty: safeCollection[id] || 1,
            };
          } catch (error) {
            console.error("[King_TCG] Erreur lors du chargement de la carte :", id, error);
            return null;
          }
        })
      );

      setCards(results.filter((c): c is CollectionCardType => c !== null));
    } catch (error) {
      console.error("[King_TCG] Erreur globale lors du chargement de la collection :", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCollection();

    const refresh = () => {
      loadCollection();
    };

    window.addEventListener("king_tcg_update", refresh);
    window.addEventListener("storage_collection_update", refresh);
    
    return () => {
      window.removeEventListener("king_tcg_update", refresh);
      window.removeEventListener("storage_collection_update", refresh);
    };
  }, []);

  const filteredCards = useMemo(() => {
    return cards.filter(card =>
      card.name?.toLowerCase().includes(search.toLowerCase())
    );
  }, [cards, search]);

  const totalCardsCount = useMemo(() => {
    return cards.reduce((sum, card) => sum + card.qty, 0);
  }, [cards]);

  const totalDuplicates = useMemo(() => {
    return Math.max(0, totalCardsCount - cards.length);
  }, [cards, totalCardsCount]);

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
            <span className="text-[9px] font-black uppercase tracking-wider text-zinc-500">Registre d'inventaire</span>
            <h1 className="mt-0.5 text-lg font-black uppercase tracking-tight text-white">Collection Complète</h1>
          </section>

          {/* KPIs Synthèse Inventaire */}
          {!loading && cards.length > 0 && (
            <section className="grid gap-3 grid-cols-3">
              <div className="rounded-xl border border-zinc-900 bg-neutral-950/40 p-3.5 flex flex-col justify-between min-h-[85px]">
                <span className="text-zinc-500 text-[10px] font-black uppercase tracking-wider">Modèles Uniques</span>
                <div className="text-xl font-black text-white tabular-nums mt-1">{cards.length}</div>
              </div>
              <div className="rounded-xl border border-zinc-900 bg-neutral-950/40 p-3.5 flex flex-col justify-between min-h-[85px]">
                <span className="text-zinc-500 text-[10px] font-black uppercase tracking-wider">Exemplaires Globaux</span>
                <div className="text-xl font-black text-white tabular-nums mt-1">{totalCardsCount}</div>
              </div>
              <div className="rounded-xl border border-zinc-900 bg-neutral-950/40 p-3.5 flex flex-col justify-between min-h-[85px]">
                <span className="text-zinc-500 text-[10px] font-black uppercase tracking-wider">Doublons Physiques</span>
                <div className="text-xl font-black text-cyan-400 tabular-nums mt-1">{totalDuplicates}</div>
              </div>
            </section>
          )}

          {/* Barre de Recherche */}
          <section className="w-full">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filtrer l'inventaire complet par désignation..."
              className="w-full rounded-xl border border-zinc-900 bg-neutral-950/40 px-4 py-3 text-xs font-medium text-white outline-none focus:border-zinc-800 focus:bg-neutral-950/80 transition-all placeholder:text-zinc-600"
            />
          </section>

          {/* Grille Technique */}
          {loading ? (
            <div className="grid grid-cols-3 gap-3 md:grid-cols-4 xl:grid-cols-6">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="aspect-[0.72] animate-pulse rounded-xl bg-neutral-950/40 border border-zinc-900/50" />
              ))}
            </div>
          ) : filteredCards.length === 0 ? (
            <div className="rounded-xl border border-zinc-900 bg-neutral-950/10 p-12 text-center">
              <p className="text-zinc-600 text-xs font-medium italic">
                Aucun actif identifié dans la collection pour la requête "{search}".
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3 md:grid-cols-4 xl:grid-cols-6">
              {filteredCards.map(card => (
                <div key={card.id} className="relative group">
                  <CardResult card={card} />
                  {card.qty > 1 && (
                    <div className="absolute right-2 top-2 z-10 rounded bg-neutral-950 border border-zinc-900 px-1.5 py-0.5 text-[9px] font-black text-cyan-400 shadow-2xl tabular-nums">
                      x{card.qty}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

        </div>
      </main>
    </>
  );
}