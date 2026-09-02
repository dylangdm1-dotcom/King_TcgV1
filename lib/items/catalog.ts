import { readFileSync } from "node:fs";
import path from "node:path";
import catalogEnIndex from "@/public/data/items-v1/en/index.json";
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
