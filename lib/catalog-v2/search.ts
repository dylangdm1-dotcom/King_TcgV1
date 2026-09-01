"use client";

import type {
  CardPrintVariant,
  CardPrintVariantKey,
  PokemonCard,
} from "../types";
import type {
  CatalogCardV2,
  CatalogLanguageV2,
  CatalogSetV2,
  CatalogVisualV2,
} from "./schema";
import {
  loadLocalCatalogLanguageV2,
  loadLocalCatalogSetCardsV2,
} from "./local/client";
import type { CatalogLocalCoverageStatusV2 } from "./local/schema";
import { CHINESE_SET_CATALOG } from "../regionalSetCatalog";
import { pokewalletPrintVariantsV285 } from "./printVariants";

export interface SearchCatalogSetV278 {
  id: string;
  canonicalId: string;
  name: string;
  aliases: string[];
  series: string;
  total: number;
  printedTotal: number;
  identityCount: number;
  sourceCardCount: number;
  releaseDate?: string;
  images: { symbol?: string; logo?: string };
  availability: "available" | "announced" | "metadata_only" | "unknown";
  coverage: CatalogLocalCoverageStatusV2;
  localCardsAvailable: boolean;
}

export interface SearchLocalSetCardsV278 {
  status: CatalogLocalCoverageStatusV2;
  cards: PokemonCard[];
}

function normalizedCode(value: string): string {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function canonicalChineseSetName(code: string, fallback: string): string {
  const wanted = normalizedCode(code);
  const entry = CHINESE_SET_CATALOG.find((candidate) =>
    [candidate.code, ...(candidate.providerCodes ?? [])].some(
      (value) => normalizedCode(value) === wanted
    )
  );
  return entry?.name || fallback;
}

function visualUrls(visual: CatalogVisualV2 | undefined, visuals: CatalogVisualV2[]): string[] {
  return Array.from(new Set([visual?.url, ...visuals.map((entry) => entry.url)].filter(Boolean))) as string[];
}

function setImages(set: CatalogSetV2): { symbol?: string; logo?: string } {
  const visuals = [set.visual, ...set.visuals].filter(Boolean) as CatalogVisualV2[];
  return {
    symbol: visuals.find((visual) => visual.kind === "symbol")?.url,
    logo: visuals.find((visual) => visual.kind === "logo")?.url,
  };
}

function availabilityFromCoverage(
  coverage: CatalogLocalCoverageStatusV2
): SearchCatalogSetV278["availability"] {
  if (coverage === "complete" || coverage === "partial") return "available";
  return coverage;
}

function variantKey(card: CatalogCardV2, kind: string, label: string): CardPrintVariantKey {
  if (kind === "holo") return "Holofoil";
  if (kind === "reverse") return "Reverse Holofoil";
  if (kind === "poke_ball") return "Poké Ball";
  if (kind === "master_ball") return "Master Ball";
  if (/first|1st/i.test(`${kind} ${label}`)) return "First Edition";
  return "Normal";
}

function cardVariants(card: CatalogCardV2): CardPrintVariant[] {
  const variants = new Map<CardPrintVariantKey, CardPrintVariant>();
  for (const variant of card.variants) {
    const key = variantKey(card, variant.kind, variant.label);
    variants.set(key, { key, label: variant.label || key });
  }
  if (!variants.size) variants.set("Normal", { key: "Normal", label: "Normal" });
  return Array.from(variants.values());
}

function runtimeCardId(card: CatalogCardV2): string {
  const tcgdex = card.sources.find((source) => source.provider === "tcgdex" && source.sourceId);
  if (tcgdex) return `tcgdex-${card.language}-${tcgdex.sourceId}`;
  return card.id;
}

function runtimeSetId(card: CatalogCardV2, set: CatalogSetV2): string {
  const cardSource = card.sources.find((source) => source.provider === "tcgdex" && source.sourceId)?.sourceId;
  if (cardSource) {
    const suffix = `-${card.number}`.toLowerCase();
    if (cardSource.toLowerCase().endsWith(suffix)) {
      return cardSource.slice(0, -suffix.length);
    }
  }
  const setSources = set.sources.filter((source) => source.provider === "tcgdex" && source.sourceId);
  return setSources[setSources.length - 1]?.sourceId || set.code;
}

function toPokemonCard(
  card: CatalogCardV2,
  set: CatalogSetV2,
  seriesName: string,
  cardCount: number
): PokemonCard {
  const candidates = visualUrls(card.visual, card.visuals);
  const pokewallet = card.sources.find((source) => source.provider === "pokewallet" && source.sourceId);
  const providerVariants = pokewalletPrintVariantsV285(card);
  const variants = providerVariants.length ? providerVariants : cardVariants(card);
  const primaryVariant = variants[0];
  const large = primaryVariant?.images?.large || card.visuals.find((visual) => visual.kind === "card")?.url || card.visual?.url || candidates[0] || "/placeholder.png";
  const small = primaryVariant?.images?.small || card.visuals.find((visual) => visual.kind === "thumbnail")?.url || candidates[0] || large;
  const images = setImages(set);

  return {
    id: runtimeCardId(card),
    ...(primaryVariant?.providerId || pokewallet?.sourceId
      ? { providerId: primaryVariant?.providerId || pokewallet?.sourceId }
      : {}),
    name: card.name,
    number: card.number,
    rarity: card.rarity === "None" ? undefined : card.rarity,
    images: { small, large },
    imageCandidates: Array.from(new Set([
      ...(primaryVariant?.imageCandidates || []),
      large,
      small,
      ...candidates,
      "/placeholder.png",
    ])),
    availablePrintVariants: variants,
    selectedPrintVariant: primaryVariant?.key,
    set: {
      id: runtimeSetId(card, set),
      name: set.name,
      series: seriesName,
      printedTotal: set.officialCardCount || cardCount,
      total: set.knownCardCount || cardCount,
      releaseDate: set.releaseDate,
      images,
    },
    dataLanguage: card.language,
    quantity: 0,
    favorite: false,
  };
}

export async function loadSearchCatalogSetsV278(
  language: CatalogLanguageV2
): Promise<SearchCatalogSetV278[]> {
  const bundle = await loadLocalCatalogLanguageV2(language);
  const seriesNames = new Map(bundle.series.series.map((series) => [series.id, series.name]));
  const entries = new Map(bundle.language.setEntries.map((entry) => [entry.setId, entry]));

  return bundle.sets.sets.map((set) => {
    const entry = entries.get(set.id);
    const coverage = entry?.status || (set.availability === "announced" ? "announced" : "metadata_only");
    return {
      id: set.code,
      canonicalId: set.id,
      name: language === "zh-tw" ? canonicalChineseSetName(set.code, set.name) : set.name,
      aliases: set.aliases,
      series: seriesNames.get(set.seriesId) || "Pokémon TCG",
      total: entry?.sourceCardCount || set.knownCardCount || entry?.cardCount || set.officialCardCount || 0,
      printedTotal: entry?.officialCardCount || set.officialCardCount || 0,
      identityCount: entry?.cardCount || 0,
      sourceCardCount: entry?.sourceCardCount || entry?.cardCount || 0,
      releaseDate: set.releaseDate,
      images: setImages(set),
      availability: availabilityFromCoverage(coverage),
      coverage,
      localCardsAvailable: Boolean(entry?.cards),
    };
  });
}

export async function loadSearchCatalogSetCardsV278(
  language: CatalogLanguageV2,
  setCode: string
): Promise<SearchLocalSetCardsV278 | undefined> {
  const bundle = await loadLocalCatalogLanguageV2(language);
  const wanted = normalizedCode(setCode);
  const set = bundle.sets.sets.find((entry) =>
    normalizedCode(entry.code) === wanted || normalizedCode(entry.id) === wanted
  );
  if (!set) return undefined;

  const entry = bundle.language.setEntries.find((candidate) => candidate.setId === set.id);
  if (!entry?.cards) return entry ? { status: entry.status, cards: [] } : undefined;

  const file = await loadLocalCatalogSetCardsV2(language, set.id);
  if (!file) return { status: entry.status, cards: [] };
  const seriesName = bundle.series.series.find((series) => series.id === set.seriesId)?.name || "Pokémon TCG";
  const runtimeSet = language === "zh-tw"
    ? { ...set, name: canonicalChineseSetName(set.code, set.name) }
    : set;
  return {
    status: file.status,
    cards: file.cards.map((card) => toPokemonCard(card, runtimeSet, seriesName, file.cards.length)),
  };
}

export function mergeSearchCatalogSetsV278(
  localSets: SearchCatalogSetV278[],
  liveSets: any[]
): any[] {
  const merged = new Map<string, any>();
  for (const local of localSets) merged.set(normalizedCode(local.id), local);

  for (const live of liveSets) {
    const key = normalizedCode(String(live?.id || ""));
    if (!key) continue;
    const local = merged.get(key) as SearchCatalogSetV278 | undefined;
    if (!local) {
      merged.set(key, live);
      continue;
    }

    const liveHasCards = Number(live?.total || live?.printedTotal || 0) > 0 || live?.availability === "available";
    merged.set(key, {
      ...live,
      ...local,
      name: local.name || live.name,
      aliases: Array.from(new Set([...(local.aliases || []), ...(live.aliases || [])])),
      series: local.series || live.series,
      releaseDate: live.releaseDate || local.releaseDate || "",
      total: liveHasCards ? Number(live.total || live.printedTotal || local.total || 0) : local.total,
      printedTotal: Number(live.printedTotal || local.printedTotal || 0),
      availability: liveHasCards ? "available" : local.availability,
      images: { ...(local.images || {}), ...(live.images || {}) },
    });
  }

  return Array.from(merged.values());
}
