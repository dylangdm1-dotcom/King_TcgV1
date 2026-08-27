import { z } from "zod";
import { CatalogSnapshotV2Schema } from "../schema";
import type {
  CatalogCachePolicyV2,
  CatalogCachedValueV2,
  CatalogKeyValueStoreV2,
  CatalogSnapshotRepositoryV2,
  CatalogSyncCheckpointV2,
} from "./types";

const CacheEnvelopeSchema = z.object({
  schemaVersion: z.literal(1),
  storedAt: z.string().datetime({ offset: true }),
  freshUntil: z.number().finite(),
  staleUntil: z.number().finite(),
  value: z.unknown(),
});

const CheckpointSchema = z.object({
  schemaVersion: z.literal(1),
  checkpointId: z.string().trim().min(1).max(160),
  savedAt: z.string().datetime({ offset: true }),
  catalogVersion: z.string().trim().min(1).max(80),
  cursors: z.record(z.object({ offset: z.number().int().nonnegative(), complete: z.boolean() })),
  snapshot: CatalogSnapshotV2Schema,
});

export class MemoryCatalogKeyValueStoreV2 implements CatalogKeyValueStoreV2 {
  private readonly values = new Map<string, string>();

  async get(key: string): Promise<string | null> {
    return this.values.get(key) ?? null;
  }

  async set(key: string, value: string): Promise<void> {
    this.values.set(key, value);
  }
}

export class CatalogJsonCacheV2 {
  constructor(
    private readonly store: CatalogKeyValueStoreV2,
    private readonly prefix = "king-tcg:catalog-v2:cache"
  ) {}

  private key(key: string): string {
    return `${this.prefix}:${key}`;
  }

  async read<T>(key: string, nowMs: number): Promise<CatalogCachedValueV2<T>> {
    const raw = await this.store.get(this.key(key));
    if (!raw) return { state: "miss" };
    try {
      const parsed = CacheEnvelopeSchema.parse(JSON.parse(raw));
      if (nowMs <= parsed.freshUntil) return { state: "fresh", value: parsed.value as T, storedAt: parsed.storedAt };
      if (nowMs <= parsed.staleUntil) return { state: "stale", value: parsed.value as T, storedAt: parsed.storedAt };
      return { state: "miss" };
    } catch {
      return { state: "miss" };
    }
  }

  async write<T>(key: string, value: T, policy: CatalogCachePolicyV2, nowMs: number): Promise<void> {
    const freshMs = Math.max(1, Math.trunc(policy.freshMs));
    const staleMs = Math.max(freshMs, Math.trunc(policy.staleMs));
    await this.store.set(this.key(key), JSON.stringify({
      schemaVersion: 1,
      storedAt: new Date(nowMs).toISOString(),
      freshUntil: nowMs + freshMs,
      staleUntil: nowMs + staleMs,
      value,
    }));
  }
}

export class CatalogJsonSnapshotRepositoryV2 implements CatalogSnapshotRepositoryV2 {
  constructor(
    private readonly store: CatalogKeyValueStoreV2,
    private readonly prefix = "king-tcg:catalog-v2:snapshot"
  ) {}

  async load(checkpointId: string): Promise<CatalogSyncCheckpointV2 | null> {
    const raw = await this.store.get(`${this.prefix}:${checkpointId}`);
    if (!raw) return null;
    try {
      return CheckpointSchema.parse(JSON.parse(raw));
    } catch {
      return null;
    }
  }

  async save(checkpoint: CatalogSyncCheckpointV2): Promise<void> {
    const parsed = CheckpointSchema.parse(checkpoint);
    await this.store.set(`${this.prefix}:${checkpoint.checkpointId}`, JSON.stringify(parsed));
  }
}
