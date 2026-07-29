import { getCollection, setCollection } from "./storage";
import type { CollectionMap } from "./storage"; // Assurez-vous que le type est exporté, sinon utilisez "as any"

//
// 📤 EXPORT COLLECTION
//

export function exportCollection(): string {
  const collection = getCollection();

  const data = {
    version: 1,
    date: new Date().toISOString(),
    collection,
  };

  return JSON.stringify(data, null, 2);
}

//
// 📥 IMPORT COLLECTION
//

export function importCollection(json: string): boolean {
  try {
    const parsed = JSON.parse(json);

    if (!parsed.collection || typeof parsed.collection !== "object") {
      return false;
    }

    // validation simple
    const cleaned: Record<string, any> = {};

    Object.entries(parsed.collection).forEach(([id, qty]) => {
      // Gère si la quantité importée est un nombre direct ou un objet
      const val = typeof qty === "object" && qty !== null ? (qty as any).quantity : Number(qty);
      const n = Number(val);

      if (id && n > 0) {
        // On stocke sous la forme attendue par CollectionMap (soit un nombre, soit un objet selon votre structure)
        cleaned[id] = typeof qty === "object" && qty !== null ? qty : n;
      }
    });

    setCollection(cleaned as CollectionMap);

    return true;
  } catch (e) {
    console.error("Import error:", e);
    return false;
  }
}

//
// 🧹 RESET COLLECTION
//

export function resetCollection(): void {
  setCollection({});
}
