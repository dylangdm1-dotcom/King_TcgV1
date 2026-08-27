import type { CatalogCachePolicyV2 } from "./types";
import { CatalogJsonCacheV2 } from "./storage";

export const CATALOG_INDEX_CACHE_V2: CatalogCachePolicyV2 = {
  freshMs: 24 * 60 * 60 * 1_000,
  staleMs: 30 * 24 * 60 * 60 * 1_000,
};

export const CATALOG_SET_CACHE_V2: CatalogCachePolicyV2 = {
  freshMs: 7 * 24 * 60 * 60 * 1_000,
  staleMs: 180 * 24 * 60 * 60 * 1_000,
};

export interface CatalogHttpRequestV2 {
  url: string;
  cacheKey: string;
  policy: CatalogCachePolicyV2;
  headers?: Record<string, string>;
  timeoutMs?: number;
  retries?: number;
}

export interface CatalogHttpResultV2<T> {
  data: T;
  cacheState: "fresh" | "network" | "stale-fallback";
  attempts: number;
}

export class CatalogHttpErrorV2 extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = "CatalogHttpErrorV2";
  }
}

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export class CatalogHttpClientV2 {
  private readonly inFlight = new Map<string, Promise<CatalogHttpResultV2<unknown>>>();

  constructor(
    private readonly cache: CatalogJsonCacheV2,
    private readonly fetchImpl: FetchLike = fetch,
    private readonly now: () => number = Date.now,
    private readonly delay: (ms: number) => Promise<void> = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
  ) {}

  async getJson<T>(request: CatalogHttpRequestV2): Promise<CatalogHttpResultV2<T>> {
    const existing = this.inFlight.get(request.cacheKey);
    if (existing) return existing as Promise<CatalogHttpResultV2<T>>;
    const operation = this.load<T>(request).finally(() => this.inFlight.delete(request.cacheKey));
    this.inFlight.set(request.cacheKey, operation as Promise<CatalogHttpResultV2<unknown>>);
    return operation;
  }

  private async load<T>(request: CatalogHttpRequestV2): Promise<CatalogHttpResultV2<T>> {
    const nowMs = this.now();
    const cached = await this.cache.read<T>(request.cacheKey, nowMs);
    if (cached.state === "fresh" && cached.value !== undefined) {
      return { data: cached.value, cacheState: "fresh", attempts: 0 };
    }

    const retries = Math.min(3, Math.max(0, request.retries ?? 2));
    let lastError: unknown;
    for (let attempt = 0; attempt <= retries; attempt += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), Math.min(30_000, Math.max(1_000, request.timeoutMs ?? 15_000)));
      try {
        const response = await this.fetchImpl(request.url, {
          method: "GET",
          headers: { Accept: "application/json", ...(request.headers ?? {}) },
          signal: controller.signal,
        });
        if (!response.ok) throw new CatalogHttpErrorV2(`Fournisseur HTTP ${response.status}.`, response.status);
        const data = await response.json() as T;
        await this.cache.write(request.cacheKey, data, request.policy, nowMs);
        return { data, cacheState: "network", attempts: attempt + 1 };
      } catch (error) {
        lastError = error;
        const status = error instanceof CatalogHttpErrorV2 ? error.status : undefined;
        const retryable = status === 429 || status === undefined || (status >= 500 && status <= 599);
        if (!retryable || attempt >= retries) break;
        await this.delay(Math.min(1_000, 100 * 2 ** attempt));
      } finally {
        clearTimeout(timeout);
      }
    }

    if (cached.state === "stale" && cached.value !== undefined) {
      return { data: cached.value, cacheState: "stale-fallback", attempts: retries + 1 };
    }
    throw lastError instanceof Error ? lastError : new CatalogHttpErrorV2("Fournisseur catalogue indisponible.");
  }
}
