import { normalizeItemText } from "./normalize";
import type { ItemSearchFilters, SealedItem } from "./types";

export const DEFAULT_ITEM_FILTERS: ItemSearchFilters = {
  query: "",
  // La page Items est d'abord un catalogue français. Les autres langues
  // restent accessibles volontairement depuis le sélecteur.
  language: "fr",
  category: "all",
  availability: "all",
  sort: "newest",
};

export function filterSealedItems(items: SealedItem[], filters: ItemSearchFilters): SealedItem[] {
  const query = normalizeItemText(filters.query);
  return items
    .filter((item) => {
      if (filters.language !== "all" && item.language !== filters.language) return false;
      if (filters.category !== "all" && item.category !== filters.category) return false;
      if (filters.availability === "verified" && item.catalogStatus !== "verified") return false;
      if (filters.availability === "personal" && item.catalogStatus !== "user_created") return false;
      if (!query) return true;
      const haystack = normalizeItemText([
        item.name,
        item.category,
        item.language,
        item.barcode,
        item.sku,
        ...(item.setIds || []),
      ].filter(Boolean).join(" "));
      return query.split(" ").every((token) => haystack.includes(token));
    })
    .sort((a, b) => {
      if (filters.sort === "name") return a.name.localeCompare(b.name, "fr");
      if (filters.sort === "category") return a.category.localeCompare(b.category) || a.name.localeCompare(b.name, "fr");
      return String(b.releaseDate || b.createdAt || "").localeCompare(String(a.releaseDate || a.createdAt || "")) || a.name.localeCompare(b.name, "fr");
    });
}
