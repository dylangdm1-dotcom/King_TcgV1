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
    id: "authorized-market",
    label: "API marché autorisée à sélectionner",
    purposes: ["identity", "current_market", "image"],
    state: "api_required",
    requiresApiKey: true,
    canHotlinkImages: false,
    persistenceAllowed: false,
    notes: "Coût, quotas, langues et droit de stockage à mesurer avant activation.",
  },
];

export function activeItemSources(): ItemSourceDescriptor[] {
  return ITEM_SOURCE_REGISTRY.filter((source) => source.state === "ready");
}
