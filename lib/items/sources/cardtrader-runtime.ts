import "server-only";
import { slugifyItem } from "../identity";
import { frenchItemCatalogPathV300, groupFrenchItemsByPackagingV300 } from "../grouping";
import type { ItemCatalogManifest, SealedItem } from "../types";
import { isMarketRedisConfiguredV277, executeMarketRedisCommandV277 } from "@/lib/market-cache/persistent";
import { previewCardTraderFrenchCatalog } from "./cardtrader-catalog";
import type { CardTraderFrenchItemCandidate } from "./cardtrader-types";

const SNAPSHOT_KEY = "king-tcg:items-fr:v300:snapshot";
const LOCK_KEY = "king-tcg:items-fr:v300:refresh-lock";
const READY_FRESH_MS = 24 * 60 * 60 * 1000;
const EMPTY_RETRY_MS = 10 * 60 * 1000;
const ERROR_RETRY_MS = 5 * 60 * 1000;
const RETENTION_SECONDS = 14 * 24 * 60 * 60;

export interface RuntimeSnapshotV300 {
  version: "items-fr-runtime-v300";
  state: "ready" | "empty" | "error";
  generatedAt: number;
  freshUntil: number;
  items: SealedItem[];
  expansionIds: number[];
  failures: Array<{ expansionId: number; error: string }>;
  lastError?: string;
  backend: "cardtrader";
}

type RuntimeGlobal = typeof globalThis & {
  __kingTcgItemsFrSnapshotV300?: RuntimeSnapshotV300;
  __kingTcgItemsFrRefreshV300?: Promise<RuntimeSnapshotV300>;
};

const runtime = globalThis as RuntimeGlobal;

function configuredExpansionIds(): number[] {
  return Array.from(new Set(String(process.env.KING_TCG_CARDTRADER_FR_EXPANSION_IDS || "")
    .split(",")
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isInteger(value) && value > 0)))
    .slice(0, 12);
}

function parseSnapshot(value: unknown): RuntimeSnapshotV300 | null {
  if (typeof value !== "string" || !value) return null;
  try {
    const parsed = JSON.parse(value) as RuntimeSnapshotV300;
    if (parsed?.version !== "items-fr-runtime-v300" || !Array.isArray(parsed.items) || !Number.isFinite(parsed.freshUntil)) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function readSnapshot(): Promise<RuntimeSnapshotV300 | null> {
  if (runtime.__kingTcgItemsFrSnapshotV300) return runtime.__kingTcgItemsFrSnapshotV300;
  if (!isMarketRedisConfiguredV277()) return null;
  try {
    const snapshot = parseSnapshot(await executeMarketRedisCommandV277(["GET", SNAPSHOT_KEY]));
    if (snapshot) runtime.__kingTcgItemsFrSnapshotV300 = snapshot;
    return snapshot;
  } catch {
    return null;
  }
}

async function writeSnapshot(snapshot: RuntimeSnapshotV300): Promise<void> {
  runtime.__kingTcgItemsFrSnapshotV300 = snapshot;
  if (!isMarketRedisConfiguredV277()) return;
  try {
    await executeMarketRedisCommandV277(["SET", SNAPSHOT_KEY, JSON.stringify(snapshot), "EX", RETENTION_SECONDS]);
  } catch {
    // Le catalogue EN et le dernier miroir mémoire restent disponibles.
  }
}

async function acquireRefreshLock(): Promise<{ acquired: boolean; token: string }> {
  const token = `${Date.now()}:${Math.random().toString(36).slice(2)}`;
  if (!isMarketRedisConfiguredV277()) return { acquired: true, token };
  try {
    const result = await executeMarketRedisCommandV277(["SET", LOCK_KEY, token, "NX", "EX", 90]);
    return { acquired: result === "OK", token };
  } catch {
    return { acquired: true, token };
  }
}

async function releaseRefreshLock(token: string): Promise<void> {
  if (!isMarketRedisConfiguredV277()) return;
  try {
    await executeMarketRedisCommandV277([
      "EVAL",
      "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end",
      1,
      LOCK_KEY,
      token,
    ]);
  } catch {
    // Le verrou expire automatiquement après 90 secondes.
  }
}

function internalImageUrl(candidate: CardTraderFrenchItemCandidate): string | undefined {
  return candidate.imageUrl ? `/api/items/image?source=cardtrader&url=${encodeURIComponent(candidate.imageUrl)}` : undefined;
}

function candidateToItem(candidate: CardTraderFrenchItemCandidate, generatedAt: number): SealedItem | null {
  const name = String(candidate.name || "").trim();
  if (!name || !Number.isInteger(candidate.blueprintId) || candidate.blueprintId <= 0) return null;
  const image = internalImageUrl(candidate);
  const quote = Number.isFinite(candidate.lowestEur) ? [{
    source: "cardtrader",
    amount: Number(candidate.lowestEur),
    currency: "EUR" as const,
    kind: "current_market" as const,
    updatedAt: new Date(generatedAt).toISOString(),
  }] : undefined;
  const slug = `${slugifyItem(name)}-${candidate.blueprintId}`;
  return {
    id: `ktcg:item:cardtrader:${candidate.blueprintId}`,
    slug,
    catalogPath: frenchItemCatalogPathV300({ name, category: candidate.itemCategory, setIds: candidate.expansionCode ? [candidate.expansionCode] : undefined }),
    name,
    category: candidate.itemCategory,
    language: "fr",
    setIds: candidate.expansionCode ? [candidate.expansionCode] : undefined,
    sku: String(candidate.blueprintId),
    description: `Produit scellé français CardTrader · ${candidate.expansionName}. Prix de sortie FR officiel affiché uniquement lorsqu’une source officielle française le publie.`,
    images: image ? { small: image, large: image, source: "cardtrader" } : undefined,
    sources: [{ provider: "cardtrader", reference: `blueprint:${candidate.blueprintId}`, verifiedAt: new Date(generatedAt).toISOString() }],
    catalogStatus: "partial",
    priceStatus: quote?.length ? "available" : "not_listed",
    quotes: quote,
    createdAt: new Date(generatedAt).toISOString(),
  };
}

async function synchronize(): Promise<RuntimeSnapshotV300> {
  const generatedAt = Date.now();
  const explicitIds = configuredExpansionIds();
  const result = await previewCardTraderFrenchCatalog({
    expansionIds: explicitIds,
    maximumExpansions: explicitIds.length || 12,
  });
  const seen = new Set<string>();
  const rawItems = result.previews
    .flatMap((preview) => preview.candidates)
    .map((candidate) => candidateToItem(candidate, generatedAt))
    .filter((item): item is SealedItem => Boolean(item))
    .filter((item) => !seen.has(item.id) && Boolean(seen.add(item.id)));
  const items = groupFrenchItemsByPackagingV300(rawItems);
  const allFailed = result.selectedExpansionIds.length > 0 && result.failures.length === result.selectedExpansionIds.length;
  const state: RuntimeSnapshotV300["state"] = items.length ? "ready" : allFailed ? "error" : "empty";
  const lastError = state === "error" ? result.failures.map((failure) => failure.error).join(", ").slice(0, 300) : undefined;
  const freshFor = state === "ready" ? READY_FRESH_MS : state === "empty" ? EMPTY_RETRY_MS : ERROR_RETRY_MS;
  const snapshot: RuntimeSnapshotV300 = {
    version: "items-fr-runtime-v300",
    state,
    generatedAt,
    freshUntil: generatedAt + freshFor,
    items,
    expansionIds: result.selectedExpansionIds,
    failures: result.failures,
    lastError,
    backend: "cardtrader",
  };
  await writeSnapshot(snapshot);
  return snapshot;
}

async function refreshOnce(): Promise<RuntimeSnapshotV300> {
  if (runtime.__kingTcgItemsFrRefreshV300) return runtime.__kingTcgItemsFrRefreshV300;
  runtime.__kingTcgItemsFrRefreshV300 = (async () => {
    const lease = await acquireRefreshLock();
    if (!lease.acquired) return (await readSnapshot()) || {
      version: "items-fr-runtime-v300",
      state: "empty",
      generatedAt: Date.now(),
      freshUntil: Date.now() + EMPTY_RETRY_MS,
      items: [],
      expansionIds: [],
      failures: [],
      backend: "cardtrader",
    };
    try {
      return await synchronize();
    } finally {
      await releaseRefreshLock(lease.token);
    }
  })();
  try {
    return await runtime.__kingTcgItemsFrRefreshV300;
  } finally {
    runtime.__kingTcgItemsFrRefreshV300 = undefined;
  }
}

export async function getCardTraderFrenchRuntimeSnapshotV300(options?: { refresh?: boolean }): Promise<RuntimeSnapshotV300 | null> {
  const cached = await readSnapshot();
  if (cached && cached.freshUntil > Date.now()) return cached;
  if (!options?.refresh || !process.env.CARDTRADER_API_TOKEN) return cached;
  try {
    return await refreshOnce();
  } catch (error) {
    const generatedAt = Date.now();
    const failure: RuntimeSnapshotV300 = {
      version: "items-fr-runtime-v300",
      state: "error",
      generatedAt: cached?.generatedAt || generatedAt,
      freshUntil: generatedAt + ERROR_RETRY_MS,
      items: cached?.items || [],
      expansionIds: cached?.expansionIds || configuredExpansionIds(),
      failures: cached?.failures || [],
      lastError: error instanceof Error ? error.message : "cardtrader_unknown_error",
      backend: "cardtrader",
    };
    await writeSnapshot(failure);
    return failure;
  }
}

export function withFrenchRuntimeManifestV300(manifest: ItemCatalogManifest, snapshot: RuntimeSnapshotV300 | null): ItemCatalogManifest {
  const frenchItems = snapshot?.items || [];
  const frenchImages = frenchItems.filter((item) => item.images?.small || item.images?.large).length;
  const frenchQuotes = frenchItems.filter((item) => item.quotes?.some((quote) => quote.kind === "current_market")).length;
  const note = frenchItems.length
    ? "Produits scellés FR CardTrader chargés automatiquement."
    : snapshot?.state === "error"
      ? `Synchronisation FR en erreur temporaire : ${snapshot.lastError || "fournisseur indisponible"}.`
      : "Synchronisation CardTrader FR en attente d’un lot exploitable.";
  return {
    ...manifest,
    catalogVersion: frenchItems.length ? "v300-cardtrader-fr-grouped" : "v300-items-images-fr-runtime",
    itemCount: manifest.itemCount + frenchItems.length,
    priceQuoteCount: (manifest.priceQuoteCount || 0) + frenchQuotes,
    imageCount: (manifest.imageCount || 0) + frenchImages,
    languageStatus: {
      ...manifest.languageStatus,
      fr: {
        state: frenchItems.length ? "ready" : "preparation",
        itemCount: frenchItems.length,
        imageCount: frenchImages,
        quoteCount: frenchQuotes,
        note,
      },
    },
  };
}
