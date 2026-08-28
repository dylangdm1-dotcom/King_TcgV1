import { buildMarketCacheKeyV275 } from "../market-cache/canonical";
import type { CardPrintVariant, PokemonCard } from "../types";

export type MarketLanguageV279 = "fr" | "en" | "ja" | "zh-tw";

const MARKET_LANGUAGES = new Set<MarketLanguageV279>(["fr", "en", "ja", "zh-tw"]);

export function normalizeMarketLanguageV279(value: unknown): MarketLanguageV279 | null {
  const normalized = String(value ?? "").trim().toLowerCase().replace("_", "-");
  if (MARKET_LANGUAGES.has(normalized as MarketLanguageV279)) {
    return normalized as MarketLanguageV279;
  }
  return null;
}

export function inferMarketLanguageFromCardIdV279(id: unknown): MarketLanguageV279 {
  const value = String(id ?? "").toLowerCase();
  if (value.startsWith("tcgdex-ja-") || value.startsWith("catalog-v2-ja-") || value.includes(":ja:")) return "ja";
  if (
    value.startsWith("tcgdex-zh-") ||
    value.startsWith("catalog-v2-zh-") ||
    value.startsWith("pokewallet-") ||
    value.includes(":zh-tw:")
  ) return "zh-tw";
  if (value.startsWith("tcgdex-fr-") || value.startsWith("catalog-v2-fr-") || value.includes(":fr:")) return "fr";
  return "en";
}

export function marketLanguageForCardV279(card: Pick<PokemonCard, "id" | "dataLanguage">): MarketLanguageV279 {
  return normalizeMarketLanguageV279(card.dataLanguage) ?? inferMarketLanguageFromCardIdV279(card.id);
}

export function activePrintVariantV279(
  card: Pick<PokemonCard, "availablePrintVariants" | "selectedPrintVariant">
): { key: CardPrintVariant["key"]; detail?: CardPrintVariant } {
  const variants = card.availablePrintVariants ?? [];
  const key = card.selectedPrintVariant ?? variants[0]?.key ?? "Normal";
  return { key, detail: variants.find((variant) => variant.key === key) };
}

export function buildPriceRequestCardV279(card: PokemonCard) {
  const language = marketLanguageForCardV279(card);
  const activeVariant = activePrintVariantV279(card);
  const requestKey = buildMarketCacheKeyV275({
    id: card.id,
    language,
    setId: card.set?.id,
    number: card.number,
    printingVariant: activeVariant.key,
    condition: card.condition || "Near Mint",
    variantCardmarketId: activeVariant.detail?.cardmarketId,
    variantTcgplayerId: activeVariant.detail?.tcgplayerId,
  });

  return {
    requestKey,
    id: card.id,
    providerId: (card as PokemonCard & { providerId?: string }).providerId,
    name: card.name,
    number: card.number,
    setId: card.set?.id,
    setName: card.set?.name,
    variant: card.variant,
    printingVariant: activeVariant.key,
    condition: card.condition || "Near Mint",
    rarity: card.rarity,
    language,
    variantCardmarketId: activeVariant.detail?.cardmarketId,
    variantTcgplayerId: activeVariant.detail?.tcgplayerId,
    directCardmarketUrl: card.cardmarket?.url,
    variantPricing: activeVariant.detail?.pricing,
    ...(language === "zh-tw"
      ? { embeddedCardmarket: card.cardmarket, embeddedTcgplayer: card.tcgplayer }
      : {}),
  };
}
