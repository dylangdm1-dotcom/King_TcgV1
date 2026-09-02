import type { ItemCollectionMap, SealedItem } from "./types";

export function itemCatalogStats(items: SealedItem[]) {
  return {
    total: items.length,
    verified: items.filter((item) => item.catalogStatus === "verified").length,
    personal: items.filter((item) => item.catalogStatus === "user_created").length,
    withCurrentPrice: items.filter((item) => item.quotes?.some((quote) => quote.kind === "current_market")).length,
    withImage: items.filter((item) => Boolean(item.images?.small || item.images?.large || item.imageCandidates?.length)).length,
  };
}

export function itemCollectionStats(collection: ItemCollectionMap) {
  const entries = Object.values(collection);
  return {
    references: entries.length,
    units: entries.reduce((sum, entry) => sum + Math.max(0, entry.quantity || 0), 0),
    invested: entries.reduce((sum, entry) => sum + Math.max(0, entry.buyPrice || 0) * Math.max(0, entry.quantity || 0), 0),
  };
}
