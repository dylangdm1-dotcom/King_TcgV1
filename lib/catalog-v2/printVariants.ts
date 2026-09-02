import type { CardPrintVariant } from "../types";
import type { CatalogCardV2, CatalogVisualV2 } from "./schema";

function unique(values: Array<string | undefined>): string[] {
  return Array.from(new Set(values.filter(Boolean))) as string[];
}

function preferredLarge(visuals: CatalogVisualV2[]): string | undefined {
  return visuals.find((visual) => visual.kind === "card" && /[?&]size=high(?:&|$)/.test(visual.url))?.url
    || visuals.find((visual) => visual.kind === "card" && /[?&]size=large(?:&|$)/.test(visual.url))?.url
    || visuals.find((visual) => visual.kind === "card")?.url;
}

function preferredSmall(visuals: CatalogVisualV2[]): string | undefined {
  return visuals.find((visual) => visual.kind === "thumbnail" && /[?&]size=low(?:&|$)/.test(visual.url))?.url
    || visuals.find((visual) => visual.kind === "thumbnail" && /[?&]size=small(?:&|$)/.test(visual.url))?.url
    || visuals.find((visual) => visual.kind === "thumbnail")?.url;
}

/**
 * Une carte canonique peut représenter plusieurs impressions PokéWallet.
 * Chaque option garde son identifiant fournisseur et ses visuels sans créer
 * de faux doublon dans le catalogue, le Scanner ou la Collection.
 */
export function pokewalletPrintVariantsV285(card: CatalogCardV2): CardPrintVariant[] {
  const sources = Array.from(
    new Map(
      card.sources
        .filter((source) => source.provider === "pokewallet" && source.sourceId)
        .map((source) => [source.sourceId, source])
    ).values()
  );
  if (!sources.length) return [];

  return sources.map((source, index) => {
    const visuals = card.visuals.filter((visual) =>
      visual.source?.provider === source.provider
      && visual.source?.sourceId === source.sourceId
    );
    const large = preferredLarge(visuals) || card.visual?.url || "/placeholder.png";
    const small = preferredSmall(visuals) || large;
    const candidates = unique([
      large,
      small,
      ...visuals.map((visual) => visual.url),
      "/placeholder.png",
    ]);
    const multiple = sources.length > 1;

    return {
      key: multiple ? `PokéWallet:${source.sourceId}` : "Normal",
      label: multiple ? `Impression ${index + 1} / ${sources.length}` : "Normal",
      providerId: source.sourceId,
      marketPrinting: "Normal",
      images: { small, large },
      imageCandidates: candidates,
    };
  });
}

/** Compte les impressions physiques réellement reliées à l'identité canonique. */
export function pokewalletPrintCountV292(card: CatalogCardV2): number {
  return new Set(
    card.sources
      .filter((source) => source.provider === "pokewallet" && source.sourceId)
      .map((source) => source.sourceId)
  ).size;
}
