import "server-only";
import { slugifyItem } from "../identity";
import type { ItemCatalogManifest, SealedItem } from "../types";
import { isMarketRedisConfiguredV277, executeMarketRedisCommandV277 } from "@/lib/market-cache/persistent";
import { previewCardTraderFrenchCatalog } from "./cardtrader-catalog";
import type { CardTraderFrenchItemCandidate } from "./cardtrader-types";

const SNAPSHOT_KEY = "king-tcg:items-fr:v296:snapshot";
const LOCK_KEY = "king-tcg:items-fr:v296:refresh-lock";
const FRESH_MS = 24 * 60 * 60 * 1000;
const RETENTION_SECONDS = 7 * 24 * 60 * 60;

export interface RuntimeSnapshotV296 {
  version: "items-fr-runtime-v296";
  generatedAt: number;
  freshUntil: number;
  items: SealedItem[];
  expansionIds: number[];
  failures: Array<{ expansionId: number; error: string }>;
  backend: "cardtrader";
}

type RuntimeGlobal = typeof globalThis & {
  __kingTcgItemsFrSnapshotV296?: RuntimeSnapshotV296;
  __kingTcgItemsFrRefreshV296?: Promise<RuntimeSnapshotV296>;
};

const runtime = globalThis as RuntimeGlobal;

function configuredExpansionIds(): number[] {
  return Array.from(new Set(String(process.env.KING_TCG_CARDTRADER_FR_EXPANSION_IDS || "")
    .split(",")
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isInteger(value) && value > 0)))
    .slice(0, 12);
}

function parseSnapshot(value: unknown): RuntimeSnapshotV296 | null {
  if (typeof value !== "string" || !value) return null;
  try {
    const parsed = JSON.parse(value) as RuntimeSnapshotV296;
    if (parsed?.version !== "items-fr-runtime-v296" || !Array.isArray(parsed.items) || !Number.isFinite(parsed.freshUntil)) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function readSnapshot(): Promise<RuntimeSnapshotV296 | null> {
  if (runtime.__kingTcgItemsFrSnapshotV296) return runtime.__kingTcgItemsFrSnapshotV296;
  if (!isMarketRedisConfiguredV277()) return null;
  try {
    const snapshot = parseSnapshot(await executeMarketRedisCommandV277(["GET", SNAPSHOT_KEY]));
    if (snapshot) runtime.__kingTcgItemsFrSnapshotV296 = snapshot;
    return snapshot;
  } catch {
    return null;
  }
}

async function writeSnapshot(snapshot: RuntimeSnapshotV296): Promise<void> {
  runtime.__kingTcgItemsFrSnapshotV296 = snapshot;
  if (!isMarketRedisConfiguredV277()) return;
  try {
    await executeMarketRedisCommandV277(["SET", SNAPSHOT_KEY, JSON.stringify(snapshot), "EX", RETENTION_SECONDS]);
  } catch {
    // Le catalogue statique EN et le dernier miroir mémoire restent utilisables.
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
    description: `Candidat français CardTrader · ${candidate.expansionName}. Nom et emballage à confirmer pendant la bêta.`,
    images: image ? { small: image, large: image, source: "cardtrader" } : undefined,
    sources: [{ provider: "cardtrader", reference: `blueprint:${candidate.blueprintId}` }],
    catalogStatus: "partial",
    priceStatus: quote?.length ? "available" : "not_listed",
    quotes: quote,
    createdAt: new Date(generatedAt).toISOString(),
  };
}

async function synchronize(): Promise<RuntimeSnapshotV296> {
  const generatedAt = Date.now();
  const explicitIds = configuredExpansionIds();
  const result = await previewCardTraderFrenchCatalog({
    expansionIds: explicitIds,
    maximumExpansions: explicitIds.length || 6,
  });
  const seen = new Set<string>();
  const items = result.previews
    .flatMap((preview) => preview.candidates)
    .map((candidate) => candidateToItem(candidate, generatedAt))
    .filter((item): item is SealedItem => Boolean(item))
    .filter((item) => !seen.has(item.id) && Boolean(seen.add(item.id)));
  const snapshot: RuntimeSnapshotV296 = {
    version: "items-fr-runtime-v296",
    generatedAt,
    freshUntil: generatedAt + FRESH_MS,
    items,
    expansionIds: result.selectedExpansionIds,
    failures: result.failures,
    backend: "cardtrader",
  };
  await writeSnapshot(snapshot);
  return snapshot;
}

async function refreshOnce(): Promise<RuntimeSnapshotV296> {
  if (runtime.__kingTcgItemsFrRefreshV296) return runtime.__kingTcgItemsFrRefreshV296;
  runtime.__kingTcgItemsFrRefreshV296 = (async () => {
    const lease = await acquireRefreshLock();
    if (!lease.acquired) return (await readSnapshot()) || {
      version: "items-fr-runtime-v296",
      generatedAt: Date.now(),
      freshUntil: 0,
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
    return await runtime.__kingTcgItemsFrRefreshV296;
  } finally {
    runtime.__kingTcgItemsFrRefreshV296 = undefined;
  }
}

export async function getCardTraderFrenchRuntimeSnapshotV296(options?: { refresh?: boolean }): Promise<RuntimeSnapshotV296 | null> {
  const cached = await readSnapshot();
  if (cached && cached.freshUntil > Date.now()) return cached;
  if (!options?.refresh || !process.env.CARDTRADER_API_TOKEN) return cached;
  try {
    return await refreshOnce();
  } catch {
    return cached;
  }
}

export function withFrenchRuntimeManifestV296(manifest: ItemCatalogManifest, snapshot: RuntimeSnapshotV296 | null): ItemCatalogManifest {
  const frenchItems = snapshot?.items || [];
  const frenchImages = frenchItems.filter((item) => item.images?.small || item.images?.large).length;
  const frenchQuotes = frenchItems.filter((item) => item.quotes?.some((quote) => quote.kind === "current_market")).length;
  return {
    ...manifest,
    catalogVersion: frenchItems.length ? "v296-cardtrader-fr-runtime-preview" : manifest.catalogVersion,
    itemCount: manifest.itemCount + frenchItems.length,
    priceQuoteCount: (manifest.priceQuoteCount || 0) + frenchQuotes,
    imageCount: (manifest.imageCount || 0) + frenchImages,
    languageStatus: {
      ...manifest.languageStatus,
      fr: {
        state: "preparation",
        itemCount: frenchItems.length,
        imageCount: frenchImages,
        quoteCount: frenchQuotes,
        note: frenchItems.length ? "Candidats CardTrader FR affichés pour contrôle visuel en bêta." : "Synchronisation CardTrader FR en attente.",
      },
    },
  };
}
