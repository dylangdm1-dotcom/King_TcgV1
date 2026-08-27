import { adaptPokewalletSetV2 } from "../adapters/pokewallet";
import { adaptTcgdexSetV2 } from "../adapters/tcgdex";
import type { CatalogImportBatchV2 } from "../adapters/types";
import type { CatalogLocalCoverageInputV2 } from "../local/writer";
import type { CatalogSnapshotV2 } from "../schema";
import { syncCatalogV2, type CatalogSyncResultV2 } from "../sync";
import { reconcileRegionalBatchV2 } from "./reconcile";
import { CatalogRegionalSnapshotV2Schema, type CatalogRegionalSnapshotV2 } from "./schema";

export interface CatalogRegionalImportResultV2 extends CatalogSyncResultV2 {
  coverage: Map<string, CatalogLocalCoverageInputV2>;
}

function adaptRegionalSnapshot(source: CatalogRegionalSnapshotV2): CatalogImportBatchV2 {
  const context = {
    language: source.language,
    syncedAt: source.capturedAt,
    sourceUrl: source.sourceUrl,
  } as const;
  return source.provider === "tcgdex"
    ? adaptTcgdexSetV2(source.payload, context)
    : adaptPokewalletSetV2(source.payload, context);
}

export function importRegionalSnapshotsV2(
  current: CatalogSnapshotV2,
  inputs: readonly CatalogRegionalSnapshotV2[],
  catalogVersion = "v274-regional-import"
): CatalogRegionalImportResultV2 {
  const sources = inputs.map((entry) => CatalogRegionalSnapshotV2Schema.parse(entry));
  const setIndex = new Map(current.sets.map((set) => [set.id, set]));
  const batches: CatalogImportBatchV2[] = [];
  const coverage = new Map<string, CatalogLocalCoverageInputV2>();
  const seen = new Set<string>();
  for (const source of sources) {
    const key = `${source.provider}:${source.language}:${source.canonicalSetId}`;
    if (seen.has(key)) throw new Error(`Snapshot régional dupliqué : ${key}.`);
    seen.add(key);
    const canonicalSet = setIndex.get(source.canonicalSetId);
    if (!canonicalSet) throw new Error(`Snapshot régional : extension canonique absente ${source.canonicalSetId}.`);
    const batch = reconcileRegionalBatchV2(adaptRegionalSnapshot(source), source, canonicalSet);
    if (batch.cards.length !== source.receivedCardCount) {
      throw new Error(`Snapshot régional : compteur cartes invalide pour ${source.canonicalCode}.`);
    }
    batches.push(batch);
    coverage.set(`${source.language}:${source.canonicalSetId}`, {
      status: source.status,
      sourceCardCount: source.expectedCardCount ?? source.receivedCardCount,
    });
  }
  const result = syncCatalogV2(current, batches, catalogVersion);
  if (result.report.sets.rejected > 0 || result.report.cards.rejected > 0) {
    throw new Error("Snapshot régional : la synchronisation canonique a rejeté des entités.");
  }
  return { ...result, coverage };
}

