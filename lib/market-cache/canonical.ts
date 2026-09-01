export const MARKET_CACHE_SCHEMA_VERSION = 1 as const;

export type MarketCacheLanguage = "fr" | "en" | "ja" | "zh-tw";

export interface MarketCacheIdentityInput {
  id: string;
  language: MarketCacheLanguage;
  setId?: string;
  number?: string;
  printingVariant?: string;
  condition?: string;
  variantCardmarketId?: number;
  variantTcgplayerId?: number;
  providerId?: string;
}

function token(value: unknown): string {
  return encodeURIComponent(
    String(value ?? "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
  );
}

function normalizedNumber(value: unknown): string {
  const raw = String(value ?? "").trim().split("/")[0].trim().toUpperCase();
  const prefix = raw.match(/^[A-Z]+/)?.[0] ?? "";
  const digits = raw.replace(/^[A-Z]+/, "").replace(/^0+(?=\d)/, "");
  return `${prefix}${digits || "0"}`;
}

/**
 * Une clé désigne un produit marché physique précis. La langue, l'impression
 * et l'état ne peuvent donc jamais partager silencieusement la même cotation.
 */
export function buildMarketCacheKeyV275(input: MarketCacheIdentityInput): string {
  const parts: unknown[] = [
    `market-v${MARKET_CACHE_SCHEMA_VERSION}`,
    input.id,
    input.language,
    input.setId,
    normalizedNumber(input.number),
    input.printingVariant || "Normal",
    input.condition || "Near Mint",
    input.variantCardmarketId || "",
    input.variantTcgplayerId || "",
  ];
  // Préserve toutes les anciennes clés hors catalogue régional. Seules les
  // impressions qui possèdent un providerId obtiennent un segment distinct.
  if (input.providerId) parts.push(input.providerId);
  return parts.map(token).join(":");
}
