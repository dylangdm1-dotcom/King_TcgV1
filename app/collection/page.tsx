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
  PieChart,
  Puzzle,
} from "lucide-react";

import Navbar from "../../components/Navbar";
import BackButton from "../../components/BackButton";

import { getCollection, getFavorites, getCondition } from "@/lib/storage";
import { enrichAndCacheCards, getCardById } from "../../lib/pokemon";
import { calculateRealMarketPrices } from "../../lib/priceTracker";
import { getAdjustedPriceByCondition } from "../../lib/marketEngine";
import { PokemonCard } from "../../lib/types";
import RarityDonut, { type RarityDatum } from "@/components/charts/RarityDonut";
import CollectionCardTile from "@/components/cards/CollectionCardTile";

/**
 * Portfolio sécurisé
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


function rarityBucket(rarity?: string): string {
  const value = (rarity || "Autre").toLowerCase();
  if (value.includes("promo")) return "Promo";
  if (value.includes("secret") || value.includes("hyper")) return "Secret";
  if (value.includes("illustration") || value.includes("art rare")) return "Illustration";
  if (value.includes("ultra") || value.includes("vmax") || value.includes("vstar") || value.includes("ex")) return "Ultra";
  if (value.includes("uncommon") || value.includes("peu commune")) return "Peu commune";
  if (value.includes("common") || value.includes("commune")) return "Commune";
  if (value.includes("rare")) return "Rare";
  return "Autre";
}

const rarityColors: Record<string, string> = {
  Commune: "#94a3b8",
  "Peu commune": "#38bdf8",
  Rare: "#a78bfa",
  Ultra: "#f472b6",
  Illustration: "#fb923c",
  Secret: "#facc15",
  Promo: "#34d399",
  Autre: "#71717a",
};

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
  const [showAllExtensions, setShowAllExtensions] = useState(false);

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
    
      const cleanFavorites =
        favoriteResults.filter(
          (card): card is PokemonCard => card !== null
        );
    
      setCollectionCards(cleanCollection);
      setFavoriteCards(cleanFavorites);
      setLoading(false);

      void enrichAndCacheCards(cleanCollection).then((fresh) => {
        setCollectionCards(
          fresh.map((card, index) => ({
            ...card,
            qty: cleanCollection[index]?.qty ?? 1,
          }))
        );
      }).catch(() => {});
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
        "storage_collection_update",
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
      const cardPrice = getAdjustedPriceByCondition(
        prices.average ?? 0,
        getCondition(card.id)
      );
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
      lastThreeCollection: collectionCards.slice(0, 3),
      lastThreeFavorites: favoriteCards.slice(0, 3),
    };
  }, [collectionCards, favoriteCards]);

  const rarityData = useMemo<RarityDatum[]>(() => {
    const counts = new Map<string, number>();
    for (const card of collectionCards) {
      const bucket = rarityBucket(card.rarity);
      counts.set(bucket, (counts.get(bucket) || 0) + getCardQuantity(card.qty));
    }

    return Object.keys(rarityColors).map((name) => ({
      name,
      value: counts.get(name) || 0,
      color: rarityColors[name],
    }));
  }, [collectionCards]);

  const extensionProgress = useMemo(() => {
    const map = new Map<string, { id: string; name: string; owned: Set<string>; total: number; logo?: string }>();

    for (const card of collectionCards) {
      const id = card.set?.id || card.set?.name || "unknown";
      const current = map.get(id) || {
        id,
        name: card.set?.name || "Extension inconnue",
        owned: new Set<string>(),
        total: card.set?.printedTotal || card.set?.total || 0,
        logo: card.set?.images?.logo,
      };
      current.owned.add(card.number || card.id);
      current.total = Math.max(current.total, card.set?.printedTotal || card.set?.total || 0);
      map.set(id, current);
    }

    return Array.from(map.values())
      .map((item) => ({
        ...item,
        ownedCount: item.owned.size,
        missing: Math.max(0, item.total - item.owned.size),
        percent: item.total > 0 ? Math.min(100, Math.round((item.owned.size / item.total) * 100)) : 0,
      }))
      .filter((item) => item.total > 0 && item.missing > 0)
      .sort((a, b) => b.percent - a.percent)
      .slice(0, 4);
  }, [collectionCards]);

  return (
    <>
      <Navbar />
      <main className="kt-premium-shell min-h-screen px-4 py-6 pb-28 text-white sm:px-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <BackButton />
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.11em] text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-xl">
                <ShieldCheck className="w-3.5 h-3.5" />
                Portfolio sécurisé
              </span>
            </div>
          </div>

          <section className="relative overflow-hidden rounded-[22px] border border-cyan-400/26 bg-[#0a1118] p-5 shadow-[0_20px_52px_rgba(0,0,0,.26),0_0_34px_rgba(34,211,238,.04)] sm:p-6">
            <div className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-cyan-400/[0.05] blur-3xl" />
            <div className="relative flex items-center gap-4">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] border border-cyan-400/25 bg-cyan-400/[0.075] text-cyan-300">
                <Layers className="h-7 w-7" />
              </span>
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.14em] text-cyan-300">Portfolio King_TCG</p>
                <h1 className="mt-1 text-[22px] font-black tracking-tight text-white sm:text-[26px]">
                  Collection
                </h1>
                <p className="mt-1 text-[11px] leading-5 text-zinc-300">
                  Valeur, quantité, raretés et progression de votre collection en un coup d’œil.
                </p>
              </div>
            </div>
          </section>

          {/* Métriques KPIs Uniformisées V5.0 */}
          <section className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {/* KPI Valeur */}
            <div className="relative flex min-h-[92px] flex-col justify-between overflow-hidden rounded-[16px] border border-cyan-400/14 bg-[#0a1118] p-3 shadow-[0_14px_34px_rgba(0,0,0,.20)]">
              <div className="flex justify-between items-start">
                <span className="text-zinc-200 text-[10px] sm:text-[10px] font-bold uppercase tracking-[0.11em] flex items-center gap-1 min-w-0 whitespace-nowrap">
                  <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
                  Valeur
                </span>
                <span className="text-[10px] sm:text-[10px] font-bold uppercase tracking-[0.11em] text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-full">
                  Marché EUR
                </span>
              </div>
              <div className="text-sm sm:text-lg font-black text-white tabular-nums mt-2">
                {totalValue.toFixed(2)}
                <span className="text-zinc-200 text-sm font-bold ml-1">
                  €
                </span>
              </div>
            </div>

            {/* KPI Quantité physique */}
            <div className="relative flex min-h-[92px] flex-col justify-between overflow-hidden rounded-[16px] border border-cyan-400/14 bg-[#0a1118] p-3 shadow-[0_14px_34px_rgba(0,0,0,.20)]">
              <div className="flex justify-between items-start">
                <span className="text-zinc-200 text-[10px] sm:text-[10px] font-bold uppercase tracking-[0.11em] flex items-center gap-1 min-w-0 whitespace-nowrap">
                  <Layers className="w-3.5 h-3.5 text-zinc-100" />
                  Volume
                </span>
                <span className="text-[10px] sm:text-[10px] font-bold uppercase tracking-[0.11em] text-zinc-100 bg-zinc-800/40 border border-zinc-800 px-2 py-0.5 rounded-full">
                  Stock
                </span>
              </div>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-sm sm:text-lg font-black text-white tabular-nums">
                  {totalCardsCount}
                </span>
                <span className="text-[10px] font-bold text-zinc-200">
                  ({collectionCards.length} uniques)
                </span>
              </div>
            </div>

            {/* Top Asset */}
            <div className="relative flex min-h-[92px] flex-col justify-between overflow-hidden rounded-[16px] border border-cyan-400/14 bg-[#0a1118] p-3 shadow-[0_14px_34px_rgba(0,0,0,.20)]">
              <div className="flex justify-between items-start">
                <span className="text-zinc-200 text-[10px] sm:text-[10px] font-bold uppercase tracking-[0.11em] flex items-center gap-1 min-w-0 whitespace-nowrap">
                  <Award className="w-3.5 h-3.5 text-yellow-400" />
                  Top Actif
                </span>
                <span className="text-[10px] sm:text-[10px] font-bold uppercase tracking-[0.11em] text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 px-2 py-0.5 rounded-full">
                  Star
                </span>
              </div>
              <div className="mt-2">
                {topValuedCard ? (
                  <div className="flex items-end justify-between gap-2">
                    <span className="text-sm sm:text-base font-black text-yellow-300 tabular-nums">
                      {topCardPrice.toFixed(2)} €
                    </span>
                    <span className="max-w-[112px] truncate text-right text-[10px] font-black leading-4 text-white">
                      {topValuedCard.name}
                    </span>
                  </div>
                ) : (
                  <span className="text-xs font-bold text-zinc-200">
                    Aucune carte
                  </span>
                )}
              </div>
            </div>

            {/* Liquidité prix */}
            <div className="relative flex min-h-[92px] flex-col justify-between overflow-hidden rounded-[16px] border border-cyan-400/14 bg-[#0a1118] p-3 shadow-[0_14px_34px_rgba(0,0,0,.20)]">
              <div className="flex justify-between items-start">
                <span className="text-zinc-200 text-[10px] sm:text-[10px] font-bold uppercase tracking-[0.11em] flex items-center gap-1 min-w-0 whitespace-nowrap">
                  <Activity className="w-3.5 h-3.5 text-emerald-400" />
                  Couverture
                </span>
                <span className="text-[10px] sm:text-[10px] font-bold uppercase tracking-[0.11em] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                  Prix
                </span>
              </div>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-sm sm:text-lg font-black text-white tabular-nums">
                  {liquidityRatio}%
                </span>
                <span className="text-[10px] font-bold text-zinc-200">
                  cartes cotées
                </span>
              </div>
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-[18px] border border-white/[0.09] bg-[#0a1118] p-4 shadow-[0_16px_38px_rgba(0,0,0,.20)] sm:p-5">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-white">
                    <PieChart className="h-4 w-4 text-violet-300" /> Répartition par rareté
                  </p>
                  <p className="mt-1 text-[10px] leading-4 text-zinc-200">Suivez vos cartes, leur valeur et la composition de votre collection, doublons inclus.</p>
                </div>
              </div>
              <RarityDonut data={rarityData} />
            </div>

            <div className="rounded-[18px] border border-white/[0.09] bg-[#0a1118] p-4 shadow-[0_16px_38px_rgba(0,0,0,.20)] sm:p-5">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-white">
                    <Puzzle className="h-4 w-4 text-amber-300" /> Extensions à compléter
                  </p>
                  <p className="mt-1 text-[10px] leading-4 text-zinc-200">Les extensions les plus avancées, mais encore incomplètes.</p>
                </div>
                <Link href="/recherche" className="text-[10px] sm:text-[10px] font-bold uppercase tracking-[0.11em] text-amber-300 hover:text-white">Explorer</Link>
              </div>

              {extensionProgress.length ? (
                <div className="space-y-2.5">
                  {(showAllExtensions ? extensionProgress : extensionProgress.slice(0, 3)).map((extension) => (
                    <Link
                      key={extension.id}
                      href={`/recherche?set=${encodeURIComponent(extension.id)}`}
                      className="block rounded-2xl border border-white/[0.055] bg-[#171d25] p-3.5 transition hover:border-amber-300/20 hover:bg-[#1a212b]"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-[10px] font-black text-white">{extension.name}</p>
                          <p className="mt-1 text-[10px] font-semibold text-zinc-200">{extension.ownedCount} / {extension.total} · {extension.missing} manquante{extension.missing > 1 ? "s" : ""}</p>
                        </div>
                        <span className="text-xs font-black tabular-nums text-amber-300">{extension.percent}%</span>
                      </div>
                      <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-white/[0.045]">
                        <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-yellow-300 transition-[width] duration-700" style={{ width: `${extension.percent}%` }} />
                      </div>
                    </Link>
                  ))}
                  {extensionProgress.length > 3 ? (
                    <button
                      type="button"
                      onClick={() => setShowAllExtensions((value) => !value)}
                      className="mt-3 flex w-full items-center justify-center rounded-xl border border-amber-200/15 bg-amber-300/[0.06] px-3 py-2.5 text-[10px] sm:text-[10px] font-bold uppercase tracking-[0.11em] text-amber-200 transition hover:border-amber-200/30 hover:bg-amber-300/[0.1]"
                    >
                      {showAllExtensions ? "Réduire la liste" : `Voir toutes les extensions (${extensionProgress.length})`}
                    </button>
                  ) : null}
                </div>
              ) : (
                <div className="flex min-h-[140px] items-center justify-center rounded-2xl border border-white/[0.055] bg-[#171d25] p-6 text-center text-[11px] text-zinc-200">
                  Ajoutez des cartes de plusieurs extensions pour suivre votre progression.
                </div>
              )}
            </div>
          </section>

          {/* Collection récente V5.0 */}
          <section className="space-y-4 pt-2">
            <div className="flex justify-between items-end border-b border-white/[0.055] pb-3">
              <h2 className="text-xs font-black uppercase tracking-widest text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                Collection récente
                <span className="text-zinc-200 font-bold">
                  ({collectionCards.length})
                </span>
              </h2>
              {collectionCards.length > 0 && (
                <Link
                  href="/collection/tout"
                  className="text-[10px] font-bold uppercase tracking-[0.11em] text-cyan-400 hover:text-white transition flex items-center gap-1"
                >
                  Inventaire
                  <ArrowRight className="w-3 h-3" />
                </Link>
              )}
            </div>

            {loading ? (
              <SkeletonGrid />
            ) : lastThreeCollection.length === 0 ? (
              <div className="kt-premium-panel rounded-[18px] p-10 text-center text-xs text-zinc-100 font-medium">
                Votre inventaire est actuellement vide.
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
                {lastThreeCollection.map((card) => (
                  <CollectionCardTile
                    key={card.id}
                    card={card}
                    quantity={getCardQuantity(card.qty)}
                  />
                ))}
              </div>
            )}

            <div
              className="
              kt-premium-panel rounded-[18px]
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
            <div className="flex justify-between items-end border-b border-white/[0.055] pb-3">
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
                <span className="text-zinc-200 font-bold">
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
                border border-white/[0.06]
                bg-[#171e28]/80
                p-12
                text-center
                text-xs
                text-zinc-200
                italic
                shadow-xl
                "
              >
                Aucun actif surveillé.
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
                {lastThreeFavorites.map((card) => (
                  <CollectionCardTile
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
              kt-premium-panel rounded-[18px]
              p-4
              text-[11px]
              text-zinc-100
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
 * Portfolio sécurisé
 */
function SkeletonGrid() {
  return (
    <div
      className="
      grid
      grid-cols-3
      gap-2.5
      sm:gap-4
      "
    >
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={index}
          className="
          aspect-[0.72]
          kt-skeleton
          rounded-[18px]
          border border-white/[0.055]
          "
        />
      ))}
    </div>
  );
}
