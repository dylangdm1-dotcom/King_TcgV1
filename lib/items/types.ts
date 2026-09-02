export type ItemLanguage = "fr" | "en" | "ja" | "zh-tw" | "multi";

export type ItemCategory =
  | "etb"
  | "booster_box"
  | "booster"
  | "bundle"
  | "upc"
  | "collection_box"
  | "tin"
  | "deck"
  | "special_collection"
  | "other";

export type ItemCatalogStatus = "verified" | "partial" | "user_created";
export type ItemPriceStatus = "available" | "not_connected" | "not_listed";

export interface SealedItemSource {
  provider: string;
  url?: string;
  reference?: string;
  verifiedAt?: string;
}

export interface SealedItemImage {
  small?: string;
  large?: string;
  source?: string;
}

export interface SealedItemPriceQuote {
  source: string;
  amount: number;
  currency: "EUR" | "USD" | "JPY" | "CNY";
  kind: "official_retail" | "current_market";
  updatedAt: string;
  url?: string;
}

export interface SealedItem {
  id: string;
  slug: string;
  name: string;
  category: ItemCategory;
  language: ItemLanguage;
  releaseDate?: string;
  setIds?: string[];
  barcode?: string;
  sku?: string;
  description?: string;
  contents?: string[];
  images?: SealedItemImage;
  imageCandidates?: string[];
  sources: SealedItemSource[];
  catalogStatus: ItemCatalogStatus;
  priceStatus: ItemPriceStatus;
  quotes?: SealedItemPriceQuote[];
  createdAt?: string;
}

export interface ItemCatalogManifest {
  schemaVersion: 1;
  catalogVersion: string;
  access: "premium_or_pro";
  itemCount: number;
  verifiedItemCount: number;
  priceCoverage: number;
  priceQuoteCount?: number;
  imageCount?: number;
  languageStatus?: Partial<Record<ItemLanguage, {
    state: "ready" | "preparation" | "future";
    itemCount: number;
    imageCount: number;
    quoteCount: number;
    note?: string;
  }>>;
  languages: ItemLanguage[];
  categories: ItemCategory[];
  files: {
    catalog: string;
    categories: string;
    sources: string;
    languageCatalogs: Record<ItemLanguage, string>;
  };
}

export interface ItemCollectionEntry {
  quantity: number;
  buyPrice: number;
  purchaseDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type ItemCollectionMap = Record<string, ItemCollectionEntry>;

export interface ItemSearchFilters {
  query: string;
  language: ItemLanguage | "all";
  category: ItemCategory | "all";
  availability: "all" | "verified" | "personal";
  sort: "newest" | "name" | "category";
}
