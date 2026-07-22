"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Navbar from "../../components/Navbar";
import BackButton from "../../components/BackButton";
import CardResult from "@/components/cards/CardResult";

import { getCollection, getFavorites } from "@/lib/storage";
import { getCardById } from "../../lib/pokemon";
import { calculateRealMarketPrices } from "../../lib/priceTracker";
import { PokemonCard } from "../../lib/types";

type CollectionCardType = PokemonCard & { qty: number };

export default function BibliothequePage() {
  const [collectionCards, setCollectionCards] = useState<CollectionCardType[]>([]);
  const [favoriteCards, setFavoriteCards] = useState<PokemonCard[]>([]);
  const [loading, setLoading] = useState(true);

  const loadBibliotheque = () => {
    setLoading(true);
    
    const collection = getCollection();
    const collectionIds = Object.keys(collection);
    const favoriteIds = getFavorites();

    Promise.all([
      Promise.all(
        collectionIds.map(async (id) => {
          try {
            const card = await getCardById(id);
            if (!card) return null;
            return {
              ...card,
              qty: collection[id],
            };
          } catch (err) {
            console.error("[King_TCG] Erreur chargement carte collection :", id, err);
            return null;
          }
        })
      ),
      Promise.all(
        favoriteIds.map(async (id: string) => {
          try {
            const card = await getCardById(id);
            return card || null;
          } catch (err) {
            console.error("[King_TCG] Erreur chargement carte favori :", id, err);
            return null;
          }
        })
      )
    ]).then(([collectionResults, favoriteResults]) => {
      setCollectionCards(collectionResults.filter((c): c is CollectionCardType => c !== null));
      setFavoriteCards(favoriteResults.filter((c): c is PokemonCard => c !== null));
      setLoading(false);
    }).catch((error) => {
      console.error("[King_TCG] Erreur critique chargement bibliothèque :", error);
      setLoading(false);
    });
  };

  useEffect(() => {
    loadBibliotheque();

    const refresh = () => {
      loadBibliotheque();
    };

    window.addEventListener("storage_favorites_update", refresh);
    window.addEventListener("storage_collection_update", refresh);
    window.addEventListener("king_tcg_update", refresh);
    
    return () => {
      window.removeEventListener("storage_favorites_update", refresh);
      window.removeEventListener("storage_collection_update", refresh);
      window.removeEventListener("king_tcg_update", refresh);
    };
  }, []);

  const totalValue = useMemo(() => {
    return collectionCards.reduce((sum, card) => {
      const market = calculateRealMarketPrices(card);
      const price = market.average ?? 0;
      return sum + price * card.qty;
    }, 0);
  }, [collectionCards]);

  const totalCardsCount = useMemo(() => {
    return collectionCards.reduce((sum, card) => sum + card.qty, 0);
  }, [collectionCards]);

  const lastThreeFavorites = useMemo(() => {
    return [...favoriteCards].reverse().slice(0, 3);
  }, [favoriteCards]);

  const lastThreeCollection = useMemo(() => {
    return [...collectionCards].reverse().slice(0, 3);
  }, [collectionCards]);

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
            <span className="text-[9px] font-black uppercase tracking-wider text-zinc-500">Répertoire personnel</span>
            <h1 className="mt-0.5 text-lg font-black uppercase tracking-tight text-white">Ma Bibliothèque d'Actifs</h1>
          </section>

          {/* Métriques KPIs Uniformisées */}
          <section className="grid gap-3 grid-cols-1 md:grid-cols-3">
            
            <div className="rounded-xl border border-zinc-900 bg-neutral-950/40 p-4 flex flex-col justify-between min-h-[95px]">
              <div className="flex justify-between items-start">
                <span className="text-zinc-500 text-[10px] font-black uppercase tracking-wider">Valeur Portfolio</span>
                <span className="text-[9px] font-black uppercase tracking-wider text-cyan-400 bg-cyan-500/5 border border-cyan-500/10 px-1.5 py-0.5 rounded">Marché</span>
              </div>
              <div className="text-xl font-black text-white tabular-nums mt-2">
                {totalValue.toFixed(2)} <span className="text-zinc-500 text-sm font-bold">€</span>
              </div>
            </div>

            <div className="rounded-xl border border-zinc-900 bg-neutral-950/40 p-4 flex flex-col justify-between min-h-[95px]">
              <div className="flex justify-between items-start">
                <span className="text-zinc-500 text-[10px] font-black uppercase tracking-wider">Total Cartes</span>
                <span className="text-[9px] font-black uppercase tracking-wider text-zinc-400 bg-zinc-800/40 border border-zinc-800 px-1.5 py-0.5 rounded">Volume</span>
              </div>
              <div className="text-xl font-black text-white tabular-nums mt-2">
                {totalCardsCount}
              </div>
            </div>

            <div className="rounded-xl border border-zinc-900 bg-neutral-950/40 p-4 flex flex-col justify-between min-h-[95px]">
              <div className="flex justify-between items-start">
                <span className="text-zinc-500 text-[10px] font-black uppercase tracking-wider">Cartes Uniques</span>
                <span className="text-[9px] font-black uppercase tracking-wider text-zinc-400 bg-zinc-800/40 border border-zinc-800 px-1.5 py-0.5 rounded">Index</span>
              </div>
              <div className="text-xl font-black text-white tabular-nums mt-2">
                {collectionCards.length}
              </div>
            </div>

          </section>

          {/* Section Watchlist (Favoris) */}
          <section className="space-y-4 pt-2">
            <div className="flex justify-between items-end border-b border-zinc-900 pb-2">
              <h2 className="text-[12px] font-black uppercase tracking-widest text-white-500">
                Liste de Favoris <span className="text-zinc-600 font-bold">({favoriteCards.length})</span>
              </h2>
              {favoriteCards.length > 3 && (
                <Link href="/favoris" className="text-[10px] font-black uppercase tracking-wider text-cyan-400 hover:text-white transition-colors">
                  Voir tout
                </Link>
              )}
            </div>

            {loading ? (
              <SkeletonGrid />
            ) : lastThreeFavorites.length === 0 ? (
              <div className="rounded-xl border border-zinc-900 bg-neutral-950/10 p-8 text-center text-xs text-zinc-600 font-medium italic">
                Aucun actif en surveillance.
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3 md:grid-cols-4 xl:grid-cols-6">
                {lastThreeFavorites.map((card) => (
                  <CardResult key={card.id} card={card} />
                ))}
              </div>
            )}

            <div className="rounded-xl border border-zinc-900 bg-neutral-950/20 p-3 text-[11px] text-zinc-500">
              <span className="font-bold text-zinc-400">Évaluation :</span>{" "}
              {favoriteCards.filter((c) => {
                const prices = calculateRealMarketPrices(c);
                return (prices.average ?? 0) > 0;
              }).length} actifs possèdent un flux d'évaluation actif sur les marchés européens.
            </div>
          </section>

          {/* Section Collection */}
          <section className="space-y-4 pt-2">
            <div className="flex justify-between items-end border-b border-zinc-900 pb-2">
              <h2 className="text-[12px] font-black uppercase tracking-widest text-white-500">
                Collection <span className="text-zinc-600 font-bold">({collectionCards.length})</span>
              </h2>
              {collectionCards.length > 3 && (
                <Link href="/collection/tout" className="text-[10px] font-black uppercase tracking-wider text-cyan-400 hover:text-white transition-colors">
                  Voir Tout
                </Link>
              )}
            </div>

            {loading ? (
              <SkeletonGrid />
            ) : lastThreeCollection.length === 0 ? (
              <div className="rounded-xl border border-zinc-900 bg-neutral-950/10 p-8 text-center text-xs text-zinc-600 font-medium italic">
                Votre inventaire d'actifs est actuellement vide.
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3 md:grid-cols-4 xl:grid-cols-6">
                {lastThreeCollection.map((card) => (
                  <div key={card.id} className="relative group">
                    <CardResult card={card} />
                    {card.qty > 1 && (
                      <div className="absolute right-2 top-2 rounded bg-neutral-950 border border-zinc-900 px-1.5 py-0.5 text-[9px] font-black text-cyan-400 shadow-2xl z-10 tabular-nums">
                        x{card.qty}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="rounded-xl border border-zinc-900 bg-neutral-950/20 p-3 text-[11px] text-zinc-500 space-y-1">
              <p className="font-bold text-zinc-400">Synthèse de l'inventaire :</p>
              <ul className="list-disc pl-4 space-y-0.5 text-zinc-500">
                <li>Modèles uniques référencés : <span className="font-bold text-zinc-300 tabular-nums">{collectionCards.length}</span></li>
                <li>Volume d'accumulation (doublons) : <span className="font-bold text-zinc-300 tabular-nums">{Math.max(0, totalCardsCount - collectionCards.length)}</span></li>
              </ul>
            </div>
          </section>

        </div>
      </main>
    </>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-3 gap-3 md:grid-cols-4 xl:grid-cols-6">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="aspect-[0.72] animate-pulse rounded-xl bg-neutral-950/40 border border-zinc-900/50" />
      ))}
    </div>
  );
}