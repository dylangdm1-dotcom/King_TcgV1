import { createHash } from "crypto";
import { readFile } from "fs/promises";
import path from "path";
import type { z } from "zod";

import type { CatalogLanguageV2 } from "../schema";
import { CatalogSnapshotV2Schema, type CatalogSnapshotV2 } from "../schema";
import {
  CatalogLocalCardsFileV2Schema,
  CatalogLocalGroupsFileV2Schema,
  CatalogLocalManifestV2Schema,
  CatalogLocalSeriesFileV2Schema,
  CatalogLocalSetsFileV2Schema,
  type CatalogLocalCardsFileV2,
  type CatalogLocalFileV2,
  type CatalogLocalLanguageBundleV2,
  type CatalogLocalManifestV2,
} from "./schema";

export const DEFAULT_LOCAL_CATALOG_ROOT_V2 = path.join(process.cwd(), "public", "data", "catalog-v2");

function resolveLocalCatalogFile(root: string, relativePath: string): string {
  const resolvedRoot = path.resolve(root);
  const resolvedFile = path.resolve(resolvedRoot, relativePath);
  if (resolvedFile !== resolvedRoot && !resolvedFile.startsWith(`${resolvedRoot}${path.sep}`)) {
    throw new Error("Catalogue V2 local : chemin hors racine refusé.");
  }
  return resolvedFile;
}

async function readJsonFile<Schema extends z.ZodTypeAny>(
  absolutePath: string,
  schema: Schema
): Promise<z.infer<Schema>> {
  const raw = await readFile(absolutePath, "utf8");
  return schema.parse(JSON.parse(raw));
}

async function readVerifiedLocalFile<Schema extends z.ZodTypeAny>(
  root: string,
  file: CatalogLocalFileV2,
  schema: Schema
): Promise<z.infer<Schema>> {
  const absolutePath = resolveLocalCatalogFile(root, file.path);
  const raw = await readFile(absolutePath);
  if (raw.byteLength !== file.bytes) {
    throw new Error(`Catalogue V2 local : taille invalide pour ${file.path}.`);
  }
  const digest = createHash("sha256").update(raw).digest("hex");
  if (digest !== file.sha256) {
    throw new Error(`Catalogue V2 local : empreinte invalide pour ${file.path}.`);
  }
  return schema.parse(JSON.parse(raw.toString("utf8")));
}

export async function loadLocalCatalogManifestServerV2(
  root = DEFAULT_LOCAL_CATALOG_ROOT_V2
): Promise<CatalogLocalManifestV2> {
  return readJsonFile(resolveLocalCatalogFile(root, "manifest.json"), CatalogLocalManifestV2Schema);
}

export async function loadLocalCatalogLanguageServerV2(
  language: CatalogLanguageV2,
  root = DEFAULT_LOCAL_CATALOG_ROOT_V2
): Promise<CatalogLocalLanguageBundleV2> {
  const manifest = await loadLocalCatalogManifestServerV2(root);
  const languageManifest = manifest.languages[language];
  if (!languageManifest) throw new Error(`Catalogue V2 local : langue ${language} absente.`);
  const [series, sets, groups] = await Promise.all([
    readVerifiedLocalFile(root, languageManifest.series, CatalogLocalSeriesFileV2Schema),
    readVerifiedLocalFile(root, languageManifest.sets, CatalogLocalSetsFileV2Schema),
    readVerifiedLocalFile(root, languageManifest.groups, CatalogLocalGroupsFileV2Schema),
  ]);
  return { manifest, language: languageManifest, series, sets, groups };
}

export async function loadLocalCatalogSetCardsServerV2(
  language: CatalogLanguageV2,
  setId: string,
  root = DEFAULT_LOCAL_CATALOG_ROOT_V2
): Promise<CatalogLocalCardsFileV2 | undefined> {
  const manifest = await loadLocalCatalogManifestServerV2(root);
  const setEntry = manifest.languages[language]?.setEntries.find((entry) => entry.setId === setId);
  if (!setEntry?.cards) return undefined;
  return readVerifiedLocalFile(root, setEntry.cards, CatalogLocalCardsFileV2Schema);
}

export async function loadCatalogSetCardsLocalFirstV2<T>(options: {
  language: CatalogLanguageV2;
  setId: string;
  root?: string;
  fallback?: () => Promise<T>;
}): Promise<{ source: "local"; data: CatalogLocalCardsFileV2 } | { source: "fallback"; data: T }> {
  try {
    const local = await loadLocalCatalogSetCardsServerV2(
      options.language,
      options.setId,
      options.root ?? DEFAULT_LOCAL_CATALOG_ROOT_V2
    );
    if (local && local.cards.length > 0) return { source: "local", data: local };
  } catch (error) {
    if (!options.fallback) throw error;
  }
  if (!options.fallback) {
    throw new Error(`Catalogue V2 local : aucune carte disponible pour ${options.setId}.`);
  }
  return { source: "fallback", data: await options.fallback() };
}

export async function loadLocalCatalogSnapshotServerV2(
  root = DEFAULT_LOCAL_CATALOG_ROOT_V2
): Promise<CatalogSnapshotV2> {
  const manifest = await loadLocalCatalogManifestServerV2(root);
  const series = [];
  const sets = [];
  const setGroups = [];
  const cards = [];
  for (const language of ["fr", "en", "ja", "zh-tw"] as const) {
    const bundle = await loadLocalCatalogLanguageServerV2(language, root);
    series.push(...bundle.series.series);
    sets.push(...bundle.sets.sets);
    setGroups.push(...bundle.groups.groups);
    for (const entry of bundle.language.setEntries) {
      if (!entry.cards) continue;
      const chunk = await loadLocalCatalogSetCardsServerV2(language, entry.setId, root);
      if (chunk) cards.push(...chunk.cards);
    }
  }
  return CatalogSnapshotV2Schema.parse({
    schemaVersion: manifest.schemaVersion,
    catalogVersion: manifest.catalogVersion,
    bootstrapSource: "king-tcg-local-manifest",
    languages: ["fr", "en", "ja", "zh-tw"],
    series,
    sets,
    setGroups,
    cards,
    statsByLanguage: Object.fromEntries(Object.entries(manifest.languages).map(([language, value]) => [
      language,
      {
        series: value.stats.series,
        sets: value.stats.sets,
        groups: value.stats.groups,
        cards: value.stats.cards,
      },
    ])),
  });
}
