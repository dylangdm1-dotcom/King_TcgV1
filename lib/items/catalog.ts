import { readFileSync } from "node:fs";
import path from "node:path";
import catalogEnIndex from "@/public/data/items-v1/en/index.json";
import manifestData from "@/public/data/items-v1/manifest.json";
import type { ItemCatalogManifest, SealedItem } from "./types";
import { isItemCatalogManifest, parseItemCatalog } from "./validation";
import { getCardTraderFrenchRuntimeSnapshotV300, withFrenchRuntimeManifestV300 } from "./sources/cardtrader-runtime";

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

const catalog = parseItemCatalog([
  ...optionalCatalog("catalog.json"),
  ...optionalCatalog("fr/catalog.json"),
  ...indexedItems(catalogEnIndex),
  ...optionalCatalog("ja/catalog.json"),
  ...optionalCatalog("zh-tw/catalog.json"),
  ...optionalCatalog("multi/catalog.json"),
]);

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

export async function getServerItemBundleV300(options?: { refreshFrench?: boolean }) {
  const snapshot = await getCardTraderFrenchRuntimeSnapshotV300({ refresh: Boolean(options?.refreshFrench) });
  const seen = new Set<string>();
  const items = parseItemCatalog([...(snapshot?.items || []), ...catalog])
    .filter((item) => !seen.has(item.id) && Boolean(seen.add(item.id)));
  return {
    items,
    manifest: withFrenchRuntimeManifestV300(getServerItemManifest(), snapshot),
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

export async function getServerItemByIdV300(idOrSlug: string): Promise<SealedItem | null> {
  const bundle = await getServerItemBundleV300({ refreshFrench: true });
  return bundle.items.find((item) => item.id === idOrSlug || item.slug === idOrSlug) || null;
}
