"use client";

import { useMemo, useState, useEffect } from "react";
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
  });

  // Recharger la liste des extensions au changement de langue
  useEffect(() => {
    async function loadSets() {
      setLoading(true);
      const setsData = await getAllSets(selectedLanguage);
      setAllSetsList(setsData);
      setSelectedBlock("all");
      setSelectedSetId("");
      setCards([]);
      setLoading(false);
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

  const availableBlocks = useMemo(() => Object.keys(groupedSets), [groupedSets]);

  // Liste des séries filtrées par le bloc sélectionné
  const filteredSetsByBlock = useMemo(() => {
    if (selectedBlock === "all") return allSetsList;
    return groupedSets[selectedBlock] || [];
  }, [selectedBlock, groupedSets, allSetsList]);

  // Recherche textuelle classique
  async function handleSearch() {
    const value = searchQuery.trim();
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
  }

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

      <main className="min-h-screen bg-black">
        <div className="mx-auto max-w-7xl space-y-6 px-4 py-8">
          {/* Section Recherche */}
          <section className="rounded-xl border border-zinc-900 bg-neutral-950/40 p-4 md:p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-900/80 pb-4">
              <div>
                <h1 className="text-s font-black uppercase tracking-widest text-white">
                  Recherche de Carte Pokémon
                </h1>
                <p className="mt-1 text-[11px] font-medium text-zinc-500">
                  Filtrez les bases TCG, analysez les cotations et recherchez vos Pokémon.
                </p>
              </div>

              {/* Sélecteur de Région/Langue (FR en premier) */}
              <div className="flex items-center gap-1 bg-neutral-900 p-1 rounded-lg border border-zinc-800">
                <span className="text-[10px] font-bold text-zinc-500 uppercase px-2">Région :</span>
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
                        ? "bg-cyan-500 text-black shadow"
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
                className={`rounded-lg px-3 py-1.5 text-[11px] font-black uppercase tracking-wider transition ${
                  searchMode === "text"
                    ? "bg-cyan-500 text-black"
                    : "border border-zinc-800 bg-neutral-900 text-zinc-400 hover:text-white"
                }`}
              >
                Par Nom
              </button>
              <button
                onClick={() => setSearchMode("set")}
                className={`rounded-lg px-3 py-1.5 text-[11px] font-black uppercase tracking-wider transition ${
                  searchMode === "set"
                    ? "bg-cyan-500 text-black"
                    : "border border-zinc-800 bg-neutral-900 text-cyan-400 hover:bg-cyan-500/10"
                }`}
              >
                📦 Par Extension
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {searchMode === "text" ? (
                <>
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleSearch();
                      }
                    }}
                    placeholder="Saisir un nom de Pokémon, un dresseur..."
                    className="w-full rounded-lg border border-zinc-900 bg-neutral-950/80 px-4 py-3 text-xs font-bold text-white placeholder-zinc-600 outline-none transition focus:border-cyan-500/30"
                  />

                  <button
                    onClick={handleSearch}
                    disabled={loading}
                    className="w-full rounded-lg bg-cyan-500 py-3 text-xs font-black uppercase tracking-widest text-black transition hover:bg-cyan-400 disabled:opacity-50"
                  >
                    {loading ? "Recherche..." : "Rechercher"}
                  </button>
                </>
              ) : (
                /* Sélecteur d'extension hiérarchique (Bloc -> Série) */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Étape 1 : Sélection du Bloc / Ère */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                      1. Bloc / Ère
                    </label>
                    <select
                      value={selectedBlock}
                      onChange={(e) => {
                        setSelectedBlock(e.target.value);
                        setSelectedSetId("");
                      }}
                      className="w-full rounded-lg border border-zinc-800 bg-neutral-950/90 px-3 py-2.5 text-xs font-bold text-white outline-none transition focus:border-cyan-400"
                    >
                      <option value="all">-- Tous les Blocs ({availableBlocks.length}) --</option>
                      {availableBlocks.map((block) => (
                        <option key={block} value={block} className="bg-neutral-900">
                          {block} ({groupedSets[block].length} séries)
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Étape 2 : Sélection de la Série finale */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                      2. Série / Extension
                    </label>
                    <select
                      value={selectedSetId}
                      onChange={(e) => handleSetSelect(e.target.value)}
                      className="w-full rounded-lg border border-cyan-500/40 bg-neutral-950/90 px-3 py-2.5 text-xs font-bold text-cyan-300 outline-none transition focus:border-cyan-400"
                    >
                      <option value="">-- Choisir la série --</option>
                      {filteredSetsByBlock.map((s) => (
                        <option key={s.id} value={s.id} className="bg-neutral-900 text-white">
                          {s.name} ({s.id.toUpperCase()}) [{s.total} cartes]
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

          {/* Barre d'outils */}
          <section className="flex items-center justify-between gap-4 border-b border-zinc-900/60 pb-3">
            <div className="rounded border border-zinc-900 bg-neutral-950 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-zinc-400">
              {filteredCards.length} Carte(s) trouvées
            </div>

            <div className="flex gap-1 rounded-lg border border-zinc-900 bg-neutral-950 p-1">
              <button
                onClick={() => setViewMode("grid")}
                className={`rounded px-3 py-1 text-[10px] font-black uppercase ${
                  viewMode === "grid"
                    ? "bg-zinc-900 text-cyan-400"
                    : "text-zinc-500"
                }`}
              >
                Grille
              </button>

              <button
                onClick={() => setViewMode("large")}
                className={`rounded px-3 py-1 text-[10px] font-black uppercase ${
                  viewMode === "large"
                    ? "bg-zinc-900 text-cyan-400"
                    : "text-zinc-500"
                }`}
              >
                Large
              </button>
            </div>
          </section>

          {loading && (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-[0.72] animate-pulse rounded-lg bg-neutral-950 border border-zinc-900"
                />
              ))}
            </div>
          )}

          {!loading && query.length >= 2 && filteredCards.length === 0 && (
            <div className="rounded-xl border border-zinc-900 bg-neutral-950/20 p-10 text-center">
              <p className="text-xs font-black uppercase text-zinc-400">
                Aucune correspondance trouvée
              </p>

              <p className="mt-1 text-[11px] text-zinc-500">
                Vérifiez l'orthographe ou modifiez les filtres.
              </p>
            </div>
          )}

          {!loading && (
            <div
              className={
                viewMode === "grid"
                  ? "grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6"
                  : "flex flex-col items-center gap-4"
              }
            >
              {displayedCards.map((card) => (
                <div
                  key={card.id}
                  className={
                    viewMode === "large" ? "w-full max-w-md" : "w-full"
                  }
                >
                  <CardResult card={card} />
                </div>
              ))}
            </div>
          )}

          {!loading && visible < filteredCards.length && (
            <div className="text-center pt-4">
              <button
                onClick={() => setVisible((v) => v + PAGE_SIZE)}
                className="rounded-lg border border-zinc-900 bg-neutral-950 px-6 py-2.5 text-[11px] font-black uppercase text-cyan-400"
              >
                Charger plus de références
              </button>
            </div>
          )}
        </div>
      </main>
    </>
  );
}