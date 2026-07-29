// "use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import {
  Search,
  Package,
  Layers,
  Globe,
  LayoutGrid,
  Maximize2,
  Filter,
  Loader2,
  Sparkles,
} from "lucide-react";
import Navbar from "../../components/Navbar";
import CardResult from "@/components/cards/CardResult";
import SearchFilters from "../../components/SearchFilters";
import {
  searchCards,
  searchCardsBySetId,
  getAllSets,
  type LanguageCode,
} from "../../lib/pokemon";
import { filterCards, type SearchFilters as SearchFiltersType } from "../../lib/search";
import { getAdjustedPriceByCondition } from "../../lib/marketEngine";
import type { PokemonCard } from "../../lib/types";

const PAGE_SIZE = 24;

export default function Recherche() {
  const [searchQuery, setSearchQuery] = useState("");
  const [query, setQuery] = useState("");

  const [cards, setCards] = useState<PokemonCard[]>([]);
  const [loading, setLoading] = useState(false);

  const [visible, setVisible] = useState(PAGE_SIZE);
  const [viewMode, setViewMode] = useState<"grid" | "large">("grid");

  const [searchMode, setSearchMode] = useState<"text" | "set">("text");
  // Français sélectionné par défaut
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageCode>("fr");

  const [allSetsList, setAllSetsList] = useState<any[]>([]);
  const [selectedBlock, setSelectedBlock] = useState<string>("all");
  const [selectedSetId, setSelectedSetId] = useState<string>("");

  const [filters, setFilters] = useState<SearchFiltersType>({
    category: "all",
    rarity: "all",
    set: "all",
    sort: "recent",
    condition: "Near Mint", // État par défaut
  });

  // Recharger et trier la liste des extensions au changement de langue
  useEffect(() => {
    async function loadSets() {
      setLoading(true);
      try {
        const setsData = await getAllSets(selectedLanguage);
        
        // 1. Ne garder que les séries valides ayant un ID
        const validSets = (setsData || []).filter((s) => Boolean(s && s.id && s.name));

        // 2. Tri du plus récent au plus ancien
        validSets.sort((a, b) => {
          if (a.releaseDate && b.releaseDate) {
            return new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime();
          }
          return b.id.localeCompare(a.id, undefined, { numeric: true, sensitivity: "base" });
        });

        setAllSetsList(validSets);
      } catch (error) {
        console.error("[King_TCG] Erreur chargement des séries :", error);
      } finally {
        setSelectedBlock("all");
        setSelectedSetId("");
        setCards([]);
        setLoading(false);
      }
    }
    loadSets();
  }, [selectedLanguage]);

  // Regroupement dynamique des séries par Bloc / Ère
  const groupedSets = useMemo(() => {
    const groups: { [series: string]: any[] } = {};
    allSetsList.forEach((set) => {
      const seriesName = set.series || "Autres Séries";
      if (!groups[seriesName]) {
        groups[seriesName] = [];
      }
      groups[seriesName].push(set);
    });
    return groups;
  }, [allSetsList]);

  // Liste des blocs
  const availableBlocks = useMemo(() => Object.keys(groupedSets), [groupedSets]);

  // Liste des séries filtrées par le bloc sélectionné
  const filteredSetsByBlock = useMemo(() => {
    if (selectedBlock === "all") return allSetsList;
    return groupedSets[selectedBlock] || [];
  }, [selectedBlock, groupedSets, allSetsList]);

  // Fonction centrale de recherche textuelle MANUELLE
  const executeSearch = useCallback(async (searchTerm: string) => {
    const value = searchTerm.trim();
    setQuery(value);

    if (value.length < 2) {
      setCards([]);
      setVisible(PAGE_SIZE);
      return;
    }

    setLoading(true);

    try {
      const results = await searchCards(value, selectedLanguage);
      setCards(results);
      setVisible(PAGE_SIZE);
    } catch (error) {
      console.error("[King_TCG] Erreur recherche :", error);
    } finally {
      setLoading(false);
    }
  }, [selectedLanguage]);

  // Recherche directe par Extension
  async function handleSetSelect(setId: string) {
    setSelectedSetId(setId);
    if (!setId) return;

    const chosenSet = allSetsList.find((s) => s.id === setId);
    setQuery(chosenSet ? chosenSet.name : setId);
    setLoading(true);

    try {
      const results = await searchCardsBySetId(setId, selectedLanguage);
      setCards(results);
      setVisible(PAGE_SIZE);
    } catch (error) {
      console.error("[King_TCG] Erreur recherche extension :", error);
    } finally {
      setLoading(false);
    }
  }

  const filteredCards = useMemo(
    () => filterCards(cards, filters),
    [cards, filters]
  );

  const displayedCards = filteredCards.slice(0, visible);

  const sets = useMemo(() => {
    return Array.from(
      new Set(
        cards
          .map((c) => c.set?.name)
          .filter(Boolean)
      )
    ) as string[];
  }, [cards]);

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-black text-white">
        <div className="mx-auto max-w-7xl space-y-6 px-4 py-8">
          {/* Section Recherche */}
          <section className="rounded-xl border border-zinc-900 bg-neutral-950 p-4 md:p-6 shadow-2xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-900/80 pb-4">
              <div>
                <h1 className="text-base font-black uppercase tracking-widest text-white flex items-center gap-2">
                  <Search className="w-5 h-5 text-cyan-400" /> Recherche de Carte Pokémon
                </h1>
                <p className="mt-1 text-[11px] font-medium text-zinc-500">
                  Consultez la base de données TCG, comparez les prix FR/EN et trouvez vos cartes.
                </p>
              </div>

              {/* Sélecteur de Région/Langue */}
              <div className="flex items-center gap-1 bg-neutral-900 p-1 rounded-lg border border-zinc-800">
                <span className="text-[10px] font-bold text-zinc-500 uppercase px-2 flex items-center gap-1">
                  <Globe className="w-3 h-3 text-cyan-400" /> Région :
                </span>
                {[
                  { code: "fr", label: "🇫🇷 FR" },
                  { code: "en", label: "🇺🇸 EN" },
                  { code: "ja", label: "🇯🇵 JP" },
                  { code: "zh-tw", label: "🇨🇳 ZH" },
                ].map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => setSelectedLanguage(lang.code as LanguageCode)}
                    className={`px-2.5 py-1 rounded text-[10px] font-black transition ${
                      selectedLanguage === lang.code
                        ? "bg-cyan-500 text-black shadow-lg shadow-cyan-500/20"
                        : "text-zinc-400 hover:text-white hover:bg-neutral-800"
                    }`}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Commutateur de Mode : Texte / Extension */}
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setSearchMode("text")}
                className={`rounded-lg px-3.5 py-2 text-[11px] font-black uppercase tracking-wider transition flex items-center gap-2 ${
                  searchMode === "text"
                    ? "bg-cyan-500 text-black shadow"
                    : "border border-zinc-800 bg-neutral-900 text-zinc-400 hover:text-white"
                }`}
              >
                <Search className="w-3.5 h-3.5" /> Par Nom
              </button>
              <button
                onClick={() => setSearchMode("set")}
                className={`rounded-lg px-3.5 py-2 text-[11px] font-black uppercase tracking-wider transition flex items-center gap-2 ${
                  searchMode === "set"
                    ? "bg-cyan-500 text-black shadow"
                    : "border border-zinc-800 bg-neutral-900 text-cyan-400 hover:bg-cyan-500/10"
                }`}
              >
                <Package className="w-3.5 h-3.5" /> Par Extension
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {searchMode === "text" ? (
                <>
                  <div className="relative">
                    <input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          executeSearch(searchQuery);
                        }
                      }}
                      placeholder="Saisir un nom de Pokémon (ex: Dracaufeu, Pikachu, Mewtwo...)"
                      className="w-full rounded-lg border border-zinc-800 bg-neutral-900 px-4 py-3 text-xs font-bold text-white placeholder-zinc-600 outline-none transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                    />
                    {loading && (
                      <Loader2 className="absolute right-3 top-3.5 h-4 w-4 animate-spin text-cyan-400" />
                    )}
                  </div>

                  <button
                    onClick={() => executeSearch(searchQuery)}
                    disabled={loading || searchQuery.trim().length < 2}
                    className="w-full rounded-lg bg-cyan-500 py-3 text-xs font-black uppercase tracking-widest text-black transition hover:bg-cyan-400 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/10"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Recherche en cours...
                      </>
                    ) : (
                      <>
                        <Search className="w-4 h-4" /> Rechercher
                      </>
                    )}
                  </button>
                </>
              ) : (
                /* Sélecteur d'extension hiérarchique (Bloc -> Série) */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-cyan-400" /> 1. Bloc / Ère
                    </label>
                    <select
                      value={selectedBlock}
                      onChange={(e) => {
                        setSelectedBlock(e.target.value);
                        setSelectedSetId("");
                      }}
                      style={{ colorScheme: "dark" }}
                      className="w-full rounded-lg border border-zinc-800 bg-neutral-900 text-white px-3 py-3 text-xs font-bold outline-none transition focus:border-cyan-400 appearance-none"
                    >
                      <option value="all" className="bg-neutral-900 text-white">
                        -- Tous les Blocs ({availableBlocks.length}) --
                      </option>
                      {availableBlocks.map((block) => (
                        <option key={block} value={block} className="bg-neutral-900 text-white">
                          {block} ({groupedSets[block].length} séries)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1 flex items-center gap-1.5">
                      <Package className="w-3.5 h-3.5 text-cyan-400" /> 2. Série / Extension
                    </label>
                    <select
                      value={selectedSetId}
                      onChange={(e) => handleSetSelect(e.target.value)}
                      style={{ colorScheme: "dark" }}
                      className="w-full rounded-lg border border-cyan-500/40 bg-neutral-900 text-cyan-300 px-3 py-3 text-xs font-bold outline-none transition focus:border-cyan-400 appearance-none"
                    >
                      <option value="" className="bg-neutral-900 text-white">
                        -- Choisir la série --
                      </option>
                      {filteredSetsByBlock.map((s) => (
                        <option key={s.id} value={s.id} className="bg-neutral-900 text-white">
                          {s.name} ({s.id.toUpperCase()}) {s.total ? `[${s.total} cartes]` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-5">
              <SearchFilters
                filters={filters}
                onChange={setFilters}
                sets={sets}
              />
            </div>
          </section>

          {/* Barre d'outils / Stats */}
          <section className="flex items-center justify-between gap-4 border-b border-zinc-900/60 pb-3">
            <div className="rounded-md border border-zinc-800 bg-neutral-900/80 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-zinc-300 flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-cyan-400" />
              <span>{filteredCards.length} Carte(s) disponible(s)</span>
              {query && (
                <span className="text-cyan-400 font-normal">pour "{query}"</span>
              )}
            </div>

            <div className="flex gap-1 rounded-lg border border-zinc-900 bg-neutral-900 p-1">
              <button
                onClick={() => setViewMode("grid")}
                className={`rounded px-2.5 py-1 text-[10px] font-black uppercase flex items-center gap-1 transition ${
                  viewMode === "grid"
                    ? "bg-zinc-800 text-cyan-400"
                    : "text-zinc-500 hover:text-white"
                }`}
                title="Vue en grille"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Grille</span>
              </button>

              <button
                onClick={() => setViewMode("large")}
                className={`rounded px-2.5 py-1 text-[10px] font-black uppercase flex items-center gap-1 transition ${
                  viewMode === "large"
                    ? "bg-zinc-800 text-cyan-400"
                    : "text-zinc-500 hover:text-white"
                }`}
                title="Vue large"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Large</span>
              </button>
            </div>
          </section>

          {/* Loader Skeleton */}
          {loading && (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-[0.72] animate-pulse rounded-xl bg-neutral-900/80 border border-zinc-800/80 p-3 flex flex-col justify-between"
                >
                  <div className="w-full h-3/4 bg-zinc-800/50 rounded-lg" />
                  <div className="space-y-1.5 mt-2">
                    <div className="h-3 bg-zinc-800/50 rounded w-3/4" />
                    <div className="h-2.5 bg-zinc-800/30 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* État vide */}
          {!loading && query.length >= 2 && filteredCards.length === 0 && (
            <div className="rounded-xl border border-zinc-900 bg-neutral-950 p-12 text-center shadow-inner">
              <Sparkles className="w-8 h-8 text-cyan-400/50 mx-auto mb-3 animate-pulse" />
              <p className="text-xs font-black uppercase tracking-wider text-zinc-300">
                Aucune carte trouvée pour "{query}"
              </p>
              <p className="mt-1.5 text-[11px] text-zinc-500 max-w-sm mx-auto">
                Essayez avec le nom anglais (ex: Charizard) ou ajustez vos filtres de recherche.
              </p>
            </div>
          )}

          {/* Grille de cartes avec application dynamique du prix selon l'état choisi */}
          {!loading && (
            <div
              className={
                viewMode === "grid"
                  ? "grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6"
                  : "flex flex-col items-center gap-4"
              }
            >
              {displayedCards.map((card) => {
                // Application du prix ajusté selon la condition sélectionnée dans les filtres
                const basePrice = card.computedPrice ?? 0;
                const adjustedPrice = getAdjustedPriceByCondition(basePrice, filters.condition ?? "Near Mint");
                const cardWithAdjustedPrice = { ...card, computedPrice: adjustedPrice };

                return (
                  <div
                    key={card.id}
                    className={
                      viewMode === "large" ? "w-full max-w-md" : "w-full"
                    }
                  >
                    <CardResult card={cardWithAdjustedPrice} />
                  </div>
                );
              })}
            </div>
          )}

          {/* Bouton Charger Plus */}
          {!loading && visible < filteredCards.length && (
            <div className="text-center pt-6 pb-8">
              <button
                onClick={() => setVisible((v) => v + PAGE_SIZE)}
                className="rounded-lg border border-zinc-800 bg-neutral-900 px-8 py-3 text-[11px] font-black uppercase text-cyan-400 hover:bg-neutral-800 hover:border-cyan-500/30 transition active:scale-95 shadow-lg"
              >
                Afficher plus de cartes ({filteredCards.length - visible} restantes)
              </button>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
