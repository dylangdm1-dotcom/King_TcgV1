export interface CardTraderApiStatus {
  configured: boolean;
  state: "ready" | "configuration_required";
  publicLimit: number;
  internalLimit: number;
  windowMs: number;
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
  editable_properties?: Array<{
    name: string;
    type: string;
    default_value?: unknown;
    possible_values?: unknown[];
  }>;
}
