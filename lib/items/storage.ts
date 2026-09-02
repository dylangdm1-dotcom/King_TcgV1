import { createCustomItemId, slugifyItem } from "./identity";
import { normalizeMoney, normalizeOptionalText } from "./normalize";
import type { ItemCategory, ItemCollectionEntry, ItemCollectionMap, ItemLanguage, SealedItem } from "./types";
import { isSealedItem } from "./validation";

const CUSTOM_ITEMS_KEY = "king_tcg_custom_items_v1";
const ITEM_FAVORITES_KEY = "king_tcg_item_favorites_v1";
const ITEM_COLLECTION_KEY = "king_tcg_item_collection_v1";

function notifyItems() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("king_tcg_items_update"));
  window.dispatchEvent(new Event("king_tcg_update"));
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    return JSON.parse(localStorage.getItem(key) || "") as T;
  } catch {
    return fallback;
  }
}

export function getCustomItems(): SealedItem[] {
  return readJson<unknown[]>(CUSTOM_ITEMS_KEY, []).filter(isSealedItem);
}

export function createCustomItem(input: {
  name: string;
  category: ItemCategory;
  language: ItemLanguage;
  barcode?: string;
  sku?: string;
  description?: string;
}): SealedItem {
  if (typeof window === "undefined") throw new Error("Stockage navigateur indisponible");
  const name = normalizeOptionalText(input.name, 140);
  if (!name) throw new Error("Le nom de l’item est obligatoire.");
  const id = createCustomItemId(name, input.category, input.language);
  const item: SealedItem = {
    id,
    slug: `${slugifyItem(name)}-${id.slice(-6)}`,
    name,
    category: input.category,
    language: input.language,
    barcode: normalizeOptionalText(input.barcode, 32),
    sku: normalizeOptionalText(input.sku, 64),
    description: normalizeOptionalText(input.description, 500),
    sources: [{ provider: "user" }],
    catalogStatus: "user_created",
    priceStatus: "not_connected",
    createdAt: new Date().toISOString(),
  };
  const items = [item, ...getCustomItems()];
  localStorage.setItem(CUSTOM_ITEMS_KEY, JSON.stringify(items));
  notifyItems();
  return item;
}

export function removeCustomItem(id: string): boolean {
  if (typeof window === "undefined") return false;
  const existing = getCustomItems();
  const items = existing.filter((item) => item.id !== id);
  if (items.length === existing.length) return false;
  localStorage.setItem(CUSTOM_ITEMS_KEY, JSON.stringify(items));
  const collection = getItemCollection();
  delete collection[id];
  localStorage.setItem(ITEM_COLLECTION_KEY, JSON.stringify(collection));
  localStorage.setItem(ITEM_FAVORITES_KEY, JSON.stringify(getItemFavorites().filter((itemId) => itemId !== id)));
  notifyItems();
  return true;
}

export function getItemFavorites(): string[] {
  const values = readJson<unknown[]>(ITEM_FAVORITES_KEY, []);
  return Array.from(new Set(values.filter((value): value is string => typeof value === "string" && value.length <= 180)));
}

export function isItemFavorite(id: string): boolean {
  return getItemFavorites().includes(id);
}

export function toggleItemFavorite(id: string): string[] {
  if (typeof window === "undefined") return [];
  const favorites = getItemFavorites();
  const updated = favorites.includes(id) ? favorites.filter((value) => value !== id) : [...favorites, id];
  localStorage.setItem(ITEM_FAVORITES_KEY, JSON.stringify(updated));
  notifyItems();
  return updated;
}

export function getItemCollection(): ItemCollectionMap {
  const raw = readJson<Record<string, Partial<ItemCollectionEntry>>>(ITEM_COLLECTION_KEY, {});
  return Object.entries(raw).reduce<ItemCollectionMap>((result, [id, entry]) => {
    const quantity = Math.max(0, Math.floor(Number(entry?.quantity || 0)));
    if (!quantity) return result;
    result[id] = {
      quantity,
      buyPrice: normalizeMoney(entry?.buyPrice),
      purchaseDate: normalizeOptionalText(entry?.purchaseDate, 10),
      notes: normalizeOptionalText(entry?.notes, 300),
      createdAt: normalizeOptionalText(entry?.createdAt, 40) || new Date().toISOString(),
      updatedAt: normalizeOptionalText(entry?.updatedAt, 40) || new Date().toISOString(),
    };
    return result;
  }, {});
}

export function getItemQuantity(id: string): number {
  return getItemCollection()[id]?.quantity || 0;
}

export function setItemCollectionEntry(id: string, patch: Partial<Pick<ItemCollectionEntry, "quantity" | "buyPrice" | "purchaseDate" | "notes">>): ItemCollectionMap {
  if (typeof window === "undefined") return {};
  const collection = getItemCollection();
  const previous = collection[id];
  const quantity = Math.max(0, Math.floor(Number(patch.quantity ?? previous?.quantity ?? 0)));
  if (!quantity) {
    delete collection[id];
  } else {
    const now = new Date().toISOString();
    collection[id] = {
      quantity,
      buyPrice: normalizeMoney(patch.buyPrice ?? previous?.buyPrice),
      purchaseDate: normalizeOptionalText(patch.purchaseDate ?? previous?.purchaseDate, 10),
      notes: normalizeOptionalText(patch.notes ?? previous?.notes, 300),
      createdAt: previous?.createdAt || now,
      updatedAt: now,
    };
  }
  localStorage.setItem(ITEM_COLLECTION_KEY, JSON.stringify(collection));
  notifyItems();
  return collection;
}

export function addItemToCollection(id: string): ItemCollectionMap {
  return setItemCollectionEntry(id, { quantity: getItemQuantity(id) + 1 });
}

export function removeItemFromCollection(id: string): ItemCollectionMap {
  return setItemCollectionEntry(id, { quantity: Math.max(0, getItemQuantity(id) - 1) });
}

export function findCustomItem(idOrSlug: string): SealedItem | null {
  return getCustomItems().find((item) => item.id === idOrSlug || item.slug === idOrSlug) || null;
}
