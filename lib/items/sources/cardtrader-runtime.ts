import "server-only";
import { slugifyItem } from "../identity";
import type { ItemCatalogManifest, SealedItem } from "../types";
import { isMarketRedisConfiguredV277, executeMarketRedisCommandV277 } from "@/lib/market-cache/persistent";
import { previewCardTraderFrenchCatalog } from "./cardtrader-catalog";
import type { CardTraderFrenchItemCandidate } from "./cardtrader-types";

const SNAPSHOT_KEY = "king-tcg:items-fr:v298:snapshot";
const LOCK_KEY = "king-tcg:items-fr:v298:refresh-lock";
const READY_FRESH_MS = 24 * 60 * 60 * 1000;
const EMPTY_RETRY_MS = 10 * 60 * 1000;
const ERROR_RETRY_MS = 5 * 60 * 1000;
const RETENTION_SECONDS = 14 * 24 * 60 * 60;

export interface RuntimeSnapshotV298 {
  version: "items-fr-runtime-v298";
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
  __kingTcgItemsFrSnapshotV298?: RuntimeSnapshotV298;
  __kingTcgItemsFrRefreshV298?: Promise<RuntimeSnapshotV298>;
};

const runtime = globalThis as RuntimeGlobal;

function configuredExpansionIds(): number[] {
  return Array.from(new Set(String(process.env.KING_TCG_CARDTRADER_FR_EXPANSION_IDS || "")
    .split(",")
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isInteger(value) && value > 0)))
    .slice(0, 12);
}

function parseSnapshot(value: unknown): RuntimeSnapshotV298 | null {
  if (typeof value !== "string" || !value) return null;
  try {
    const parsed = JSON.parse(value) as RuntimeSnapshotV298;
    if (parsed?.version !== "items-fr-runtime-v298" || !Array.isArray(parsed.items) || !Number.isFinite(parsed.freshUntil)) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function readSnapshot(): Promise<RuntimeSnapshotV298 | null> {
  if (runtime.__kingTcgItemsFrSnapshotV298) return runtime.__kingTcgItemsFrSnapshotV298;
  if (!isMarketRedisConfiguredV277()) return null;
  try {
    const snapshot = parseSnapshot(await executeMarketRedisCommandV277(["GET", SNAPSHOT_KEY]));
    if (snapshot) runtime.__kingTcgItemsFrSnapshotV298 = snapshot;
    return snapshot;
  } catch {
    return null;
  }
}

async function writeSnapshot(snapshot: RuntimeSnapshotV298): Promise<void> {
  runtime.__kingTcgItemsFrSnapshotV298 = snapshot;
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

async function synchronize(): Promise<RuntimeSnapshotV298> {
  const generatedAt = Date.now();
  const explicitIds = configuredExpansionIds();
  const result = await previewCardTraderFrenchCatalog({
    expansionIds: explicitIds,
    maximumExpansions: explicitIds.length || 12,
  });
  const seen = new Set<string>();
  const items = result.previews
    .flatMap((preview) => preview.candidates)
    .map((candidate) => candidateToItem(candidate, generatedAt))
    .filter((item): item is SealedItem => Boolean(item))
    .filter((item) => !seen.has(item.id) && Boolean(seen.add(item.id)));
  const allFailed = result.selectedExpansionIds.length > 0 && result.failures.length === result.selectedExpansionIds.length;
  const state: RuntimeSnapshotV298["state"] = items.length ? "ready" : allFailed ? "error" : "empty";
  const lastError = state === "error" ? result.failures.map((failure) => failure.error).join(", ").slice(0, 300) : undefined;
  const freshFor = state === "ready" ? READY_FRESH_MS : state === "empty" ? EMPTY_RETRY_MS : ERROR_RETRY_MS;
  const snapshot: RuntimeSnapshotV298 = {
    version: "items-fr-runtime-v298",
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

async function refreshOnce(): Promise<RuntimeSnapshotV298> {
  if (runtime.__kingTcgItemsFrRefreshV298) return runtime.__kingTcgItemsFrRefreshV298;
  runtime.__kingTcgItemsFrRefreshV298 = (async () => {
    const lease = await acquireRefreshLock();
    if (!lease.acquired) return (await readSnapshot()) || {
      version: "items-fr-runtime-v298",
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
    return await runtime.__kingTcgItemsFrRefreshV298;
  } finally {
    runtime.__kingTcgItemsFrRefreshV298 = undefined;
  }
}

export async function getCardTraderFrenchRuntimeSnapshotV298(options?: { refresh?: boolean }): Promise<RuntimeSnapshotV298 | null> {
  const cached = await readSnapshot();
  if (cached && cached.freshUntil > Date.now()) return cached;
  if (!options?.refresh || !process.env.CARDTRADER_API_TOKEN) return cached;
  try {
    return await refreshOnce();
  } catch (error) {
    const generatedAt = Date.now();
    const failure: RuntimeSnapshotV298 = {
      version: "items-fr-runtime-v298",
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

export function withFrenchRuntimeManifestV298(manifest: ItemCatalogManifest, snapshot: RuntimeSnapshotV298 | null): ItemCatalogManifest {
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
    catalogVersion: frenchItems.length ? "v298-cardtrader-fr-runtime" : "v298-items-images-fr-runtime",
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
