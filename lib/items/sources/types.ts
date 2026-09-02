export type ItemSourcePurpose = "identity" | "official_retail" | "current_market" | "image";
export type ItemSourceState = "research_required" | "api_required" | "ready" | "disabled";

export interface ItemSourceDescriptor {
  id: string;
  label: string;
  purposes: ItemSourcePurpose[];
  state: ItemSourceState;
  requiresApiKey: boolean;
  canHotlinkImages: boolean;
  persistenceAllowed: boolean;
  notes: string;
}
