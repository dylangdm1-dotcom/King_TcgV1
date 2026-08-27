import {
  CATALOG_SCHEMA_VERSION,
  type CatalogAvailabilityV2,
  type CatalogLanguageV2,
  type CatalogSeriesV2,
  type CatalogSetV2,
  type CatalogSourceV2,
  type CatalogVisualV2,
} from "../schema";
import {
  canonicalSeriesId,
  canonicalSetId,
  normalizeCatalogCode,
  resolveCatalogLanguage,
} from "../identity";
import type { CatalogProviderV2 } from "./types";

export function textValue(value: unknown): string | undefined {
  const text = typeof value === "string" || typeof value === "number" ? String(value).trim() : "";
  return text || undefined;
}

export function numberValue(value: unknown): number | undefined {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.trunc(number) : undefined;
}

export function isoDate(value: unknown): string | undefined {
  const raw = textValue(value);
  if (!raw) return undefined;
  const normalized = raw.replace(/\//g, "-");
  const exact = normalized.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (exact) return `${exact[1]}-${exact[2].padStart(2, "0")}-${exact[3].padStart(2, "0")}`;
  const parsed = Date.parse(raw);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString().slice(0, 10) : undefined;
}

export function sourceRef(
  provider: CatalogProviderV2,
  sourceId: unknown,
  syncedAt?: string,
  url?: string
): CatalogSourceV2 | undefined {
  const id = textValue(sourceId);
  if (!id) return undefined;
  return {
    provider,
    sourceId: id,
    ...(url?.startsWith("https://") ? { url } : {}),
    ...(syncedAt ? { lastSyncedAt: syncedAt } : {}),
  };
}

export function mapProviderLanguage(value: unknown, fallback: CatalogLanguageV2): CatalogLanguageV2 {
  const token = String(value ?? "").trim().toLowerCase();
  if (["fr", "fra", "french"].includes(token)) return "fr";
  if (["en", "eng", "english"].includes(token)) return "en";
  if (["ja", "jp", "jap", "japanese"].includes(token)) return "ja";
  if (["zh", "zh-tw", "zh-cn", "chn", "chinese"].includes(token)) return "zh-tw";
  return fallback;
}

export function buildSeries(
  language: CatalogLanguageV2,
  name: string,
  source?: CatalogSourceV2,
  syncedAt?: string
): CatalogSeriesV2 {
  return {
    schemaVersion: CATALOG_SCHEMA_VERSION,
    id: canonicalSeriesId(language, name),
    language,
    name,
    aliases: [],
    sources: source ? [source] : [],
    ...(syncedAt ? { lastSyncedAt: syncedAt } : {}),
  };
}

export function buildSet(params: {
  declaredLanguage: CatalogLanguageV2;
  code: string;
  name: string;
  series: CatalogSeriesV2;
  source?: CatalogSourceV2;
  releaseDate?: string;
  officialCardCount?: number;
  knownCardCount?: number;
  availability?: CatalogAvailabilityV2;
  visuals?: CatalogVisualV2[];
  syncedAt?: string;
}): CatalogSetV2 {
  const language = resolveCatalogLanguage(params.declaredLanguage, params.code);
  const visuals = params.visuals ?? [];
  return {
    schemaVersion: CATALOG_SCHEMA_VERSION,
    id: canonicalSetId(language, params.code),
    language,
    code: normalizeCatalogCode(params.code) || params.code,
    name: params.name,
    aliases: [],
    sources: params.source ? [params.source] : [],
    seriesId: params.series.language === language
      ? params.series.id
      : canonicalSeriesId(language, params.series.name),
    ...(params.releaseDate ? { releaseDate: params.releaseDate, year: Number(params.releaseDate.slice(0, 4)) } : {}),
    ...(params.officialCardCount !== undefined ? { officialCardCount: params.officialCardCount } : {}),
    ...(params.knownCardCount !== undefined ? { knownCardCount: params.knownCardCount } : {}),
    availability: params.availability ?? ((params.knownCardCount ?? 0) > 0 ? "available" : "metadata_only"),
    ...(visuals[0] ? { visual: visuals[0] } : {}),
    visuals,
    ...(params.syncedAt ? { lastSyncedAt: params.syncedAt } : {}),
  };
}

export function visual(
  url: unknown,
  kind: CatalogVisualV2["kind"],
  source?: CatalogSourceV2,
  status: CatalogVisualV2["status"] = "candidate",
  dimensions?: { width?: number; height?: number }
): CatalogVisualV2 | undefined {
  const safeUrl = textValue(url);
  if (!safeUrl || (!safeUrl.startsWith("https://") && !safeUrl.startsWith("/"))) return undefined;
  return {
    url: safeUrl,
    kind,
    status,
    ...(dimensions?.width ? { width: dimensions.width } : {}),
    ...(dimensions?.height ? { height: dimensions.height } : {}),
    ...(source ? { source } : {}),
  };
}

export function uniqueVisuals(values: Array<CatalogVisualV2 | undefined>): CatalogVisualV2[] {
  return Array.from(new Map(values.filter((entry): entry is CatalogVisualV2 => Boolean(entry)).map((entry) => [`${entry.kind}:${entry.url}`, entry])).values());
}
