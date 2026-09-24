import { readFileSync } from "node:fs";
import path from "node:path";
import catalogEnIndex from "@/public/data/items-v1/en/index.json";
import manifestData from "@/public/data/items-v1/manifest.json";
import type { ItemCatalogManifest, SealedItem } from "./types";
import { groupItemsByPackagingV301 } from "./grouping";
import { isItemCatalogManifest, parseItemCatalog } from "./validation";
import { withBundledItemImagesV304 } from "./static-images";
import { getCardTraderFrenchRuntimeSnapshotV301, withFrenchRuntimeManifestV301 } from "./sources/cardtrader-runtime";

function indexedItems(index: { items?: Array<{ path?: string }> }): SealedItem[] {
  const rows = Array.isArray(index?.items) ? index.items : [];
  return parseItemCatalog(rows.map((entry) => {
    const relative = String(entry?.path || "");
    if (!/^[a-z0-9/_-]+\.json$/i.test(relative)) return null;
    try {
      const filename = path.join(process.cwd(), "public/data/items-v1", relative);
      return JSON.parse(readFileSync(filename, "utf8"));
    } catch {
      return null;
    }
  }));
}

function optionalCatalog(relative: string): SealedItem[] {
  if (!/^[a-z0-9/_-]+\.json$/i.test(relative)) return [];
  try {
    const filename = path.join(process.cwd(), "public/data/items-v1", relative);
    return parseItemCatalog(JSON.parse(readFileSync(filename, "utf8")));
  } catch {
    // Les catalogues de langue vides sont facultatifs et ne doivent pas bloquer
    // un déploiement lorsque seuls les lots réellement alimentés sont publiés.
    return [];
  }
}


const ANNIVERSARY_TCGCSV_GROUP_ID = 24722;
const ANNIVERSARY_TCGCSV_CACHE_MS = 24 * 60 * 60 * 1000;
let anniversaryRuntimeCache: { expiresAt: number; items: SealedItem[] } | null = null;

function anniversaryCategory(name: string): SealedItem["category"] {
  const value = name.toLowerCase();
  if (/elite trainer box|etb/.test(value)) return "etb";
  if (/booster box|display/.test(value)) return "booster_box";
  if (/booster bundle|bundle/.test(value)) return "bundle";
  if (/mini tin|tin/.test(value)) return "tin";
  if (/deck/.test(value)) return "deck";
  if (/ultra.?premium|premium collection|collection box|knock out|poster|figure|figurine|binder|sticker|collection/.test(value)) return "collection_box";
  return "other";
}

async function getThirtyAnniversaryItemsV301(): Promise<SealedItem[]> {
  if (anniversaryRuntimeCache && anniversaryRuntimeCache.expiresAt > Date.now()) {
    return anniversaryRuntimeCache.items;
  }

  try {
    const response = await fetch(
      `https://tcgcsv.com/tcgplayer/3/${ANNIVERSARY_TCGCSV_GROUP_ID}/products`,
      {
        headers: { Accept: "application/json" },
        next: { revalidate: 86_400 },
      }
    );
    if (!response.ok) return anniversaryRuntimeCache?.items || [];
    const body = await response.json() as unknown;
    const rows = body && typeof body === "object" && Array.isArray((body as any).results)
      ? (body as any).results
      : [];
    const generatedAt = Date.now();
    const items = parseItemCatalog(rows.map((raw: any) => {
      const productId = Number(raw?.productId ?? raw?.product_id);
      const name = String(raw?.name || raw?.cleanName || "").trim();
      if (!Number.isInteger(productId) || productId <= 0 || !name) return null;
      const image = `/api/catalog/image?provider=tcgplayer&product=${productId}`;
      return {
        id: `ktcg:item:tcgcsv:${productId}`,
        slug: `${name.toLowerCase().replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "")}-${productId}`,
        name,
        category: anniversaryCategory(name),
        language: "en",
        releaseDate: String(raw?.releaseDate || raw?.release_date || "2026-09-16"),
        setIds: ["30C", `tcgplayer:group:${ANNIVERSARY_TCGCSV_GROUP_ID}`],
        sku: String(productId),
        images: { small: image, large: image, source: "tcgcsv-tcgplayer" },
        sources: [{ provider: "tcgcsv-tcgplayer", reference: `group:${ANNIVERSARY_TCGCSV_GROUP_ID}/product:${productId}`, verifiedAt: new Date(generatedAt).toISOString() }],
        catalogStatus: "partial",
        priceStatus: "not_listed",
      };
    }));
    const deduped = groupItemsByPackagingV301(items);
    anniversaryRuntimeCache = { expiresAt: generatedAt + ANNIVERSARY_TCGCSV_CACHE_MS, items: deduped };
    return deduped;
  } catch {
    return anniversaryRuntimeCache?.items || [];
  }
}

const catalog = groupItemsByPackagingV301(parseItemCatalog([
  ...optionalCatalog("catalog.json"),
  ...optionalCatalog("fr/catalog.json"),
  ...indexedItems(catalogEnIndex),
  ...optionalCatalog("ja/catalog.json"),
  ...optionalCatalog("zh-tw/catalog.json"),
  ...optionalCatalog("multi/catalog.json"),
]).map(withBundledItemImagesV304));

export function getServerItemCatalog(): SealedItem[] {
  return catalog;
}

export function getServerItemManifest(): ItemCatalogManifest {
  if (!isItemCatalogManifest(manifestData)) {
    throw new Error("Manifest Items V1 invalide");
  }
  return manifestData;
}

export function getServerItemById(idOrSlug: string): SealedItem | null {
  return catalog.find((item) => item.id === idOrSlug || item.slug === idOrSlug) || null;
}

export async function getServerItemBundleV301(options?: { refreshFrench?: boolean; forceFrench?: boolean }) {
  const snapshot = await getCardTraderFrenchRuntimeSnapshotV301({
    refresh: Boolean(options?.refreshFrench),
    force: Boolean(options?.forceFrench),
  });
  const anniversaryItems = await getThirtyAnniversaryItemsV301();
  const seen = new Set<string>();
  const items = parseItemCatalog([...(snapshot?.items || []), ...anniversaryItems, ...catalog])
    .filter((item) => !seen.has(item.id) && Boolean(seen.add(item.id)));
  return {
    items,
    manifest: withFrenchRuntimeManifestV301(getServerItemManifest(), snapshot),
    runtime: snapshot ? {
      state: snapshot.state,
      generatedAt: snapshot.generatedAt,
      freshUntil: snapshot.freshUntil,
      itemCount: snapshot.items.length,
      expansionIds: snapshot.expansionIds,
      failures: snapshot.failures.length,
      lastError: snapshot.lastError,
    } : { state: "unavailable", itemCount: 0 },
  };
}

export async function getServerItemByIdV301(idOrSlug: string): Promise<SealedItem | null> {
  const bundle = await getServerItemBundleV301({ refreshFrench: true });
  return bundle.items.find((item) => item.id === idOrSlug || item.slug === idOrSlug) || null;
}
