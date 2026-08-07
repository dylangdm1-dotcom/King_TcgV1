import {
  enrichAndCacheCards,
  getAllSets,
  searchCards,
  searchCardsBySetId,
  type LanguageCode,
} from "@/lib/pokemon";
import type { CardScanResult, PokemonCard } from "@/lib/types";
import { logger } from "@/lib/cache/logger";

function normalizeText(value?: string | null) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\u3040-\u30ff\u3400-\u9fff]+/g, " ")
    .trim();
}

function cleanCardNumber(value?: string | null) {
  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw) return "";
  const firstPart = raw.split("/")[0] ?? raw;
  return firstPart.replace(/[^a-z0-9]/g, "").replace(/^0+(?=\d)/, "");
}

function toLanguageCode(language?: string | null): LanguageCode {
  const value = String(language ?? "fr").toLowerCase().replace("_", "-");
  if (["ja", "jp", "jpn", "japanese", "japonais"].includes(value)) return "ja";
  if (["zh", "zh-cn", "zh-tw", "cn", "tw", "chinese", "chinois"].includes(value)) return "zh-tw";
  if (["en", "eng", "english", "anglais"].includes(value)) return "en";
  return "fr";
}

function dedupe(cards: PokemonCard[]) {
  const map = new Map<string, PokemonCard>();
  for (const card of cards) {
    const key = `${normalizeText(card.name)}_${cleanCardNumber(card.number)}_${normalizeText(card.set?.id)}`;
    if (!map.has(key)) map.set(key, card);
  }
  return Array.from(map.values());
}

function getNames(scan: CardScanResult) {
  return Array.from(
    new Set(
      [scan.cardName, scan.pokemonName, ...(scan.possibleNames ?? [])]
        .filter((value): value is string => Boolean(value?.trim()))
        .map((value) => value.trim())
    )
  );
}

function scoreSet(set: any, scan: CardScanResult) {
  const targets = [scan.setSymbol, scan.setName]
    .filter((value): value is string => Boolean(value?.trim()))
    .map(normalizeText);
  if (!targets.length) return 0;

  const id = normalizeText(set?.id);
  const name = normalizeText(set?.name);
  const series = normalizeText(set?.series?.name ?? set?.series);
  const haystack = `${id} ${name} ${series}`;

  let score = 0;
  for (const target of targets) {
    if (!target) continue;
    if (id === target) score += 1000;
    else if (id.includes(target) || target.includes(id)) score += 650;
    if (name === target) score += 800;
    else if (name.includes(target) || target.includes(name)) score += 500;
    if (series.includes(target)) score += 150;
  }
  return score;
}

function scoreCard(card: PokemonCard, scan: CardScanResult, language: LanguageCode) {
  let score = 0;
  const targetNumber = cleanCardNumber(scan.cardNumber);
  const cardNumber = cleanCardNumber(card.number);
  const cardName = normalizeText(card.name);
  const names = getNames(scan).map(normalizeText).filter(Boolean);
  const setTargets = [scan.setSymbol, scan.setName].map(normalizeText).filter(Boolean);
  const cardSet = normalizeText(`${card.set?.id ?? ""} ${card.set?.name ?? ""}`);

  if (targetNumber && cardNumber === targetNumber) score += 1200;
  else if (targetNumber && cardNumber.includes(targetNumber)) score += 280;

  for (const name of names) {
    if (cardName === name) score += 650;
    else if (cardName.includes(name) || name.includes(cardName)) score += 260;
  }

  for (const setTarget of setTargets) {
    if (cardSet.includes(setTarget)) score += 450;
  }

  if (card.id.startsWith(`tcgdex-${language}-`)) score += 180;
  if (!card.id.startsWith("tcgdex-") && (language === "fr" || language === "en")) score += 120;
  if (card.images?.large || card.images?.small) score += 20;
  if (card.rarity) score += 10;

  return score;
}

async function searchByDetectedSet(scan: CardScanResult, language: LanguageCode) {
  if (!scan.setName && !scan.setSymbol) return [] as PokemonCard[];

  try {
    const sets = await getAllSets(language);
    const candidates = sets
      .map((set: any) => ({ set, score: scoreSet(set, scan) }))
      .filter(({ score }: { score: number }) => score > 0)
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, 4);

    const results: PokemonCard[] = [];
    for (const { set } of candidates) {
      const cards = await searchCardsBySetId(set.id, language);
      results.push(...cards);
    }
    return results;
  } catch (error) {
    logger.warn("SCAN", "Recherche par extension détectée indisponible");
    return [];
  }
}

/**
 * Recherche dédiée au scanner. Elle appelle les mêmes fonctions publiques que
 * la recherche manuelle, mais garde son classement spécifique dans un module
 * isolé afin de ne jamais modifier les résultats de la page Recherche.
 */
export async function searchCardsForScan(scan: CardScanResult): Promise<PokemonCard[]> {
  const language = toLanguageCode(scan.language);
  const names = getNames(scan);
  const targetNumber = cleanCardNumber(scan.cardNumber);
  let candidates: PokemonCard[] = [];

  logger.api(
    `[SCAN SEARCH V5.02] langue=${language}, numéro=${targetNumber || "—"}, extension=${scan.setSymbol || scan.setName || "—"}`
  );

  // JP/CN : extension + numéro en priorité. FR/EN : recherche par nom d'abord.
  if (language === "ja" || language === "zh-tw") {
    candidates.push(...(await searchByDetectedSet(scan, language)));
  }

  for (const name of names.slice(0, 5)) {
    try {
      candidates.push(...(await searchCards(name, language)));
    } catch (error) {
      logger.warn("SCAN", `Recherche standard impossible pour ${name}`);
    }
  }

  if ((language === "fr" || language === "en") && (scan.setName || scan.setSymbol)) {
    candidates.push(...(await searchByDetectedSet(scan, language)));
  }

  const ranked = dedupe(candidates)
    .map((card) => ({ card, score: scoreCard(card, scan, language) }))
    .sort((a, b) => b.score - a.score)
    .map(({ card }) => card)
    .slice(0, 12);

  if (!ranked.length) return [];

  // Même enrichissement et même cache que la recherche manuelle, uniquement
  // sur les meilleurs candidats pour préserver la vitesse du scanner.
  return enrichAndCacheCards(ranked);
}
