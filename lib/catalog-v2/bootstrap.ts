import {
  CHINESE_SET_CATALOG,
  JAPANESE_SET_CATALOG,
  auditedChineseAvailableCount,
  hasVerifiedJapaneseCards,
  type RegionalSetEntry,
} from "../regionalSetCatalog";
import {
  getSetDisplayCatalog,
  type SetDisplayMeta,
} from "../setDisplayCatalog";
import {
  CATALOG_SCHEMA_VERSION,
  CatalogSnapshotV2Schema,
  type CatalogAvailabilityV2,
  type CatalogLanguageStatsV2,
  type CatalogLanguageV2,
  type CatalogSeriesV2,
  type CatalogSetGroupV2,
  type CatalogSetV2,
  type CatalogSnapshotV2,
  type CatalogSourceV2,
} from "./schema";
import {
  canonicalSeriesId,
  canonicalSetGroupId,
  canonicalSetId,
  normalizeCatalogCode,
  normalizeCatalogToken,
  resolveCatalogLanguage,
} from "./identity";
import {
  mergeCatalogSeriesV2,
  mergeCatalogSetGroupV2,
  mergeCatalogSetV2,
} from "./merge";

export const CATALOG_V2_LANGUAGES: readonly CatalogLanguageV2[] = ["fr", "en", "ja", "zh-tw"];

function uniqueAliases(values: readonly (string | undefined)[]): string[] {
  const aliases = new Map<string, string>();
  for (const value of values) {
    const label = String(value ?? "").trim();
    const key = normalizeCatalogToken(label);
    if (key && !aliases.has(key)) aliases.set(key, label);
  }
  return Array.from(aliases.values());
}

function kingTcgSource(kind: "display" | "regional", language: CatalogLanguageV2, code: string): CatalogSourceV2 {
  return {
    provider: "king_tcg",
    sourceId: `v269:${kind}:${language}:${code}`,
  };
}

function displaySources(language: CatalogLanguageV2, meta: SetDisplayMeta): CatalogSourceV2[] {
  return [
    kingTcgSource("display", language, meta.code),
    ...(meta.sourceIds ?? []).map((sourceId) => ({ provider: "tcgdex", sourceId })),
  ];
}

function yearFromReleaseDate(releaseDate?: string): number | undefined {
  const year = Number(String(releaseDate ?? "").slice(0, 4));
  return Number.isInteger(year) && year >= 1996 ? year : undefined;
}

function compareCatalogEntities(
  left: { language: CatalogLanguageV2; year?: number; name: string; id: string },
  right: { language: CatalogLanguageV2; year?: number; name: string; id: string }
): number {
  const languageOrder = CATALOG_V2_LANGUAGES.indexOf(left.language) - CATALOG_V2_LANGUAGES.indexOf(right.language);
  if (languageOrder !== 0) return languageOrder;
  const yearOrder = (right.year ?? 0) - (left.year ?? 0);
  if (yearOrder !== 0) return yearOrder;
  return left.name.localeCompare(right.name, "fr") || left.id.localeCompare(right.id);
}

export function buildCatalogV2Bootstrap(): CatalogSnapshotV2 {
  const seriesById = new Map<string, CatalogSeriesV2>();
  const setsById = new Map<string, CatalogSetV2>();
  const groupsById = new Map<string, CatalogSetGroupV2>();

  function ensureSeries(
    language: CatalogLanguageV2,
    name: string,
    sources: CatalogSourceV2[]
  ): CatalogSeriesV2 {
    const id = canonicalSeriesId(language, name);
    const incoming: CatalogSeriesV2 = {
      schemaVersion: CATALOG_SCHEMA_VERSION,
      id,
      language,
      name,
      aliases: [],
      sources,
    };
    const existing = seriesById.get(id);
    const series = existing ? mergeCatalogSeriesV2(existing, incoming) : incoming;
    seriesById.set(id, series);
    return series;
  }

  function allocateSetId(language: CatalogLanguageV2, code: string, year?: number, name?: string): string {
    const base = canonicalSetId(language, code);
    const existing = setsById.get(base);
    if (!existing || normalizeCatalogToken(existing.name) === normalizeCatalogToken(name)) return base;
    const dated = canonicalSetId(language, code, year || name);
    if (!setsById.has(dated)) return dated;
    return canonicalSetId(language, code, `${year || "unknown"}-${name || "set"}`);
  }

  function addSet(incoming: CatalogSetV2): CatalogSetV2 {
    const existing = setsById.get(incoming.id);
    const merged = existing ? mergeCatalogSetV2(existing, incoming) : incoming;
    setsById.set(merged.id, merged);
    return merged;
  }

  function addGroup(incoming: CatalogSetGroupV2): CatalogSetGroupV2 {
    const existing = groupsById.get(incoming.id);
    const merged = existing ? mergeCatalogSetGroupV2(existing, incoming) : incoming;
    groupsById.set(merged.id, merged);
    return merged;
  }

  function findSetByTechnicalCode(language: CatalogLanguageV2, codes: readonly string[]): CatalogSetV2 | undefined {
    const candidates = new Set(codes.map(normalizeCatalogCode).filter(Boolean));
    return Array.from(setsById.values()).find((set) => {
      if (set.language !== language) return false;
      if (candidates.has(normalizeCatalogCode(set.code))) return true;
      return set.sources.some((source) => candidates.has(normalizeCatalogCode(source.sourceId)));
    });
  }

  function displayAvailability(
    language: CatalogLanguageV2,
    technicalCodes: readonly string[]
  ): CatalogAvailabilityV2 {
    if (language === "ja" && technicalCodes.some(hasVerifiedJapaneseCards)) return "available";
    if (language === "zh-tw" && technicalCodes.some((code) => auditedChineseAvailableCount(code) > 0)) {
      return "available";
    }
    return "metadata_only";
  }

  function addDisplaySet(language: CatalogLanguageV2, meta: SetDisplayMeta, technicalCode: string): CatalogSetV2 {
    const resolvedLanguage = resolveCatalogLanguage(language, technicalCode);
    const sources = displaySources(resolvedLanguage, meta);
    const series = ensureSeries(resolvedLanguage, meta.era, sources);
    const id = allocateSetId(resolvedLanguage, technicalCode, meta.year, meta.name);
    return addSet({
      schemaVersion: CATALOG_SCHEMA_VERSION,
      id,
      language: resolvedLanguage,
      code: normalizeCatalogCode(technicalCode),
      name: meta.name,
      aliases: uniqueAliases([
        ...(meta.aliases ?? []),
        normalizeCatalogCode(meta.code) !== normalizeCatalogCode(technicalCode) ? meta.code : undefined,
      ]),
      sources,
      seriesId: series.id,
      year: meta.year,
      availability: displayAvailability(resolvedLanguage, [technicalCode, ...(meta.sourceIds ?? [])]),
    });
  }

  function addRegionalSet(language: CatalogLanguageV2, entry: RegionalSetEntry): CatalogSetV2 {
    const resolvedLanguage = resolveCatalogLanguage(language, entry.code);
    const candidates = [entry.code, ...(entry.providerCodes ?? [])];
    const existing = findSetByTechnicalCode(resolvedLanguage, candidates);
    const sources = [kingTcgSource("regional", resolvedLanguage, entry.code)];
    const series = ensureSeries(resolvedLanguage, entry.era, sources);
    const knownCardCount = resolvedLanguage === "zh-tw"
      ? Math.max(0, ...candidates.map(auditedChineseAvailableCount))
      : undefined;
    const availability: CatalogAvailabilityV2 = resolvedLanguage === "ja"
      ? (candidates.some(hasVerifiedJapaneseCards) ? "available" : "metadata_only")
      : ((knownCardCount ?? 0) > 0 ? "available" : "metadata_only");
    const incoming: CatalogSetV2 = {
      schemaVersion: CATALOG_SCHEMA_VERSION,
      id: existing?.id ?? allocateSetId(
        resolvedLanguage,
        entry.code,
        yearFromReleaseDate(entry.releaseDate),
        entry.name
      ),
      language: resolvedLanguage,
      code: existing?.code ?? normalizeCatalogCode(entry.code),
      name: entry.name,
      aliases: uniqueAliases(entry.providerCodes ?? []),
      sources,
      seriesId: existing?.seriesId ?? series.id,
      year: existing?.year ?? yearFromReleaseDate(entry.releaseDate),
      releaseDate: entry.releaseDate,
      officialCardCount: entry.officialCount,
      knownCardCount: knownCardCount || undefined,
      availability,
    };
    return addSet(incoming);
  }

  function addDisplayGroup(language: CatalogLanguageV2, meta: SetDisplayMeta): CatalogSetGroupV2 {
    const sources = displaySources(language, meta);
    const series = ensureSeries(language, meta.era, sources);
    const memberSetIds = (meta.sourceIds ?? [])
      .map((sourceId) => findSetByTechnicalCode(language, [sourceId])?.id)
      .filter((id): id is string => Boolean(id));
    const availability = memberSetIds.some((id) => setsById.get(id)?.availability === "available")
      ? "available"
      : "metadata_only";
    return addGroup({
      schemaVersion: CATALOG_SCHEMA_VERSION,
      id: canonicalSetGroupId(language, meta.code, meta.year),
      language,
      displayCode: meta.code,
      name: meta.name,
      aliases: uniqueAliases(meta.aliases ?? []),
      sources,
      seriesId: series.id,
      year: meta.year,
      availability,
      memberSetIds,
    });
  }

  // FR : catalogue éditorial actuel, sans présumer de la disponibilité fournisseur.
  for (const meta of getSetDisplayCatalog("fr")) addDisplaySet("fr", meta, meta.code);

  // JP : une source = une extension ; plusieurs sources = un groupe d'affichage.
  const japaneseDisplayGroups: SetDisplayMeta[] = [];
  for (const meta of getSetDisplayCatalog("ja")) {
    if ((meta.sourceIds?.length ?? 0) > 1) japaneseDisplayGroups.push(meta);
    else addDisplaySet("ja", meta, meta.sourceIds?.[0] || meta.code);
  }
  for (const entry of JAPANESE_SET_CATALOG) addRegionalSet("ja", entry);
  for (const meta of japaneseDisplayGroups) addDisplayGroup("ja", meta);

  // CN : le manifeste régional porte les vraies extensions. Les regroupements
  // éditoriaux restent des groupes et ne polluent jamais le catalogue japonais.
  for (const entry of CHINESE_SET_CATALOG) addRegionalSet("zh-tw", entry);
  for (const meta of getSetDisplayCatalog("zh-tw")) {
    const technicalCodes = meta.sourceIds ?? [];
    if (technicalCodes.length > 1) {
      addDisplayGroup("zh-tw", meta);
      continue;
    }
    const existing = findSetByTechnicalCode("zh-tw", [technicalCodes[0] || meta.code]);
    if (existing) {
      const sources = displaySources("zh-tw", meta);
      const incoming: CatalogSetV2 = {
        ...existing,
        name: meta.name,
        aliases: uniqueAliases([
          ...existing.aliases,
          ...(meta.aliases ?? []),
          normalizeCatalogCode(meta.code) !== normalizeCatalogCode(existing.code) ? meta.code : undefined,
        ]),
        sources,
        year: existing.year ?? meta.year,
        availability: displayAvailability("zh-tw", [existing.code, ...technicalCodes]),
      };
      addSet(incoming);
    } else if (technicalCodes.length === 1) {
      addDisplaySet("zh-tw", meta, technicalCodes[0]);
    } else {
      addDisplayGroup("zh-tw", meta);
    }
  }

  const series = Array.from(seriesById.values()).sort(compareCatalogEntities);
  const sets = Array.from(setsById.values()).sort(compareCatalogEntities);
  const setGroups = Array.from(groupsById.values()).sort(compareCatalogEntities);
  const statsByLanguage = Object.fromEntries(CATALOG_V2_LANGUAGES.map((language) => {
    const stats: CatalogLanguageStatsV2 = {
      series: series.filter((entry) => entry.language === language).length,
      sets: sets.filter((entry) => entry.language === language).length,
      groups: setGroups.filter((entry) => entry.language === language).length,
      cards: 0,
    };
    return [language, stats];
  })) as Record<CatalogLanguageV2, CatalogLanguageStatsV2>;

  return CatalogSnapshotV2Schema.parse({
    schemaVersion: CATALOG_SCHEMA_VERSION,
    catalogVersion: "v270-bootstrap",
    bootstrapSource: "King_TCG V269 display + regional catalogs",
    languages: [...CATALOG_V2_LANGUAGES],
    series,
    sets,
    setGroups,
    cards: [],
    statsByLanguage,
  });
}

/**
 * Snapshot parallèle : aucune page ni route ne le consomme encore en V270.
 */
export const CATALOG_V2_BOOTSTRAP = buildCatalogV2Bootstrap();

export function getCatalogV2LanguageStats(language: CatalogLanguageV2): CatalogLanguageStatsV2 {
  return CATALOG_V2_BOOTSTRAP.statsByLanguage[language] ?? {
    series: 0,
    sets: 0,
    groups: 0,
    cards: 0,
  };
}
