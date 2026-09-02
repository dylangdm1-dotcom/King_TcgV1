import type { ItemSourceDescriptor } from "./types";

export const ITEM_SOURCE_REGISTRY: ItemSourceDescriptor[] = [
  {
    id: "official-retail",
    label: "Source Pokémon officielle à valider",
    purposes: ["identity", "official_retail"],
    state: "research_required",
    requiresApiKey: false,
    canHotlinkImages: false,
    persistenceAllowed: false,
    notes: "Aucune ingestion automatisée avant validation des conditions de réutilisation.",
  },
  {
    id: "tcgcsv-tcgplayer",
    label: "TCGCSV · données marché TCGplayer",
    purposes: ["identity", "current_market", "image"],
    state: "ready",
    requiresApiKey: false,
    canHotlinkImages: false,
    persistenceAllowed: true,
    notes: "Synchronisation serveur quotidienne maximum, marché EN/US, prix USD et visuels servis par le proxy cache King_TCG.",
  },
  {
    id: "cardtrader",
    label: "CardTrader · futur catalogue scellé FR",
    purposes: ["identity", "current_market", "image"],
    state: "api_required",
    requiresApiKey: true,
    canHotlinkImages: false,
    persistenceAllowed: true,
    rateLimit: { requests: 200, windowMs: 10_000, internalLimit: 180 },
    notes: "Connecteur serveur V290 prêt. Import FR différé jusqu’à configuration et validation d’un échantillon réel.",
  },
];

export function activeItemSources(): ItemSourceDescriptor[] {
  return ITEM_SOURCE_REGISTRY.filter((source) => source.state === "ready");
}
