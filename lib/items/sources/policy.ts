import type { SealedItem } from "../types";
import { ITEM_SOURCE_REGISTRY } from "./registry";

export function validateItemSourcePolicy(item: SealedItem): string[] {
  const errors: string[] = [];
  if (item.catalogStatus === "verified" && item.sources.length === 0) errors.push("source_missing");
  if (item.priceStatus === "available" && !item.quotes?.length) errors.push("quote_missing");
  for (const quote of item.quotes || []) {
    const source = ITEM_SOURCE_REGISTRY.find((entry) => entry.id === quote.source);
    if (!source || source.state !== "ready") errors.push(`source_not_ready:${quote.source}`);
    if (quote.kind === "current_market" && !source?.purposes.includes("current_market")) errors.push(`market_not_allowed:${quote.source}`);
    if (quote.kind === "official_retail" && !source?.purposes.includes("official_retail")) errors.push(`retail_not_allowed:${quote.source}`);
  }
  return Array.from(new Set(errors));
}
