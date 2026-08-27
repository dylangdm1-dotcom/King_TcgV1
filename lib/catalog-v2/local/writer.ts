import { createHash } from "crypto";
import { existsSync, mkdirSync, readdirSync, writeFileSync } from "fs";
import path from "path";

import type { CatalogSetV2, CatalogSnapshotV2 } from "../schema";
import { CatalogSnapshotV2Schema } from "../schema";
import {
  CATALOG_LOCAL_FORMAT_VERSION,
  CatalogLocalManifestV2Schema,
  type CatalogLocalCoverageStatusV2,
  type CatalogLocalManifestV2,
  type CatalogLocalRegionalSourceV2,
  type CatalogLocalSetManifestV2,
} from "./schema";

export interface CatalogLocalCoverageInputV2 {
  status?: CatalogLocalCoverageStatusV2;
  sourceCardCount?: number;
}

export interface WriteLocalCatalogOptionsV2 {
  outputRoot: string;
  catalogVersion: string;
  generatedAt: string;
  previousManifest: CatalogLocalManifestV2;
  coverage?: ReadonlyMap<string, CatalogLocalCoverageInputV2>;
  regionalSources?: CatalogLocalRegionalSourceV2[];
}

function jsonBuffer(value: unknown): Buffer {
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function safeFilename(set: CatalogSetV2): string {
  const code = String(set.code || "set")
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/^-+|-+$/g, "") || "set";
  const suffix = createHash("sha256").update(set.id).digest("hex").slice(0, 10);
  return `${code}-${suffix}.json`;
}

function writeJson(outputRoot: string, relativePath: string, value: unknown) {
  const absolutePath = path.join(outputRoot, relativePath);
  mkdirSync(path.dirname(absolutePath), { recursive: true });
  const buffer = jsonBuffer(value);
  writeFileSync(absolutePath, buffer);
  return {
    path: relativePath.replace(/\\/g, "/"),
    bytes: buffer.byteLength,
    sha256: createHash("sha256").update(buffer).digest("hex"),
  };
}

function statusForSet(
  set: CatalogSetV2,
  cardCount: number,
  coverage: CatalogLocalCoverageInputV2 | undefined,
  previous: CatalogLocalSetManifestV2 | undefined
): CatalogLocalCoverageStatusV2 {
  if (coverage?.status) return coverage.status;
  if (coverage?.sourceCardCount !== undefined && cardCount > 0) {
    return cardCount >= coverage.sourceCardCount ? "complete" : "partial";
  }
  if (previous && previous.cardCount === cardCount) return previous.status;
  if (cardCount > 0) return "partial";
  return set.availability === "announced" ? "announced" : "metadata_only";
}

export function writeLocalCatalogSnapshotV2(
  snapshotInput: CatalogSnapshotV2,
  options: WriteLocalCatalogOptionsV2
): CatalogLocalManifestV2 {
  const snapshot = CatalogSnapshotV2Schema.parse(snapshotInput);
  const outputRoot = path.resolve(options.outputRoot);
  if (existsSync(outputRoot) && readdirSync(outputRoot).length > 0) {
    throw new Error(`Catalogue V2 local : le dossier de sortie doit être vide (${outputRoot}).`);
  }
  mkdirSync(outputRoot, { recursive: true });
  const languages = {} as CatalogLocalManifestV2["languages"];
  const byId = <T extends { id: string }>(left: T, right: T): number => left.id.localeCompare(right.id, "en");

  for (const language of ["fr", "en", "ja", "zh-tw"] as const) {
    const series = snapshot.series.filter((entry) => entry.language === language).sort(byId);
    const sets = snapshot.sets.filter((entry) => entry.language === language).sort(byId);
    const groups = snapshot.setGroups.filter((entry) => entry.language === language).sort(byId);
    const cardsBySet = new Map<string, typeof snapshot.cards>();
    for (const card of snapshot.cards.filter((entry) => entry.language === language).sort(byId)) {
      const cards = cardsBySet.get(card.setId) ?? [];
      cards.push(card);
      cardsBySet.set(card.setId, cards);
    }
    const envelope = {
      schemaVersion: snapshot.schemaVersion,
      formatVersion: CATALOG_LOCAL_FORMAT_VERSION,
      catalogVersion: options.catalogVersion,
      language,
    };
    const seriesFile = writeJson(outputRoot, `${language}/series.json`, { ...envelope, series });
    const setsFile = writeJson(outputRoot, `${language}/sets.json`, { ...envelope, sets });
    const groupsFile = writeJson(outputRoot, `${language}/groups.json`, { ...envelope, groups });
    const previousLanguage = options.previousManifest.languages[language];
    if (!previousLanguage) throw new Error(`Catalogue V2 local : langue précédente absente (${language}).`);
    const previousEntries = new Map(previousLanguage.setEntries.map((entry) => [entry.setId, entry]));
    const setEntries: CatalogLocalSetManifestV2[] = [];
    const counts = { complete: 0, partial: 0, metadata_only: 0, announced: 0 };
    let cardCount = 0;

    for (const set of sets) {
      const cards = cardsBySet.get(set.id) ?? [];
      const coverage = options.coverage?.get(`${language}:${set.id}`);
      const previous = previousEntries.get(set.id);
      const status = statusForSet(set, cards.length, coverage, previous);
      counts[status] += 1;
      cardCount += cards.length;
      const sourceCardCount = coverage?.sourceCardCount ?? previous?.sourceCardCount;
      const cardsFile = cards.length > 0
        ? writeJson(outputRoot, `${language}/cards/${safeFilename(set)}`, {
            ...envelope,
            setId: set.id,
            status,
            ...(sourceCardCount !== undefined ? { sourceCardCount } : {}),
            cards,
          })
        : undefined;
      setEntries.push({
        setId: set.id,
        code: set.code,
        name: set.name,
        status,
        cardCount: cards.length,
        ...(sourceCardCount !== undefined ? { sourceCardCount } : {}),
        ...(set.officialCardCount !== undefined ? { officialCardCount: set.officialCardCount } : {}),
        ...(cardsFile ? { cards: cardsFile } : {}),
      });
    }
    languages[language] = {
      language,
      series: seriesFile,
      sets: setsFile,
      groups: groupsFile,
      stats: {
        series: series.length,
        sets: sets.length,
        groups: groups.length,
        cards: cardCount,
        completeSets: counts.complete,
        partialSets: counts.partial,
        metadataOnlySets: counts.metadata_only,
        announcedSets: counts.announced,
      },
      setEntries,
    };
  }

  const manifest = CatalogLocalManifestV2Schema.parse({
    schemaVersion: snapshot.schemaVersion,
    formatVersion: CATALOG_LOCAL_FORMAT_VERSION,
    catalogVersion: options.catalogVersion,
    generatedAt: options.generatedAt,
    source: options.previousManifest.source,
    regionalSources: options.regionalSources ?? options.previousManifest.regionalSources,
    languages,
  });
  writeFileSync(path.join(outputRoot, "manifest.json"), jsonBuffer(manifest));
  return manifest;
}
