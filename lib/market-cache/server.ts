export const MARKET_CACHE_POSITIVE_FRESH_MS = 24 * 60 * 60 * 1000;
export const MARKET_CACHE_NEGATIVE_FRESH_MS = 6 * 60 * 60 * 1000;
export const MARKET_CACHE_STALE_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
const MARKET_CACHE_MAX_ENTRIES = 5_000;

export interface ServerMarketCacheEnvelopeV275<T> {
  value: T;
  cachedAt: number;
  freshUntil: number;
  staleUntil: number;
}

export type ServerMarketCacheReadV275<T> =
  | { state: "miss" }
  | { state: "fresh" | "stale"; entry: ServerMarketCacheEnvelopeV275<T> };

type MarketCacheGlobal = typeof globalThis & {
  __kingTcgMarketCacheV275?: Map<string, ServerMarketCacheEnvelopeV275<unknown>>;
  __kingTcgMarketRefreshV275?: Map<string, number>;
};

const sharedGlobal = globalThis as MarketCacheGlobal;
const entries = sharedGlobal.__kingTcgMarketCacheV275 ?? new Map();
sharedGlobal.__kingTcgMarketCacheV275 = entries;
const refreshLocks = sharedGlobal.__kingTcgMarketRefreshV275 ?? new Map<string, number>();
sharedGlobal.__kingTcgMarketRefreshV275 = refreshLocks;

function prune(now: number): void {
  entries.forEach((entry, key) => {
    if (entry.staleUntil <= now) entries.delete(key);
  });
  if (entries.size <= MARKET_CACHE_MAX_ENTRIES) return;
  const oldest = Array.from(entries.entries())
    .sort(([, left], [, right]) => left.cachedAt - right.cachedAt)
    .slice(0, entries.size - MARKET_CACHE_MAX_ENTRIES);
  oldest.forEach(([key]) => entries.delete(key));
}

export function readServerMarketCacheV275<T>(
  key: string,
  now = Date.now()
): ServerMarketCacheReadV275<T> {
  const entry = entries.get(key) as ServerMarketCacheEnvelopeV275<T> | undefined;
  if (!entry) return { state: "miss" };
  if (entry.staleUntil <= now) {
    entries.delete(key);
    return { state: "miss" };
  }
  return { state: entry.freshUntil > now ? "fresh" : "stale", entry };
}

export function writeServerMarketCacheV275<T>(options: {
  key: string;
  value: T;
  freshForMs: number;
  now?: number;
}): ServerMarketCacheEnvelopeV275<T> {
  const now = options.now ?? Date.now();
  const entry: ServerMarketCacheEnvelopeV275<T> = {
    value: options.value,
    cachedAt: now,
    freshUntil: now + Math.max(0, options.freshForMs),
    staleUntil: now + MARKET_CACHE_STALE_RETENTION_MS,
  };
  entries.set(options.key, entry as ServerMarketCacheEnvelopeV275<unknown>);
  if (entries.size > MARKET_CACHE_MAX_ENTRIES) prune(now);
  return entry;
}

/**
 * Hydrate le miroir mémoire avec une enveloppe déjà validée par un stockage
 * durable. Les dates d'origine sont conservées : un redémarrage d'instance ne
 * doit jamais rendre artificiellement fraîche une ancienne cotation.
 */
export function seedServerMarketCacheV275<T>(
  key: string,
  entry: ServerMarketCacheEnvelopeV275<T>,
  now = Date.now()
): void {
  if (entry.staleUntil <= now) return;
  entries.set(key, entry as ServerMarketCacheEnvelopeV275<unknown>);
  if (entries.size > MARKET_CACHE_MAX_ENTRIES) prune(now);
}

export function clearServerMarketCacheV275(): void {
  entries.clear();
  refreshLocks.clear();
}

/** Empêche plusieurs écrans de relancer simultanément le même refresh stale. */
export function beginServerMarketRefreshV275(key: string, now = Date.now()): boolean {
  const lockedUntil = refreshLocks.get(key) ?? 0;
  if (lockedUntil > now) return false;
  refreshLocks.set(key, now + 30_000);
  return true;
}

export function endServerMarketRefreshV275(key: string): void {
  refreshLocks.delete(key);
}
