import catalogData from "@/public/data/items-v1/catalog.json";
import catalogFr from "@/public/data/items-v1/fr/catalog.json";
import catalogEn from "@/public/data/items-v1/en/catalog.json";
import catalogJa from "@/public/data/items-v1/ja/catalog.json";
import catalogZh from "@/public/data/items-v1/zh-tw/catalog.json";
import catalogMulti from "@/public/data/items-v1/multi/catalog.json";
import manifestData from "@/public/data/items-v1/manifest.json";
import type { ItemCatalogManifest, SealedItem } from "./types";
import { isItemCatalogManifest, parseItemCatalog } from "./validation";

const catalog = parseItemCatalog([
  ...parseItemCatalog(catalogData),
  ...parseItemCatalog(catalogFr),
  ...parseItemCatalog(catalogEn),
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
