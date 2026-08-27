import { canonicalCardId, isChineseCatalogCode, normalizeCatalogCode } from "../identity";
import type { CatalogImportBatchV2 } from "../adapters/types";
import type { CatalogSetV2 } from "../schema";
import type { CatalogRegionalSnapshotV2 } from "./schema";

function unique(values: readonly string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

export function reconcileRegionalBatchV2(
  batch: CatalogImportBatchV2,
  source: CatalogRegionalSnapshotV2,
  canonicalSet: CatalogSetV2
): CatalogImportBatchV2 {
  if (batch.language !== source.language || canonicalSet.language !== source.language) {
    throw new Error(`Snapshot régional : langue incohérente pour ${source.canonicalCode}.`);
  }
  if (source.canonicalSetId !== canonicalSet.id || normalizeCatalogCode(source.canonicalCode) !== normalizeCatalogCode(canonicalSet.code)) {
    throw new Error(`Snapshot régional : identité canonique incohérente pour ${source.canonicalCode}.`);
  }
  if (source.language === "ja") {
    if (source.provider !== "tcgdex" || source.region !== "japan" || isChineseCatalogCode(source.canonicalCode)) {
      throw new Error(`Snapshot régional : source japonaise refusée pour ${source.canonicalCode}.`);
    }
  } else if (source.provider !== "pokewallet" || source.region !== "simplified_china" || !isChineseCatalogCode(source.canonicalCode)) {
    throw new Error(`Snapshot régional : seule une source Chine simplifiée explicite est acceptée pour ${source.canonicalCode}.`);
  }
  const importedSet = batch.sets[0];
  if (!importedSet) throw new Error(`Snapshot régional : extension fournisseur absente pour ${source.canonicalCode}.`);
  const sourceRefs = importedSet.sources.map((entry) => ({ ...entry, lastSyncedAt: source.capturedAt }));
  const reconciledSet: CatalogSetV2 = {
    ...canonicalSet,
    name: canonicalSet.name,
    aliases: unique([...canonicalSet.aliases, importedSet.name, importedSet.code, source.providerCode]),
    sources: [...canonicalSet.sources, ...sourceRefs],
    lastSyncedAt: source.capturedAt,
    knownCardCount: Math.max(canonicalSet.knownCardCount ?? 0, source.receivedCardCount),
    availability: source.receivedCardCount > 0 ? "available" : canonicalSet.availability,
    visuals: canonicalSet.visuals.length > 0 ? canonicalSet.visuals : importedSet.visuals,
    ...(canonicalSet.visual ? {} : importedSet.visual ? { visual: importedSet.visual } : {}),
  };
  const cards = batch.cards.map((card) => ({
    ...card,
    id: canonicalCardId(source.language, canonicalSet.id, card.number),
    language: source.language,
    setId: canonicalSet.id,
    lastSyncedAt: source.capturedAt,
  }));
  return {
    ...batch,
    language: source.language,
    syncedAt: source.capturedAt,
    series: [],
    sets: [reconciledSet],
    cards,
  };
}

