import type { ItemCategory, ItemLanguage } from "./types";
import { normalizeItemText } from "./normalize";

export function slugifyItem(value: string): string {
  return normalizeItemText(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96) || "item";
}

export function createCustomItemId(
  name: string,
  category: ItemCategory,
  language: ItemLanguage
): string {
  const base = slugifyItem(`${language}-${category}-${name}`);
  const stamp = Date.now().toString(36);
  return `ktcg:item:custom:${base}:${stamp}`;
}

export function encodeItemRouteId(id: string): string {
  return encodeURIComponent(id);
}
