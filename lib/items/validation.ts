import { ITEM_CATEGORIES, ITEM_LANGUAGES } from "./categories";
import type { ItemCatalogManifest, SealedItem } from "./types";

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function isSealedItem(value: unknown): value is SealedItem {
  if (!isObject(value)) return false;
  if (typeof value.id !== "string" || !value.id.trim()) return false;
  if (typeof value.slug !== "string" || !value.slug.trim()) return false;
  if (typeof value.name !== "string" || !value.name.trim()) return false;
  if (!ITEM_CATEGORIES.includes(value.category as SealedItem["category"])) return false;
  if (!ITEM_LANGUAGES.includes(value.language as SealedItem["language"])) return false;
  if (!Array.isArray(value.sources)) return false;
  return value.catalogStatus === "verified" || value.catalogStatus === "partial" || value.catalogStatus === "user_created";
}

export function parseItemCatalog(value: unknown): SealedItem[] {
  if (!Array.isArray(value)) return [];
  const ids = new Set<string>();
  return value.filter((item): item is SealedItem => {
    if (!isSealedItem(item) || ids.has(item.id)) return false;
    ids.add(item.id);
    return true;
  });
}

export function isItemCatalogManifest(value: unknown): value is ItemCatalogManifest {
  if (!isObject(value)) return false;
  return value.schemaVersion === 1 &&
    value.access === "premium_or_pro" &&
    Number.isInteger(value.itemCount) &&
    Number.isInteger(value.verifiedItemCount) &&
    Array.isArray(value.languages) &&
    Array.isArray(value.categories) &&
    isObject(value.files);
}
