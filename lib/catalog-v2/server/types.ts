import type { CatalogImportBatchV2, CatalogProviderV2 } from "../adapters";
import type { CatalogLanguageV2, CatalogSnapshotV2 } from "../schema";

export interface CatalogKeyValueStoreV2 {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
}

export interface CatalogCachePolicyV2 {
  freshMs: number;
  staleMs: number;
}

export interface CatalogCachedValueV2<T> {
  state: "fresh" | "stale" | "miss";
  value?: T;
  storedAt?: string;
}

export interface CatalogDiscoveredSetV2 {
  sourceId: string;
  code: string;
  name: string;
  raw?: unknown;
}

export interface CatalogProviderSourceV2 {
  provider: CatalogProviderV2;
  language: CatalogLanguageV2;
  discoverSets(): Promise<CatalogDiscoveredSetV2[]>;
  loadSet(reference: CatalogDiscoveredSetV2): Promise<CatalogImportBatchV2>;
}

export interface CatalogSourceCursorV2 {
  offset: number;
  complete: boolean;
}

export type CatalogCursorMapV2 = Record<string, CatalogSourceCursorV2>;

export interface CatalogSyncCheckpointV2 {
  schemaVersion: 1;
  checkpointId: string;
  savedAt: string;
  catalogVersion: string;
  cursors: CatalogCursorMapV2;
  snapshot: CatalogSnapshotV2;
}

export interface CatalogSnapshotRepositoryV2 {
  load(checkpointId: string): Promise<CatalogSyncCheckpointV2 | null>;
  save(checkpoint: CatalogSyncCheckpointV2): Promise<void>;
}

export interface CatalogCoverageBaselineV2 {
  name: string;
  snapshot: CatalogSnapshotV2;
}
