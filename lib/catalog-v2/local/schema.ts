import { z } from "zod";

import {
  CATALOG_SCHEMA_VERSION,
  CatalogCardV2Schema,
  CatalogCoverageBasisV2Schema,
  CatalogLanguageV2Schema,
  CatalogSeriesV2Schema,
  CatalogSetGroupV2Schema,
  CatalogSetV2Schema,
} from "../schema";

export const CATALOG_LOCAL_FORMAT_VERSION = 1 as const;

export const CatalogLocalCoverageStatusV2Schema = z.enum([
  "complete",
  "partial",
  "metadata_only",
  "announced",
]);
export type CatalogLocalCoverageStatusV2 = z.infer<typeof CatalogLocalCoverageStatusV2Schema>;

export const CatalogLocalFileV2Schema = z.object({
  path: z.string().trim().min(1).max(512).refine((value) => {
    return !value.startsWith("/") && !value.split("/").includes("..");
  }, "Le chemin local doit rester relatif au catalogue."),
  bytes: z.number().int().nonnegative(),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
});
export type CatalogLocalFileV2 = z.infer<typeof CatalogLocalFileV2Schema>;

export const CatalogLocalSetManifestV2Schema = z.object({
  setId: z.string().trim().min(1).max(240),
  code: z.string().trim().min(1).max(80),
  name: z.string().trim().min(1).max(240),
  status: CatalogLocalCoverageStatusV2Schema,
  cardCount: z.number().int().nonnegative(),
  identityCount: z.number().int().nonnegative().optional(),
  providerPrintCount: z.number().int().nonnegative().optional(),
  coverageBasis: CatalogCoverageBasisV2Schema.optional(),
  sourceCardCount: z.number().int().nonnegative().optional(),
  officialCardCount: z.number().int().nonnegative().optional(),
  cards: CatalogLocalFileV2Schema.optional(),
});
export type CatalogLocalSetManifestV2 = z.infer<typeof CatalogLocalSetManifestV2Schema>;

export const CatalogLocalLanguageStatsV2Schema = z.object({
  series: z.number().int().nonnegative(),
  sets: z.number().int().nonnegative(),
  groups: z.number().int().nonnegative(),
  cards: z.number().int().nonnegative(),
  completeSets: z.number().int().nonnegative(),
  partialSets: z.number().int().nonnegative(),
  metadataOnlySets: z.number().int().nonnegative(),
  announcedSets: z.number().int().nonnegative(),
});
export type CatalogLocalLanguageStatsV2 = z.infer<typeof CatalogLocalLanguageStatsV2Schema>;

export const CatalogLocalLanguageManifestV2Schema = z.object({
  language: CatalogLanguageV2Schema,
  series: CatalogLocalFileV2Schema,
  sets: CatalogLocalFileV2Schema,
  groups: CatalogLocalFileV2Schema,
  stats: CatalogLocalLanguageStatsV2Schema,
  setEntries: z.array(CatalogLocalSetManifestV2Schema),
});
export type CatalogLocalLanguageManifestV2 = z.infer<typeof CatalogLocalLanguageManifestV2Schema>;

export const CatalogLocalRegionalSourceV2Schema = z.object({
  provider: z.enum(["tcgdex", "pokewallet"]),
  language: z.enum(["ja", "zh-tw"]),
  revision: z.string().trim().min(1).max(160),
  importedAt: z.string().datetime({ offset: true }),
  snapshotCount: z.number().int().nonnegative(),
  cardCount: z.number().int().nonnegative(),
  identityCount: z.number().int().nonnegative().optional(),
  providerPrintCount: z.number().int().nonnegative().optional(),
});
export type CatalogLocalRegionalSourceV2 = z.infer<typeof CatalogLocalRegionalSourceV2Schema>;

export const CatalogLocalManifestV2Schema = z.object({
  schemaVersion: z.literal(CATALOG_SCHEMA_VERSION),
  formatVersion: z.literal(CATALOG_LOCAL_FORMAT_VERSION),
  catalogVersion: z.string().trim().min(1).max(80),
  generatedAt: z.string().datetime({ offset: true }),
  source: z.object({
    provider: z.string().trim().min(1).max(80),
    revision: z.string().trim().min(1).max(120),
    license: z.string().trim().min(1).max(120),
  }),
  regionalSources: z.array(CatalogLocalRegionalSourceV2Schema).default([]),
  languages: z.record(CatalogLanguageV2Schema, CatalogLocalLanguageManifestV2Schema),
});
export type CatalogLocalManifestV2 = z.infer<typeof CatalogLocalManifestV2Schema>;

const CatalogLocalEnvelopeV2Schema = z.object({
  schemaVersion: z.literal(CATALOG_SCHEMA_VERSION),
  formatVersion: z.literal(CATALOG_LOCAL_FORMAT_VERSION),
  catalogVersion: z.string().trim().min(1).max(80),
  language: CatalogLanguageV2Schema,
});

export const CatalogLocalSeriesFileV2Schema = CatalogLocalEnvelopeV2Schema.extend({
  series: z.array(CatalogSeriesV2Schema),
});
export type CatalogLocalSeriesFileV2 = z.infer<typeof CatalogLocalSeriesFileV2Schema>;

export const CatalogLocalSetsFileV2Schema = CatalogLocalEnvelopeV2Schema.extend({
  sets: z.array(CatalogSetV2Schema),
});
export type CatalogLocalSetsFileV2 = z.infer<typeof CatalogLocalSetsFileV2Schema>;

export const CatalogLocalGroupsFileV2Schema = CatalogLocalEnvelopeV2Schema.extend({
  groups: z.array(CatalogSetGroupV2Schema),
});
export type CatalogLocalGroupsFileV2 = z.infer<typeof CatalogLocalGroupsFileV2Schema>;

export const CatalogLocalCardsFileV2Schema = CatalogLocalEnvelopeV2Schema.extend({
  setId: z.string().trim().min(1).max(240),
  status: CatalogLocalCoverageStatusV2Schema,
  sourceCardCount: z.number().int().nonnegative().optional(),
  identityCount: z.number().int().nonnegative().optional(),
  providerPrintCount: z.number().int().nonnegative().optional(),
  coverageBasis: CatalogCoverageBasisV2Schema.optional(),
  cards: z.array(CatalogCardV2Schema),
});
export type CatalogLocalCardsFileV2 = z.infer<typeof CatalogLocalCardsFileV2Schema>;

export interface CatalogLocalLanguageBundleV2 {
  manifest: CatalogLocalManifestV2;
  language: CatalogLocalLanguageManifestV2;
  series: CatalogLocalSeriesFileV2;
  sets: CatalogLocalSetsFileV2;
  groups: CatalogLocalGroupsFileV2;
}
