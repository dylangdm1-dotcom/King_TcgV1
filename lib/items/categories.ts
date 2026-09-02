import type { ItemCategory, ItemLanguage } from "./types";

export const ITEM_CATEGORY_LABELS: Record<ItemCategory, string> = {
  etb: "ETB",
  booster_box: "Displays",
  booster: "Boosters",
  bundle: "Bundles",
  upc: "UPC",
  collection_box: "Coffrets",
  tin: "Pokébox",
  deck: "Decks",
  special_collection: "Collections spéciales",
  other: "Autres produits",
};

export const ITEM_LANGUAGE_LABELS: Record<ItemLanguage, string> = {
  fr: "Français",
  en: "Anglais",
  ja: "Japonais",
  "zh-tw": "Chinois",
  multi: "Multilingue",
};

export const ITEM_CATEGORIES = Object.keys(ITEM_CATEGORY_LABELS) as ItemCategory[];
export const ITEM_LANGUAGES = Object.keys(ITEM_LANGUAGE_LABELS) as ItemLanguage[];

export function itemCategoryLabel(category: ItemCategory): string {
  return ITEM_CATEGORY_LABELS[category] || ITEM_CATEGORY_LABELS.other;
}

export function itemLanguageLabel(language: ItemLanguage): string {
  return ITEM_LANGUAGE_LABELS[language] || ITEM_LANGUAGE_LABELS.multi;
}
