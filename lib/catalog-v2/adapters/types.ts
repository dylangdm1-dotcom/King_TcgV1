import type {
  CatalogCardV2,
  CatalogLanguageV2,
  CatalogSeriesV2,
  CatalogSetV2,
} from "../schema";

export type CatalogProviderV2 = "tcgdex" | "pokemon_tcg_api" | "pokewallet" | "pokewallet_public";

export type CatalogImportSeverityV2 = "warning" | "error";

export interface CatalogImportIssueV2 {
  severity: CatalogImportSeverityV2;
  code: string;
  message: string;
  provider: CatalogProviderV2;
  sourceId?: string;
  entityId?: string;
}

export interface CatalogImportBatchV2 {
  provider: CatalogProviderV2;
  language: CatalogLanguageV2;
  syncedAt?: string;
  series: CatalogSeriesV2[];
  sets: CatalogSetV2[];
  cards: CatalogCardV2[];
  issues: CatalogImportIssueV2[];
}

export interface CatalogAdapterContextV2 {
  language: CatalogLanguageV2;
  syncedAt?: string;
  sourceUrl?: string;
}
