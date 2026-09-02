import { z } from "zod";

export const CATALOG_SCHEMA_VERSION = 2 as const;

export const CatalogLanguageV2Schema = z.enum(["fr", "en", "ja", "zh-tw"]);
export type CatalogLanguageV2 = z.infer<typeof CatalogLanguageV2Schema>;

export const CatalogAvailabilityV2Schema = z.enum([
  "available",
  "metadata_only",
  "announced",
  "unknown",
]);
export type CatalogAvailabilityV2 = z.infer<typeof CatalogAvailabilityV2Schema>;

export const CatalogCoverageBasisV2Schema = z.enum([
  "canonical_identities",
  "provider_prints",
]);
export type CatalogCoverageBasisV2 = z.infer<typeof CatalogCoverageBasisV2Schema>;

export const CatalogSourceV2Schema = z.object({
  provider: z.string().trim().min(1).max(80),
  sourceId: z.string().trim().min(1).max(180),
  url: z.string().url().optional(),
  lastSyncedAt: z.string().datetime({ offset: true }).optional(),
});
export type CatalogSourceV2 = z.infer<typeof CatalogSourceV2Schema>;

export const CatalogVisualV2Schema = z.object({
  url: z.string().trim().min(1).max(2_048),
  kind: z.enum(["symbol", "logo", "card", "thumbnail"]),
  status: z.enum(["verified", "candidate"]).default("candidate"),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  source: CatalogSourceV2Schema.optional(),
});
export type CatalogVisualV2 = z.infer<typeof CatalogVisualV2Schema>;

const CatalogBaseEntityV2Schema = z.object({
  schemaVersion: z.literal(CATALOG_SCHEMA_VERSION),
  id: z.string().trim().min(1).max(240),
  name: z.string().trim().min(1).max(240),
  aliases: z.array(z.string().trim().min(1).max(240)).default([]),
  sources: z.array(CatalogSourceV2Schema).default([]),
  lastSyncedAt: z.string().datetime({ offset: true }).optional(),
});

export const CatalogSeriesV2Schema = CatalogBaseEntityV2Schema.extend({
  language: CatalogLanguageV2Schema,
});
export type CatalogSeriesV2 = z.infer<typeof CatalogSeriesV2Schema>;

export const CatalogSetV2Schema = CatalogBaseEntityV2Schema.extend({
  language: CatalogLanguageV2Schema,
  code: z.string().trim().min(1).max(80),
  seriesId: z.string().trim().min(1).max(240),
  year: z.number().int().min(1996).max(2200).optional(),
  releaseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  officialCardCount: z.number().int().nonnegative().optional(),
  knownCardCount: z.number().int().nonnegative().optional(),
  identityCount: z.number().int().nonnegative().optional(),
  providerPrintCount: z.number().int().nonnegative().optional(),
  coverageBasis: CatalogCoverageBasisV2Schema.optional(),
  availability: CatalogAvailabilityV2Schema,
  visual: CatalogVisualV2Schema.optional(),
  visuals: z.array(CatalogVisualV2Schema).default([]),
});
export type CatalogSetV2 = z.infer<typeof CatalogSetV2Schema>;

/**
 * Une entrée éditoriale peut regrouper plusieurs vraies extensions fournisseur.
 * Elle ne doit donc jamais être stockée comme une fausse extension.
 */
export const CatalogSetGroupV2Schema = CatalogBaseEntityV2Schema.extend({
  language: CatalogLanguageV2Schema,
  displayCode: z.string().trim().min(1).max(80),
  seriesId: z.string().trim().min(1).max(240),
  year: z.number().int().min(1996).max(2200).optional(),
  availability: CatalogAvailabilityV2Schema,
  memberSetIds: z.array(z.string().trim().min(1).max(240)).default([]),
});
export type CatalogSetGroupV2 = z.infer<typeof CatalogSetGroupV2Schema>;

export const CatalogVariantKindV2Schema = z.enum([
  "normal",
  "holo",
  "reverse",
  "poke_ball",
  "master_ball",
  "stamp",
  "custom",
]);
export type CatalogVariantKindV2 = z.infer<typeof CatalogVariantKindV2Schema>;

export const CatalogVariantV2Schema = z.object({
  kind: CatalogVariantKindV2Schema,
  label: z.string().trim().min(1).max(120),
  rawLabel: z.string().trim().min(1).max(240).optional(),
  stampName: z.string().trim().min(1).max(120).optional(),
});
export type CatalogVariantV2 = z.infer<typeof CatalogVariantV2Schema>;

export const CatalogCardV2Schema = CatalogBaseEntityV2Schema.extend({
  language: CatalogLanguageV2Schema,
  setId: z.string().trim().min(1).max(240),
  number: z.string().trim().min(1).max(80),
  rarity: z.string().trim().min(1).max(160).optional(),
  variants: z.array(CatalogVariantV2Schema).default([]),
  visual: CatalogVisualV2Schema.optional(),
  visuals: z.array(CatalogVisualV2Schema).default([]),
});
export type CatalogCardV2 = z.infer<typeof CatalogCardV2Schema>;

export const CatalogLanguageStatsV2Schema = z.object({
  series: z.number().int().nonnegative(),
  sets: z.number().int().nonnegative(),
  groups: z.number().int().nonnegative(),
  cards: z.number().int().nonnegative(),
});
export type CatalogLanguageStatsV2 = z.infer<typeof CatalogLanguageStatsV2Schema>;

export const CatalogSnapshotV2Schema = z.object({
  schemaVersion: z.literal(CATALOG_SCHEMA_VERSION),
  catalogVersion: z.string().trim().min(1).max(80),
  bootstrapSource: z.string().trim().min(1).max(120),
  languages: z.array(CatalogLanguageV2Schema),
  series: z.array(CatalogSeriesV2Schema),
  sets: z.array(CatalogSetV2Schema),
  setGroups: z.array(CatalogSetGroupV2Schema),
  cards: z.array(CatalogCardV2Schema),
  statsByLanguage: z.record(CatalogLanguageV2Schema, CatalogLanguageStatsV2Schema),
});
export type CatalogSnapshotV2 = z.infer<typeof CatalogSnapshotV2Schema>;
