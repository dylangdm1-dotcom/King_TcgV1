export type MarketCacheMetricBackendV277 = "memory" | "redis-rest";

export interface MarketCacheMetricsSnapshotV277 {
  since: string;
  redisCommands: number;
  redisReads: number;
  redisWrites: number;
  redisErrors: number;
  cacheHits: number;
  cacheMisses: number;
  memoryHits: number;
  redisHits: number;
  snapshotWrites: number;
  historyWrites: number;
  memoryFallbacks: number;
  averageRedisLatencyMs: number;
  maxRedisLatencyMs: number;
  lastRedisErrorAt?: string;
}

type MutableMetrics = Omit<
  MarketCacheMetricsSnapshotV277,
  "since" | "averageRedisLatencyMs" | "maxRedisLatencyMs" | "lastRedisErrorAt"
> & {
  since: number;
  redisLatencyTotalMs: number;
  maxRedisLatencyMs: number;
  lastRedisErrorAt?: number;
};

type MetricsGlobal = typeof globalThis & {
  __kingTcgMarketMetricsV277?: MutableMetrics;
};

const sharedGlobal = globalThis as MetricsGlobal;

function emptyMetrics(): MutableMetrics {
  return {
    since: Date.now(),
    redisCommands: 0,
    redisReads: 0,
    redisWrites: 0,
    redisErrors: 0,
    cacheHits: 0,
    cacheMisses: 0,
    memoryHits: 0,
    redisHits: 0,
    snapshotWrites: 0,
    historyWrites: 0,
    memoryFallbacks: 0,
    redisLatencyTotalMs: 0,
    maxRedisLatencyMs: 0,
  };
}

const metrics = sharedGlobal.__kingTcgMarketMetricsV277 ?? emptyMetrics();
sharedGlobal.__kingTcgMarketMetricsV277 = metrics;

export function recordRedisCommandV277(
  command: string,
  latencyMs: number,
  success: boolean
): void {
  const normalized = command.toUpperCase();
  metrics.redisCommands += 1;
  if (["GET", "MGET", "PING", "DBSIZE", "PTTL"].includes(normalized)) {
    metrics.redisReads += 1;
  } else {
    metrics.redisWrites += 1;
  }
  metrics.redisLatencyTotalMs += Math.max(0, latencyMs);
  metrics.maxRedisLatencyMs = Math.max(metrics.maxRedisLatencyMs, latencyMs);
  if (!success) {
    metrics.redisErrors += 1;
    metrics.lastRedisErrorAt = Date.now();
  }
}

export function recordMarketCacheLookupV277(
  state: "fresh" | "stale" | "miss",
  backend: MarketCacheMetricBackendV277
): void {
  if (state === "miss") {
    metrics.cacheMisses += 1;
    return;
  }
  metrics.cacheHits += 1;
  if (backend === "redis-rest") metrics.redisHits += 1;
  else metrics.memoryHits += 1;
}

export function recordSnapshotWriteV277(backend: MarketCacheMetricBackendV277): void {
  metrics.snapshotWrites += 1;
  if (backend === "memory") metrics.memoryFallbacks += 1;
}

export function recordHistoryWriteV277(backend: MarketCacheMetricBackendV277): void {
  metrics.historyWrites += 1;
  if (backend === "memory") metrics.memoryFallbacks += 1;
}

export function recordMarketCacheFallbackV277(): void {
  metrics.memoryFallbacks += 1;
}

export function getMarketCacheMetricsV277(): MarketCacheMetricsSnapshotV277 {
  const average = metrics.redisCommands > 0
    ? metrics.redisLatencyTotalMs / metrics.redisCommands
    : 0;
  return {
    since: new Date(metrics.since).toISOString(),
    redisCommands: metrics.redisCommands,
    redisReads: metrics.redisReads,
    redisWrites: metrics.redisWrites,
    redisErrors: metrics.redisErrors,
    cacheHits: metrics.cacheHits,
    cacheMisses: metrics.cacheMisses,
    memoryHits: metrics.memoryHits,
    redisHits: metrics.redisHits,
    snapshotWrites: metrics.snapshotWrites,
    historyWrites: metrics.historyWrites,
    memoryFallbacks: metrics.memoryFallbacks,
    averageRedisLatencyMs: Number(average.toFixed(2)),
    maxRedisLatencyMs: Number(metrics.maxRedisLatencyMs.toFixed(2)),
    ...(metrics.lastRedisErrorAt
      ? { lastRedisErrorAt: new Date(metrics.lastRedisErrorAt).toISOString() }
      : {}),
  };
}

export function resetMarketCacheMetricsV277(): void {
  Object.assign(metrics, emptyMetrics());
}
