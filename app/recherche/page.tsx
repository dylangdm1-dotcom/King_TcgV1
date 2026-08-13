"use client";

import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
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
  CalendarDays,
  ChevronDown,
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
import { type PokemonCard } from "../../lib/types";
import {
  UPCOMING_OFFICIAL_RELEASES,
  classifySetGeneration,
  compareCardsNewestFirst,
  compareSetsNewestFirst,
  effectiveSetReleaseDate,
  isFutureRelease,
  normalizeSetId,
  localizedSetCode,
} from "../../lib/setCatalog";

const PAGE_SIZE = 24;

type SetItem = {
  id: string;
  name: string;
  series?: string;
  total?: number;
  printedTotal?: number;
  releaseDate?: string;
  images?: { symbol?: string; logo?: string };
};


const FR_SET_NAME_ALIASES: Array<[RegExp, string]> = [
  [/^pitch black$/i, "Nuit Noire"],
  [/^chaos rising$/i, "Chaos Ascendant"],
  [/^ascended heroes$/i, "Héros Ascendants"],
];

function localizedSetName(set: SetItem, lang: LanguageCode): string {
  if (lang !== "fr") return set.name;
  for (const [pattern, french] of FR_SET_NAME_ALIASES) {
    if (pattern.test(set.name.trim())) return french;
  }
  return set.name;
}
function getGeneration(set: SetItem): string {
  return classifySetGeneration(set);
}

function yearLabel(date?: string) {
  return date?.slice(0, 4) || "—";
}

export default function Recherche() {
  const [searchQuery, setSearchQuery] = useState("");
  const [query, setQuery] = useState("");
  const [cards, setCards] = useState<PokemonCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [viewMode, setViewMode] = useState<"grid" | "large">("grid");
  const [searchMode, setSearchMode] = useState<"text" | "set">("text");
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageCode>("fr");
  const [allSetsList, setAllSetsList] = useState<SetItem[]>([]);
  const [selectedGeneration, setSelectedGeneration] = useState<string>("all");
  const [selectedSetId, setSelectedSetId] = useState<string>("");
  const [setSearch, setSetSearch] = useState("");
  const [expandedGeneration, setExpandedGeneration] = useState<string | null>(null);
  const [showUpcoming, setShowUpcoming] = useState(false);
  const initialSetHandledRef = useRef(false);
  const [filters, setFilters] = useState<SearchFiltersType>({
    category: "all",
    rarity: "all",
    set: "all",
    sort: "recent",
    condition: "Near Mint",
  });

  useEffect(() => {
    setCards([]);
    setQuery("");
    setSearchQuery("");
    setSelectedSetId("");

    async function loadSets() {
      setLoading(true);
      try {
        const setsData = await getAllSets(selectedLanguage);
        const validSets = (setsData || []).filter((set: any) => Boolean(set?.id && set?.name));
        validSets.forEach((set: SetItem) => {
          const knownDate = effectiveSetReleaseDate(set.id, set.releaseDate);
          if (!set.releaseDate && knownDate) set.releaseDate = knownDate;
        });
        validSets.sort(compareSetsNewestFirst);
        setAllSetsList(validSets);
        setExpandedGeneration(null);
      } catch (error) {
        console.error("[King_TCG] Erreur chargement des séries :", error);
      } finally {
        setSelectedGeneration("all");
        setSelectedSetId("");
        setCards([]);
        setLoading(false);
      }
    }

    void loadSets();
  }, [selectedLanguage]);

  const groupedSets = useMemo(() => {
    const groups: Record<string, SetItem[]> = {};
    for (const set of allSetsList) {
      if (isFutureRelease(set)) continue;
      const generation = getGeneration(set);
      if (!groups[generation]) groups[generation] = [];
      groups[generation].push(set);
    }
    Object.values(groups).forEach((sets) => sets.sort(compareSetsNewestFirst));
    return groups;
  }, [allSetsList]);

  const generationOrder = [
    "MEGA",
    "Écarlate & Violet",
    "Épée & Bouclier",
    "Soleil & Lune",
    "XY",
    "Noir & Blanc",
    "HeartGold & SoulSilver",
    "Diamant & Perle",
    "Promos",
    "Séries classiques",
  ];

  const availableGenerations = useMemo(
    () => generationOrder.filter((generation) => groupedSets[generation]?.length),
    [groupedSets]
  );

  const visibleSetGroups = useMemo(() => {
    const normalized = setSearch.trim().toLowerCase();
    const entries = availableGenerations
      .filter((generation) => selectedGeneration === "all" || selectedGeneration === generation)
      .map((generation) => {
        const sets = groupedSets[generation].filter((set) => {
          if (!normalized) return true;
          return `${localizedSetName(set, selectedLanguage)} ${set.name} ${localizedSetCode(set.id, selectedLanguage)} ${set.id} ${set.series || ""} ${set.releaseDate || ""}`.toLowerCase().includes(normalized);
        });
        return [generation, sets] as const;
      })
      .filter(([, sets]) => sets.length > 0);

    return entries;
  }, [availableGenerations, groupedSets, selectedGeneration, setSearch]);

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
      setCards([...results].sort(compareCardsNewestFirst));
      setVisible(PAGE_SIZE);
    } catch (error) {
      console.error("[King_TCG] Erreur recherche :", error);
    } finally {
      setLoading(false);
    }
  }, [selectedLanguage]);

  async function handleSetSelect(setId: string) {
    if (!setId) return;

    const chosenSet = allSetsList.find(
      (set) => normalizeSetId(set.id) === normalizeSetId(setId)
    );

    // Refuser toute extension absente du catalogue de la langue active.
    if (!chosenSet) {
      console.warn(
        `[King_TCG] Extension ${setId} absente du catalogue ${selectedLanguage}`
      );
      return;
    }

    setSelectedSetId(chosenSet.id);
    setQuery(localizedSetName(chosenSet, selectedLanguage));
    setLoading(true);

    try {
      const results = await searchCardsBySetId(
        chosenSet.id,
        selectedLanguage
      );
      setCards(results);
      if (selectedLanguage === "zh-tw" && results.length > 0) {
        setAllSetsList((current) => current.map((set) =>
          normalizeSetId(set.id) === normalizeSetId(chosenSet.id)
            ? { ...set, total: results[0]?.set?.total || results.length, printedTotal: results[0]?.set?.printedTotal || results.length }
            : set
        ));
      }
      setVisible(PAGE_SIZE);
    } catch (error) {
      console.error("[King_TCG] Erreur recherche extension :", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (initialSetHandledRef.current || allSetsList.length === 0) return;
    const requestedSet = new URLSearchParams(window.location.search).get("set");
    if (!requestedSet || !allSetsList.some((set) => set.id === requestedSet)) return;

    initialSetHandledRef.current = true;
    setSearchMode("set");
    const selected = allSetsList.find((set) => set.id === requestedSet);
    if (selected) {
      setSelectedGeneration(getGeneration(selected));
      setExpandedGeneration(getGeneration(selected));
    }
    void handleSetSelect(requestedSet);
  }, [allSetsList]);

  const filteredCards = useMemo(() => filterCards(cards, filters), [cards, filters]);
  const displayedCards = filteredCards.slice(0, visible);
  const sets = useMemo(
    () => Array.from(new Set(cards.map((card) => card.set?.name).filter(Boolean))) as string[],
    [cards]
  );

  const upcomingReleases = useMemo(() => {
    const languageReleases = UPCOMING_OFFICIAL_RELEASES.filter((release) => release.language === selectedLanguage);
    return languageReleases.map((release) => ({
      ...release,
      set: allSetsList.find((set) => normalizeSetId(set.id) === normalizeSetId(release.id)),
    }));
  }, [allSetsList, selectedLanguage]);

  return (
    <>
      <Navbar />
      <main className="kt-app-shell selection:bg-cyan-500/20">
        <div className="kt-page space-y-6">
          <section className="kt-premium-card kt-rise-in space-y-5 p-4 sm:p-6">
            <div className="flex flex-col justify-between gap-4 border-b border-white/[0.06] pb-5 md:flex-row md:items-center">
              <div className="min-w-0 flex-1">
                <div className="mb-2 flex w-full items-center justify-between gap-4">
                  <div className="kt-eyebrow"><Sparkles className="h-3 w-3" /> Recherche de cartes</div>
                  <img src="/brands/pokemon.png" alt="Pokémon" className="h-9 w-auto max-w-[150px] shrink-0 object-contain sm:h-10 sm:max-w-[176px]" />
                </div>
                <h1 className="flex items-center gap-2 text-xl font-black tracking-tight text-white sm:text-2xl">
                  <Search className="h-5 w-5 text-cyan-300" /> Rechercher une carte
                </h1>
                <p className="mt-1 max-w-2xl text-[11px] leading-5 text-zinc-400">
                  Recherchez par nom ou parcourez les extensions par génération. Les prix visibles se synchronisent ensuite automatiquement.
                </p>
              </div>

              <div className="flex self-start items-center gap-1.5 rounded-2xl border border-white/[0.09] bg-[#1a212b] p-1.5 md:self-auto">
                <span className="flex items-center gap-1.5 px-1.5 text-[10px] font-bold uppercase tracking-[0.11em] text-zinc-500">
                  <Globe className="h-3.5 w-3.5" /> Langue :
                </span>
                {[
                  { code: "fr", label: "🇫🇷", title: "Français" },
                  { code: "en", label: "🇬🇧", title: "Anglais" },
                  { code: "ja", label: "🇯🇵", title: "Japonais" },
                  { code: "zh-tw", label: "🇨🇳", title: "Chinois" },
                ].map((lang) => (
                  <button
                    key={lang.code}
                    title={lang.title}
                    aria-label={lang.title}
                    onClick={() => setSelectedLanguage(lang.code as LanguageCode)}
                    className={`flex h-8 w-9 items-center justify-center rounded-lg text-base transition ${selectedLanguage === lang.code ? "bg-white text-[#0a1017] shadow" : "text-zinc-500 hover:bg-white/[0.05] hover:text-white"}`}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 rounded-2xl border border-white/[0.07] bg-[#171d25] p-1.5">
              <button
                onClick={() => setSearchMode("text")}
                className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-[10px] font-bold uppercase tracking-[0.11em] transition ${searchMode === "text" ? "bg-white text-[#0a1017]" : "text-zinc-500 hover:text-white"}`}
              >
                <Search className="h-3.5 w-3.5" /> Par nom
              </button>
              <button
                onClick={() => setSearchMode("set")}
                className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-[10px] font-bold uppercase tracking-[0.11em] transition ${searchMode === "set" ? "bg-white text-[#0a1017]" : "text-zinc-500 hover:text-white"}`}
              >
                <Layers className="h-3.5 w-3.5" /> Par extension
              </button>
            </div>

            {upcomingReleases.length > 0 ? (
              <section className="overflow-hidden rounded-2xl border border-amber-300/20 bg-amber-300/[0.04]">
                <button
                  type="button"
                  onClick={() => setShowUpcoming((value) => !value)}
                  className="flex w-full items-center justify-between gap-3 px-3.5 py-3 text-left"
                >
                  <span className="min-w-0">
                    <span className="block text-[10px] font-black uppercase tracking-[0.16em] text-amber-300">À venir · Extensions et cartes annoncées</span>
                    <span className="mt-0.5 block truncate text-[11px] font-bold text-zinc-300">Extensions annoncées et cartes révélées avant leur sortie</span>
                  </span>
                  <ChevronDown className={`h-4 w-4 shrink-0 text-amber-300 transition ${showUpcoming ? "rotate-180" : ""}`} />
                </button>
                {showUpcoming ? (
                  <div className="grid gap-2 border-t border-amber-300/10 p-2.5 sm:grid-cols-2">
                    {upcomingReleases.map((release) => (
                      <article key={release.id} className="rounded-xl border border-white/[0.08] bg-[#171d25] p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <span className="text-[10px] font-bold uppercase tracking-[0.11em] text-violet-300">{release.id.toUpperCase()}</span>
                            <h3 className="truncate text-xs font-black text-white">{release.name}</h3>
                            <p className="mt-1 text-[10px] leading-4 text-zinc-400">Sortie {new Date(release.releaseDate).toLocaleDateString("fr-FR")} · Prix officiel {release.officialPrice}</p>
                            <p className="text-[10px] text-zinc-500">{release.contents}</p>
                          </div>
                          <div className="flex shrink-0 flex-col gap-1.5">
                            {release.set ? (
                              <button type="button" onClick={() => { setSearchMode("set"); void handleSetSelect(release.set!.id); }} className="rounded-lg border border-cyan-300/20 bg-cyan-300/[0.08] px-2.5 py-1.5 text-[10px] font-black uppercase text-cyan-200">
                                Cartes révélées
                              </button>
                            ) : null}
                            <a href={release.officialUrl} target="_blank" rel="noreferrer" className="rounded-lg border border-white/[0.08] px-2.5 py-1.5 text-center text-[10px] font-black uppercase text-zinc-300">
                              Officiel
                            </a>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : null}
              </section>
            ) : null}

            {searchMode === "text" ? (
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                  <input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    onKeyDown={(event) => event.key === "Enter" && executeSearch(searchQuery)}
                    placeholder="Dracaufeu, Pikachu, Ectoplasma…"
                    className="w-full rounded-2xl border border-white/[0.09] bg-[#11161d] px-4 py-4 text-xs font-bold text-white outline-none transition placeholder:text-zinc-600 focus:border-cyan-300/45 focus:ring-2 focus:ring-cyan-300/10"
                  />
                  {loading ? <Loader2 className="absolute right-4 top-4 h-4 w-4 animate-spin text-cyan-300" /> : null}
                </div>
                <button onClick={() => executeSearch(searchQuery)} disabled={loading || searchQuery.trim().length < 2} className="kt-primary-button px-6 text-xs uppercase tracking-widest disabled:opacity-50">
                  <Search className="h-4 w-4" /> Rechercher
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
                  <div className="relative">
                    <Search className="absolute left-4 top-3.5 h-4 w-4 text-zinc-600" />
                    <input
                      value={setSearch}
                      onChange={(event) => setSetSearch(event.target.value)}
                      placeholder="Rechercher une extension, une année ou un code…"
                      className="w-full rounded-2xl border border-white/[0.09] bg-[#11161d] py-3.5 pl-11 pr-4 text-xs font-bold text-white outline-none placeholder:text-zinc-600 focus:border-violet-300/40"
                    />
                  </div>
                  <select
                    value={selectedGeneration}
                    onChange={(event) => setSelectedGeneration(event.target.value)}
                    className="rounded-2xl border border-white/[0.09] bg-[#171d25] px-4 py-3.5 text-xs font-bold text-white outline-none"
                    style={{ colorScheme: "dark" }}
                  >
                    <option value="all">Toutes les générations</option>
                    {availableGenerations.map((generation) => (
                      <option key={generation} value={generation}>{generation}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-3">
                  {visibleSetGroups.map(([generation, generationSets]) => {
                    const expanded = expandedGeneration === generation;
                    const newestSet = generationSets[0];

                    return (
                      <section key={generation} className="min-w-0 max-w-full overflow-hidden rounded-[18px] border border-white/[0.08] bg-[#151b23]">
                        <button
                          type="button"
                          onClick={() => setExpandedGeneration(expandedGeneration === generation ? null : generation)}
                          className="flex w-full min-w-0 items-center justify-between gap-3 overflow-hidden px-4 py-3.5 text-left"
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-xs font-black text-white">{generation}</span>
                            <span className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[10px] font-semibold text-zinc-500">
                              <span className="shrink-0">{generationSets.length} extension{generationSets.length > 1 ? "s" : ""}</span>
                              {newestSet ? <span className="truncate">· dernière : {yearLabel(effectiveSetReleaseDate(newestSet.id))}</span> : null}
                            </span>
                          </span>
                          <ChevronDown className={`h-4 w-4 text-zinc-500 transition ${expanded ? "rotate-180" : ""}`} />
                        </button>

                        {expanded ? (
                          <div className="grid min-w-0 gap-1.5 border-t border-white/[0.06] p-2 sm:grid-cols-2 xl:grid-cols-3">
                            {generationSets.map((set) => (
                              <button
                                type="button"
                                key={set.id}
                                onClick={() => handleSetSelect(set.id)}
                                className={`group grid min-h-[56px] min-w-0 max-w-full grid-cols-[38px_minmax(0,1fr)_auto] items-center gap-2.5 overflow-hidden rounded-xl border px-2.5 py-2 text-left transition ${selectedSetId === set.id ? "border-violet-300/40 bg-violet-300/[0.08]" : "border-white/[0.07] bg-[#1a212b] hover:border-white/[0.14] hover:bg-[#1d2530]"}`}
                              >
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/[0.08] bg-black/20">
                                  {set.images?.symbol ? <img src={set.images.symbol} alt="" className="h-6 w-6 object-contain" /> : <Package className="h-4 w-4 text-violet-300" />}
                                </span>

                                <span className="min-w-0 overflow-hidden">
                                  <span className="block truncate text-[10px] font-black text-white" title={set.name}>{localizedSetName(set, selectedLanguage)}</span>
                                  <span className="mt-1 flex min-w-0 items-center gap-1.5 overflow-hidden text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                                    <span className="inline-flex shrink-0 items-center gap-1"><CalendarDays className="h-2.5 w-2.5 text-amber-300" /> {yearLabel(effectiveSetReleaseDate(set.id))}</span>
                                    <span className="truncate">{set.series || generation}</span>
                                  </span>
                                </span>

                                <span className="shrink-0 pl-1 text-right">
                                  <span className="block text-[10px] font-black text-zinc-200">{set.total || set.printedTotal || "—"}</span>
                                  <span className="block text-[6px] font-bold uppercase tracking-wide text-zinc-600">cartes</span>
                                  <span className="mt-0.5 block max-w-[54px] truncate text-[6px] font-black uppercase text-violet-300">{localizedSetCode(set.id, selectedLanguage)}</span>
                                </span>
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </section>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="border-t border-white/[0.07] pt-4">
              <SearchFilters filters={filters} onChange={setFilters} sets={sets} />
            </div>
          </section>

          <section className="kt-premium-card-soft flex items-center justify-between gap-4 p-3">
            <div className="flex min-w-0 items-center gap-2 rounded-xl border border-white/[0.08] bg-[#171d25] px-3.5 py-2 text-[10px] font-bold uppercase tracking-[0.11em] text-zinc-300">
              <Filter className="h-3.5 w-3.5 shrink-0 text-violet-300" />
              <span>{filteredCards.length} résultat{filteredCards.length > 1 ? "s" : ""}</span>
              {query ? <span className="truncate font-normal text-zinc-500">· {query}</span> : null}
            </div>

            <div className="flex gap-1 rounded-xl border border-white/[0.08] bg-[#171d25] p-1">
              <button onClick={() => setViewMode("grid")} className={`rounded-lg px-3 py-1.5 text-[10px] font-black uppercase transition ${viewMode === "grid" ? "bg-white text-[#0a1017]" : "text-zinc-500"}`}>
                <LayoutGrid className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => setViewMode("large")} className={`rounded-lg px-3 py-1.5 text-[10px] font-black uppercase transition ${viewMode === "large" ? "bg-white text-[#0a1017]" : "text-zinc-500"}`}>
                <Maximize2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </section>

          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="search-loading"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
              >
                {Array.from({ length: 12 }).map((_, index) => (
                  <div key={index} className="overflow-hidden rounded-[18px] border border-white/[0.08] bg-[#171f29] p-2.5">
                    <div className="kt-skeleton aspect-[0.72] rounded-[15px]" />
                    <div className="space-y-2 px-1 pb-1 pt-3">
                      <div className="kt-skeleton h-3 w-4/5 rounded-full" />
                      <div className="kt-skeleton h-2.5 w-3/5 rounded-full" />
                      <div className="mt-3 flex gap-2"><div className="kt-skeleton h-6 flex-1 rounded-lg" /><div className="kt-skeleton h-6 w-14 rounded-lg" /></div>
                    </div>
                  </div>
                ))}
              </motion.div>
            ) : null}
          </AnimatePresence>

          {!loading && query.length >= 2 && filteredCards.length === 0 ? (
            <div className="rounded-2xl border border-white/[0.08] bg-[#171d25] p-10 text-center">
              <Sparkles className="mx-auto mb-3 h-8 w-8 text-violet-300/60" />
              <p className="text-xs font-black uppercase tracking-wider text-zinc-300">Aucun résultat pour « {query} »</p>
              <p className="mx-auto mt-1 max-w-sm text-[11px] text-zinc-500">Vérifiez l’orthographe, la langue ou sélectionnez directement une extension.</p>
            </div>
          ) : null}

          {!loading ? (
            <motion.div
              layout
              className={viewMode === "grid" ? "grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6" : "flex flex-col items-center gap-4"}
            >
              {displayedCards.map((card, index) => (
                <motion.div
                  layout
                  key={card.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.24, delay: Math.min(index, 10) * 0.018 }}
                  className={viewMode === "large" ? "w-full max-w-md" : "w-full"}
                >
                  <CardResult card={card} />
                </motion.div>
              ))}
            </motion.div>
          ) : null}

          {!loading && visible < filteredCards.length ? (
            <div className="pb-8 pt-6 text-center">
              <button onClick={() => setVisible((value) => value + PAGE_SIZE)} className="kt-secondary-button px-8 text-[11px] uppercase tracking-wider">
                Afficher plus ({filteredCards.length - visible})
              </button>
            </div>
          ) : null}
        </div>
      </main>
    </>
  );
}
