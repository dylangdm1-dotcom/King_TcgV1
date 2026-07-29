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
  TrendingUp
} from "lucide-react";

import Navbar from "../../../components/Navbar";
import BackButton from "../../../components/BackButton";
import CardResult from "@/components/cards/CardResult";

import { getCollection } from "../../../lib/storage";
import { getCardById } from "../../../lib/pokemon";
import { calculateRealMarketPrices } from "../../../lib/priceTracker";
import { PokemonCard } from "../../../lib/types";

// Si le type pose encore problème à l'avenir, on peut utiliser { qty: any }
type CollectionCardType = PokemonCard & { qty: any };

// Helper sécurisé pour extraire la quantité numérique (gère les objets et les nombres)
function getSafeQty(qty: any): number {
  if (typeof qty === "number") return qty;
  if (qty && typeof qty === "object" && typeof qty.quantity === "number") return qty.quantity;
  return 1;
}

type SortOption = "value_desc" | "value_asc" | "qty_desc" | "name_asc" | "rarity";

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
            console.error("[King_TCG] Erreur chargement carte :", id, error);
            return null;
          }
        })
      );

      // 🔥 LA CORRECTION EST ICI : On force TypeScript à accepter le type après filtrage
      setCards(results.filter((c) => c !== null) as unknown as CollectionCardType[]);
    } catch (error) {
      console.error("[King_TCG] Erreur globale chargement collection :", error);
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

  // Liste des raretés uniques présentes dans l'inventaire
  const availableRarities = useMemo(() => {
    const setRarities = new Set<string>();
    cards.forEach((c) => {
      if (c.rarity) setRarities.add(c.rarity);
    });
    return Array.from(setRarities);
  }, [cards]);

  // Filtrage et Tri combinés
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
            return (b.rarity || "").localeCompare(a.rarity || "");
          default:
            return 0;
        }
      });
  }, [cards, search, filterRarity, sortBy]);

  const totalCardsCount = useMemo(() => {
    return cards.reduce((sum, card) => sum + getSafeQty(card.qty), 0);
  }, [cards]);

  const totalDuplicates = useMemo(() => {
    return Math.max(0, totalCardsCount - cards.length);
  }, [cards, totalCardsCount]);

  const filteredTotalValue = useMemo(() => {
    return processedCards.reduce((sum, card) => {
      const price = calculateRealMarketPrices(card).average ?? 0;
      return sum + price * getSafeQty(card.qty);
    }, 0);
  }, [processedCards]);

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
            <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" /> Registre d'Inventaire V3.8
                </span>
                <h1 className="mt-0.5 text-xl font-black uppercase tracking-tight text-white">
                  Inventaire Global & Doublons
                </h1>
              </div>

              {!loading && cards.length > 0 && (
                <div className="px-3.5 py-1.5 rounded-xl bg-neutral-900/90 border border-zinc-800 flex items-center gap-2">
                  <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                    Valeur Sélection :
                  </span>
                  <span className="text-sm font-black text-cyan-400 tabular-nums">
                    {filteredTotalValue.toFixed(2)} €
                  </span>
                </div>
              )}
            </div>
          </section>

          {/* KPIs Synthèse Inventaire */}
          {!loading && cards.length > 0 && (
            <section className="grid gap-3 grid-cols-3">
              <div className="rounded-xl border border-zinc-900 bg-neutral-950/60 p-3.5 flex flex-col justify-between min-h-[85px]">
                <span className="text-zinc-500 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                  <Layers className="w-3 h-3 text-cyan-400" /> Modèles Uniques
                </span>
                <div className="text-xl font-black text-white tabular-nums mt-1">{cards.length}</div>
              </div>
              <div className="rounded-xl border border-zinc-900 bg-neutral-950/60 p-3.5 flex flex-col justify-between min-h-[85px]">
                <span className="text-zinc-500 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-zinc-400" /> Exemplaires
                </span>
                <div className="text-xl font-black text-white tabular-nums mt-1">{totalCardsCount}</div>
              </div>
              <div className="rounded-xl border border-zinc-900 bg-neutral-950/60 p-3.5 flex flex-col justify-between min-h-[85px]">
                <span className="text-zinc-500 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                  <Layers className="w-3 h-3 text-cyan-400" /> Doublons
                </span>
                <div className="text-xl font-black text-cyan-400 tabular-nums mt-1">{totalDuplicates}</div>
              </div>
            </section>
          )}

          {/* Controls Bar : Recherche, Tri & Filtres */}
          <section className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-2.5">
              
              {/* Barre de Recherche */}
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher par nom, numéro, extension..."
                  className="w-full rounded-xl border border-zinc-900 bg-neutral-950/60 pl-10 pr-4 py-2.5 text-xs font-medium text-white outline-none focus:border-cyan-500/50 focus:bg-neutral-950 transition-all placeholder:text-zinc-600"
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
                  <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-cyan-400 pointer-events-none" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="w-full appearance-none rounded-xl border border-zinc-900 bg-neutral-950/60 pl-9 pr-8 py-2.5 text-xs font-bold uppercase tracking-wider text-white outline-none focus:border-cyan-500/50 cursor-pointer"
                  >
                    <option value="value_desc">Valeur (Fort → Faible)</option>
                    <option value="value_asc">Valeur (Faible → Fort)</option>
                    <option value="qty_desc">Doublons (Max → Min)</option>
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
                      className="w-full appearance-none rounded-xl border border-zinc-900 bg-neutral-950/60 pl-9 pr-8 py-2.5 text-xs font-bold uppercase tracking-wider text-white outline-none focus:border-cyan-500/50 cursor-pointer"
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
                <span>Résultats : <strong className="text-white">{processedCards.length}</strong> cartes trouvées</span>
                <button
                  onClick={() => {
                    setSearch("");
                    setFilterRarity("all");
                  }}
                  className="text-cyan-400 underline hover:text-cyan-300 ml-2"
                >
                  Réinitialiser les filtres
                </button>
              </div>
            )}
          </section>

          {/* Grille Technique */}
          {loading ? (
            <div className="grid grid-cols-3 gap-3 md:grid-cols-4 xl:grid-cols-6">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="aspect-[0.72] animate-pulse rounded-xl bg-neutral-950/60 border border-zinc-900/80" />
              ))}
            </div>
          ) : processedCards.length === 0 ? (
            <div className="rounded-xl border border-zinc-900 bg-neutral-950/40 p-12 text-center">
              <p className="text-zinc-600 text-xs font-medium italic">
                {search || filterRarity !== "all"
                  ? "Aucun actif ne correspond aux critères de recherche."
                  : "Votre inventaire complet est actuellement vide."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3 md:grid-cols-4 xl:grid-cols-6">
              {processedCards.map((card) => {
                const safeQty = getSafeQty(card.qty);
                return (
                  <div key={card.id} className="relative group">
                    <CardResult card={card} />
                    {safeQty > 1 && (
                      <div className="absolute right-2 top-2 z-10 rounded-md bg-neutral-950/90 border border-cyan-500/40 px-1.5 py-0.5 text-[9px] font-black text-cyan-400 shadow-2xl tabular-nums backdrop-blur-md">
                        x{safeQty}
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
