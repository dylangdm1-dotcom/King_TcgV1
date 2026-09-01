import {
  CatalogCardV2Schema,
  CatalogSeriesV2Schema,
  CatalogSetGroupV2Schema,
  CatalogSetV2Schema,
  CatalogSnapshotV2Schema,
  type CatalogAvailabilityV2,
  type CatalogCardV2,
  type CatalogLanguageStatsV2,
  type CatalogLanguageV2,
  type CatalogSeriesV2,
  type CatalogSetGroupV2,
  type CatalogSetV2,
  type CatalogSnapshotV2,
  type CatalogSourceV2,
  type CatalogVariantV2,
  type CatalogVisualV2,
} from "./schema";
import { normalizeCatalogToken } from "./identity";

function usableText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function mergeText(existing: string, incoming: string): string {
  return usableText(existing) ? existing.trim() : incoming.trim();
}

function positiveNumber(existing?: number, incoming?: number): number | undefined {
  if (typeof incoming === "number" && Number.isFinite(incoming) && incoming > 0) return incoming;
  return existing;
}

function uniqueText(values: readonly string[]): string[] {
  const seen = new Set<string>();
  return values.filter((value) => {
    if (!usableText(value)) return false;
    const trimmed = value.trim();
    // `normalizeCatalogToken` intentionally produces ASCII identifiers. Names
    // written entirely in Japanese or Chinese therefore need a Unicode-safe
    // fallback when they are used as searchable aliases.
    const key = normalizeCatalogToken(trimmed) || trimmed.normalize("NFKC").toLocaleLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function mostRecentIso(existing?: string, incoming?: string): string | undefined {
  if (!existing) return incoming;
  if (!incoming) return existing;
  const existingTime = Date.parse(existing);
  const incomingTime = Date.parse(incoming);
  if (!Number.isFinite(incomingTime)) return existing;
  if (!Number.isFinite(existingTime)) return incoming;
  return incomingTime > existingTime ? incoming : existing;
}

function mergeSources(
  existing: readonly CatalogSourceV2[],
  incoming: readonly CatalogSourceV2[]
): CatalogSourceV2[] {
  const merged = new Map<string, CatalogSourceV2>();
  for (const source of [...existing, ...incoming]) {
    if (!usableText(source.provider) || !usableText(source.sourceId)) continue;
    const key = `${normalizeCatalogToken(source.provider)}:${normalizeCatalogToken(source.sourceId)}`;
    const previous = merged.get(key);
    merged.set(key, previous ? {
      ...previous,
      ...(source.url ? { url: source.url } : {}),
      ...(mostRecentIso(previous.lastSyncedAt, source.lastSyncedAt)
        ? { lastSyncedAt: mostRecentIso(previous.lastSyncedAt, source.lastSyncedAt) }
        : {}),
    } : source);
  }
  return Array.from(merged.values());
}

function visualScore(visual?: CatalogVisualV2): number {
  if (!visual || !usableText(visual.url)) return -1;
  const safeUrl = visual.url.startsWith("https://") || visual.url.startsWith("/");
  if (!safeUrl) return -1;
  const status = visual.status === "verified" ? 1_000_000_000 : 0;
  const area = (visual.width ?? 0) * (visual.height ?? 0);
  return status + area + 1;
}

function mergeVisual(
  existing?: CatalogVisualV2,
  incoming?: CatalogVisualV2
): CatalogVisualV2 | undefined {
  return visualScore(incoming) >= visualScore(existing) && visualScore(incoming) >= 0
    ? incoming
    : existing;
}

function visualKey(visual: CatalogVisualV2): string {
  return `${visual.kind}:${visual.url}`;
}

function mergeVisuals(
  existing: readonly CatalogVisualV2[],
  incoming: readonly CatalogVisualV2[]
): CatalogVisualV2[] {
  const visuals = new Map<string, CatalogVisualV2>();
  for (const visual of [...existing, ...incoming]) {
    const previous = visuals.get(visualKey(visual));
    visuals.set(visualKey(visual), mergeVisual(previous, visual) ?? visual);
  }
  return Array.from(visuals.values());
}

const AVAILABILITY_RANK: Record<CatalogAvailabilityV2, number> = {
  unknown: 0,
  announced: 1,
  metadata_only: 2,
  available: 3,
};

function strongerAvailability(
  existing: CatalogAvailabilityV2,
  incoming: CatalogAvailabilityV2
): CatalogAvailabilityV2 {
  return AVAILABILITY_RANK[incoming] > AVAILABILITY_RANK[existing] ? incoming : existing;
}

function variantKey(variant: CatalogVariantV2): string {
  return `${variant.kind}:${normalizeCatalogToken(variant.stampName || variant.label)}`;
}

function mergeVariants(
  existing: readonly CatalogVariantV2[],
  incoming: readonly CatalogVariantV2[]
): CatalogVariantV2[] {
  const variants = new Map<string, CatalogVariantV2>();
  for (const variant of [...existing, ...incoming]) variants.set(variantKey(variant), variant);
  return Array.from(variants.values());
}

function assertSameIdentity(
  entity: string,
  existing: { id: string; language?: string },
  incoming: { id: string; language?: string }
): void {
  if (existing.id !== incoming.id || existing.language !== incoming.language) {
    throw new Error(`Catalogue V2: fusion ${entity} refusée car l'identité canonique diffère.`);
  }
}

export function mergeCatalogSeriesV2(
  existing: CatalogSeriesV2,
  incoming: CatalogSeriesV2
): CatalogSeriesV2 {
  assertSameIdentity("série", existing, incoming);
  return CatalogSeriesV2Schema.parse({
    ...existing,
    name: mergeText(existing.name, incoming.name),
    aliases: uniqueText([
      ...existing.aliases,
      ...incoming.aliases,
      existing.name !== incoming.name ? incoming.name : "",
    ]),
    sources: mergeSources(existing.sources, incoming.sources),
    lastSyncedAt: mostRecentIso(existing.lastSyncedAt, incoming.lastSyncedAt),
  });
}

export function mergeCatalogSetV2(existing: CatalogSetV2, incoming: CatalogSetV2): CatalogSetV2 {
  assertSameIdentity("extension", existing, incoming);
  if (normalizeCatalogToken(existing.code) !== normalizeCatalogToken(incoming.code)) {
    throw new Error("Catalogue V2: fusion d'extensions refusée car les codes canoniques diffèrent.");
  }
  return CatalogSetV2Schema.parse({
    ...existing,
    name: mergeText(existing.name, incoming.name),
    aliases: uniqueText([
      ...existing.aliases,
      ...incoming.aliases,
      existing.name !== incoming.name ? incoming.name : "",
    ]),
    sources: mergeSources(existing.sources, incoming.sources),
    lastSyncedAt: mostRecentIso(existing.lastSyncedAt, incoming.lastSyncedAt),
    seriesId: existing.seriesId,
    year: existing.year ?? incoming.year,
    releaseDate: existing.releaseDate || incoming.releaseDate,
    officialCardCount: positiveNumber(existing.officialCardCount, incoming.officialCardCount),
    knownCardCount: positiveNumber(existing.knownCardCount, incoming.knownCardCount),
    availability: strongerAvailability(existing.availability, incoming.availability),
    visual: mergeVisual(existing.visual, incoming.visual),
    visuals: mergeVisuals(existing.visuals, incoming.visuals),
  });
}

export function mergeCatalogSetGroupV2(
  existing: CatalogSetGroupV2,
  incoming: CatalogSetGroupV2
): CatalogSetGroupV2 {
  assertSameIdentity("groupe", existing, incoming);
  return CatalogSetGroupV2Schema.parse({
    ...existing,
    name: mergeText(existing.name, incoming.name),
    aliases: uniqueText([
      ...existing.aliases,
      ...incoming.aliases,
      existing.name !== incoming.name ? incoming.name : "",
    ]),
    sources: mergeSources(existing.sources, incoming.sources),
    lastSyncedAt: mostRecentIso(existing.lastSyncedAt, incoming.lastSyncedAt),
    seriesId: existing.seriesId,
    year: existing.year ?? incoming.year,
    availability: strongerAvailability(existing.availability, incoming.availability),
    memberSetIds: uniqueText([...existing.memberSetIds, ...incoming.memberSetIds]),
  });
}

export function mergeCatalogCardV2(existing: CatalogCardV2, incoming: CatalogCardV2): CatalogCardV2 {
  assertSameIdentity("carte", existing, incoming);
  if (existing.setId !== incoming.setId || existing.number !== incoming.number) {
    throw new Error("Catalogue V2: fusion de cartes refusée car le set ou le numéro diffère.");
  }
  return CatalogCardV2Schema.parse({
    ...existing,
    name: mergeText(existing.name, incoming.name),
    aliases: uniqueText([
      ...existing.aliases,
      ...incoming.aliases,
      existing.name !== incoming.name ? incoming.name : "",
    ]),
    sources: mergeSources(existing.sources, incoming.sources),
    lastSyncedAt: mostRecentIso(existing.lastSyncedAt, incoming.lastSyncedAt),
    rarity: usableText(incoming.rarity) ? incoming.rarity : existing.rarity,
    variants: mergeVariants(existing.variants, incoming.variants),
    visual: mergeVisual(existing.visual, incoming.visual),
    visuals: mergeVisuals(existing.visuals, incoming.visuals),
  });
}

function mergeById<T extends { id: string }>(
  existing: readonly T[],
  incoming: readonly T[],
  merge: (left: T, right: T) => T
): T[] {
  const entries = new Map(existing.map((entry) => [entry.id, entry]));
  for (const entry of incoming) {
    const previous = entries.get(entry.id);
    entries.set(entry.id, previous ? merge(previous, entry) : entry);
  }
  return Array.from(entries.values());
}

export function mergeCatalogSnapshotV2(
  existing: CatalogSnapshotV2,
  incoming: CatalogSnapshotV2
): CatalogSnapshotV2 {
  const languages = uniqueText([...existing.languages, ...incoming.languages]) as CatalogLanguageV2[];
  const series = mergeById(existing.series, incoming.series, mergeCatalogSeriesV2);
  const sets = mergeById(existing.sets, incoming.sets, mergeCatalogSetV2);
  const setGroups = mergeById(existing.setGroups, incoming.setGroups, mergeCatalogSetGroupV2);
  const cards = mergeById(existing.cards, incoming.cards, mergeCatalogCardV2);
  const statsByLanguage = Object.fromEntries(languages.map((language) => {
    const stats: CatalogLanguageStatsV2 = {
      series: series.filter((entry) => entry.language === language).length,
      sets: sets.filter((entry) => entry.language === language).length,
      groups: setGroups.filter((entry) => entry.language === language).length,
      cards: cards.filter((entry) => entry.language === language).length,
    };
    return [language, stats];
  })) as Record<CatalogLanguageV2, CatalogLanguageStatsV2>;

  return CatalogSnapshotV2Schema.parse({
    ...existing,
    catalogVersion: incoming.catalogVersion || existing.catalogVersion,
    bootstrapSource: existing.bootstrapSource,
    languages,
    series,
    sets,
    setGroups,
    cards,
    statsByLanguage,
  });
}
