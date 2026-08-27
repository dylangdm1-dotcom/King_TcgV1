import type { CatalogLanguageV2, CatalogSnapshotV2 } from "../schema";
import { normalizeCatalogCode } from "../identity";

export interface CatalogLanguageCoverageV2 {
  language: CatalogLanguageV2;
  baselineSets: number;
  candidateSets: number;
  setDelta: number;
  baselineCards: number;
  candidateCards: number;
  cardDelta: number;
  missingBaselineSetCodes: string[];
  newSetCodes: string[];
  regressed: boolean;
}

export interface CatalogCoverageReportV2 {
  baselineName: string;
  candidateVersion: string;
  languages: CatalogLanguageCoverageV2[];
  hasRegression: boolean;
}

export function compareCatalogCoverageV2(
  candidate: CatalogSnapshotV2,
  baseline: CatalogSnapshotV2,
  baselineName = "catalogue-actif"
): CatalogCoverageReportV2 {
  const languages = Array.from(new Set([...baseline.languages, ...candidate.languages]));
  const rows = languages.map((language) => {
    const baselineSets = baseline.sets.filter((entry) => entry.language === language);
    const candidateSets = candidate.sets.filter((entry) => entry.language === language);
    const baselineCodes = new Set(baselineSets.map((entry) => normalizeCatalogCode(entry.code)));
    const candidateCodes = new Set(candidateSets.map((entry) => normalizeCatalogCode(entry.code)));
    const missingBaselineSetCodes = Array.from(baselineCodes).filter((code) => !candidateCodes.has(code)).sort();
    const newSetCodes = Array.from(candidateCodes).filter((code) => !baselineCodes.has(code)).sort();
    const baselineCards = baseline.cards.filter((entry) => entry.language === language).length;
    const candidateCards = candidate.cards.filter((entry) => entry.language === language).length;
    return {
      language,
      baselineSets: baselineSets.length,
      candidateSets: candidateSets.length,
      setDelta: candidateSets.length - baselineSets.length,
      baselineCards,
      candidateCards,
      cardDelta: candidateCards - baselineCards,
      missingBaselineSetCodes,
      newSetCodes,
      regressed: missingBaselineSetCodes.length > 0 || candidateCards < baselineCards,
    };
  });
  return {
    baselineName,
    candidateVersion: candidate.catalogVersion,
    languages: rows,
    hasRegression: rows.some((entry) => entry.regressed),
  };
}
