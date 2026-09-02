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
    purposes: ["identity", "current_market"],
    state: "ready",
    requiresApiKey: false,
    canHotlinkImages: false,
    persistenceAllowed: true,
    notes: "Synchronisation serveur quotidienne maximum, marché EN/US et prix USD.",
  },
];

export function activeItemSources(): ItemSourceDescriptor[] {
  return ITEM_SOURCE_REGISTRY.filter((source) => source.state === "ready");
}
