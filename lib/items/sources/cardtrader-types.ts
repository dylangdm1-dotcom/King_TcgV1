export interface CardTraderApiStatus {
  configured: boolean;
  state: "ready" | "configuration_required";
  publicLimit: number;
  internalLimit: number;
  windowMs: number;
  marketplaceMinimumIntervalMs: number;
}

export interface CardTraderGame {
  id: number;
  name: string;
  display_name: string;
}

export interface CardTraderCategory {
  id: number;
  name: string;
  game_id: number;
  properties?: CardTraderProperty[];
}

export interface CardTraderExpansion {
  id: number;
  game_id: number;
  code: string;
  name: string;
}

export interface CardTraderBlueprint {
  id: number;
  name: string;
  version?: string | null;
  game_id: number;
  category_id: number;
  expansion_id?: number | null;
  image_url?: string | null;
  card_market_ids?: number[];
  tcg_player_id?: string | null;
  editable_properties?: CardTraderProperty[];
}

export interface CardTraderProperty {
  name: string;
  type: string;
  default_value?: unknown;
  possible_values?: unknown[];
}

export interface CardTraderMoney {
  cents: number;
  currency: string;
}

export interface CardTraderMarketplaceProduct {
  id: number;
  blueprint_id: number;
  name_en?: string;
  quantity?: number;
  price?: CardTraderMoney;
  description?: string | null;
  properties_hash?: Record<string, unknown>;
  expansion?: {
    id: number;
    code?: string;
    name_en?: string;
  };
  graded?: boolean;
  on_vacation?: boolean;
  bundle_size?: number;
}

export type CardTraderMarketplaceProducts = Record<string, CardTraderMarketplaceProduct[]>;

export interface CardTraderSealedCategory {
  id: number;
  name: string;
  itemCategory: import("../types").ItemCategory;
}

export interface CardTraderFrenchItemCandidate {
  blueprintId: number;
  name: string;
  version?: string;
  categoryId: number;
  categoryName: string;
  itemCategory: import("../types").ItemCategory;
  expansionId: number;
  expansionCode: string;
  expansionName: string;
  imageUrl?: string;
  imageHost?: string;
  frenchOffers: number;
  availableQuantity: number;
  lowestEur?: number;
  languageEvidence: "marketplace_filter_fr";
  reviewRequired: true;
}
