import { CATALOG_SCHEMA_VERSION, type CatalogCardV2, type CatalogVariantV2, type CatalogVisualV2 } from "../schema";
import { canonicalCardId, resolveCatalogLanguage } from "../identity";
import { normalizeCatalogVariants } from "../variants";
import { mergeCatalogCardV2 } from "../merge";
import { buildSeries, buildSet, isoDate, mapProviderLanguage, numberValue, sourceRef, textValue, uniqueVisuals, visual } from "./common";
import type { CatalogAdapterContextV2, CatalogImportBatchV2, CatalogImportIssueV2, CatalogProviderV2 } from "./types";

type Json = Record<string, unknown>;
const record = (value: unknown): Json => value && typeof value === "object" && !Array.isArray(value) ? value as Json : {};

function collectVariantLabels(cardRaw: Json): string[] {
  const labels: string[] = [];
  const direct = textValue(cardRaw.variant_type ?? cardRaw.sub_type_name ?? cardRaw.variant);
  if (direct) labels.push(direct);
  for (const market of [cardRaw.tcgplayer, cardRaw.cardmarket, cardRaw.prices]) {
    const marketRaw = record(market);
    const rows = Array.isArray(market) ? market : Object.values(marketRaw);
    for (const row of rows) {
      const item = record(row);
      const label = textValue(item.sub_type_name ?? item.variant_type ?? item.variant);
      if (label) labels.push(label);
    }
  }
  return labels;
}

function imageCandidates(
  cardRaw: Json,
  sourceId: string,
  source: ReturnType<typeof sourceRef>,
  provider: CatalogProviderV2
): CatalogVisualV2[] {
  const images = record(cardRaw.images);
  const languages = record(images.languages);
  const chinese = record(languages.chn ?? languages["zh-tw"] ?? languages["zh-cn"]);
  const rawUrls = [chinese.large, chinese.high, chinese.small, cardRaw.image_url, cardRaw.image];
  return uniqueVisuals([
    ...rawUrls.map((url, index) => visual(url, index < 2 ? "card" : "thumbnail", source)),
    provider === "pokewallet" ? visual(`/api/catalog/image?id=${encodeURIComponent(sourceId)}&lang=zh-tw&size=large`, "card", source) : undefined,
    provider === "pokewallet" ? visual(`/api/catalog/image?id=${encodeURIComponent(sourceId)}&lang=zh-tw&size=small`, "thumbnail", source) : undefined,
  ]);
}

function mergeVariants(existing: CatalogVariantV2[], incoming: CatalogVariantV2[]): CatalogVariantV2[] {
  const values = [...existing, ...incoming];
  return Array.from(new Map(values.map((entry) => [`${entry.kind}:${entry.label}`, entry])).values());
}

export function adaptPokewalletSetV2(raw: unknown, context: CatalogAdapterContextV2): CatalogImportBatchV2 {
  const container = record(raw);
  const setRaw = record(container.set ?? container.data ?? raw);
  const provider: CatalogProviderV2 = context.sourceUrl?.includes("/api/catalog/") ? "pokewallet_public" : "pokewallet";
  const issues: CatalogImportIssueV2[] = [];
  const numericId = textValue(setRaw.set_id ?? setRaw.id);
  const code = textValue(setRaw.set_code ?? setRaw.code) || numericId;
  const name = textValue(setRaw.name ?? setRaw.set_name);
  if (!code || !name) {
    issues.push({ severity: "error", code: "POKEWALLET_SET_INVALID", message: "Extension PokéWallet sans code/id ou nom.", provider, ...(numericId ? { sourceId: numericId } : {}) });
    return { provider, language: context.language, syncedAt: context.syncedAt, series: [], sets: [], cards: [], issues };
  }
  const declared = mapProviderLanguage(setRaw.language, context.language);
  const language = resolveCatalogLanguage(declared, code);
  if (language !== declared) issues.push({ severity: "warning", code: "LANGUAGE_CORRECTED_CN", message: `${code} reclassé dans le catalogue chinois.`, provider, sourceId: numericId ?? code });
  const source = sourceRef(provider, numericId ?? code, context.syncedAt, context.sourceUrl);
  const seriesName = textValue(setRaw.series ?? setRaw.era) || "Pokémon chinois";
  const series = buildSeries(language, seriesName, source, context.syncedAt);
  const cardsRaw = Array.isArray(container.cards) ? container.cards : Array.isArray(setRaw.cards) ? setRaw.cards : [];
  const set = buildSet({
    declaredLanguage: language,
    code,
    name,
    series,
    source,
    releaseDate: isoDate(setRaw.release_date ?? setRaw.releaseDate),
    officialCardCount: numberValue(setRaw.official_card_count),
    knownCardCount: numberValue(setRaw.card_count) ?? cardsRaw.length,
    availability: cardsRaw.length > 0 ? "available" : "metadata_only",
    syncedAt: context.syncedAt,
  });

  const cardsById = new Map<string, CatalogCardV2>();
  for (let index = 0; index < cardsRaw.length; index += 1) {
    const entry = cardsRaw[index];
    const cardRaw = record(entry);
    const info = record(cardRaw.card_info);
    const publicNumber = textValue(cardRaw.card_number ?? info.card_number ?? cardRaw.number);
    const cardSourceId = textValue(cardRaw.id ?? cardRaw.card_id)
      ?? (provider === "pokewallet_public" && publicNumber ? `public:${code}:${publicNumber}:${index}` : undefined);
    const number = textValue(cardRaw.card_number ?? info.card_number ?? cardRaw.number);
    const cardName = textValue(info.name ?? cardRaw.name ?? cardRaw.card_name ?? cardRaw.clean_name);
    if (!cardSourceId || !number || !cardName) {
      issues.push({ severity: "warning", code: "POKEWALLET_CARD_SKIPPED", message: "Carte PokéWallet incomplète ignorée.", provider, ...(cardSourceId ? { sourceId: cardSourceId } : {}) });
      continue;
    }
    const id = canonicalCardId(language, set.id, number);
    const cardSource = sourceRef(provider, cardSourceId, context.syncedAt);
    const visuals = imageCandidates(cardRaw, cardSourceId, cardSource, provider);
    const incoming: CatalogCardV2 = {
      schemaVersion: CATALOG_SCHEMA_VERSION,
      id,
      language,
      setId: set.id,
      number,
      name: cardName,
      aliases: [],
      sources: cardSource ? [cardSource] : [],
      ...(textValue(cardRaw.rarity ?? info.rarity) ? { rarity: textValue(cardRaw.rarity ?? info.rarity) } : {}),
      variants: normalizeCatalogVariants(collectVariantLabels(cardRaw)),
      ...(visuals[0] ? { visual: visuals[0] } : {}),
      visuals,
      ...(context.syncedAt ? { lastSyncedAt: context.syncedAt } : {}),
    };
    const existing = cardsById.get(id);
    cardsById.set(id, existing ? {
      ...mergeCatalogCardV2(existing, incoming),
      variants: mergeVariants(existing.variants, incoming.variants),
    } : incoming);
  }
  return { provider, language, syncedAt: context.syncedAt, series: [series], sets: [set], cards: Array.from(cardsById.values()), issues };
}
