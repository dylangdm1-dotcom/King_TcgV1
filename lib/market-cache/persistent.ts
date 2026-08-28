import {
  MARKET_CACHE_STALE_RETENTION_MS,
  beginServerMarketRefreshV275,
  endServerMarketRefreshV275,
  readServerMarketCacheV275,
  seedServerMarketCacheV275,
  writeServerMarketCacheV275,
  type ServerMarketCacheEnvelopeV275,
  type ServerMarketCacheReadV275,
} from "./server";
import {
  recordMarketCacheFallbackV277,
  recordMarketCacheLookupV277,
  recordRedisCommandV277,
  recordSnapshotWriteV277,
} from "./metrics";

export type MarketCacheBackendV276 = "memory" | "redis-rest";

export type SharedMarketCacheReadV276<T> = ServerMarketCacheReadV275<T> & {
  backend: MarketCacheBackendV276;
};

export interface MarketCachePersistenceStatusV276 {
  configured: boolean;
  backend: MarketCacheBackendV276;
  reason?: "missing_environment" | "invalid_url";
}

export interface MarketRefreshLeaseV276 {
  acquired: boolean;
  backend: MarketCacheBackendV276;
  token?: string;
}

type RedisRestConfig = { url: string; token: string };
type RedisRestPayload = { result?: unknown; error?: string };
type MarketCachePersistentGlobal = typeof globalThis & {
  __kingTcgMarketMemoryOnlyV276?: Set<string>;
  __kingTcgMarketRedisWarningV276?: number;
};

const sharedGlobal = globalThis as MarketCachePersistentGlobal;
const memoryOnlyKeys = sharedGlobal.__kingTcgMarketMemoryOnlyV276 ?? new Set<string>();
sharedGlobal.__kingTcgMarketMemoryOnlyV276 = memoryOnlyKeys;

const REDIS_KEY_PREFIX = "king-tcg:market:v1:";
const REDIS_LOCK_PREFIX = "king-tcg:market-lock:v1:";
const REDIS_TIMEOUT_MS = 2_500;
const REFRESH_LOCK_MS = 30_000;

function redisRestConfig(): RedisRestConfig | null {
  const url = String(
    process.env.KING_TCG_REDIS_REST_URL ||
    process.env.KV_REST_API_URL ||
    process.env.UPSTASH_REDIS_REST_URL ||
    process.env.UPSTASH_REDIS_REST_KV_REST_API_URL ||
    process.env.KING_TCG_KV_REST_API_URL ||
    ""
  ).trim().replace(/\/+$/, "");
  const token = String(
    process.env.KING_TCG_REDIS_REST_TOKEN ||
    process.env.KV_REST_API_TOKEN ||
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN ||
    process.env.KING_TCG_KV_REST_API_TOKEN ||
    ""
  ).trim();
  if (!url || !token) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return null;
    return { url: parsed.toString().replace(/\/+$/, ""), token };
  } catch {
    return null;
  }
}

export function getMarketCachePersistenceStatusV276(): MarketCachePersistenceStatusV276 {
  const hasAnyValue = Boolean(
    process.env.KING_TCG_REDIS_REST_URL ||
    process.env.KING_TCG_REDIS_REST_TOKEN ||
    process.env.KV_REST_API_URL ||
    process.env.KV_REST_API_TOKEN ||
    process.env.UPSTASH_REDIS_REST_URL ||
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    process.env.UPSTASH_REDIS_REST_KV_REST_API_URL ||
    process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN ||
    process.env.KING_TCG_KV_REST_API_URL ||
    process.env.KING_TCG_KV_REST_API_TOKEN
  );
  if (redisRestConfig()) return { configured: true, backend: "redis-rest" };
  return {
    configured: false,
    backend: "memory",
    reason: hasAnyValue ? "invalid_url" : "missing_environment",
  };
}

function reportRedisFailure(error: unknown): void {
  const now = Date.now();
  if ((sharedGlobal.__kingTcgMarketRedisWarningV276 ?? 0) > now - 60_000) return;
  sharedGlobal.__kingTcgMarketRedisWarningV276 = now;
  console.warn("[market-cache] Redis REST indisponible, repli mémoire actif.",
    error instanceof Error ? error.message : "Erreur inconnue");
}

async function redisCommand(config: RedisRestConfig, command: Array<string | number>): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REDIS_TIMEOUT_MS);
  const startedAt = Date.now();
  try {
    const response = await fetch(config.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(command),
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json() as RedisRestPayload;
    if (payload.error) throw new Error(payload.error);
    recordRedisCommandV277(String(command[0] || "UNKNOWN"), Date.now() - startedAt, true);
    return payload.result;
  } catch (error) {
    recordRedisCommandV277(String(command[0] || "UNKNOWN"), Date.now() - startedAt, false);
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

/** Usage serveur interne pour l'historique et les diagnostics V277. */
export async function executeMarketRedisCommandV277(
  command: Array<string | number>
): Promise<unknown> {
  const config = redisRestConfig();
  if (!config) throw new Error("Redis REST non configuré");
  return redisCommand(config, command);
}

export function isMarketRedisConfiguredV277(): boolean {
  return Boolean(redisRestConfig());
}

export function clearPersistentMarketCacheMemoryV277(): void {
  memoryOnlyKeys.clear();
  sharedGlobal.__kingTcgMarketRedisWarningV276 = undefined;
}

export async function probeMarketRedisV277(): Promise<{
  configured: boolean;
  reachable: boolean;
  latencyMs?: number;
  keyCount?: number;
  error?: string;
}> {
  if (!redisRestConfig()) return { configured: false, reachable: false };
  const startedAt = Date.now();
  try {
    const pong = await executeMarketRedisCommandV277(["PING"]);
    const keyCount = Number(await executeMarketRedisCommandV277(["DBSIZE"]));
    return {
      configured: true,
      reachable: pong === "PONG",
      latencyMs: Date.now() - startedAt,
      keyCount: Number.isFinite(keyCount) ? keyCount : undefined,
    };
  } catch (error) {
    return {
      configured: true,
      reachable: false,
      latencyMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : "Erreur Redis inconnue",
    };
  }
}

function redisKey(key: string): string {
  return `${REDIS_KEY_PREFIX}${key}`;
}

function redisLockKey(key: string): string {
  return `${REDIS_LOCK_PREFIX}${key}`;
}

function parseEnvelope<T>(raw: unknown, now: number): ServerMarketCacheEnvelopeV275<T> | null {
  if (typeof raw !== "string" || !raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<ServerMarketCacheEnvelopeV275<T>>;
    if (
      typeof value !== "object" ||
      value === null ||
      !Number.isFinite(value.cachedAt) ||
      !Number.isFinite(value.freshUntil) ||
      !Number.isFinite(value.staleUntil) ||
      Number(value.staleUntil) <= now ||
      !("value" in value)
    ) return null;
    return value as ServerMarketCacheEnvelopeV275<T>;
  } catch {
    return null;
  }
}

function withBackend<T>(
  read: ServerMarketCacheReadV275<T>,
  backend: MarketCacheBackendV276
): SharedMarketCacheReadV276<T> {
  return { ...read, backend };
}

/** Lecture groupée : le miroir mémoire sert les entrées fraîches, Redis MGET les autres. */
export async function readSharedMarketCacheBatchV276<T>(
  keys: string[],
  now = Date.now()
): Promise<Map<string, SharedMarketCacheReadV276<T>>> {
  const uniqueKeys = Array.from(new Set(keys));
  const result = new Map<string, SharedMarketCacheReadV276<T>>();
  const remoteKeys: string[] = [];
  const config = redisRestConfig();

  for (const key of uniqueKeys) {
    const local = readServerMarketCacheV275<T>(key, now);
    if (local.state === "fresh") {
      const backend = config && !memoryOnlyKeys.has(key) ? "redis-rest" : "memory";
      result.set(key, withBackend(local, backend));
      recordMarketCacheLookupV277(local.state, backend);
    } else if (config) {
      remoteKeys.push(key);
    } else {
      result.set(key, withBackend(local, "memory"));
    }
  }

  if (!config || !remoteKeys.length) return result;

  try {
    const raw = await redisCommand(config, ["MGET", ...remoteKeys.map(redisKey)]);
    if (!Array.isArray(raw) || raw.length !== remoteKeys.length) {
      throw new Error("Réponse MGET invalide");
    }
    remoteKeys.forEach((key, index) => {
      const remoteEntry = parseEnvelope<T>(raw[index], now);
      if (remoteEntry) {
        seedServerMarketCacheV275(key, remoteEntry, now);
        memoryOnlyKeys.delete(key);
        result.set(key, withBackend({
          state: remoteEntry.freshUntil > now ? "fresh" : "stale",
          entry: remoteEntry,
        }, "redis-rest"));
        recordMarketCacheLookupV277(
          remoteEntry.freshUntil > now ? "fresh" : "stale",
          "redis-rest"
        );
        return;
      }
      const local = readServerMarketCacheV275<T>(key, now);
      result.set(key, withBackend(local, "memory"));
      recordMarketCacheLookupV277(local.state, "memory");
    });
  } catch (error) {
    reportRedisFailure(error);
    recordMarketCacheFallbackV277();
    remoteKeys.forEach((key) => {
      const local = readServerMarketCacheV275<T>(key, now);
      result.set(key, withBackend(local, "memory"));
      recordMarketCacheLookupV277(local.state, "memory");
    });
  }

  return result;
}

export async function writeSharedMarketCacheV276<T>(options: {
  key: string;
  value: T;
  freshForMs: number;
  now?: number;
}): Promise<{
  entry: ServerMarketCacheEnvelopeV275<T>;
  backend: MarketCacheBackendV276;
}> {
  const entry = writeServerMarketCacheV275(options);
  const config = redisRestConfig();
  if (!config) {
    memoryOnlyKeys.add(options.key);
    recordSnapshotWriteV277("memory");
    return { entry, backend: "memory" };
  }

  const ttl = Math.max(1_000, entry.staleUntil - (options.now ?? Date.now()));
  try {
    await redisCommand(config, [
      "SET",
      redisKey(options.key),
      JSON.stringify(entry),
      "PX",
      Math.min(ttl, MARKET_CACHE_STALE_RETENTION_MS),
    ]);
    memoryOnlyKeys.delete(options.key);
    recordSnapshotWriteV277("redis-rest");
    return { entry, backend: "redis-rest" };
  } catch (error) {
    reportRedisFailure(error);
    memoryOnlyKeys.add(options.key);
    recordSnapshotWriteV277("memory");
    return { entry, backend: "memory" };
  }
}

export async function beginSharedMarketRefreshV276(
  key: string,
  now = Date.now()
): Promise<MarketRefreshLeaseV276> {
  const config = redisRestConfig();
  if (!config) {
    return { acquired: beginServerMarketRefreshV275(key, now), backend: "memory" };
  }
  const token = `${now}:${Math.random().toString(36).slice(2)}`;
  try {
    const response = await redisCommand(config, [
      "SET", redisLockKey(key), token, "NX", "PX", REFRESH_LOCK_MS,
    ]);
    return { acquired: response === "OK", backend: "redis-rest", token };
  } catch (error) {
    reportRedisFailure(error);
    return { acquired: beginServerMarketRefreshV275(key, now), backend: "memory" };
  }
}

export async function endSharedMarketRefreshV276(
  key: string,
  lease: MarketRefreshLeaseV276
): Promise<void> {
  if (!lease.acquired) return;
  if (lease.backend === "memory" || !lease.token) {
    endServerMarketRefreshV275(key);
    return;
  }
  const config = redisRestConfig();
  if (!config) return;
  try {
    await redisCommand(config, [
      "EVAL",
      "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end",
      1,
      redisLockKey(key),
      lease.token,
    ]);
  } catch (error) {
    reportRedisFailure(error);
  }
}
