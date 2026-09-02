import { readFileSync } from "node:fs";
import path from "node:path";
import catalogData from "@/public/data/items-v1/catalog.json";
import catalogFr from "@/public/data/items-v1/fr/catalog.json";
import catalogEnIndex from "@/public/data/items-v1/en/index.json";
import catalogJa from "@/public/data/items-v1/ja/catalog.json";
import catalogZh from "@/public/data/items-v1/zh-tw/catalog.json";
import catalogMulti from "@/public/data/items-v1/multi/catalog.json";
import manifestData from "@/public/data/items-v1/manifest.json";
import type { ItemCatalogManifest, SealedItem } from "./types";
import { isItemCatalogManifest, parseItemCatalog } from "./validation";

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

const catalog = parseItemCatalog([
  ...parseItemCatalog(catalogData),
  ...parseItemCatalog(catalogFr),
  ...indexedItems(catalogEnIndex),
  ...parseItemCatalog(catalogJa),
  ...parseItemCatalog(catalogZh),
  ...parseItemCatalog(catalogMulti),
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
