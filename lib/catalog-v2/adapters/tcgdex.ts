import {
  CATALOG_SCHEMA_VERSION,
  type CatalogCardV2,
  type CatalogLanguageV2,
} from "../schema";
import { canonicalCardId, resolveCatalogLanguage } from "../identity";
import { normalizeCatalogVariants } from "../variants";
import {
  buildSeries,
  buildSet,
  mapProviderLanguage,
  numberValue,
  sourceRef,
  textValue,
  uniqueVisuals,
  visual,
  isoDate,
} from "./common";
import type { CatalogAdapterContextV2, CatalogImportBatchV2, CatalogImportIssueV2 } from "./types";

type Json = Record<string, unknown>;

function record(value: unknown): Json {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Json : {};
}

function tcgdexImage(base: unknown, size: "low" | "high"): string | undefined {
  const url = textValue(base);
  if (!url) return undefined;
  return /\.(?:webp|png|jpe?g)$/i.test(url) ? url : `${url}/${size}.webp`;
}

function tcgdexVariants(value: unknown): string[] {
  if (Array.isArray(value)) {
    const labels: string[] = [];
    for (const entry of value) {
      if (typeof entry === "string") {
        labels.push(entry);
        continue;
      }
      const variant = record(entry);
      const type = textValue(variant.type);
      const subtype = textValue(variant.subtype);
      if (type) labels.push(type);
      if (subtype && /(?:master[ -]?ball|poke[ -]?ball)/i.test(subtype)) labels.push(subtype);
      const stamps = Array.isArray(variant.stamp) ? variant.stamp : [];
      for (const stamp of stamps) {
        const label = textValue(stamp);
        if (label) labels.push(`${label} stamp`);
      }
    }
    return labels;
  }
  const variants = record(value);
  return [
    variants.normal ? "Normal" : undefined,
    variants.holo ? "Holofoil" : undefined,
    variants.reverse ? "Reverse Holofoil" : undefined,
    variants.firstEdition ? "1st Edition" : undefined,
  ].filter((entry): entry is string => Boolean(entry));
}

export function adaptTcgdexSetV2(raw: unknown, context: CatalogAdapterContextV2): CatalogImportBatchV2 {
  const provider = "tcgdex" as const;
  const issues: CatalogImportIssueV2[] = [];
  const setRaw = record(raw);
  const sourceId = textValue(setRaw.id);
  const code = sourceId || textValue(setRaw.code);
  const name = textValue(setRaw.name);
  if (!code || !name) {
    issues.push({ severity: "error", code: "TCGDEX_SET_INVALID", message: "Extension TCGdex sans id ou nom.", provider, ...(sourceId ? { sourceId } : {}) });
    return { provider, language: context.language, syncedAt: context.syncedAt, series: [], sets: [], cards: [], issues };
  }

  const declaredLanguage = mapProviderLanguage(setRaw.language, context.language);
  const language = resolveCatalogLanguage(declaredLanguage, code);
  if (language !== declaredLanguage) {
    issues.push({ severity: "warning", code: "LANGUAGE_CORRECTED_CN", message: `${code} reclassé dans le catalogue chinois.`, provider, sourceId });
  }
  const seriesRaw = record(setRaw.serie ?? setRaw.series);
  const seriesName = textValue(seriesRaw.name) || "Série non classée";
  const source = sourceRef(provider, sourceId, context.syncedAt, context.sourceUrl);
  const series = buildSeries(language, seriesName, source, context.syncedAt);
  const cardCount = record(setRaw.cardCount);
  const setVisuals = uniqueVisuals([
    visual(tcgdexImage(setRaw.logo, "high"), "logo", source),
    visual(tcgdexImage(setRaw.symbol, "high"), "symbol", source),
  ]);
  const cardsRaw = Array.isArray(setRaw.cards) ? setRaw.cards : [];
  const set = buildSet({
    declaredLanguage: language,
    code,
    name,
    series,
    source,
    releaseDate: isoDate(setRaw.releaseDate),
    officialCardCount: numberValue(cardCount.official),
    knownCardCount: numberValue(cardCount.total) ?? cardsRaw.length,
    availability: cardsRaw.length > 0 ? "available" : "metadata_only",
    visuals: setVisuals,
    syncedAt: context.syncedAt,
  });

  const cards: CatalogCardV2[] = [];
  for (const entry of cardsRaw) {
    const cardRaw = record(entry);
    const cardSourceId = textValue(cardRaw.id);
    const number = textValue(cardRaw.localId ?? cardRaw.number);
    const cardName = textValue(cardRaw.name);
    if (!cardSourceId || !number || !cardName) {
      issues.push({ severity: "warning", code: "TCGDEX_CARD_SKIPPED", message: "Carte TCGdex incomplète ignorée.", provider, ...(cardSourceId ? { sourceId: cardSourceId } : {}) });
      continue;
    }
    const cardSource = sourceRef(provider, cardSourceId, context.syncedAt);
    const visuals = uniqueVisuals([
      visual(tcgdexImage(cardRaw.image, "high"), "card", cardSource, "candidate", { width: 734, height: 1024 }),
      visual(tcgdexImage(cardRaw.image, "low"), "thumbnail", cardSource, "candidate", { width: 245, height: 337 }),
    ]);
    cards.push({
      schemaVersion: CATALOG_SCHEMA_VERSION,
      id: canonicalCardId(language, set.id, number),
      language,
      setId: set.id,
      number,
      name: cardName,
      aliases: [],
      sources: cardSource ? [cardSource] : [],
      ...(textValue(cardRaw.rarity) ? { rarity: textValue(cardRaw.rarity) } : {}),
      variants: normalizeCatalogVariants(tcgdexVariants(cardRaw.variants)),
      ...(visuals[0] ? { visual: visuals[0] } : {}),
      visuals,
      ...(context.syncedAt ? { lastSyncedAt: context.syncedAt } : {}),
    });
  }

  return { provider, language, syncedAt: context.syncedAt, series: [series], sets: [set], cards, issues };
}
