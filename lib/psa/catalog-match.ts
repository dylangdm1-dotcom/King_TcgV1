import frCatalog from "../../public/data/catalog-v2/fr/sets.json";
import enCatalog from "../../public/data/catalog-v2/en/sets.json";
import jaCatalog from "../../public/data/catalog-v2/ja/sets.json";
import type { PSALanguage } from "./types";
import { normalizePSACardNumberV280, normalizePSATextV280 } from "./identity";

type CatalogSource = { provider?: string; sourceId?: string };
type CatalogSet = {
  id: string;
  name: string;
  aliases?: string[];
  sources?: CatalogSource[];
  code?: string;
  year?: number;
};

type CatalogDocument = { sets: CatalogSet[] };

export type PSACatalogSetMatchV302 = {
  key: string;
  name: string;
  code?: string;
  year?: number;
  sourceId?: string;
  matchedAlias: string;
  confidence: "exact" | "strong";
};

const CATALOGS: Record<PSALanguage, CatalogDocument> = {
  fr: frCatalog as CatalogDocument,
  en: enCatalog as CatalogDocument,
  ja: jaCatalog as CatalogDocument,
};

function sourceId(set: CatalogSet): string | undefined {
  return set.sources?.find((source) => source.provider === "tcgdex")?.sourceId ||
    set.sources?.find((source) => source.sourceId)?.sourceId;
}

function aliasIsUseful(value: string): boolean {
  const normalized = normalizePSATextV280(value);
  return normalized.length >= 3 && !["pokemon", "promo", "cards", "card"].includes(normalized);
}

function phraseInText(text: string, phrase: string): boolean {
  return Boolean(phrase) && ` ${text} `.includes(` ${phrase} `);
}

function gallerySuffix(cardNumber: string): "tg" | "gg" | null {
  const normalized = normalizePSACardNumberV280(cardNumber);
  if (/^TG\d/i.test(normalized)) return "tg";
  if (/^GG\d/i.test(normalized)) return "gg";
  return null;
}

function relatedAliases(set: CatalogSet): string[] {
  const id = sourceId(set);
  const aliases = new Set<string>([set.name, set.code || "", ...(set.aliases || [])]);

  if (id) {
    for (const catalog of Object.values(CATALOGS)) {
      const aligned = catalog.sets.find((candidate) => sourceId(candidate) === id);
      if (!aligned) continue;
      aliases.add(aligned.name);
      aliases.add(aligned.code || "");
      for (const alias of aligned.aliases || []) aliases.add(alias);
    }
  }

  return Array.from(aliases).filter(aliasIsUseful);
}

/**
 * Résout une extension PSA dans la langue choisie en s'appuyant sur le
 * catalogue local. Les noms EN/FR alignés par l'identifiant TCGdex sont
 * acceptés, ce qui permet par exemple de convertir Crown Zenith en
 * Zénith Suprême lors d'une recherche française.
 */
export function resolvePSASetFromCatalogV302(input: {
  language: PSALanguage;
  text: unknown;
  cardNumber?: unknown;
}): PSACatalogSetMatchV302 | null {
  const text = normalizePSATextV280(input.text);
  if (!text) return null;

  const suffix = gallerySuffix(String(input.cardNumber ?? ""));
  const candidates = CATALOGS[input.language].sets.flatMap((set) => {
    const id = sourceId(set);
    const aliases = relatedAliases(set)
      .map((alias) => ({ raw: alias, normalized: normalizePSATextV280(alias) }))
      .filter(({ normalized }) => phraseInText(text, normalized));

    if (!aliases.length) return [];

    const bestAlias = aliases.sort((left, right) => right.normalized.length - left.normalized.length)[0];
    const setSuffix = id?.toLowerCase().endsWith("tg") ? "tg" : id?.toLowerCase().endsWith("gg") ? "gg" : null;
    const galleryBonus = suffix && setSuffix === suffix ? 1000 : 0;
    const galleryPenalty = suffix && setSuffix && setSuffix !== suffix ? -1000 : 0;
    const score = galleryBonus + galleryPenalty + bestAlias.normalized.length;

    return [{ set, id, bestAlias, score }];
  });

  if (!candidates.length) return null;

  // A title often contains only the base set name while a TG/GG number
  // identifies its gallery subset. Prefer the aligned gallery set.
  if (suffix) {
    const bestBase = candidates.sort((left, right) => right.score - left.score)[0];
    const baseId = bestBase.id || "";
    const basePrefix = baseId.replace(/(?:tg|gg)$/i, "");
    const gallery = CATALOGS[input.language].sets.find((set) => {
      const id = sourceId(set) || "";
      return id.toLowerCase() === `${basePrefix}${suffix}`.toLowerCase();
    });
    if (gallery) {
      return {
        key: gallery.id,
        name: gallery.name,
        code: gallery.code,
        year: gallery.year,
        sourceId: sourceId(gallery),
        matchedAlias: bestBase.bestAlias.raw,
        confidence: "strong",
      };
    }
  }

  const winner = candidates.sort((left, right) => right.score - left.score)[0];
  return {
    key: winner.set.id,
    name: winner.set.name,
    code: winner.set.code,
    year: winner.set.year,
    sourceId: winner.id,
    matchedAlias: winner.bestAlias.raw,
    confidence: normalizePSATextV280(winner.bestAlias.raw) === text ? "exact" : "strong",
  };
}
