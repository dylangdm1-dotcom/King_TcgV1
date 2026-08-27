import type { CatalogImportIssueV2 } from "../adapters";
import type { CatalogSnapshotV2 } from "../schema";
import { CatalogSnapshotV2Schema } from "../schema";
import { syncCatalogV2, type CatalogSyncReportV2 } from "../sync";
import { compareCatalogCoverageV2, type CatalogCoverageReportV2 } from "./coverage";
import type {
  CatalogCursorMapV2,
  CatalogProviderSourceV2,
  CatalogSnapshotRepositoryV2,
  CatalogSourceCursorV2,
  CatalogSyncCheckpointV2,
} from "./types";

export interface CatalogSourceRunReportV2 {
  source: string;
  discovered: number;
  attempted: number;
  succeeded: number;
  failed: number;
  startOffset: number;
  nextCursor: CatalogSourceCursorV2;
  errors: string[];
}

export interface CatalogOrchestratorOptionsV2 {
  initialSnapshot: CatalogSnapshotV2;
  sources: readonly CatalogProviderSourceV2[];
  catalogVersion: string;
  checkpointId?: string;
  repository?: CatalogSnapshotRepositoryV2;
  resume?: boolean;
  restartCompletedSources?: boolean;
  maxSetsPerSource?: number;
  baselineSnapshot?: CatalogSnapshotV2;
  baselineName?: string;
  now?: () => number;
}

export interface CatalogOrchestratorResultV2 {
  snapshot: CatalogSnapshotV2;
  checkpoint: CatalogSyncCheckpointV2;
  sourceRuns: CatalogSourceRunReportV2[];
  syncReports: CatalogSyncReportV2[];
  coverage: CatalogCoverageReportV2;
  issues: CatalogImportIssueV2[];
  storageErrors: string[];
}

function sourceKey(source: CatalogProviderSourceV2): string {
  return `${source.provider}:${source.language}`;
}

function initialCursor(): CatalogSourceCursorV2 {
  return { offset: 0, complete: false };
}

export async function orchestrateCatalogV2(options: CatalogOrchestratorOptionsV2): Promise<CatalogOrchestratorResultV2> {
  const now = options.now ?? Date.now;
  const checkpointId = options.checkpointId ?? "catalog-v2-main";
  const maxSets = Math.min(100, Math.max(1, options.maxSetsPerSource ?? 10));
  const storageErrors: string[] = [];
  let snapshot = CatalogSnapshotV2Schema.parse(options.initialSnapshot);
  let cursors: CatalogCursorMapV2 = {};

  if (options.resume && options.repository) {
    try {
      const saved = await options.repository.load(checkpointId);
      if (saved) {
        snapshot = CatalogSnapshotV2Schema.parse(saved.snapshot);
        cursors = { ...saved.cursors };
      }
    } catch (error) {
      storageErrors.push(error instanceof Error ? error.message : "Chargement du checkpoint impossible.");
    }
  }

  const sourceRuns: CatalogSourceRunReportV2[] = [];
  const syncReports: CatalogSyncReportV2[] = [];
  const issues: CatalogImportIssueV2[] = [];

  async function saveCheckpoint(): Promise<CatalogSyncCheckpointV2> {
    const checkpoint: CatalogSyncCheckpointV2 = {
      schemaVersion: 1,
      checkpointId,
      savedAt: new Date(now()).toISOString(),
      catalogVersion: options.catalogVersion,
      cursors: { ...cursors },
      snapshot: CatalogSnapshotV2Schema.parse({ ...snapshot, catalogVersion: options.catalogVersion }),
    };
    if (options.repository) {
      try {
        await options.repository.save(checkpoint);
      } catch (error) {
        storageErrors.push(error instanceof Error ? error.message : "Sauvegarde du checkpoint impossible.");
      }
    }
    return checkpoint;
  }

  for (const source of options.sources) {
    const key = sourceKey(source);
    let cursor = cursors[key] ?? initialCursor();
    if (cursor.complete && options.restartCompletedSources) cursor = initialCursor();
    const report: CatalogSourceRunReportV2 = {
      source: key,
      discovered: 0,
      attempted: 0,
      succeeded: 0,
      failed: 0,
      startOffset: cursor.offset,
      nextCursor: cursor,
      errors: [],
    };
    sourceRuns.push(report);
    if (cursor.complete) continue;

    let references;
    try {
      const discovered = await source.discoverSets();
      references = Array.from(new Map(discovered.map((entry) => [entry.sourceId, entry])).values());
      report.discovered = references.length;
    } catch (error) {
      report.failed += 1;
      report.errors.push(error instanceof Error ? error.message : "Index fournisseur indisponible.");
      cursors[key] = cursor;
      continue;
    }

    const selected = references.slice(cursor.offset, cursor.offset + maxSets);
    for (const reference of selected) {
      report.attempted += 1;
      try {
        const batch = await source.loadSet(reference);
        const result = syncCatalogV2(snapshot, [batch], options.catalogVersion);
        snapshot = result.snapshot;
        syncReports.push(result.report);
        issues.push(...result.report.issues);
        report.succeeded += 1;
        cursor = {
          offset: cursor.offset + 1,
          complete: cursor.offset + 1 >= references.length,
        };
        cursors[key] = cursor;
        await saveCheckpoint();
      } catch (error) {
        report.failed += 1;
        report.errors.push(`${reference.code}: ${error instanceof Error ? error.message : "chargement impossible"}`);
        cursors[key] = cursor;
        break;
      }
    }
    if (selected.length === 0 && cursor.offset >= references.length) {
      cursor = { offset: cursor.offset, complete: true };
      cursors[key] = cursor;
    }
    report.nextCursor = cursors[key] ?? cursor;
  }

  const checkpoint = await saveCheckpoint();
  snapshot = checkpoint.snapshot;
  const coverage = compareCatalogCoverageV2(
    snapshot,
    options.baselineSnapshot ?? options.initialSnapshot,
    options.baselineName ?? "catalogue-actif"
  );
  return { snapshot, checkpoint, sourceRuns, syncReports, coverage, issues, storageErrors };
}
