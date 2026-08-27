import { CATALOG_SCHEMA_VERSION, type CatalogCardV2 } from "../schema";
import { canonicalCardId, resolveCatalogLanguage } from "../identity";
import { normalizeCatalogVariants } from "../variants";
import { buildSeries, buildSet, isoDate, numberValue, sourceRef, textValue, uniqueVisuals, visual } from "./common";
import type { CatalogAdapterContextV2, CatalogImportBatchV2, CatalogImportIssueV2 } from "./types";

type Json = Record<string, unknown>;
const record = (value: unknown): Json => value && typeof value === "object" && !Array.isArray(value) ? value as Json : {};

function pokemonVariantLabel(key: string): string {
  const labels: Record<string, string> = {
    normal: "Normal",
    holofoil: "Holofoil",
    reverseHolofoil: "Reverse Holofoil",
    firstEditionHolofoil: "1st Edition Holofoil",
    firstEditionNormal: "1st Edition Normal",
  };
  return labels[key] ?? key.replace(/([a-z])([A-Z])/g, "$1 $2");
}

function unwrap(value: unknown): unknown {
  const raw = record(value);
  return raw.data ?? value;
}

export function adaptPokemonTcgApiSetV2(
  rawSet: unknown,
  rawCards: unknown,
  context: CatalogAdapterContextV2 = { language: "en" }
): CatalogImportBatchV2 {
  const provider = "pokemon_tcg_api" as const;
  const issues: CatalogImportIssueV2[] = [];
  const setRaw = record(unwrap(rawSet));
  const sourceId = textValue(setRaw.id);
  const code = sourceId || textValue(setRaw.ptcgoCode);
  const name = textValue(setRaw.name);
  if (!code || !name) {
    issues.push({ severity: "error", code: "POKEMON_TCG_SET_INVALID", message: "Extension Pokémon TCG API sans id ou nom.", provider, ...(sourceId ? { sourceId } : {}) });
    return { provider, language: "en", syncedAt: context.syncedAt, series: [], sets: [], cards: [], issues };
  }
  const language = resolveCatalogLanguage("en", code);
  const source = sourceRef(provider, sourceId ?? code, context.syncedAt, context.sourceUrl);
  const series = buildSeries(language, textValue(setRaw.series) || "Série non classée", source, context.syncedAt);
  const setImages = record(setRaw.images);
  const setVisuals = uniqueVisuals([
    visual(setImages.logo, "logo", source),
    visual(setImages.symbol, "symbol", source),
  ]);
  const cardsContainer = record(rawCards);
  const cardsRaw = Array.isArray(cardsContainer.data) ? cardsContainer.data : Array.isArray(rawCards) ? rawCards : [];
  const set = buildSet({
    declaredLanguage: language,
    code,
    name,
    series,
    source,
    releaseDate: isoDate(setRaw.releaseDate),
    officialCardCount: numberValue(setRaw.printedTotal),
    knownCardCount: numberValue(setRaw.total) ?? cardsRaw.length,
    availability: cardsRaw.length > 0 ? "available" : "metadata_only",
    visuals: setVisuals,
    syncedAt: context.syncedAt,
  });

  const cards: CatalogCardV2[] = [];
  for (const entry of cardsRaw) {
    const cardRaw = record(entry);
    const cardSourceId = textValue(cardRaw.id);
    const number = textValue(cardRaw.number);
    const cardName = textValue(cardRaw.name);
    if (!cardSourceId || !number || !cardName) {
      issues.push({ severity: "warning", code: "POKEMON_TCG_CARD_SKIPPED", message: "Carte Pokémon TCG API incomplète ignorée.", provider, ...(cardSourceId ? { sourceId: cardSourceId } : {}) });
      continue;
    }
    const cardSource = sourceRef(provider, cardSourceId, context.syncedAt);
    const images = record(cardRaw.images);
    const visuals = uniqueVisuals([
      visual(images.large, "card", cardSource),
      visual(images.small, "thumbnail", cardSource),
    ]);
    const tcgplayer = record(cardRaw.tcgplayer);
    const priceKeys = Object.keys(record(tcgplayer.prices));
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
      variants: normalizeCatalogVariants(priceKeys.map(pokemonVariantLabel)),
      ...(visuals[0] ? { visual: visuals[0] } : {}),
      visuals,
      ...(context.syncedAt ? { lastSyncedAt: context.syncedAt } : {}),
    });
  }
  return { provider, language, syncedAt: context.syncedAt, series: [series], sets: [set], cards, issues };
}
