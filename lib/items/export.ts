import { itemCategoryLabel, itemLanguageLabel } from "./categories";
import type { ItemCollectionMap, SealedItem } from "./types";

function csvCell(value: unknown): string {
  const text = String(value ?? "").replace(/\r?\n/g, " ");
  return `"${text.replace(/"/g, '""')}"`;
}

export function buildItemCollectionCsv(items: SealedItem[], collection: ItemCollectionMap): string {
  const header = ["Nom", "Catégorie", "Langue", "Quantité", "Prix d'achat unitaire", "Date d'achat", "Code-barres", "SKU", "Notes"];
  const rows = items
    .filter((item) => collection[item.id])
    .map((item) => {
      const entry = collection[item.id];
      return [
        item.name,
        itemCategoryLabel(item.category),
        itemLanguageLabel(item.language),
        entry.quantity,
        entry.buyPrice.toFixed(2),
        entry.purchaseDate || "",
        item.barcode || "",
        item.sku || "",
        entry.notes || "",
      ];
    });
  return [header, ...rows].map((row) => row.map(csvCell).join(";")).join("\n");
}

export function downloadItemCollectionCsv(items: SealedItem[], collection: ItemCollectionMap) {
  if (typeof window === "undefined") return;
  const blob = new Blob(["\uFEFF", buildItemCollectionCsv(items, collection)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "king-tcg-items-collection.csv";
  anchor.click();
  URL.revokeObjectURL(url);
}
