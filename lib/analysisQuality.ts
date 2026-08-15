import type { PokemonCard } from "./types";
import type { PricePoint } from "./priceHistory";
import { getMarketData } from "./marketEngine";

export type AnalysisQuality = "insufficient" | "limited" | "moderate" | "strong";

export type AnalysisQualityResult = {
  coverage: number;
  quality: AnalysisQuality;
  label: string;
  sourceCount: number;
  observedHistoryPoints: number;
  hasTrend7d: boolean;
  hasTrend30d: boolean;
  evidence: string[];
  uncertaintyRate: number;
};

export function observedHistory(history: PricePoint[] = []): PricePoint[] {
  return history.filter(
    (point) => point?.origin !== "reconstructed" && Number(point?.average) > 0
  );
}

function distinctSources(card?: PokemonCard | null): string[] {
  if (!card) return [];
  const sources = new Set<string>();

  for (const quote of card.marketQuotes ?? []) {
    if (!quote?.compatible || !(Number(quote.price) > 0)) continue;
    if (quote.language !== card.dataLanguage && quote.language !== "multi") continue;
    sources.add(quote.source);
  }

  for (const source of card.marketEstimate?.includedSources ?? []) {
    if (source) sources.add(String(source).toLowerCase());
  }

  // Les anciens champs bruts ne comportent pas toujours une preuve de langue
  // ou d'impression. Ils peuvent compléter la couverture FR/EN, mais ne
  // doivent jamais gonfler la confiance d'une carte JP/CN.
  if (card.dataLanguage === "fr" || card.dataLanguage === "en") {
    if (card.cardmarket?.prices && Object.values(card.cardmarket.prices).some((value) => Number(value) > 0)) sources.add("cardmarket");
    if (card.tcgplayer?.prices && Object.values(card.tcgplayer.prices).some((prices) => prices && Object.values(prices).some((value) => Number(value) > 0))) sources.add("tcgplayer");
    if (Number(card.justtcg?.medianNearMint) > 0) sources.add("justtcg");
    if (Number(card.ebayListings?.median) > 0) sources.add("ebay");
  }

  return Array.from(sources);
}

export function assessAnalysisQuality(
  card?: PokemonCard | null,
  history: PricePoint[] = []
): AnalysisQualityResult {
  const market = getMarketData(card);
  const sources = distinctSources(card);
  const observed = observedHistory(history);
  const uniqueDays = new Set(observed.map((point) => new Date(point.date).toISOString().slice(0, 10))).size;
  const hasTrend7d = Number.isFinite(market.priceTrend7d) && Math.abs(market.priceTrend7d) > 0.001;
  const hasTrend30d = Number.isFinite(market.priceTrend30d) && Math.abs(market.priceTrend30d) > 0.001;

  let coverage = market.average > 0 ? 10 : 0;
  coverage += Math.min(48, sources.length * 12);
  coverage += uniqueDays >= 30 ? 20 : uniqueDays >= 7 ? 14 : uniqueDays >= 2 ? 7 : 0;
  if (hasTrend7d) coverage += 6;
  if (hasTrend30d) coverage += 8;
  if (card?.marketEstimate?.confidence === "high") coverage += 8;
  else if (card?.marketEstimate?.confidence === "medium") coverage += 5;
  else if (card?.marketEstimate?.confidence === "limited") coverage += 2;
  coverage = Math.max(0, Math.min(92, Math.round(coverage)));

  const quality: AnalysisQuality =
    coverage >= 75 ? "strong" : coverage >= 50 ? "moderate" : coverage >= 25 ? "limited" : "insufficient";
  const label =
    quality === "strong" ? "Solide" : quality === "moderate" ? "Correcte" : quality === "limited" ? "Limitée" : "Insuffisante";
  const evidence = [
    `${sources.length} source${sources.length > 1 ? "s" : ""} marché compatible${sources.length > 1 ? "s" : ""}`,
    `${uniqueDays} relevé${uniqueDays > 1 ? "s" : ""} King_TCG enregistré${uniqueDays > 1 ? "s" : ""}`,
    hasTrend7d || hasTrend30d
      ? `repère${hasTrend7d && hasTrend30d ? "s" : ""} ${[hasTrend7d ? "7 j" : "", hasTrend30d ? "30 j" : ""].filter(Boolean).join(" et ")}`
      : "aucun repère de tendance fournisseur",
  ];

  return {
    coverage,
    quality,
    label,
    sourceCount: sources.length,
    observedHistoryPoints: uniqueDays,
    hasTrend7d,
    hasTrend30d,
    evidence,
    uncertaintyRate: quality === "strong" ? 0.05 : quality === "moderate" ? 0.09 : quality === "limited" ? 0.14 : 0.2,
  };
}
