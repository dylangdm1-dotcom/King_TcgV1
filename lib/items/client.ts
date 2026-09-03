import type { ItemCatalogManifest, ItemCatalogRuntime, ItemSourceStatus, SealedItem } from "./types";

export async function fetchItemCatalog(signal?: AbortSignal): Promise<{ items: SealedItem[]; manifest: ItemCatalogManifest | null; runtime: ItemCatalogRuntime | null }> {
  try {
    const response = await fetch("/api/items/catalog", { signal, cache: "no-store" });
    if (!response.ok) return { items: [], manifest: null, runtime: null };
    const json = await response.json();
    return {
      items: Array.isArray(json?.data) ? json.data : [],
      manifest: json?.manifest || null,
      runtime: json?.runtime || null,
    };
  } catch {
    return { items: [], manifest: null, runtime: null };
  }
}

export async function fetchItemById(id: string, signal?: AbortSignal): Promise<SealedItem | null> {
  try {
    const response = await fetch(`/api/items/${encodeURIComponent(id)}`, { signal, cache: "no-store" });
    if (!response.ok) return null;
    const json = await response.json();
    return json?.data || null;
  } catch {
    return null;
  }
}

export async function fetchItemSourceStatus(signal?: AbortSignal): Promise<ItemSourceStatus> {
  try {
    const response = await fetch("/api/items/sources", { signal, cache: "no-store" });
    if (!response.ok) return { cardtrader: null };
    const json = await response.json();
    return { cardtrader: json?.cardtrader || null };
  } catch {
    return { cardtrader: null };
  }
}
