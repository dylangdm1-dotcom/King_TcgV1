"use client";

import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
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
  ArrowRight,
  Hash,
  ImageOff,
} from "lucide-react";
import Navbar from "../../components/Navbar";
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

const GENERATION_ORDER = [
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

type SetItem = {
  id: string;
  name: string;
  series?: string;
  total?: number;
  printedTotal?: number;
  releaseDate?: string;
  images?: { symbol?: string; logo?: string };
  availability?: "available" | "announced" | "unknown" | "metadata_only";
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

function hasPublishedCards(set: SetItem): boolean {
  if (set.availability === "metadata_only") return false;
  if (set.availability === "available") return true;
  return Number(set.total || set.printedTotal || 0) > 0;
}

function yearLabel(date?: string) {
  return date?.slice(0, 4) || "—";
}


function SearchResultCard({ card }: { card: PokemonCard }) {
  const imageCandidates = useMemo(
    () =>
      Array.from(
        new Set(
          [
            card.images?.large,
            card.images?.small,
            ...(card.imageCandidates ?? []),
          ].filter(Boolean)
        )
      ) as string[],
    [card.images?.large, card.images?.small, card.imageCandidates]
  );
  const [imageIndex, setImageIndex] = useState(0);
  const imageSrc = imageCandidates[imageIndex] || "";
  const imageFailed = imageIndex >= imageCandidates.length || !imageSrc;

  const variantCount = card.availablePrintVariants?.length || 0;
  const setCode = card.set?.id?.toUpperCase() || "";
  const releaseYear = yearLabel(card.set?.releaseDate);
  const typeLabel =
    card.types?.[0] ||
    card.cardType ||
    card.supertype ||
    "Carte Pokémon";

  return (
    <article className="kt-card-frame group relative flex h-full flex-col overflow-hidden rounded-[20px] bg-[#0a1118] p-2.5 transition duration-200 hover:-translate-y-1 hover:shadow-[0_20px_48px_rgba(0,0,0,.30),0_0_24px_rgba(34,211,238,.055)]">
      <div className="pointer-events-none absolute inset-x-8 top-2 h-20 rounded-full bg-cyan-400/[0.04] blur-2xl" />

      <Link href={`/card/${card.id}`} className="relative block">
        <div className="kt-card-frame relative aspect-[0.72] overflow-hidden rounded-[16px] bg-[#0c151e]">
          <div className="absolute left-2 top-2 z-20 flex max-w-[calc(100%-1rem)] flex-wrap gap-1.5">
            {card.dataLanguage ? (
              <span className="rounded-full border border-cyan-400/28 bg-[#061016]/90 px-2 py-1 text-[10px] font-black uppercase tracking-[0.10em] text-cyan-200 backdrop-blur">
                {card.dataLanguage === "zh-tw" ? "CN" : card.dataLanguage.toUpperCase()}
              </span>
            ) : null}
            {variantCount > 1 ? (
              <span className="rounded-full border border-violet-400/25 bg-[#100c19]/90 px-2 py-1 text-[10px] font-black uppercase tracking-[0.10em] text-violet-200 backdrop-blur">
                {variantCount} versions
              </span>
            ) : null}
          </div>

          {!imageFailed && imageSrc ? (
            <img
              src={imageSrc}
              alt={card.name}
              loading="lazy"
              onError={() => setImageIndex((current) => current + 1)}
              className="relative z-10 h-full w-full object-contain p-2.5 drop-shadow-[0_18px_20px_rgba(0,0,0,.46)] transition duration-300 group-hover:scale-[1.035]"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-4 text-center text-zinc-500">
              <ImageOff className="h-7 w-7" />
              <span className="text-[10px] font-bold leading-4">
                Visuel indisponible
              </span>
            </div>
          )}

          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-16 bg-gradient-to-t from-[#061016]/75 to-transparent" />
        </div>
      </Link>

      <div className="relative flex flex-1 flex-col px-1 pb-1 pt-3">
        <div className="min-h-[48px]">
          <div className="flex items-start justify-between gap-2">
            <h2 className="line-clamp-2 text-[13px] font-black leading-[1.25] tracking-[-0.015em] text-white transition group-hover:text-cyan-100">
              {card.name}
            </h2>
            <span className="shrink-0 rounded-md border border-white/[0.06] bg-white/[0.03] px-1.5 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-zinc-400">
              {setCode || "SET"}
            </span>
          </div>
          <p className="mt-1 line-clamp-1 text-[10px] font-semibold text-zinc-400">
            {card.set?.name}
          </p>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-1.5">
          <div className="rounded-[11px] border border-cyan-400/12 bg-cyan-400/[0.035] px-2.5 py-2">
            <p className="text-[10px] font-black uppercase tracking-[0.12em] text-zinc-500">
              Numéro
            </p>
            <p className="mt-1 flex items-center gap-1 text-[10px] font-black text-cyan-200">
              <Hash className="h-2.5 w-2.5" />
              {card.number}
            </p>
          </div>

          <div className="rounded-[11px] border border-white/[0.06] bg-white/[0.025] px-2.5 py-2">
            <p className="text-[10px] font-black uppercase tracking-[0.12em] text-zinc-500">
              Rareté
            </p>
            <p className="mt-1 truncate text-[10px] font-black text-white">
              {card.rarity || "Standard"}
            </p>
          </div>
        </div>

        <div className="mt-1.5 flex items-center justify-between gap-2 rounded-[11px] border border-white/[0.055] bg-[#0c151e] px-2.5 py-2">
          <span className="min-w-0 truncate text-[10px] font-bold text-zinc-400">
            {typeLabel}
          </span>
          <span className="shrink-0 text-[10px] font-black text-zinc-500">
            {releaseYear}
          </span>
        </div>

        <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-white/[0.06] pt-2.5">
          <span className="text-[10px] font-semibold text-zinc-500">
            Prix dans la fiche
          </span>
          <Link
            href={`/card/${card.id}`}
            className="inline-flex items-center gap-1.5 rounded-[10px] border border-cyan-400/22 bg-cyan-400/[0.055] px-2.5 py-2 text-[10px] font-black uppercase tracking-[0.09em] text-cyan-200 transition hover:border-cyan-300/45 hover:bg-cyan-400/[0.09]"
          >
            Voir la carte
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </article>
  );
}

export default function Recherche() {
  const [searchQuery, setSearchQuery] = useState("");
  const [query, setQuery] = useState("");
  const [cards, setCards] = useState<PokemonCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [catalogLoading, setCatalogLoading] = useState(false);
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
  const [catalogNotice, setCatalogNotice] = useState("");
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
    setCatalogNotice("");
    setAllSetsList([]);

    async function loadSets() {
      setLoading(true);
      setCatalogLoading(true);
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
        setCatalogLoading(false);
      }
    }

    void loadSets();
  }, [selectedLanguage]);

  const groupedSets = useMemo(() => {
    const groups: Record<string, SetItem[]> = {};
    for (const set of allSetsList) {
      // Une date fournisseur future ne doit jamais masquer une extension qui
      // publie déjà réellement des cartes.
      if (isFutureRelease(set) && !hasPublishedCards(set)) continue;
      const generation = getGeneration(set);
      if (!groups[generation]) groups[generation] = [];
      groups[generation].push(set);
    }
    Object.values(groups).forEach((sets) => sets.sort(compareSetsNewestFirst));
    return groups;
  }, [allSetsList]);

  const availableGenerations = useMemo(() => {
    const known = GENERATION_ORDER.filter((generation) => groupedSets[generation]?.length);
    const extra = Object.keys(groupedSets)
      .filter((generation) => !GENERATION_ORDER.includes(generation))
      .sort((a, b) => a.localeCompare(b, "fr", { sensitivity: "base" }));
    return [...known, ...extra];
  }, [groupedSets]);

  const availableSetCount = useMemo(
    () => allSetsList.filter((set) => hasPublishedCards(set)).length,
    [allSetsList]
  );

  const announcedSetCount = useMemo(
    () => allSetsList.filter((set) => !hasPublishedCards(set) && set.availability === "announced").length,
    [allSetsList]
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

    if (chosenSet.availability === "announced") {
      setCards([]);
      setCatalogNotice(`${localizedSetName(chosenSet, selectedLanguage)} est bien référencée, mais son fournisseur ne publie pas encore les cartes. Aucun résultat n’est fabriqué.`);
      setVisible(PAGE_SIZE);
      return;
    }

    setCatalogNotice("");
    setLoading(true);

    try {
      const results = await searchCardsBySetId(
        chosenSet.id,
        selectedLanguage
      );
      setCards(results);
      if (results.length === 0) {
        setCatalogNotice(`${localizedSetName(chosenSet, selectedLanguage)} est référencée, mais aucune carte n’est actuellement publiée par les fournisseurs compatibles.`);
      }
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
        <div className="kt-page-wrap space-y-5">
          <section className="kt-page-header kt-rise-in kt-hero-surface relative space-y-5 overflow-hidden border">
            <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-cyan-400/[0.045] blur-3xl" />
            <div className="pointer-events-none absolute left-1/3 top-0 h-px w-40 bg-cyan-300/60 shadow-[0_0_12px_rgba(34,211,238,.7)]" />
            <div className="flex flex-col justify-between gap-4 border-b border-white/[0.06] pb-5 md:flex-row md:items-center">
              <div className="min-w-0 flex-1">
                <div className="mb-2 flex w-full items-center justify-between gap-4">
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/20 bg-cyan-400/[0.06] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-cyan-300"><Sparkles className="h-3 w-3" /> Recherche de cartes</div>
                  <img src="/brands/pokemon.png" alt="Pokémon" className="h-9 w-auto max-w-[150px] shrink-0 object-contain sm:h-10 sm:max-w-[176px]" />
                </div>
                <h1 className="kt-page-title flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-400/25 bg-cyan-400/[0.07] text-cyan-300">
                    <Search className="h-4.5 w-4.5" />
                  </span>
                  Rechercher une carte
                </h1>
                <p className="kt-search-intro-note mt-2">
                  Recherchez par nom ou parcourez les extensions par génération. Les cotations restent disponibles dans la fiche de chaque carte.
                </p>
              </div>

              <div className="flex w-full flex-col items-center gap-1.5 self-start md:w-auto md:items-end md:self-auto">
                <div className="kt-language-panel flex w-full items-center gap-1.5 rounded-2xl border border-cyan-300/[0.48] bg-cyan-300/[0.13] p-1.5 shadow-[0_0_26px_rgba(103,232,249,.12)] md:w-auto">
                  <span className="flex items-center gap-1.5 px-1.5 text-[10px] font-bold uppercase tracking-[0.11em] text-zinc-200">
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
                      className={`flex h-8 min-w-0 flex-1 items-center justify-center rounded-lg border text-base transition md:w-9 md:flex-none ${selectedLanguage === lang.code ? "border-cyan-200/[0.72] bg-cyan-300/[0.24] text-white shadow-[0_0_16px_rgba(103,232,249,.18)]" : "border-cyan-200/[0.34] bg-cyan-300/[0.045] text-zinc-100 hover:border-cyan-200/[0.58] hover:bg-cyan-300/[0.14] hover:text-white"}`}
                    >
                      {lang.label}
                    </button>
                  ))}
                </div>
                <span aria-live="polite" className="px-1 text-center text-[9px] font-bold tracking-[0.04em] text-cyan-200/80 md:text-right">
                  {catalogLoading
                    ? "Vérification des séries disponibles…"
                    : `${availableSetCount} série${availableSetCount > 1 ? "s" : ""} disponible${availableSetCount > 1 ? "s" : ""}${announcedSetCount > 0 ? ` · ${announcedSetCount} annoncée${announcedSetCount > 1 ? "s" : ""}` : ""}`}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 rounded-2xl border border-sky-300/20 bg-sky-300/[0.055] p-1.5">
              <button
                onClick={() => setSearchMode("text")}
                className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-[10px] font-bold uppercase tracking-[0.11em] transition ${searchMode === "text" ? "border-cyan-300/40 bg-cyan-400/[0.10] text-cyan-200 shadow-[0_0_18px_rgba(34,211,238,.06)]" : "border-transparent text-zinc-300 hover:bg-white/[0.03] hover:text-white"}`}
              >
                <Search className="h-3.5 w-3.5" /> Par nom
              </button>
              <button
                onClick={() => setSearchMode("set")}
                className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-[10px] font-bold uppercase tracking-[0.11em] transition ${searchMode === "set" ? "border-cyan-300/40 bg-cyan-400/[0.10] text-cyan-200 shadow-[0_0_18px_rgba(34,211,238,.06)]" : "border-transparent text-zinc-300 hover:bg-white/[0.03] hover:text-white"}`}
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
                      <article key={release.id} className="kt-data-row rounded-xl border p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <span className="text-[10px] font-bold uppercase tracking-[0.11em] text-violet-300">{release.id.toUpperCase()}</span>
                            <h3 className="truncate text-xs font-black text-white">{release.name}</h3>
                            <p className="mt-1 text-[10px] leading-4 text-zinc-100">Sortie {new Date(release.releaseDate).toLocaleDateString("fr-FR")} · Prix officiel {release.officialPrice}</p>
                            <p className="text-[10px] text-zinc-200">{release.contents}</p>
                          </div>
                          <div className="flex shrink-0 flex-col gap-1.5">
                            {release.set ? (
                              <button type="button" onClick={() => { setSearchMode("set"); void handleSetSelect(release.set!.id); }} className="rounded-lg border border-cyan-300/20 bg-cyan-300/[0.08] px-2.5 py-1.5 text-[10px] font-black uppercase text-cyan-200">
                                Cartes révélées
                              </button>
                            ) : null}
                            <a href={release.officialUrl} target="_blank" rel="noreferrer" className="rounded-lg border border-white/[0.06] px-2.5 py-1.5 text-center text-[10px] font-black uppercase text-zinc-300">
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
                    className="kt-control w-full border px-4 py-3.5 text-xs font-bold outline-none transition placeholder:text-zinc-600 focus:ring-2 focus:ring-cyan-300/10"
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
                      className="kt-control w-full border py-3.5 pl-11 pr-4 text-xs font-bold outline-none placeholder:text-zinc-600"
                    />
                  </div>
                  <select
                    value={selectedGeneration}
                    onChange={(event) => setSelectedGeneration(event.target.value)}
                    className="kt-control border px-4 py-3.5 text-xs font-bold outline-none"
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
                      <section key={generation} className="kt-panel min-w-0 max-w-full overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setExpandedGeneration(expandedGeneration === generation ? null : generation)}
                          className="flex w-full min-w-0 items-center justify-between gap-3 overflow-hidden px-4 py-3.5 text-left transition hover:bg-cyan-400/[0.025]"
                        >
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-2">
                              <span className="block truncate text-xs font-black text-white">{generation}</span>
                              <span className="rounded-full bg-cyan-400/[0.07] px-2 py-0.5 text-[9px] font-black text-cyan-300">{generationSets.length}</span>
                            </span>
                            <span className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[10px] font-semibold text-zinc-200">
                              <span className="shrink-0">{generationSets.length} extension{generationSets.length > 1 ? "s" : ""}</span>
                              {newestSet ? <span className="truncate">· dernière : {yearLabel(effectiveSetReleaseDate(newestSet.id))}</span> : null}
                            </span>
                          </span>
                          <ChevronDown className={`h-4 w-4 text-zinc-200 transition ${expanded ? "rotate-180" : ""}`} />
                        </button>

                        {expanded ? (
                          <div className="grid min-w-0 gap-2 border-t border-white/[0.06] p-2.5 sm:grid-cols-2 xl:grid-cols-3">
                            {generationSets.map((set) => (
                              <button
                                type="button"
                                key={set.id}
                                onClick={() => handleSetSelect(set.id)}
                                aria-label={set.availability === "announced" ? `${localizedSetName(set, selectedLanguage)} — données à venir` : localizedSetName(set, selectedLanguage)}
                                className={`kt-extension-card group grid min-w-0 max-w-full grid-cols-[42px_minmax(0,1fr)_auto] items-center gap-2.5 text-left transition ${selectedSetId === set.id ? "ring-1 ring-violet-300/45 bg-violet-300/[0.08]" : "hover:bg-[#1d2530]"}`}
                              >
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/[0.06] bg-white/[0.035]">
                                  {set.images?.symbol ? <img src={set.images.symbol} alt="" className="h-6 w-6 object-contain" /> : <Package className="h-4 w-4 text-violet-300" />}
                                </span>

                                <span className="min-w-0 overflow-hidden">
                                  <span className="block truncate text-[11px] font-black text-white" title={set.name}>{localizedSetName(set, selectedLanguage)}</span>
                                  <span className="mt-1 flex min-w-0 items-center gap-1.5 overflow-hidden text-[10px] font-semibold uppercase tracking-wide text-zinc-200">
                                    <span className="inline-flex shrink-0 items-center gap-1"><CalendarDays className="h-2.5 w-2.5 text-amber-300" /> {yearLabel(effectiveSetReleaseDate(set.id))}</span>
                                    <span className="truncate">{set.series || generation}</span>
                                  </span>
                                </span>

                                <span className="shrink-0 pl-1 text-right">
                                  <span className="block text-[11px] font-black text-zinc-200">{set.total || set.printedTotal || "—"}</span>
                                  <span className={`block text-[9px] font-bold uppercase tracking-wide ${
                                    set.availability === "announced"
                                      ? "text-amber-300"
                                      : set.availability === "metadata_only"
                                        ? "text-zinc-400"
                                        : "text-zinc-600"
                                  }`}>
                                    {set.availability === "announced"
                                      ? "à venir"
                                      : set.availability === "metadata_only"
                                        ? "référencée"
                                        : "cartes"}
                                  </span>
                                  <span className="mt-0.5 block max-w-[54px] truncate text-[10px] font-black uppercase text-violet-300">{localizedSetCode(set.id, selectedLanguage)}</span>
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

            <div className="border-t border-white/[0.055] pt-4">
              <SearchFilters filters={filters} onChange={setFilters} sets={sets} />
            </div>
          </section>

          <section className="kt-section-surface flex items-center justify-between gap-4 rounded-[16px] border p-3">
            <div className="flex min-w-0 items-center gap-2 rounded-xl border border-cyan-400/14 bg-cyan-400/[0.035] px-3.5 py-2 text-[10px] font-bold uppercase tracking-[0.11em] text-zinc-300">
              <Filter className="h-3.5 w-3.5 shrink-0 text-cyan-300" />
              <span>{filteredCards.length} résultat{filteredCards.length > 1 ? "s" : ""}</span>
              {query ? <span className="truncate font-normal text-zinc-200">· {query}</span> : null}
            </div>

            <div className="flex gap-1 rounded-xl border border-cyan-400/14 bg-[#0c141c] p-1">
              <button onClick={() => setViewMode("grid")} className={`rounded-lg border px-3 py-1.5 text-[10px] font-black uppercase transition ${viewMode === "grid" ? "border-cyan-300/40 bg-cyan-400/[0.10] text-cyan-200" : "border-transparent text-zinc-300"}`}>
                <LayoutGrid className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => setViewMode("large")} className={`rounded-lg border px-3 py-1.5 text-[10px] font-black uppercase transition ${viewMode === "large" ? "border-cyan-300/40 bg-cyan-400/[0.10] text-cyan-200" : "border-transparent text-zinc-300"}`}>
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
                  <div key={index} className="overflow-hidden rounded-[18px] border border-white/[0.06] bg-[#171f29] p-2.5">
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
            <div className="kt-empty-state rounded-2xl p-10 text-center">
              <Sparkles className="mx-auto mb-3 h-8 w-8 text-violet-300/60" />
              <p className="text-xs font-black uppercase tracking-wider text-zinc-300">Aucun résultat pour « {query} »</p>
              <p className="mx-auto mt-1 max-w-sm text-[11px] text-zinc-200">{catalogNotice || "Vérifiez l’orthographe, la langue ou sélectionnez directement une extension."}</p>
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
                  <SearchResultCard card={card} />
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
