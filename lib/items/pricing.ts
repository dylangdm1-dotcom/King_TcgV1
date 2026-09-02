import type { SealedItem, SealedItemPriceQuote } from "./types";

export type ItemPriceSummary = {
  currentMarket: SealedItemPriceQuote | null;
  officialRetail: SealedItemPriceQuote | null;
  available: boolean;
};

function latest(quotes: SealedItemPriceQuote[]): SealedItemPriceQuote | null {
  return [...quotes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0] || null;
}

export function summarizeItemPrices(item: SealedItem): ItemPriceSummary {
  const quotes = (item.quotes || []).filter((quote) => Number.isFinite(quote.amount) && quote.amount >= 0);
  const currentMarket = latest(quotes.filter((quote) => quote.kind === "current_market"));
  const officialRetail = latest(quotes.filter((quote) => quote.kind === "official_retail"));
  return { currentMarket, officialRetail, available: Boolean(currentMarket || officialRetail) };
}

export function formatItemMoney(quote: SealedItemPriceQuote | null): string {
  if (!quote) return "—";
  try {
    return new Intl.NumberFormat("fr-FR", { style: "currency", currency: quote.currency }).format(quote.amount);
  } catch {
    return `${quote.amount.toFixed(2)} ${quote.currency}`;
  }
}
