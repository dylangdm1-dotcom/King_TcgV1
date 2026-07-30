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
                  <ShieldCheck className="w-3.5 h-3.5" /> Registre d'Inventaire V3.8
                </span>
                <h1 className="text-lg font-black uppercase tracking-tight text-white">
                  Inventaire Global & Doublons
                </h1>
                <p className="mt-0.5 text-[11px] text-zinc-400">Consultez, filtrez et triez l'ensemble des cartes physiques de votre collection.</p>
              </div>

              {!loading && cards.length > 0 && (
                <div className="px-4 py-2.5 rounded-xl bg-neutral-900 border border-zinc-800 flex items-center gap-2.5 shadow-lg">
                  <TrendingUp className="w-4 h-4 text-cyan-400" />
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
              <div className="rounded-2xl border border-zinc-900 bg-neutral-900/40 p-4 sm:p-5 flex flex-col justify-between min-h-[95px] shadow-xl">
                <span className="text-zinc-500 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-cyan-400" /> Modèles Uniques
                </span>
                <div className="text-xl font-black text-white tabular-nums mt-1">{cards.length}</div>
              </div>
              <div className="rounded-2xl border border-zinc-900 bg-neutral-900/40 p-4 sm:p-5 flex flex-col justify-between min-h-[95px] shadow-xl">
                <span className="text-zinc-500 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-zinc-400" /> Exemplaires
                </span>
                <div className="text-xl font-black text-white tabular-nums mt-1">{totalCardsCount}</div>
              </div>
              <div className="rounded-2xl border border-zinc-900 bg-neutral-900/40 p-4 sm:p-5 flex flex-col justify-between min-h-[95px] shadow-xl">
                <span className="text-zinc-500 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-cyan-400" /> Doublons
                </span>
                <div className="text-xl font-black text-cyan-400 tabular-nums mt-1">{totalDuplicates}</div>
              </div>
            </section>
          )}

          {/* Controls Bar : Recherche, Tri & Filtres */}
          <section className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              
              {/* Barre de Recherche */}
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher par nom, numéro, extension..."
                  className="w-full rounded-2xl border border-zinc-900 bg-neutral-900/40 pl-11 pr-10 py-3 text-xs font-medium text-white outline-none focus:border-cyan-500/50 focus:bg-neutral-900/80 transition-all placeholder:text-zinc-600 shadow-xl"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Sélection du Tri */}
              <div className="flex items-center gap-2.5">
                <div className="relative flex-1 sm:w-52">
                  <ArrowUpDown className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-cyan-400 pointer-events-none" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="w-full appearance-none rounded-2xl border border-zinc-900 bg-neutral-900/40 pl-10 pr-9 py-3 text-xs font-bold uppercase tracking-wider text-white outline-none focus:border-cyan-500/50 cursor-pointer shadow-xl"
                  >
                    <option value="value_desc" className="bg-neutral-900 text-white">Valeur (Fort → Faible)</option>
                    <option value="value_asc" className="bg-neutral-900 text-white">Valeur (Faible → Fort)</option>
                    <option value="qty_desc" className="bg-neutral-900 text-white">Doublons (Max → Min)</option>
                    <option value="name_asc" className="bg-neutral-900 text-white">Nom (A → Z)</option>
                    <option value="rarity" className="bg-neutral-900 text-white">Rareté</option>
                  </select>
                </div>

                {/* Filtre Rareté */}
                {availableRarities.length > 0 && (
                  <div className="relative flex-1 sm:w-44">
                    <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
                    <select
                      value={filterRarity}
                      onChange={(e) => setFilterRarity(e.target.value)}
                      className="w-full appearance-none rounded-2xl border border-zinc-900 bg-neutral-900/40 pl-10 pr-9 py-3 text-xs font-bold uppercase tracking-wider text-white outline-none focus:border-cyan-500/50 cursor-pointer shadow-xl"
                    >
                      <option value="all" className="bg-neutral-900 text-white">Toutes raretés</option>
                      {availableRarities.map((r) => (
                        <option key={r} value={r} className="bg-neutral-900 text-white">
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
              <div className="flex items-center gap-2.5 pt-1 text-xs text-zinc-400 px-1">
                <span>Résultats : <strong className="text-white">{processedCards.length}</strong> cartes trouvées</span>
                <button
                  onClick={() => {
                    setSearch("");
                    setFilterRarity("all");
                  }}
                  className="text-cyan-400 underline hover:text-cyan-300 ml-2 font-medium"
                >
                  Réinitialiser les filtres
                </button>
              </div>
            )}
          </section>

          {/* Grille Technique */}
          {loading ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="aspect-[0.72] animate-pulse rounded-2xl bg-neutral-900/40 border border-zinc-900 p-3" />
              ))}
            </div>
          ) : processedCards.length === 0 ? (
            <div className="rounded-2xl border border-zinc-900 bg-neutral-900/40 p-12 text-center shadow-xl">
              <p className="text-zinc-500 text-xs font-medium italic">
                {search || filterRarity !== "all"
                  ? "Aucun actif ne correspond aux critères de recherche."
                  : "Votre inventaire complet est actuellement vide."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {processedCards.map((card) => {
                const safeQty = getSafeQty(card.qty);
                return (
                  <div key={card.id} className="relative group">
                    <CardResult card={card} />
                    {safeQty > 1 && (
                      <div className="absolute right-3 top-3 z-10 rounded-lg bg-black/80 border border-cyan-500/40 px-2 py-0.5 text-[10px] font-black text-cyan-400 shadow-2xl tabular-nums backdrop-blur-md">
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
