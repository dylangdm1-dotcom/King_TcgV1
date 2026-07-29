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

  window.dispatchEvent(new Event("king_tcg_update"));
  window.dispatchEvent(new Event("storage_collection_update"));
  window.dispatchEvent(new Event("storage_favorites_update"));
}

//
// ❤️ FAVORIS
//

export function getFavorites(): string[] {
  if (typeof window === "undefined") return [];

  try {
    return JSON.parse(localStorage.getItem(FAV_KEY) || "[]");
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

  localStorage.setItem(FAV_KEY, JSON.stringify(updated));

  notifyStorageUpdate();

  return updated;
}

//
// 📦 COLLECTION
//

export function getCollection(): CollectionMap {
  if (typeof window === "undefined") return {};

  try {
    return JSON.parse(localStorage.getItem(COLLECTION_KEY) || "{}");
  } catch {
    return {};
  }
}

export function setCollection(collection: CollectionMap): CollectionMap {
  if (typeof window === "undefined") return {};

  localStorage.setItem(COLLECTION_KEY, JSON.stringify(collection));

  notifyStorageUpdate();

  return collection;
}

export function addToCollection(id: string): CollectionMap {
  if (typeof window === "undefined") return {};

  const col = getCollection();

  col[id] = (col[id] || 0) + 1;

  localStorage.setItem(COLLECTION_KEY, JSON.stringify(col));

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

  localStorage.setItem(COLLECTION_KEY, JSON.stringify(col));

  notifyStorageUpdate();

  return col;
}

//
// 📊 INFOS COLLECTION (PRIX D'ACHAT, ÉTAT, DATE)
//

export type CollectionInfo = {
  buyPrice: number;
  condition: string;
  createdAt: string;
};

function getCollectionInfos(): Record<string, CollectionInfo> {
  if (typeof window === "undefined") return {};

  try {
    return JSON.parse(localStorage.getItem(COLLECTION_INFO_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveCollectionInfos(infos: Record<string, CollectionInfo>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(COLLECTION_INFO_KEY, JSON.stringify(infos));
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

export function setBuyPrice(id: string, price: number) {
  const infos = getCollectionInfos();

  ensureCollectionInfo(id);

  infos[id] = {
    ...infos[id],
    buyPrice: Math.max(0, price), // Sécurité pour empêcher un prix négatif
  };

  saveCollectionInfos(infos);

  notifyStorageUpdate();
}

export function getBuyPrice(id: string): number {
  return getCollectionInfo(id).buyPrice;
}

export function setCondition(id: string, condition: string) {
  const infos = getCollectionInfos();

  ensureCollectionInfo(id);

  infos[id] = {
    ...infos[id],
    condition,
  };

  saveCollectionInfos(infos);

  notifyStorageUpdate();
}

export function getCondition(id: string): string {
  return getCondition(id) ? getCollectionInfo(id).condition : "Near Mint";
}

export function getPurchaseDate(id: string): string {
  return getCollectionInfo(id).createdAt;
}

export function getTotalInvestment(): number {
  const col = getCollection();
  const infos = getCollectionInfos();

  return Object.keys(col).reduce((total, id) => {
    const qty = col[id] || 0;
    const price = infos[id]?.buyPrice || 0;
    return total + price * qty;
  }, 0);
}

//
// 📤 EXPORT, IMPORT & BACKUP (V3.9)
//

export type BackupData = {
  version: "3.9";
  exportedAt: string;
  favorites: string[];
  collection: CollectionMap;
  collectionInfos: Record<string, CollectionInfo>;
};

/**
 * Exporte toutes les données utilisateur sous forme de fichier JSON téléchargeable
 */
export function exportBackup() {
  if (typeof window === "undefined") return;

  const data: BackupData = {
    version: "3.9",
    exportedAt: new Date().toISOString(),
    favorites: getFavorites(),
    collection: getCollection(),
    collectionInfos: getCollectionInfos(),
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `king_tcg_backup_${new Date().toISOString().split("T")[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Importe et fusionne (ou remplace) des données depuis un fichier JSON
 */
export function importBackup(
  jsonString: string,
  mode: "merge" | "overwrite" = "merge"
): boolean {
  if (typeof window === "undefined") return false;

  try {
    const parsed: BackupData = JSON.parse(jsonString);

    if (!parsed.collection || typeof parsed.collection !== "object") {
      throw new Error("Format de fichier invalide");
    }

    if (mode === "overwrite") {
      localStorage.setItem(FAV_KEY, JSON.stringify(parsed.favorites || []));
      localStorage.setItem(
        COLLECTION_KEY,
        JSON.stringify(parsed.collection || {})
      );
      localStorage.setItem(
        COLLECTION_INFO_KEY,
        JSON.stringify(parsed.collectionInfos || {})
      );
    } else {
      // Mode MERGE (Fusion)
      const currentFavs = getFavorites();
      const newFavs = Array.from(
        new Set([...currentFavs, ...(parsed.favorites || [])])
      );
      localStorage.setItem(FAV_KEY, JSON.stringify(newFavs));

      const currentCol = getCollection();
      const mergedCol = { ...currentCol };
      Object.entries(parsed.collection || {}).forEach(([id, qty]) => {
        mergedCol[id] = (mergedCol[id] || 0) + qty;
      });
      localStorage.setItem(COLLECTION_KEY, JSON.stringify(mergedCol));

      const currentInfos = getCollectionInfos();
      const mergedInfos = {
        ...currentInfos,
        ...(parsed.collectionInfos || {}),
      };
      localStorage.setItem(
        COLLECTION_INFO_KEY,
        JSON.stringify(mergedInfos)
      );
    }

    notifyStorageUpdate();
    return true;
  } catch (error) {
    console.error("[King_TCG] Erreur lors de l'importation :", error);
    return false;
  }
}

/**
 * Réinitialise complètement les données utilisateur
 */
export function clearAllData() {
  if (typeof window === "undefined") return;

  localStorage.removeItem(FAV_KEY);
  localStorage.removeItem(COLLECTION_KEY);
  localStorage.removeItem(COLLECTION_INFO_KEY);

  notifyStorageUpdate();
}
