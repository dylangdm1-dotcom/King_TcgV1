import {
  CatalogCardV2Schema,
  CatalogSeriesV2Schema,
  CatalogSetV2Schema,
  CatalogSnapshotV2Schema,
  type CatalogCardV2,
  type CatalogLanguageStatsV2,
  type CatalogLanguageV2,
  type CatalogSeriesV2,
  type CatalogSetV2,
  type CatalogSnapshotV2,
  type CatalogSourceV2,
} from "./schema";
import { mergeCatalogCardV2, mergeCatalogSeriesV2, mergeCatalogSetV2 } from "./merge";
import type { CatalogImportBatchV2, CatalogImportIssueV2, CatalogProviderV2 } from "./adapters/types";

export interface CatalogSyncCountersV2 {
  received: number;
  added: number;
  merged: number;
  rejected: number;
}

export interface CatalogSyncReportV2 {
  catalogVersion: string;
  batches: number;
  series: CatalogSyncCountersV2;
  sets: CatalogSyncCountersV2;
  cards: CatalogSyncCountersV2;
  byProvider: Partial<Record<CatalogProviderV2, { batches: number; series: number; sets: number; cards: number }>>;
  byLanguage: Record<CatalogLanguageV2, CatalogLanguageStatsV2>;
  issues: CatalogImportIssueV2[];
}

export interface CatalogSyncResultV2 {
  snapshot: CatalogSnapshotV2;
  report: CatalogSyncReportV2;
}

type Entity = CatalogSeriesV2 | CatalogSetV2 | CatalogCardV2;
type EntityKind = "series" | "sets" | "cards";

function counters(): CatalogSyncCountersV2 {
  return { received: 0, added: 0, merged: 0, rejected: 0 };
}

function sourceKey(kind: EntityKind, language: string | undefined, source: CatalogSourceV2): string {
  return `${kind}:${language ?? "unknown"}:${source.provider.trim().toLowerCase()}:${source.sourceId.trim().toLowerCase()}`;
}

function addSourceIdentity(index: Map<string, string>, kind: EntityKind, entity: Entity): void {
  for (const source of entity.sources) index.set(sourceKey(kind, entity.language, source), entity.id);
}

function conflictSource(index: Map<string, string>, kind: EntityKind, entity: Entity): CatalogSourceV2 | undefined {
  return entity.sources.find((source) => {
    const mappedId = index.get(sourceKey(kind, entity.language, source));
    return Boolean(mappedId && mappedId !== entity.id);
  });
}

function statsByLanguage(
  languages: readonly CatalogLanguageV2[],
  series: readonly CatalogSeriesV2[],
  sets: readonly CatalogSetV2[],
  cards: readonly CatalogCardV2[]
): Record<CatalogLanguageV2, CatalogLanguageStatsV2> {
  return Object.fromEntries(languages.map((language) => [language, {
    series: series.filter((entry) => entry.language === language).length,
    sets: sets.filter((entry) => entry.language === language).length,
    groups: 0,
    cards: cards.filter((entry) => entry.language === language).length,
  }])) as Record<CatalogLanguageV2, CatalogLanguageStatsV2>;
}

export function syncCatalogV2(
  currentInput: CatalogSnapshotV2,
  batches: readonly CatalogImportBatchV2[],
  catalogVersion = "v271-sync"
): CatalogSyncResultV2 {
  const current = CatalogSnapshotV2Schema.parse(currentInput);
  const series = new Map(current.series.map((entry) => [entry.id, entry]));
  const sets = new Map(current.sets.map((entry) => [entry.id, entry]));
  const cards = new Map(current.cards.map((entry) => [entry.id, entry]));
  const sourceIndex = new Map<string, string>();
  for (const entity of current.series) addSourceIdentity(sourceIndex, "series", entity);
  for (const entity of current.sets) addSourceIdentity(sourceIndex, "sets", entity);
  for (const entity of current.cards) addSourceIdentity(sourceIndex, "cards", entity);

  const report: CatalogSyncReportV2 = {
    catalogVersion,
    batches: batches.length,
    series: counters(),
    sets: counters(),
    cards: counters(),
    byProvider: {},
    byLanguage: statsByLanguage(current.languages, current.series, current.sets, current.cards),
    issues: [],
  };

  function issue(batch: CatalogImportBatchV2, details: Omit<CatalogImportIssueV2, "provider">): void {
    report.issues.push({ ...details, provider: batch.provider });
  }

  function importEntity<T extends Entity>(params: {
    kind: EntityKind;
    batch: CatalogImportBatchV2;
    raw: T;
    map: Map<string, T>;
    parse: { safeParse(value: unknown): { success: true; data: T } | { success: false; error: { issues: Array<{ message: string }> } } };
    merge: (existing: T, incoming: T) => T;
  }): void {
    const count = report[params.kind];
    count.received += 1;
    const parsed = params.parse.safeParse(params.raw);
    if (!parsed.success) {
      count.rejected += 1;
      issue(params.batch, { severity: "error", code: "ENTITY_SCHEMA_INVALID", message: parsed.error.issues.map((entry) => entry.message).join("; "), entityId: params.raw.id });
      return;
    }
    const entity = parsed.data;
    if (entity.language !== params.batch.language) {
      count.rejected += 1;
      issue(params.batch, { severity: "error", code: "BATCH_LANGUAGE_MISMATCH", message: `Entité ${entity.id} hors langue du lot.`, entityId: entity.id });
      return;
    }
    const sourceConflict = conflictSource(sourceIndex, params.kind, entity);
    if (sourceConflict) {
      count.rejected += 1;
      issue(params.batch, { severity: "error", code: "PROVIDER_IDENTITY_CONFLICT", message: `La référence ${sourceConflict.provider}:${sourceConflict.sourceId} pointe déjà vers une autre identité.`, sourceId: sourceConflict.sourceId, entityId: entity.id });
      return;
    }
    const existing = params.map.get(entity.id);
    try {
      const next = existing ? params.merge(existing, entity) : entity;
      params.map.set(entity.id, next);
      addSourceIdentity(sourceIndex, params.kind, next);
      if (existing) count.merged += 1;
      else count.added += 1;
    } catch (error) {
      count.rejected += 1;
      issue(params.batch, { severity: "error", code: "CANONICAL_MERGE_CONFLICT", message: error instanceof Error ? error.message : "Fusion canonique refusée.", entityId: entity.id });
    }
  }

  for (const batch of batches) {
    report.issues.push(...batch.issues);
    const providerStats = report.byProvider[batch.provider] ?? { batches: 0, series: 0, sets: 0, cards: 0 };
    providerStats.batches += 1;
    providerStats.series += batch.series.length;
    providerStats.sets += batch.sets.length;
    providerStats.cards += batch.cards.length;
    report.byProvider[batch.provider] = providerStats;

    for (const entry of batch.series) importEntity({ kind: "series", batch, raw: entry, map: series, parse: CatalogSeriesV2Schema, merge: mergeCatalogSeriesV2 });
    for (const entry of batch.sets) {
      if (!series.has(entry.seriesId)) {
        report.sets.received += 1;
        report.sets.rejected += 1;
        issue(batch, { severity: "error", code: "SET_SERIES_MISSING", message: `Série absente pour ${entry.id}.`, entityId: entry.id });
        continue;
      }
      importEntity({ kind: "sets", batch, raw: entry, map: sets, parse: CatalogSetV2Schema, merge: mergeCatalogSetV2 });
    }
    for (const entry of batch.cards) {
      const parent = sets.get(entry.setId);
      if (!parent || parent.language !== entry.language) {
        report.cards.received += 1;
        report.cards.rejected += 1;
        issue(batch, { severity: "error", code: "CARD_SET_MISSING", message: `Extension absente ou incohérente pour ${entry.id}.`, entityId: entry.id });
        continue;
      }
      importEntity({ kind: "cards", batch, raw: entry, map: cards, parse: CatalogCardV2Schema, merge: mergeCatalogCardV2 });
    }
  }

  const languages = Array.from(new Set([...current.languages, ...batches.map((batch) => batch.language)])) as CatalogLanguageV2[];
  const byId = <T extends { id: string }>(left: T, right: T): number => left.id.localeCompare(right.id);
  const seriesEntries = Array.from(series.values()).sort(byId);
  const setEntries = Array.from(sets.values()).sort(byId);
  const cardEntries = Array.from(cards.values()).sort(byId);
  const computedStats = statsByLanguage(languages, seriesEntries, setEntries, cardEntries);
  for (const language of languages) computedStats[language].groups = current.setGroups.filter((entry) => entry.language === language).length;
  report.byLanguage = computedStats;
  const snapshot = CatalogSnapshotV2Schema.parse({
    ...current,
    catalogVersion,
    languages,
    series: seriesEntries,
    sets: setEntries,
    cards: cardEntries,
    statsByLanguage: computedStats,
  });
  return { snapshot, report };
}
