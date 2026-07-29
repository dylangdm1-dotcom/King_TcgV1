import { getCollection, setCollection } from "./storage";

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
      const val = typeof qty === "object" && qty !== null ? (qty as any).quantity : Number(qty);
      const n = Number(val);

      if (id && n > 0) {
        cleaned[id] = typeof qty === "object" && qty !== null ? qty : n;
      }
    });

    setCollection(cleaned as any);

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
