"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { 
  TrendingUp, 
  Layers, 
  Bookmark, 
  Award, 
  ArrowRight, 
  Activity,
  ShieldCheck
} from "lucide-react";

import Navbar from "../../components/Navbar";
import BackButton from "../../components/BackButton";
import CardResult from "@/components/cards/CardResult";

import { getCollection, getFavorites } from "@/lib/storage";
import { getCardById } from "../../lib/pokemon";
import { calculateRealMarketPrices } from "../../lib/priceTracker";
import { PokemonCard } from "../../lib/types";

// Type d'une carte de collection avec sa quantité/données de stockage
type CollectionCardType = PokemonCard & { qty: any };

// Extraction sécurisée de la quantité numérique
function getCardQuantity(qty: any): number {
  if (typeof qty === "number") return qty;
  if (qty && typeof qty === "object" && typeof qty.quantity === "number") {
    return qty.quantity;
  }
  return 1;
}

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
      ),
    ])
      .then(([collectionResults, favoriteResults]) => {
        // Nettoyage simple des nulls et assertion de type sûre
        const cleanCollection = collectionResults.filter(Boolean) as CollectionCardType[];
        const cleanFavorites = favoriteResults.filter(Boolean) as PokemonCard[];

        setCollectionCards(cleanCollection);
        setFavoriteCards(cleanFavorites);
        setLoading(false);
      })
      .catch((error) => {
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

  // 💰 Valeur totale estimée du Portfolio
  const totalValue = useMemo(() => {
    return collectionCards.reduce((sum, card) => {
      const market = calculateRealMarketPrices(card);
      const price = market.average ?? 0;
      return sum + price * getCardQuantity(card.qty);
    }, 0);
  }, [collectionCards]);

  // 📦 Total d'exemplaires physiques
  const totalCardsCount = useMemo(() => {
    return collectionCards.reduce((sum, card) => sum + getCardQuantity(card.qty), 0);
  }, [collectionCards]);

  // 👑 Top Asset (Carte ayant la plus grande valeur unitaire)
  const topValuedCard = useMemo(() => {
    if (collectionCards.length === 0) return null;
    return [...collectionCards].sort((a, b) => {
      const priceA = calculateRealMarketPrices(a).average ?? 0;
      const priceB = calculateRealMarketPrices(b).average ?? 0;
      return priceB - priceA;
    })[0];
  }, [collectionCards]);

  const topCardPrice = useMemo(() => {
    if (!topValuedCard) return 0;
    return calculateRealMarketPrices(topValuedCard).average ?? 0;
  }, [topValuedCard]);

  // 🎯 Taux de couverture / liquidité des prix
  const pricedCardsCount = useMemo(() => {
    return collectionCards.filter(
      (c) => (calculateRealMarketPrices(c).average ?? 0) > 0
    ).length;
  }, [collectionCards]);

  const liquidityRatio = useMemo(() => {
    if (collectionCards.length === 0) return 0;
    return Math.round((pricedCardsCount / collectionCards.length) * 100);
  }, [collectionCards.length, pricedCardsCount]);

  const lastThreeFavorites = useMemo(() => {
    return [...favoriteCards].reverse().slice(0, 3);
  }, [favoriteCards]);

  const lastThreeCollection = useMemo(() => {
    return [...collectionCards].reverse().slice(0, 3);
  }, [collectionCards]);

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-neutral-950 text-white pb-32 selection:bg-cyan-500/20">
        <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
          
          <div className="flex items-center justify-between">
            <BackButton />
          </div>

          {/* En-tête Technique V3.8 */}
          <section className="rounded-2xl border border-zinc-900 bg-neutral-900/40 p-5 sm:p-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
              <div>
                <span className="text-[9px] font-black uppercase tracking-widest text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-1 rounded-full flex items-center gap-1.5 w-fit mb-2">
                  <ShieldCheck className="w-3.5 h-3.5" /> Gestion d'Actifs V3.8 Pro
                </span>
                <h1 className="text-lg font-black uppercase tracking-tight text-white">
                  Ma Bibliothèque TCG
                </h1>
                <p className="mt-0.5 text-[11px] text-zinc-400">Pilotez l'ensemble de vos actifs Pokémon, valeur de marché et favoris.</p>
              </div>

              {/* Raccourcis Rapides */}
              <div className="flex items-center gap-2">
                <Link
                  href="/collection/tout"
                  className="px-4 py-2.5 rounded-xl bg-cyan-500 text-black text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 hover:bg-cyan-400 transition active:scale-98 shadow-lg shadow-cyan-500/10"
                >
                  <Layers className="w-3.5 h-3.5" /> Inventaire ({collectionCards.length})
                </Link>
                <Link
                  href="/favoris"
                  className="px-4 py-2.5 rounded-xl bg-neutral-900 border border-zinc-800 text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 hover:bg-neutral-800 transition active:scale-98 shadow-lg"
                >
                  <Bookmark className="w-3.5 h-3.5 text-yellow-400" /> Watchlist
                </Link>
              </div>
            </div>
          </section>

          {/* Métriques KPIs Uniformisées & Analytics V3.8 */}
          <section className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            
            {/* KPI 1: Valeur Portfolio */}
            <div className="rounded-2xl border border-zinc-900 bg-neutral-900/40 p-4 sm:p-5 flex flex-col justify-between min-h-[115px] shadow-xl">
              <div className="flex justify-between items-start">
                <span className="text-zinc-500 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-cyan-400" /> Valeur Portfolio
                </span>
                <span className="text-[9px] font-black uppercase tracking-wider text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-full">
                  Marché EUR
                </span>
              </div>
              <div className="text-2xl font-black text-white tabular-nums mt-2">
                {totalValue.toFixed(2)} <span className="text-zinc-500 text-sm font-bold">€</span>
              </div>
            </div>

            {/* KPI 2: Total Volume & Uniques */}
            <div className="rounded-2xl border border-zinc-900 bg-neutral-900/40 p-4 sm:p-5 flex flex-col justify-between min-h-[115px] shadow-xl">
              <div className="flex justify-between items-start">
                <span className="text-zinc-500 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-zinc-400" /> Volume Physique
                </span>
                <span className="text-[9px] font-black uppercase tracking-wider text-zinc-400 bg-zinc-800/40 border border-zinc-800 px-2 py-0.5 rounded-full">
                  Stock
                </span>
              </div>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-2xl font-black text-white tabular-nums">
                  {totalCardsCount}
                </span>
                <span className="text-[10px] font-bold text-zinc-500">
                  ({collectionCards.length} uniques)
                </span>
              </div>
            </div>

            {/* KPI 3: Carte Majeure (Top Asset) */}
            <div className="rounded-2xl border border-zinc-900 bg-neutral-900/40 p-4 sm:p-5 flex flex-col justify-between min-h-[115px] shadow-xl">
              <div className="flex justify-between items-start">
                <span className="text-zinc-500 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-yellow-400" /> Top Actif
                </span>
                <span className="text-[9px] font-black uppercase tracking-wider text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 px-2 py-0.5 rounded-full">
                  Star
                </span>
              </div>
              <div className="mt-2">
                {topValuedCard ? (
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs font-black text-white truncate max-w-[130px]">
                      {topValuedCard.name}
                    </span>
                    <span className="text-sm font-black text-yellow-400 tabular-nums">
                      {topCardPrice.toFixed(2)} €
                    </span>
                  </div>
                ) : (
                  <span className="text-xs font-bold text-zinc-600">Aucune carte</span>
                )}
              </div>
            </div>

            {/* KPI 4: Indice de Liquidité & Couverture */}
            <div className="rounded-2xl border border-zinc-900 bg-neutral-900/40 p-4 sm:p-5 flex flex-col justify-between min-h-[115px] shadow-xl">
              <div className="flex justify-between items-start">
                <span className="text-zinc-500 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-emerald-400" /> Couverture Prix
                </span>
                <span className="text-[9px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                  Liquidité
                </span>
              </div>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-2xl font-black text-white tabular-nums">
                  {liquidityRatio}%
                </span>
                <span className="text-[10px] font-bold text-zinc-500">
                  des cartes cotées
                </span>
              </div>
            </div>

          </section>

          {/* Section Collection */}
          <section className="space-y-4 pt-2">
            <div className="flex justify-between items-end border-b border-zinc-900 pb-3">
              <h2 className="text-xs font-black uppercase tracking-widest text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" /> Collection Récente 
                <span className="text-zinc-500 font-bold">({collectionCards.length})</span>
              </h2>
              {collectionCards.length > 0 && (
                <Link
                  href="/collection/tout"
                  className="text-[10px] font-black uppercase tracking-wider text-cyan-400 hover:text-white transition-colors flex items-center gap-1"
                >
                  Accéder à l'inventaire <ArrowRight className="w-3 h-3" />
                </Link>
              )}
            </div>

            {loading ? (
              <SkeletonGrid />
            ) : lastThreeCollection.length === 0 ? (
              <div className="rounded-2xl border border-zinc-900 bg-neutral-900/40 p-12 text-center text-xs text-zinc-500 font-medium italic shadow-xl">
                Votre inventaire d'actifs est actuellement vide.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                {lastThreeCollection.map((card) => {
                  const qtyNumber = getCardQuantity(card.qty);
                  return (
                    <div key={card.id} className="relative group">
                      <CardResult card={card} />
                      {qtyNumber > 1 && (
                        <div className="absolute right-3 top-3 rounded-lg bg-black/80 border border-cyan-500/40 px-2 py-0.5 text-[10px] font-black text-cyan-400 shadow-2xl z-10 tabular-nums backdrop-blur-md">
                          x{qtyNumber}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="rounded-2xl border border-zinc-900 bg-neutral-900/40 p-4 text-xs text-zinc-300 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-xl">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
                <span>
                  Modèles uniques : <strong className="text-white">{collectionCards.length}</strong> | Cumul doublons : <strong className="text-white">{Math.max(0, totalCardsCount - collectionCards.length)}</strong>
                </span>
              </div>
              <Link
                href="/collection/tout"
                className="text-[10px] font-black uppercase tracking-wider text-cyan-400 hover:underline"
              >
                Gérer les quantités & états →
              </Link>
            </div>
          </section>

          {/* Section Watchlist (Favoris) */}
          <section className="space-y-4 pt-4">
            <div className="flex justify-between items-end border-b border-zinc-900 pb-3">
              <h2 className="text-xs font-black uppercase tracking-widest text-white flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-yellow-400" /> Watchlist / Favoris 
                <span className="text-zinc-500 font-bold">({favoriteCards.length})</span>
              </h2>
              {favoriteCards.length > 0 && (
                <Link
                  href="/favoris"
                  className="text-[10px] font-black uppercase tracking-wider text-cyan-400 hover:text-white transition-colors flex items-center gap-1"
                >
                  Voir toute la liste <ArrowRight className="w-3 h-3" />
                </Link>
              )}
            </div>

            {loading ? (
              <SkeletonGrid />
            ) : lastThreeFavorites.length === 0 ? (
              <div className="rounded-2xl border border-zinc-900 bg-neutral-900/40 p-12 text-center text-xs text-zinc-500 font-medium italic shadow-xl">
                Aucun actif en surveillance sous votre Watchlist.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                {lastThreeFavorites.map((card) => (
                  <CardResult key={card.id} card={card} />
                ))}
              </div>
            )}

            <div className="rounded-2xl border border-zinc-900 bg-neutral-900/40 p-4 text-[11px] text-zinc-400 shadow-xl">
              <span className="font-bold text-white">Surveillance marché :</span>{" "}
              {favoriteCards.filter((c) => (calculateRealMarketPrices(c).average ?? 0) > 0).length} actifs sous surveillance bénéficient d'un flux d'évaluation réactualisé.
            </div>
          </section>

        </div>
      </main>
    </>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="aspect-[0.72] animate-pulse rounded-2xl bg-neutral-900/40 border border-zinc-900 p-3"
        />
      ))}
    </div>
  );
}
