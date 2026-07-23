import type { CollectionMap } from "./types";

//
// 💾 STORAGE ENGINE
//

const FAV_KEY = "king_tcg_favs";
const COLLECTION_KEY = "king_tcg_collection";
const COLLECTION_INFO_KEY = "king_tcg_collection_infos";

//
// 🔄 SYNCHRONISATION APP
//

function notifyStorageUpdate() {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new Event("king_tcg_update")
  );
}

//
// ❤️ FAVORIS
//

export function getFavorites(): string[] {
  if (typeof window === "undefined") return [];

  try {
    return JSON.parse(
      localStorage.getItem(FAV_KEY) || "[]"
    );
  } catch {
    return [];
  }
}

export function isFavorite(id: string): boolean {
  return getFavorites().includes(id);
}

export function toggleFavorite(id: string): string[] {
  if (typeof window === "undefined") return [];

  const favs = getFavorites();

  const updated = favs.includes(id)
    ? favs.filter((f) => f !== id)
    : [...favs, id];

  localStorage.setItem(
    FAV_KEY,
    JSON.stringify(updated)
  );

  notifyStorageUpdate();

  return updated;
}

//
// 📦 COLLECTION
//

export function getCollection(): CollectionMap {
  if (typeof window === "undefined") return {};

  try {
    return JSON.parse(
      localStorage.getItem(COLLECTION_KEY) || "{}"
    );
  } catch {
    return {};
  }
}

export function setCollection(
  collection: CollectionMap
): CollectionMap {
  if (typeof window === "undefined") return {};

  localStorage.setItem(
    COLLECTION_KEY,
    JSON.stringify(collection)
  );

  notifyStorageUpdate();

  return collection;
}

export function addToCollection(id: string): CollectionMap {
  if (typeof window === "undefined") return {};

  const col = getCollection();

  col[id] = (col[id] || 0) + 1;

  localStorage.setItem(
    COLLECTION_KEY,
    JSON.stringify(col)
  );

  ensureCollectionInfo(id);

  notifyStorageUpdate();

  return col;
}

export function getCardQuantity(id: string): number {
  return getCollection()[id] || 0;
}

export function removeFromCollection(id: string): CollectionMap {
  if (typeof window === "undefined") return {};

  const col = getCollection();

  if (!col[id]) {
    return col;
  }

  col[id]--;

  if (col[id] <= 0) {
    delete col[id];
    
    // Nettoyage optionnel des infos pour éviter les données fantômes
    const infos = getCollectionInfos();
    if (infos[id]) {
      delete infos[id];
      saveCollectionInfos(infos);
    }
  }

  localStorage.setItem(
    COLLECTION_KEY,
    JSON.stringify(col)
  );

  notifyStorageUpdate();

  return col;
}

//
// 📊 INFOS COLLECTION
//

export type CollectionInfo = {
  buyPrice: number;
  condition: string;
  createdAt: string;
};

function getCollectionInfos(): Record<string, CollectionInfo> {
  if (typeof window === "undefined") return {};

  try {
    return JSON.parse(
      localStorage.getItem(COLLECTION_INFO_KEY) || "{}"
    );
  } catch {
    return {};
  }
}

function saveCollectionInfos(
  infos: Record<string, CollectionInfo>
) {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    COLLECTION_INFO_KEY,
    JSON.stringify(infos)
  );
}

function ensureCollectionInfo(id: string) {
  const infos = getCollectionInfos();

  if (!infos[id]) {
    infos[id] = {
      buyPrice: 0,
      condition: "Near Mint",
      createdAt: new Date().toISOString(),
    };

    saveCollectionInfos(infos);
  }
}

export function getCollectionInfo(id: string): CollectionInfo {
  ensureCollectionInfo(id);

  return getCollectionInfos()[id];
}

export function setBuyPrice(
  id: string,
  price: number
) {
  const infos = getCollectionInfos();

  ensureCollectionInfo(id);

  infos[id] = {
    ...infos[id],
    buyPrice: Math.max(0, price), // Sécurité pour empêcher un prix négatif
  };

  saveCollectionInfos(infos);

  notifyStorageUpdate();
}

export function getBuyPrice(
  id: string
): number {
  return getCollectionInfo(id).buyPrice;
}

export function setCondition(
  id: string,
  condition: string
) {
  const infos = getCollectionInfos();

  ensureCollectionInfo(id);

  infos[id] = {
    ...infos[id],
    condition,
  };

  saveCollectionInfos(infos);

  notifyStorageUpdate();
}

export function getCondition(
  id: string
): string {
  return getCollectionInfo(id).condition;
}

export function getPurchaseDate(
  id: string
): string {
  return getCollectionInfo(id).createdAt;
}