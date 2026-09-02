import type { CatalogLanguageV2 } from "./schema";
import type { SearchCatalogSetV278 } from "./search";

export type SearchCatalogSetV291 = SearchCatalogSetV278 & {
  displayCode?: string;
  mergedSetIds?: string[];
};

function normalizeLabel(value: unknown): string {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\u3040-\u30ff\u3400-\u9fff]+/g, " ")
    .trim();
}

function setScore(set: SearchCatalogSetV291): number {
  const coverage = set.coverage === "complete" ? 4 : set.coverage === "partial" ? 3 : set.coverage === "announced" ? 2 : 1;
  return (set.localCardsAvailable ? 1_000_000 : 0) + coverage * 100_000 + Number(set.identityCount || 0) * 100 + Number(set.providerPrintCount || set.sourceCardCount || set.total || 0);
}

function mergeDuplicateSets(sets: SearchCatalogSetV291[], language: CatalogLanguageV2): SearchCatalogSetV291 {
  const ranked = [...sets].sort((a, b) => setScore(b) - setScore(a));
  const winner = ranked[0];
  const aliases = new Set<string>();
  const mergedSetIds = new Set<string>();
  for (const set of ranked) {
    aliases.add(set.id);
    if (set.canonicalId) mergedSetIds.add(set.canonicalId);
    for (const alias of set.aliases || []) aliases.add(alias);
    for (const id of set.mergedSetIds || []) mergedSetIds.add(id);
  }
  aliases.delete(winner.name);
  const localizedCode = language === "fr"
    ? ranked.map((set) => set.id).find((code) => /^(?:EV|EB|SL|XY)\d/i.test(code))
    : undefined;
  return {
    ...winner,
    aliases: Array.from(aliases),
    mergedSetIds: Array.from(mergedSetIds),
    displayCode: localizedCode || winner.id,
    identityCount: Math.max(...ranked.map((set) => Number(set.identityCount || set.total || 0))),
    providerPrintCount: Math.max(...ranked.map((set) => Number(set.providerPrintCount || set.identityCount || set.total || 0))),
    coverageBasis: ranked.some((set) => set.coverageBasis === "provider_prints")
      ? "provider_prints"
      : winner.coverageBasis,
  };
}

/** Regroupe seulement un alias vide avec son unique extension navigable homonyme. */
export function dedupeSearchCatalogSetsV291(input: SearchCatalogSetV278[], language: CatalogLanguageV2): SearchCatalogSetV291[] {
  const groups = new Map<string, SearchCatalogSetV291[]>();
  for (const set of input) {
    const key = `${normalizeLabel(set.name)}::${normalizeLabel(set.series)}`;
    groups.set(key, [...(groups.get(key) || []), set]);
  }
  return Array.from(groups.values()).flatMap((sets) => {
    const navigable = sets.filter((set) => set.localCardsAvailable || set.coverage === "complete" || set.coverage === "partial");
    return sets.length > 1 && navigable.length === 1 ? [mergeDuplicateSets(sets, language)] : sets;
  });
}
