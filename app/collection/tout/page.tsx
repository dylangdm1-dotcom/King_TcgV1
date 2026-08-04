"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Search,
  ArrowUpDown,
  Layers,
  Sparkles,
  Filter,
  X,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";

import Navbar from "../../../components/Navbar";
import BackButton from "../../../components/BackButton";
import CardResult from "@/components/cards/CardResult";

import { getCollection } from "../../../lib/storage";
import { getCardById } from "../../../lib/pokemon";
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

  const loadCollection = async () => {
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

      const results = await Promise.all(
        ids.map(async (id) => {
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

      const cleaned = results.filter(
        (card) => card !== null
      ) as CollectionCardType[];
      
      setCards(cleaned);
    } catch (error) {
      console.error(
        "[King_TCG V5.0] Erreur inventaire global :",
        error
      );
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
      <main className="min-h-screen bg-neutral-950 text-white pb-32 selection:bg-cyan-500/20">
        <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <BackButton />
          </div>

          <section className="rounded-2xl border border-zinc-900 bg-neutral-900/40 p-5 sm:p-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
              <div>
                <span className="text-[9px] font-black uppercase tracking-widest text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-1 rounded-full flex items-center gap-1.5 w-fit mb-2">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Registre d'Inventaire V5.0
                </span>
                <h1 className="text-lg font-black uppercase tracking-tight">
                  Inventaire Global & Doublons
                </h1>
                <p className="mt-0.5 text-[11px] text-zinc-400">
                  Gestion des actifs Pokémon, valeurs marché PriceCharting et suivi collection.
                </p>
              </div>

              {!loading && cards.length > 0 && (
                <div className="px-4 py-2.5 rounded-xl bg-neutral-900 border border-zinc-800 flex items-center gap-2.5 shadow-lg">
                  <TrendingUp className="w-4 h-4 text-cyan-400" />
                  <span className="text-[10px] font-bold text-zinc-400 uppercase">
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
            <section className="grid gap-3 grid-cols-3">
              <div className="rounded-2xl border border-zinc-900 bg-neutral-900/40 p-4 shadow-xl">
                <span className="text-zinc-500 text-[10px] font-black uppercase flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-cyan-400" />
                  Modèles uniques
                </span>
                <div className="text-xl font-black mt-1">
                  {cards.length}
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-900 bg-neutral-900/40 p-4 shadow-xl">
                <span className="text-zinc-500 text-[10px] font-black uppercase flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-zinc-400" />
                  Exemplaires
                </span>
                <div className="text-xl font-black mt-1">
                  {totalCardsCount}
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-900 bg-neutral-900/40 p-4 shadow-xl">
                <span className="text-zinc-500 text-[10px] font-black uppercase flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-cyan-400" />
                  Doublons
                </span>
                <div className="text-xl font-black text-cyan-400 mt-1">
                  {totalDuplicates}
                </div>
              </div>
            </section>
          )}

          <section className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher nom, numéro, extension..."
                  className="w-full rounded-2xl border border-zinc-900 bg-neutral-900/40 pl-11 pr-10 py-3 text-xs outline-none focus:border-cyan-500/50"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3">
                <div className="relative flex-1 sm:w-52">
                  <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-cyan-400" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="w-full appearance-none rounded-2xl border border-zinc-900 bg-neutral-900/40 pl-9 py-3 text-xs font-bold"
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
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
                    <select
                      value={filterRarity}
                      onChange={(e) => setFilterRarity(e.target.value)}
                      className="w-full appearance-none rounded-2xl border border-zinc-900 bg-neutral-900/40 pl-9 py-3 text-xs font-bold"
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
              <div className="flex items-center gap-3 text-xs text-zinc-400">
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
                  className="aspect-[0.72] animate-pulse rounded-2xl bg-neutral-900/40 border border-zinc-900"
                />
              ))}
            </div>
          ) : processedCards.length === 0 ? (
            <div className="rounded-2xl border border-zinc-900 bg-neutral-900/40 p-12 text-center">
              <p className="text-zinc-500 text-xs italic">
                {search || filterRarity !== "all"
                  ? "Aucun actif correspondant."
                  : "Votre inventaire est vide."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {processedCards.map((card) => {
                const quantity = getSafeQty(card.qty);
                return (
                  <div key={card.id} className="relative group">
                    <CardResult card={card} />
                    {quantity > 1 && (
                      <div className="absolute right-3 top-3 z-10 rounded-lg bg-black/80 border border-cyan-500/40 px-2 py-0.5 text-[10px] font-black text-cyan-400">
                        x{quantity}
                      </div>
                    )}
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