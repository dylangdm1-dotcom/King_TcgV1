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
  ShieldCheck,
} from "lucide-react";

import Navbar from "../../components/Navbar";
import BackButton from "../../components/BackButton";
import CardResult from "@/components/cards/CardResult";

import { getCollection, getFavorites } from "@/lib/storage";
import { getCardById } from "../../lib/pokemon";
import { calculateRealMarketPrices } from "../../lib/priceTracker";
import { PokemonCard } from "../../lib/types";

/**
 * King TCG V5.0
 * Type carte collection avec quantité stockée
 */
 type CollectionCardType = PokemonCard & {
  qty: ReturnType<typeof getCollection>[string];
};

/**
 * Extraction sécurisée quantité carte
 */
 function getCardQuantity(qty: any): number {
  if (typeof qty === "number") {
    return qty;
  }
  if (
    qty &&
    typeof qty.quantity === "number"
  ) {
    return qty.quantity;
  }
  return 1;
}

export default function BibliothequePage() {
  const [
    collectionCards,
    setCollectionCards
  ] = useState<CollectionCardType[]>([]);
  const [
    favoriteCards,
    setFavoriteCards
  ] = useState<PokemonCard[]>([]);
  const [
    loading,
    setLoading
  ] = useState(true);

  /**
   * Chargement bibliothèque V5.0
   */
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
            if (!card) {
              return null;
            }
            return {
              ...card,
              qty: collection[id],
            };
          } catch (error) {
            console.error(
              "[King_TCG V5.0] Erreur chargement carte collection :",
              id,
              error
            );
            return null;
          }
        })
      ),
      Promise.all(
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
      )
    ])
    .then(([collectionResults, favoriteResults]) => {
      const cleanCollection =
  collectionResults.filter(
    (card): card is CollectionCardType => card !== null
  );

      setCollectionCards(cleanCollection);
      setFavoriteCards(cleanFavorites);
      setLoading(false);
    })
    .catch((error) => {
      console.error(
        "[King_TCG V5.0] Erreur bibliothèque :",
        error
      );
      setLoading(false);
    });
  };

  useEffect(() => {
    loadBibliotheque();
    const refresh = () => {
      loadBibliotheque();
    };
    window.addEventListener(
      "storage_favorites_update",
      refresh
    );
    window.addEventListener(
      "storage_collection_update",
      refresh
    );
    window.addEventListener(
      "king_tcg_update",
      refresh
    );
    return () => {
      window.removeEventListener(
        "storage_favorites_update",
        refresh
      );
      window.removeEventListener(
        "storage_collection_update",
        refresh
      );
      window.removeEventListener(
        "king_tcg_update",
        refresh
      );
    };
  }, []);

  /**
   * Calculs mémorisés pour les KPIs et listes
   */
  const {
    totalCardsCount,
    totalValue,
    topValuedCard,
    topCardPrice,
    liquidityRatio,
    lastThreeCollection,
    lastThreeFavorites,
  } = useMemo(() => {
    let count = 0;
    let val = 0;
    let maxPrice = -1;
    let topCard: PokemonCard | null = null;
    let pricedCount = 0;

    for (const card of collectionCards) {
      const q = getCardQuantity(card.qty);
      count += q;
      const prices = calculateRealMarketPrices(card);
      const cardPrice = prices.average ?? 0;
      if (cardPrice > 0) {
        pricedCount++;
      }
      const cardTotalVal = cardPrice * q;
      val += cardTotalVal;
      if (cardPrice > maxPrice) {
        maxPrice = cardPrice;
        topCard = card;
      }
    }

    const ratio = collectionCards.length > 0
      ? Math.round((pricedCount / collectionCards.length) * 100)
      : 0;

    return {
      totalCardsCount: count,
      totalValue: val,
      topValuedCard: topCard,
      topCardPrice: maxPrice > 0 ? maxPrice : 0,
      liquidityRatio: ratio,
      lastThreeCollection: collectionCards.slice(0, 6),
      lastThreeFavorites: favoriteCards.slice(0, 6),
    };
  }, [collectionCards, favoriteCards]);

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-black text-white px-4 sm:px-8 py-6 pb-24">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <BackButton />
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-xl">
                <ShieldCheck className="w-3.5 h-3.5" />
                King TCG V5.0
              </span>
            </div>
          </div>

          <div>
            <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white">
              Bibliothèque & Portfolio
            </h1>
            <p className="text-xs text-zinc-500 mt-1">
              Vue d'ensemble de votre inventaire physique et de vos actifs surveillés.
            </p>
          </div>

          {/* Métriques KPIs Uniformisées V5.0 */}
          <section className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {/* KPI Valeur Portfolio */}
            <div className="rounded-2xl border border-zinc-900 bg-neutral-900/40 p-4 sm:p-5 flex flex-col justify-between min-h-[115px] shadow-xl">
              <div className="flex justify-between items-start">
                <span className="text-zinc-500 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
                  Valeur Portfolio
                </span>
                <span className="text-[9px] font-black uppercase tracking-wider text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-full">
                  Marché EUR
                </span>
              </div>
              <div className="text-2xl font-black text-white tabular-nums mt-2">
                {totalValue.toFixed(2)}
                <span className="text-zinc-500 text-sm font-bold ml-1">
                  €
                </span>
              </div>
            </div>

            {/* KPI Quantité physique */}
            <div className="rounded-2xl border border-zinc-900 bg-neutral-900/40 p-4 sm:p-5 flex flex-col justify-between min-h-[115px] shadow-xl">
              <div className="flex justify-between items-start">
                <span className="text-zinc-500 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-zinc-400" />
                  Volume Physique
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

            {/* Top Asset */}
            <div className="rounded-2xl border border-zinc-900 bg-neutral-900/40 p-4 sm:p-5 flex flex-col justify-between min-h-[115px] shadow-xl">
              <div className="flex justify-between items-start">
                <span className="text-zinc-500 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-yellow-400" />
                  Top Actif
                </span>
                <span className="text-[9px] font-black uppercase tracking-wider text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 px-2 py-0.5 rounded-full">
                  Star
                </span>
              </div>
              <div className="mt-2">
                {topValuedCard ? (
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-xs font-black text-white truncate max-w-[130px]">
                      {topValuedCard.name}
                    </span>
                    <span className="text-sm font-black text-yellow-400 tabular-nums">
                      {topCardPrice.toFixed(2)} €
                    </span>
                  </div>
                ) : (
                  <span className="text-xs font-bold text-zinc-600">
                    Aucune carte
                  </span>
                )}
              </div>
            </div>

            {/* Liquidité prix */}
            <div className="rounded-2xl border border-zinc-900 bg-neutral-900/40 p-4 sm:p-5 flex flex-col justify-between min-h-[115px] shadow-xl">
              <div className="flex justify-between items-start">
                <span className="text-zinc-500 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-emerald-400" />
                  Couverture Prix
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
                  cartes cotées
                </span>
              </div>
            </div>
          </section>

          {/* Collection récente V5.0 */}
          <section className="space-y-4 pt-2">
            <div className="flex justify-between items-end border-b border-zinc-900 pb-3">
              <h2 className="text-xs font-black uppercase tracking-widest text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                Collection récente
                <span className="text-zinc-500 font-bold">
                  ({collectionCards.length})
                </span>
              </h2>
              {collectionCards.length > 0 && (
                <Link
                  href="/collection/tout"
                  className="text-[10px] font-black uppercase tracking-wider text-cyan-400 hover:text-white transition flex items-center gap-1"
                >
                  Inventaire
                  <ArrowRight className="w-3 h-3" />
                </Link>
              )}
            </div>

            {loading ? (
              <SkeletonGrid />
            ) : lastThreeCollection.length === 0 ? (
              <div className="rounded-2xl border border-zinc-900 bg-neutral-900/40 p-12 text-center text-xs text-zinc-500 font-medium italic shadow-xl">
                Votre inventaire est actuellement vide.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                {lastThreeCollection.map((card) => {
                  const quantity = getCardQuantity(card.qty);
                  return (
                    <div
                      key={card.id}
                      className="relative group"
                    >
                      <CardResult card={card} />
                      {quantity > 1 && (
                        <div
                          className="
                          absolute right-3 top-3
                          rounded-lg
                          bg-black/80
                          border border-cyan-500/40
                          px-2 py-0.5
                          text-[10px]
                          font-black
                          text-cyan-400
                          shadow-xl
                          z-10
                          backdrop-blur-md
                          "
                        >
                          x{quantity}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div
              className="
              rounded-2xl
              border border-zinc-900
              bg-neutral-900/40
              p-4
              text-xs
              text-zinc-300
              flex
              flex-col
              sm:flex-row
              justify-between
              gap-3
              shadow-xl
              "
            >
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
                <span>
                  Cartes uniques :
                  <strong className="text-white ml-1">
                    {collectionCards.length}
                  </strong>
                  {" | "}
                  Doublons :
                  <strong className="text-white ml-1">
                    {Math.max(
                      0,
                      totalCardsCount - collectionCards.length
                    )}
                  </strong>
                </span>
              </div>
              <Link
                href="/collection/tout"
                className="
                text-[10px]
                font-black
                uppercase
                tracking-wider
                text-cyan-400
                hover:underline
                "
              >
                Gérer l'inventaire →
              </Link>
            </div>
          </section>

          {/* WATCHLIST V5.0 */}
          <section className="space-y-4 pt-4">
            <div className="flex justify-between items-end border-b border-zinc-900 pb-3">
              <h2
                className="
                text-xs
                font-black
                uppercase
                tracking-widest
                text-white
                flex
                items-center
                gap-2
                "
              >
                <Bookmark className="w-4 h-4 text-yellow-400" />
                Watchlist
                <span className="text-zinc-500 font-bold">
                  ({favoriteCards.length})
                </span>
              </h2>
              {favoriteCards.length > 0 && (
                <Link
                  href="/favoris"
                  className="
                  text-[10px]
                  font-black
                  uppercase
                  tracking-wider
                  text-cyan-400
                  hover:text-white
                  transition
                  flex
                  items-center
                  gap-1
                  "
                >
                  Voir tout
                  <ArrowRight className="w-3 h-3" />
                </Link>
              )}
            </div>

            {loading ? (
              <SkeletonGrid />
            ) : lastThreeFavorites.length === 0 ? (
              <div
                className="
                rounded-2xl
                border border-zinc-900
                bg-neutral-900/40
                p-12
                text-center
                text-xs
                text-zinc-500
                italic
                shadow-xl
                "
              >
                Aucun actif surveillé.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                {lastThreeFavorites.map((card) => (
                  <CardResult
                    key={card.id}
                    card={card}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Bloc surveillance marché */}
          <section>
            <div
              className="
              rounded-2xl
              border border-zinc-900
              bg-neutral-900/40
              p-4
              text-[11px]
              text-zinc-400
              shadow-xl
              "
            >
              <span className="font-bold text-white">
                Surveillance marché :
              </span>
              {" "}
              {favoriteCards.filter(
                (card) =>
                  (calculateRealMarketPrices(card).average ?? 0) > 0
              ).length}
              {" actifs sous surveillance bénéficient d'une estimation marché."}
            </div>
          </section>
        </div>
      </main>
    </>
  );
}

/**
 * Skeleton chargement cartes
 * King TCG V5.0
 */
function SkeletonGrid() {
  return (
    <div
      className="
      grid
      grid-cols-2
      gap-4
      sm:grid-cols-3
      md:grid-cols-4
      lg:grid-cols-6
      "
    >
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={index}
          className="
          aspect-[0.72]
          animate-pulse
          rounded-2xl
          bg-neutral-900/40
          border border-zinc-900
          p-3
          "
        />
      ))}
    </div>
  );
}
