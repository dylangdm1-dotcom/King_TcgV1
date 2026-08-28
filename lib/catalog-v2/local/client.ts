"use client";

import type { z } from "zod";

import type { CatalogLanguageV2 } from "../schema";
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

const DEFAULT_CATALOG_BASE_URL = "/data/catalog-v2";
const DATABASE_NAME = "king-tcg-catalog-v2";
const DATABASE_VERSION = 1;
const STORE_NAME = "json";
const MANIFEST_CACHE_KEY = "manifest:latest";

interface CatalogBrowserCacheEntryV2 {
  key: string;
  value: unknown;
  savedAt: string;
}

function catalogUrl(baseUrl: string, relativePath: string): string {
  const safeBase = baseUrl.replace(/\/+$/, "");
  const safePath = relativePath.replace(/^\/+/, "");
  if (!safePath || safePath.split("/").includes("..")) {
    throw new Error("Catalogue V2 local : chemin de fichier invalide.");
  }
  return `${safeBase}/${safePath}`;
}

function openCatalogDatabase(): Promise<IDBDatabase | undefined> {
  if (typeof indexedDB === "undefined") return Promise.resolve(undefined);
  return new Promise((resolve) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: "key" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(undefined);
    request.onblocked = () => resolve(undefined);
  });
}

async function readBrowserCache(key: string): Promise<unknown | undefined> {
  const database = await openCatalogDatabase();
  if (!database) return undefined;
  return new Promise((resolve) => {
    const transaction = database.transaction(STORE_NAME, "readonly");
    const request = transaction.objectStore(STORE_NAME).get(key);
    request.onsuccess = () => resolve((request.result as CatalogBrowserCacheEntryV2 | undefined)?.value);
    request.onerror = () => resolve(undefined);
    transaction.oncomplete = () => database.close();
    transaction.onerror = () => database.close();
  });
}

async function writeBrowserCache(key: string, value: unknown): Promise<void> {
  const database = await openCatalogDatabase();
  if (!database) return;
  await new Promise<void>((resolve) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put({ key, value, savedAt: new Date().toISOString() });
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => {
      database.close();
      resolve();
    };
    transaction.onabort = () => {
      database.close();
      resolve();
    };
  });
}

async function fetchAndParse<Schema extends z.ZodTypeAny>(
  url: string,
  schema: Schema,
  cache: RequestCache
): Promise<z.infer<Schema>> {
  const response = await fetch(url, { cache });
  if (!response.ok) throw new Error(`Catalogue V2 local indisponible (${response.status}).`);
  return schema.parse(await response.json());
}

async function readVersionedFile<Schema extends z.ZodTypeAny>(
  baseUrl: string,
  catalogVersion: string,
  file: CatalogLocalFileV2,
  schema: Schema
): Promise<z.infer<Schema>> {
  const key = `${catalogVersion}:${file.path}`;
  const cached = await readBrowserCache(key);
  const parsedCached = schema.safeParse(cached);
  if (parsedCached.success) return parsedCached.data;

  const fresh = await fetchAndParse(catalogUrl(baseUrl, file.path), schema, "force-cache");
  await writeBrowserCache(key, fresh);
  return fresh;
}

export async function loadLocalCatalogManifestV2(
  baseUrl = DEFAULT_CATALOG_BASE_URL
): Promise<CatalogLocalManifestV2> {
  try {
    const manifest = await fetchAndParse(
      catalogUrl(baseUrl, "manifest.json"),
      CatalogLocalManifestV2Schema,
      "no-cache"
    );
    await writeBrowserCache(MANIFEST_CACHE_KEY, manifest);
    return manifest;
  } catch (error) {
    const cached = CatalogLocalManifestV2Schema.safeParse(await readBrowserCache(MANIFEST_CACHE_KEY));
    if (cached.success) return cached.data;
    throw error;
  }
}

export async function loadLocalCatalogLanguageV2(
  language: CatalogLanguageV2,
  baseUrl = DEFAULT_CATALOG_BASE_URL
): Promise<CatalogLocalLanguageBundleV2> {
  const manifest = await loadLocalCatalogManifestV2(baseUrl);
  const languageManifest = manifest.languages[language];
  if (!languageManifest) throw new Error(`Catalogue V2 local : langue ${language} absente.`);

  const [series, sets, groups] = await Promise.all([
    readVersionedFile(baseUrl, manifest.catalogVersion, languageManifest.series, CatalogLocalSeriesFileV2Schema),
    readVersionedFile(baseUrl, manifest.catalogVersion, languageManifest.sets, CatalogLocalSetsFileV2Schema),
    readVersionedFile(baseUrl, manifest.catalogVersion, languageManifest.groups, CatalogLocalGroupsFileV2Schema),
  ]);
  return { manifest, language: languageManifest, series, sets, groups };
}

export async function loadLocalCatalogSetCardsV2(
  language: CatalogLanguageV2,
  setId: string,
  baseUrl = DEFAULT_CATALOG_BASE_URL
): Promise<CatalogLocalCardsFileV2 | undefined> {
  const manifest = await loadLocalCatalogManifestV2(baseUrl);
  const languageManifest = manifest.languages[language];
  const setEntry = languageManifest?.setEntries.find((entry) => entry.setId === setId);
  if (!setEntry?.cards) return undefined;
  return readVersionedFile(
    baseUrl,
    manifest.catalogVersion,
    setEntry.cards,
    CatalogLocalCardsFileV2Schema
  );
}
