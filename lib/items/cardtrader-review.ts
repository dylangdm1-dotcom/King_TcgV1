import type {
  CardTraderExpansion,
  CardTraderFrenchItemCandidate,
  CardTraderSealedCategory,
} from "./sources/cardtrader-types";

export interface CardTraderReferenceResponseV295 {
  success: boolean;
  game?: { id: number; name?: string; display_name?: string };
  sealedCategories?: CardTraderSealedCategory[];
  expansions?: CardTraderExpansion[];
  count?: number;
  error?: string;
}

export interface CardTraderPreviewResponseV295 {
  success: boolean;
  expansion?: CardTraderExpansion;
  candidates?: CardTraderFrenchItemCandidate[];
  coverage?: { candidates: number; withImage: number; withEurPrice: number };
  error?: string;
}

export interface CardTraderApprovedItemV295 extends CardTraderFrenchItemCandidate {
  approvedName: string;
  reviewNote?: string;
}

export interface CardTraderReviewExportV295 {
  schemaVersion: 1;
  kind: "king_tcg_cardtrader_fr_review";
  generatedAt: string;
  expansion: CardTraderExpansion;
  approvedCount: number;
  rejectedCount: number;
  approved: CardTraderApprovedItemV295[];
}

function clean(value: unknown, maximum = 240): string {
  return String(value || "").trim().replace(/[\u0000-\u001F\u007F]/g, "").slice(0, maximum);
}

export function buildCardTraderReviewExportV295(options: {
  expansion: CardTraderExpansion;
  candidates: CardTraderFrenchItemCandidate[];
  approvedIds: ReadonlySet<number>;
  names: Record<number, string>;
  notes: Record<number, string>;
}): CardTraderReviewExportV295 {
  const approved = options.candidates
    .filter((candidate) => options.approvedIds.has(candidate.blueprintId))
    .map((candidate) => ({
      ...candidate,
      approvedName: clean(options.names[candidate.blueprintId] || candidate.name),
      reviewNote: clean(options.notes[candidate.blueprintId], 500) || undefined,
    }))
    .filter((candidate) => candidate.approvedName);

  return {
    schemaVersion: 1,
    kind: "king_tcg_cardtrader_fr_review",
    generatedAt: new Date().toISOString(),
    expansion: options.expansion,
    approvedCount: approved.length,
    rejectedCount: Math.max(0, options.candidates.length - approved.length),
    approved,
  };
}

export function cardTraderReviewFilenameV295(expansion: CardTraderExpansion): string {
  const code = clean(expansion.code || expansion.name, 80)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || String(expansion.id);
  return `king-tcg-items-fr-${code}-review.json`;
}
