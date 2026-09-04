import type { PokemonCard } from "@/lib/types";

export const SCANNER_INVENTORY_LIMIT_V303 = 40;
export const SCANNER_LISTING_LIMIT_V305 = 40;

export interface ScannerInventoryExportItemV303 {
  card: PokemonCard;
  scannedAt: Date | string;
  confidence: number;
}

function csvCell(value: unknown): string {
  const clean = String(value ?? "").replace(/\r?\n/g, " ").trim();
  return `"${clean.replace(/"/g, '""')}"`;
}

/** CSV UTF-8 séparé par des points-virgules, directement lisible par Excel FR. */
export function buildScannerInventoryCsvV303(items: readonly ScannerInventoryExportItemV303[]): string {
  const headers = ["Nom", "Numéro", "Extension", "Code extension", "Série", "Confiance", "Scanné le"];
  const rows = items.map((item) => [
    item.card.name,
    item.card.number,
    item.card.set?.name,
    item.card.set?.id,
    item.card.set?.series,
    `${Math.round(Math.max(0, Math.min(1, Number(item.confidence) || 0)) * 100)} %`,
    new Date(item.scannedAt).toLocaleString("fr-FR"),
  ]);
  return `\uFEFF${[headers, ...rows].map((row) => row.map(csvCell).join(";")).join("\r\n")}`;
}

export type ScannerListingExportItemV305 = ScannerInventoryExportItemV303;

/**
 * Listing PRO : une ligne par carte physique, sans URL d'image et sans prix.
 * Le séparateur point-virgule et le BOM assurent l'ouverture directe dans Excel FR.
 */
export function buildScannerListingCsvV305(items: readonly ScannerListingExportItemV305[]): string {
  const headers = ["Ligne", "Nom", "Numéro", "Extension", "Code extension", "Série", "Langue", "Confiance", "Scanné le"];
  const rows = items.map((item, index) => [
    index + 1,
    item.card.name,
    item.card.number,
    item.card.set?.name,
    item.card.set?.id,
    item.card.set?.series,
    item.card.dataLanguage || "fr",
    `${Math.round(Math.max(0, Math.min(1, Number(item.confidence) || 0)) * 100)} %`,
    new Date(item.scannedAt).toLocaleString("fr-FR"),
  ]);
  return `\uFEFF${[headers, ...rows].map((row) => row.map(csvCell).join(";")).join("\r\n")}`;
}
