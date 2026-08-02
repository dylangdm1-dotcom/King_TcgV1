// lib/storage.ts

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
    const parsed = JSON.parse(localStorage.getItem(FAV_KEY) || "[]");
    return Array.isArray(parsed)
      ? parsed.filter((id): id is string => typeof id === "string")
      : [];
  } catch {
    return [];
  }
}

export function isFavorite(id: string): boolean {
  if (!id) return false;
  return getFavorites().includes(id);
}

export function toggleFavorite(id: string): string[] {
  if (typeof window === "undefined" || !id) return [];

  const favs = getFavorites();

  const updated = favs.includes(id)
    ? favs.filter((f) => f !== id)
    : [...favs, id];

  try {
    localStorage.setItem(FAV_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error("[King_TCG] Impossible de sauvegarder les favoris :", error);
  }

  notifyStorageUpdate();

  return updated;
}

//
// 📦 COLLECTION
//

export function getCollection(): CollectionMap {
  if (typeof window === "undefined") return {};

  try {
    const parsed = JSON.parse(localStorage.getItem(COLLECTION_KEY) || "{}");

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }

    return parsed as CollectionMap;
  } catch {
    return {};
  }
}

export function setCollection(collection: CollectionMap): CollectionMap {
  if (typeof window === "undefined") return {};

  try {
    localStorage.setItem(COLLECTION_KEY, JSON.stringify(collection));
  } catch (error) {
    console.error("[King_TCG] Impossible de sauvegarder la collection :", error);
  }

  notifyStorageUpdate();

  return collection;
}

export function addToCollection(id: string): CollectionMap {
  if (typeof window === "undefined" || !id) return {};

  const col = getCollection();
  const currentEntry = col[id];

  const currentQty =
    typeof currentEntry === "number"
      ? currentEntry
      : Number((currentEntry as any)?.quantity || 0);

  col[id] = Math.max(0, currentQty) + 1;

  try {
    localStorage.setItem(COLLECTION_KEY, JSON.stringify(col));
  } catch (error) {
    console.error("[King_TCG] Impossible d'ajouter la carte :", error);
  }

  ensureCollectionInfo(id);

  notifyStorageUpdate();

  return col;
}

export function getCardQuantity(id: string): number {
  if (!id) return 0;

  const entry = getCollection()[id];

  if (!entry) return 0;

  const quantity =
    typeof entry === "number"
      ? entry
      : Number((entry as any)?.quantity || 0);

  return Math.max(0, quantity);
}

export function removeFromCollection(id: string): CollectionMap {
  if (typeof window === "undefined" || !id) return {};

  const col = getCollection();
  const currentEntry = col[id];

  if (!currentEntry) {
    return col;
  }

  let currentQty =
    typeof currentEntry === "number"
      ? currentEntry
      : Number((currentEntry as any)?.quantity || 0);

  currentQty--;

  if (currentQty <= 0) {
    delete col[id];

    // Nettoyage des informations associées
    const infos = getCollectionInfos();

    if (infos[id]) {
      delete infos[id];
      saveCollectionInfos(infos);
    }
  } else {
    if (typeof currentEntry === "number") {
      col[id] = currentQty;
    } else {
      col[id] = {
        ...(currentEntry as any),
        quantity: currentQty,
      } as any;
    }
  }

  try {
    localStorage.setItem(COLLECTION_KEY, JSON.stringify(col));
  } catch (error) {
    console.error("[King_TCG] Impossible de modifier la collection :", error);
  }

  notifyStorageUpdate();

  return col;
}

//
// 📊 INFOS COLLECTION
// Prix d'achat / état / date d'ajout
//

export type CollectionInfo = {
  buyPrice: number;
  condition: string;
  createdAt: string;
};

function getCollectionInfos(): Record<string, CollectionInfo> {
  if (typeof window === "undefined") return {};

  try {
    const parsed = JSON.parse(
      localStorage.getItem(COLLECTION_INFO_KEY) || "{}"
    );

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }

    return parsed as Record<string, CollectionInfo>;
  } catch {
    return {};
  }
}

function saveCollectionInfos(
  infos: Record<string, CollectionInfo>
): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(
      COLLECTION_INFO_KEY,
      JSON.stringify(infos)
    );
  } catch (error) {
    console.error(
      "[King_TCG] Impossible de sauvegarder les infos collection :",
      error
    );
  }
}

function ensureCollectionInfo(id: string): CollectionInfo | null {
  if (typeof window === "undefined" || !id) return null;

  const infos = getCollectionInfos();

  if (!infos[id]) {
    infos[id] = {
      buyPrice: 0,
      condition: "Near Mint",
      createdAt: new Date().toISOString(),
    };

    saveCollectionInfos(infos);
  }

  return infos[id];
}

export function getCollectionInfo(id: string): CollectionInfo {
  if (!id) {
    return {
      buyPrice: 0,
      condition: "Near Mint",
      createdAt: "",
    };
  }

  const infos = getCollectionInfos();

  if (!infos[id]) {
    const created = ensureCollectionInfo(id);

    return (
      created ?? {
        buyPrice: 0,
        condition: "Near Mint",
        createdAt: "",
      }
    );
  }

  return {
    buyPrice:
      typeof infos[id].buyPrice === "number"
        ? Math.max(0, infos[id].buyPrice)
        : 0,
    condition: infos[id].condition || "Near Mint",
    createdAt: infos[id].createdAt || "",
  };
}

export function setBuyPrice(
  id: string,
  price: number
): void {
  if (typeof window === "undefined" || !id) return;

  // IMPORTANT :
  // On récupère les infos APRÈS ensureCollectionInfo()
  // pour ne jamais perdre condition / createdAt.
  ensureCollectionInfo(id);

  const infos = getCollectionInfos();

  const current = infos[id] ?? {
    buyPrice: 0,
    condition: "Near Mint",
    createdAt: new Date().toISOString(),
  };

  infos[id] = {
    ...current,
    buyPrice:
      typeof price === "number" && Number.isFinite(price)
        ? Math.max(0, price)
        : 0,
  };

  saveCollectionInfos(infos);

  notifyStorageUpdate();
}

export function getBuyPrice(id: string): number {
  return getCollectionInfo(id).buyPrice;
}

export function setCondition(
  id: string,
  condition: string
): void {
  if (typeof window === "undefined" || !id) return;

  ensureCollectionInfo(id);

  const infos = getCollectionInfos();

  const current = infos[id] ?? {
    buyPrice: 0,
    condition: "Near Mint",
    createdAt: new Date().toISOString(),
  };

  infos[id] = {
    ...current,
    condition: condition?.trim() || "Near Mint",
  };

  saveCollectionInfos(infos);

  notifyStorageUpdate();
}

export function getCondition(id: string): string {
  return getCollectionInfo(id).condition || "Near Mint";
}

export function getPurchaseDate(id: string): string {
  return getCollectionInfo(id).createdAt;
}

export function getTotalInvestment(): number {
  const col = getCollection();
  const infos = getCollectionInfos();

  return Object.keys(col).reduce((total, id) => {
    const entry = col[id];

    const qty =
      typeof entry === "number"
        ? entry
        : Number((entry as any)?.quantity || 0);

    const price =
      typeof infos[id]?.buyPrice === "number"
        ? Math.max(0, infos[id].buyPrice)
        : 0;

    return total + price * Math.max(0, qty);
  }, 0);
}

//
// 📤 EXPORT / IMPORT / BACKUP
//

export type BackupData = {
  version: "3.9";
  exportedAt: string;
  favorites: string[];
  collection: CollectionMap;
  collectionInfos: Record<string, CollectionInfo>;
};

/**
 * Exporte toutes les données utilisateur
 */
export function exportBackup(): void {
  if (typeof window === "undefined") return;

  const data: BackupData = {
    version: "3.9",
    exportedAt: new Date().toISOString(),
    favorites: getFavorites(),
    collection: getCollection(),
    collectionInfos: getCollectionInfos(),
  };

  const blob = new Blob(
    [JSON.stringify(data, null, 2)],
    {
      type: "application/json",
    }
  );

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");

  a.href = url;
  a.download = `king_tcg_backup_${
    new Date().toISOString().split("T")[0]
  }.json`;

  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
}

/**
 * Importe et fusionne ou remplace les données
 */
export function importBackup(
  jsonString: string,
  mode: "merge" | "overwrite" = "merge"
): boolean {
  if (typeof window === "undefined") return false;

  try {
    const parsed = JSON.parse(jsonString) as Partial<BackupData>;

    if (
      !parsed ||
      !parsed.collection ||
      typeof parsed.collection !== "object" ||
      Array.isArray(parsed.collection)
    ) {
      throw new Error("Format de fichier invalide");
    }

    const importedFavorites = Array.isArray(parsed.favorites)
      ? parsed.favorites.filter(
          (id): id is string => typeof id === "string"
        )
      : [];

    const importedInfos =
      parsed.collectionInfos &&
      typeof parsed.collectionInfos === "object" &&
      !Array.isArray(parsed.collectionInfos)
        ? parsed.collectionInfos
        : {};

    if (mode === "overwrite") {
      localStorage.setItem(
        FAV_KEY,
        JSON.stringify(importedFavorites)
      );

      localStorage.setItem(
        COLLECTION_KEY,
        JSON.stringify(parsed.collection)
      );

      localStorage.setItem(
        COLLECTION_INFO_KEY,
        JSON.stringify(importedInfos)
      );
    } else {
      //
      // ❤️ FAVORIS
      //

      const currentFavs = getFavorites();

      const newFavs = Array.from(
        new Set([
          ...currentFavs,
          ...importedFavorites,
        ])
      );

      localStorage.setItem(
        FAV_KEY,
        JSON.stringify(newFavs)
      );

      //
      // 📦 COLLECTION
      //

      const currentCol = getCollection();

      const mergedCol: CollectionMap = {
        ...currentCol,
      };

      Object.entries(parsed.collection).forEach(
        ([id, qty]) => {
          const parsedQty =
            typeof qty === "number"
              ? qty
              : Number((qty as any)?.quantity || 1);

          const existingEntry = mergedCol[id];

          const existingQty =
            typeof existingEntry === "number"
              ? existingEntry
              : Number(
                  (existingEntry as any)?.quantity || 0
                );

          const safeParsedQty = Math.max(
            0,
            parsedQty
          );

          const safeExistingQty = Math.max(
            0,
            existingQty
          );

          mergedCol[id] =
            safeExistingQty + safeParsedQty;
        }
      );

      localStorage.setItem(
        COLLECTION_KEY,
        JSON.stringify(mergedCol)
      );

      //
      // 📊 INFOS COLLECTION
      //

      const currentInfos = getCollectionInfos();

      const mergedInfos: Record<
        string,
        CollectionInfo
      > = {
        ...currentInfos,
        ...(importedInfos as Record<
          string,
          CollectionInfo
        >),
      };

      localStorage.setItem(
        COLLECTION_INFO_KEY,
        JSON.stringify(mergedInfos)
      );
    }

    notifyStorageUpdate();

    return true;
  } catch (error) {
    console.error(
      "[King_TCG] Erreur lors de l'importation :",
      error
    );

    return false;
  }
}

//
// 🧹 RESET COMPLET
//

export function clearAllData(): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.removeItem(FAV_KEY);
    localStorage.removeItem(COLLECTION_KEY);
    localStorage.removeItem(COLLECTION_INFO_KEY);
  } catch (error) {
    console.error(
      "[King_TCG] Impossible de supprimer les données :",
      error
    );
  }

  notifyStorageUpdate();
}
export function getQuantity(id: string): number {
  const collection = getCollection();
  const entry = collection?.[id];

  if (typeof entry === "number") {
    return Math.max(0, entry);
  }

  const objectEntry = entry as
    | { quantity?: unknown }
    | null
    | undefined;

  if (
    objectEntry &&
    typeof objectEntry.quantity === "number"
  ) {
    return Math.max(0, objectEntry.quantity);
  }

  return 0;
}