import type { CatalogLanguageV2 } from "./schema";

export function normalizeCatalogToken(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
}

export function normalizeCatalogCode(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9.]+/g, "");
}

/**
 * Les familles CS / CSM / CSV / CBB sont des produits chinois simplifiés.
 * Ce garde-fou a priorité sur une langue fournisseur erronée.
 */
export function isChineseCatalogCode(value: unknown): boolean {
  const code = normalizeCatalogCode(value).replace(/\./g, "");
  return /^(?:CS|CBB)/.test(code) || ["151C", "30THP", "NRGY", "CSEC"].includes(code);
}

export function resolveCatalogLanguage(
  declaredLanguage: CatalogLanguageV2,
  setCode: unknown
): CatalogLanguageV2 {
  return isChineseCatalogCode(setCode) ? "zh-tw" : declaredLanguage;
}

export function canonicalSeriesId(language: CatalogLanguageV2, name: unknown): string {
  const token = normalizeCatalogToken(name) || "unknown";
  return `ktcg:series:${language}:${token}`;
}

export function canonicalSetId(
  language: CatalogLanguageV2,
  code: unknown,
  disambiguator?: unknown
): string {
  const codeToken = normalizeCatalogToken(normalizeCatalogCode(code)) || "unknown";
  const suffix = normalizeCatalogToken(disambiguator);
  return `ktcg:set:${language}:${codeToken}${suffix ? `:${suffix}` : ""}`;
}

export function canonicalSetGroupId(
  language: CatalogLanguageV2,
  displayCode: unknown,
  disambiguator?: unknown
): string {
  const codeToken = normalizeCatalogToken(normalizeCatalogCode(displayCode)) || "unknown";
  const suffix = normalizeCatalogToken(disambiguator);
  return `ktcg:group:${language}:${codeToken}${suffix ? `:${suffix}` : ""}`;
}

export function canonicalCardId(
  language: CatalogLanguageV2,
  setId: unknown,
  number: unknown
): string {
  const setToken = normalizeCatalogToken(setId) || "unknown-set";
  const numberToken = normalizeCatalogToken(number) || "unknown-number";
  return `ktcg:card:${language}:${setToken}:${numberToken}`;
}
