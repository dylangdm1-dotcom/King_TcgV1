"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Search,
  ArrowUpDown,
  Layers,
  Sparkles,
  Filter,
  X,
  ShieldCheck,
  TrendingUp,
  LayoutGrid,
  Maximize2,
} from "lucide-react";

import Navbar from "../../../components/Navbar";
import BackButton from "../../../components/BackButton";
import CardResult from "@/components/cards/CardResult";
import CollectionCardTile from "@/components/cards/CollectionCardTile";

import { getCollection } from "../../../lib/storage";
import { enrichAndCacheCards, getCachedCardsForAnalytics, getCardById } from "../../../lib/pokemon";
import { calculateRealMarketPrices } from "../../../lib/priceTracker";
import { PokemonCard } from "../../../lib/types";

interface CollectionCardType extends PokemonCard {
  qty: number | {
    quantity: number;
  };
}

function getSafeQty(qty: CollectionCardType["qty"]): number {
  if (typeof qty === "number") {
    return qty;
  }
  if (
    qty &&
    typeof qty === "object" &&
    typeof qty.quantity === "number"
  ) {
    return qty.quantity;
  }
  return 1;
}

type SortOption =
  | "value_desc"
  | "value_asc"
  | "qty_desc"
  | "name_asc"
  | "rarity";

export default function CollectionToutPage() {
  const [cards, setCards] = useState<CollectionCardType[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("value_desc");
  const [filterRarity, setFilterRarity] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"compact" | "large">("compact");
  const loadRequestRef = useRef(0);

  const loadCollection = async () => {
    const requestId = ++loadRequestRef.current;
    setLoading(true);
    try {
      const collection = getCollection();
      const safeCollection =
        collection && typeof collection === "object"
          ? collection
          : {};
      const ids = Object.keys(safeCollection);

      if (ids.length === 0) {
        setCards([]);
        setLoading(false);
        return;
      }

      // Affiche d'abord le cache partagé déjà utilisé par Collection/Dashboard.
      // L'inventaire n'attend plus un aller-retour TCGdex pour chaque carte.
      const cachedById = new Map(
        getCachedCardsForAnalytics().map((card) => [card.id, card] as const)
      );
      const cachedCards = ids
        .map((id) => {
          const card = cachedById.get(id);
          return card ? { ...card, qty: safeCollection[id] ?? 1 } : null;
        })
        .filter((card) => card !== null) as CollectionCardType[];

      setCards(cachedCards);

      const missingIds = ids.filter((id) => !cachedById.has(id));
      if (!missingIds.length) {
        setLoading(false);
        return;
      }

      // On conserve le squelette uniquement lors d'une toute première ouverture
      // sans aucune donnée locale disponible.
      setLoading(cachedCards.length === 0);

      const results = await Promise.all(
        missingIds.map(async (id) => {
          try {
            const card = await getCardById(id);
            if (!card) {
              return null;
            }
            return {
              ...card,
              qty: safeCollection[id] ?? 1,
            };
          } catch (error) {
            console.error(
              "[King_TCG V5.0] Erreur chargement carte :",
              id,
              error
            );
            return null;
          }
        })
      );

      if (requestId !== loadRequestRef.current) return;

      results.forEach((card) => {
        if (card) cachedById.set(card.id, card);
      });
      const complete = ids
        .map((id) => {
          const card = cachedById.get(id);
          return card ? { ...card, qty: safeCollection[id] ?? 1 } : null;
        })
        .filter((card) => card !== null) as CollectionCardType[];

      setCards(complete);
      setLoading(false);

      void enrichAndCacheCards(complete).then((fresh) => {
        if (requestId !== loadRequestRef.current) return;
        setCards(
          fresh.map((card) => ({
            ...card,
            qty: safeCollection[card.id] ?? 1,
          }))
        );
      }).catch(() => {});
    } catch (error) {
      console.error(
        "[King_TCG V5.0] Erreur inventaire global :",
        error
      );
    } finally {
      if (requestId === loadRequestRef.current) setLoading(false);
    }
  };

  useEffect(() => {
    loadCollection();
    const refresh = () => {
      loadCollection();
    };
    window.addEventListener("king_tcg_update", refresh);
    window.addEventListener("storage_collection_update", refresh);
    window.addEventListener("king_tcg_market_price_update", refresh);
    return () => {
      loadRequestRef.current += 1;
      window.removeEventListener("king_tcg_update", refresh);
      window.removeEventListener("storage_collection_update", refresh);
      window.removeEventListener("king_tcg_market_price_update", refresh);
    };
  }, []);

  const availableRarities = useMemo(() => {
    const rarities = new Set<string>();
    cards.forEach((card) => {
      if (card.rarity) {
        rarities.add(card.rarity);
      }
    });
    return Array.from(rarities);
  }, [cards]);

  const marketPrices = useMemo(() => {
    const prices = new Map<string, number>();
    cards.forEach((card) => {
      const market = calculateRealMarketPrices(card);
      prices.set(card.id, market.average ?? 0);
    });
    return prices;
  }, [cards]);

  const processedCards = useMemo(() => {
    return cards
      .filter((card) => {
        const searchValue = search.toLowerCase();
        const matchesSearch =
          card.name?.toLowerCase().includes(searchValue) ||
          card.number?.toLowerCase().includes(searchValue) ||
          card.set?.name?.toLowerCase().includes(searchValue);
        const matchesRarity =
          filterRarity === "all" || card.rarity === filterRarity;
        return matchesSearch && matchesRarity;
      })
      .sort((a, b) => {
        const priceA = marketPrices.get(a.id) ?? 0;
        const priceB = marketPrices.get(b.id) ?? 0;
        const qtyA = getSafeQty(a.qty);
        const qtyB = getSafeQty(b.qty);

        switch (sortBy) {
          case "value_desc":
            return priceB * qtyB - priceA * qtyA;
          case "value_asc":
            return priceA * qtyA - priceB * qtyB;
          case "qty_desc":
            return qtyB - qtyA;
          case "name_asc":
            return a.name.localeCompare(b.name);
          case "rarity":
            return (b.rarity ?? "").localeCompare(a.rarity ?? "");
          default:
            return 0;
        }
      });
  }, [cards, search, filterRarity, sortBy, marketPrices]);

  const totalCardsCount = useMemo(() => {
    return cards.reduce(
      (sum, card) => sum + getSafeQty(card.qty),
      0
    );
  }, [cards]);

  const totalDuplicates = useMemo(() => {
    return Math.max(0, totalCardsCount - cards.length);
  }, [totalCardsCount, cards.length]);

  const filteredTotalValue = useMemo(() => {
    return processedCards.reduce((sum, card) => {
      const price = marketPrices.get(card.id) ?? 0;
      return sum + price * getSafeQty(card.qty);
    }, 0);
  }, [processedCards, marketPrices]);

  return (
    <>
      <Navbar />
      <main className="kt-premium-shell min-h-screen pb-32 text-white selection:bg-cyan-500/20">
        <div className="kt-page-wrap space-y-5">
          <div className="flex items-center justify-between">
            <BackButton />
          </div>

          <section className="kt-page-header kt-hero-surface relative overflow-hidden border">
            <div className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-cyan-400/[0.05] blur-3xl" />
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-[0.11em] text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-1 rounded-full flex items-center gap-1.5 w-fit mb-2">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Collection complète
                </span>
                <h1 className="kt-page-title">
                  Collection <span className="text-cyan-300">› Tout</span>
                </h1>
                <p className="kt-page-subtitle mt-1">
                  Parcourez, recherchez et triez toutes les cartes présentes dans votre collection.
                </p>
              </div>

              {!loading && cards.length > 0 && (
                <div className="flex items-center gap-2.5 rounded-[13px] border border-cyan-400/18 bg-cyan-400/[0.045] px-4 py-2.5">
                  <TrendingUp className="w-4 h-4 text-cyan-400" />
                  <span className="text-[10px] font-bold text-zinc-100 uppercase">
                    Valeur sélection :
                  </span>
                  <span className="text-sm font-black text-cyan-400 tabular-nums">
                    {filteredTotalValue.toFixed(2)} €
                  </span>
                </div>
              )}
            </div>
          </section>

          {!loading && cards.length > 0 && (
            <section className="grid grid-cols-3 gap-3">
              <div className="kt-stat-card kt-compact-stat">
                <span className="text-zinc-200 text-[10px] font-black uppercase flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-cyan-400" />
                  Modèles
                </span>
                <div className="text-xl font-black mt-1">
                  {cards.length}
                </div>
              </div>

              <div className="kt-stat-card kt-compact-stat" data-tone="violet">
                <span className="text-zinc-200 text-[10px] font-black uppercase flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-zinc-100" />
                  Exemplaires
                </span>
                <div className="text-xl font-black mt-1">
                  {totalCardsCount}
                </div>
              </div>

              <div className="kt-stat-card kt-compact-stat" data-tone="gold">
                <span className="text-zinc-200 text-[10px] font-black uppercase flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-cyan-400" />
                  Doublons
                </span>
                <div className="text-xl font-black text-cyan-400 mt-1">
                  {totalDuplicates}
                </div>
              </div>
            </section>
          )}

          <section className="kt-toolbar space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-200" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher nom, numéro, extension..."
                  className="kt-control w-full border py-3 pl-11 pr-10 text-xs outline-none transition placeholder:text-zinc-500"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-200"
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

              <div className="flex items-center gap-3">
                <div className="relative flex-1 sm:w-52">
                  <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-cyan-400" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="kt-control w-full appearance-none border py-3 pl-9 pr-8 text-xs font-bold outline-none"
                  >
                    <option value="value_desc">Valeur décroissante</option>
                    <option value="value_asc">Valeur croissante</option>
                    <option value="qty_desc">Quantité</option>
                    <option value="name_asc">Nom A-Z</option>
                    <option value="rarity">Rareté</option>
                  </select>
                </div>

                {availableRarities.length > 0 && (
                  <div className="relative flex-1 sm:w-44">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-100" />
                    <select
                      value={filterRarity}
                      onChange={(e) => setFilterRarity(e.target.value)}
                      className="kt-control w-full appearance-none border py-3 pl-9 pr-8 text-xs font-bold outline-none"
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

            {(search || filterRarity !== "all") && (
              <div className="flex items-center gap-3 text-xs text-zinc-100">
                <span>
                  Résultats : <strong className="text-white">{processedCards.length}</strong>
                </span>
                <button
                  onClick={() => {
                    setSearch("");
                    setFilterRarity("all");
                  }}
                  className="text-cyan-400 underline"
                >
                  Réinitialiser
                </button>
              </div>
            )}
          </section>

          {loading ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-[0.72] animate-pulse rounded-2xl bg-[#171e28]/80 border border-white/[0.06]"
                />
              ))}
            </div>
          ) : processedCards.length === 0 ? (
            <div className="kt-empty-state-rich">
              <Layers className="h-6 w-6 text-cyan-300" />
              <p className="text-[12px] font-black text-white">
                {search || filterRarity !== "all"
                  ? "Aucun actif correspondant."
                  : "Votre inventaire est vide."}
              </p>
              <p className="max-w-md text-[11px]">Ajoutez des cartes depuis la Recherche ou le Scanner pour construire votre inventaire complet.</p>
            </div>
          ) : (
            <div className={viewMode === "compact" ? "grid grid-cols-3 gap-2.5 sm:gap-4" : "grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6"}>
              {processedCards.map((card) => {
                const quantity = getSafeQty(card.qty);
                return viewMode === "compact" ? (
                  <CollectionCardTile key={card.id} card={card} quantity={quantity} />
                ) : (
                  <div key={card.id} className="relative group">
                    <CardResult card={card} />
                    {quantity > 1 && <div className="absolute right-3 top-3 z-10 rounded-lg bg-black/80 border border-cyan-500/40 px-2 py-0.5 text-[10px] font-black text-cyan-400">x{quantity}</div>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
