export type CatalogCoverageBasisV292 = "canonical_identities" | "provider_prints";

export interface CatalogCountInputV292 {
  cardCount?: number;
  identityCount?: number;
  sourceCardCount?: number;
  providerPrintCount?: number;
  officialCardCount?: number;
  knownCardCount?: number;
  coverageBasis?: CatalogCoverageBasisV292;
}

function validCount(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.trunc(parsed) : 0;
}

/** Les identités pilotent la grille; les impressions pilotent la couverture fournisseur. */
export function catalogCountsV292(input: CatalogCountInputV292) {
  const identityCount = validCount(
    input.identityCount ?? input.cardCount ?? input.knownCardCount
  );
  const legacySourceCount = validCount(input.sourceCardCount);
  const providerPrintCount = validCount(
    input.providerPrintCount
      ?? (input.coverageBasis === "provider_prints" ? legacySourceCount : identityCount)
  );
  const officialCardCount = validCount(input.officialCardCount);

  return {
    identityCount,
    providerPrintCount,
    officialCardCount,
    hasGroupedPrints: providerPrintCount > identityCount && identityCount > 0,
  };
}

export function coverageCountV292(input: CatalogCountInputV292): number {
  const counts = catalogCountsV292(input);
  return input.coverageBasis === "provider_prints"
    ? counts.providerPrintCount
    : counts.identityCount;
}
