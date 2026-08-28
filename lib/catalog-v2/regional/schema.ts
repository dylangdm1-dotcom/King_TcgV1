import { z } from "zod";

import { CatalogLocalFileV2Schema } from "../local/schema";

export const CATALOG_REGIONAL_SNAPSHOT_FORMAT_VERSION = 1 as const;

export const CatalogRegionalProviderV2Schema = z.enum(["tcgdex", "pokewallet"]);
export const CatalogRegionalLanguageV2Schema = z.enum(["ja", "zh-tw"]);
export const CatalogRegionalRegionV2Schema = z.enum(["japan", "simplified_china"]);

export const CatalogRegionalSnapshotV2Schema = z.object({
  formatVersion: z.literal(CATALOG_REGIONAL_SNAPSHOT_FORMAT_VERSION),
  provider: CatalogRegionalProviderV2Schema,
  language: CatalogRegionalLanguageV2Schema,
  region: CatalogRegionalRegionV2Schema,
  capturedAt: z.string().datetime({ offset: true }),
  sourceRevision: z.string().trim().min(1).max(160),
  sourceUrl: z.string().url(),
  canonicalSetId: z.string().trim().min(1).max(240),
  canonicalCode: z.string().trim().min(1).max(80),
  providerSetId: z.string().trim().min(1).max(180),
  providerCode: z.string().trim().min(1).max(80),
  status: z.enum(["complete", "partial"]),
  expectedCardCount: z.number().int().nonnegative().optional(),
  receivedCardCount: z.number().int().nonnegative(),
  payload: z.unknown(),
});
export type CatalogRegionalSnapshotV2 = z.infer<typeof CatalogRegionalSnapshotV2Schema>;

export const CatalogRegionalSnapshotEntryV2Schema = z.object({
  provider: CatalogRegionalProviderV2Schema,
  language: CatalogRegionalLanguageV2Schema,
  canonicalSetId: z.string().trim().min(1).max(240),
  canonicalCode: z.string().trim().min(1).max(80),
  status: z.enum(["complete", "partial"]),
  expectedCardCount: z.number().int().nonnegative().optional(),
  receivedCardCount: z.number().int().nonnegative(),
  file: CatalogLocalFileV2Schema,
});

export const CatalogRegionalSnapshotIndexV2Schema = z.object({
  formatVersion: z.literal(CATALOG_REGIONAL_SNAPSHOT_FORMAT_VERSION),
  capturedAt: z.string().datetime({ offset: true }),
  sourceRevision: z.string().trim().min(1).max(160),
  entries: z.array(CatalogRegionalSnapshotEntryV2Schema),
  failures: z.array(z.object({
    provider: CatalogRegionalProviderV2Schema,
    language: CatalogRegionalLanguageV2Schema,
    canonicalSetId: z.string().trim().min(1).max(240),
    canonicalCode: z.string().trim().min(1).max(80),
    message: z.string().trim().min(1).max(1_000),
  })).default([]),
});
export type CatalogRegionalSnapshotIndexV2 = z.infer<typeof CatalogRegionalSnapshotIndexV2Schema>;

