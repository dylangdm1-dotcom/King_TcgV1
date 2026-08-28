import {
  getAllSets,
  searchCards,
  searchCardsBySetId,
  type LanguageCode,
} from "@/lib/pokemon";
import type { CardScanResult, PokemonCard } from "@/lib/types";
import { logger } from "@/lib/cache/logger";
import {
  compareCardsNewestFirst,
  effectiveSetReleaseDate,
  normalizeSetId,
  parseSetReleaseDate,
  setCodeRecency,
  setIdAliases,
} from "@/lib/setCatalog";

const SEARCH_TIMEOUT_MS = 12_000;
const MAX_SET_CANDIDATES = 5;
const MAX_NAME_CANDIDATES = 5;
const MAX_SCAN_CANDIDATES = 10;

function normalizeText(value?: string | null) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\u3040-\u30ff\u3400-\u9fff]+/g, " ")
    .trim();
}

function compactText(value?: string | null) {
  return normalizeText(value).replace(/\s+/g, "");
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

async function withTimeout<T>(promise: Promise<T>, fallback: T, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((resolve) => {
        timer = setTimeout(() => {
          logger.warn("SCAN", `${label} interrompu après ${SEARCH_TIMEOUT_MS} ms`);
          resolve(fallback);
        }, SEARCH_TIMEOUT_MS);
      }),
    ]);
  } catch (error) {
    logger.warn("SCAN", `${label} indisponible`);
    return fallback;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function dedupe(cards: PokemonCard[]) {
  const map = new Map<string, PokemonCard>();
  for (const card of cards) {
    const key = [
      normalizeText(card.name),
      cleanCardNumber(card.number),
      normalizeSetId(card.set?.id),
      normalizeText(card.variant),
    ].join("_");
    const previous = map.get(key);
    if (!previous || (!previous.images?.large && card.images?.large)) map.set(key, card);
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

function getSetTargets(scan: CardScanResult) {
  return Array.from(
    new Set(
      [scan.setSymbol, scan.setName]
        .filter((value): value is string => Boolean(value?.trim()))
        .flatMap((value) => [
          normalizeText(value),
          compactText(value),
          ...setIdAliases(value),
        ])
        .filter(Boolean)
    )
  );
}

function scoreSet(set: any, scan: CardScanResult) {
  const targets = getSetTargets(scan);
  if (!targets.length) return 0;

  const id = normalizeSetId(set?.id);
  const name = normalizeText(set?.name);
  const series = normalizeText(set?.series?.name ?? set?.series);
  const compactName = compactText(set?.name);
  const haystack = `${id} ${name} ${series}`;

  let score = 0;
  for (const target of targets) {
    const compactTarget = target.replace(/\s+/g, "");
    if (id && id === compactTarget) score += 2_400;
    else if (id && (id.includes(compactTarget) || compactTarget.includes(id))) score += 1_000;

    if (name && name === target) score += 1_700;
    else if (name && (name.includes(target) || target.includes(name))) score += 850;

    if (compactName && compactName === compactTarget) score += 1_500;
    if (series && series.includes(target)) score += 220;
    if (haystack.includes(target)) score += 100;
  }

  const release = parseSetReleaseDate(effectiveSetReleaseDate(set?.id, set?.releaseDate));
  if (release) score += Math.min(120, Math.floor(release / 100_000_000_000));
  return score;
}

function scoreCard(card: PokemonCard, scan: CardScanResult, language: LanguageCode) {
  let score = 0;
  const targetNumber = cleanCardNumber(scan.cardNumber);
  const cardNumber = cleanCardNumber(card.number);
  const cardName = normalizeText(card.name);
  const names = getNames(scan).map(normalizeText).filter(Boolean);
  const setTargets = getSetTargets(scan);
  const cardSetId = normalizeSetId(card.set?.id);
  const cardSetName = normalizeText(card.set?.name);
  const cardSet = `${cardSetId} ${cardSetName}`;

  if (targetNumber) {
    if (cardNumber === targetNumber) score += 2_200;
    else if (cardNumber.endsWith(targetNumber) || targetNumber.endsWith(cardNumber)) score += 520;
    else if (cardNumber) score -= 700;
  }

  let bestNameScore = 0;
  for (const name of names) {
    if (cardName === name) bestNameScore = Math.max(bestNameScore, 1_000);
    else if (cardName.startsWith(name) || name.startsWith(cardName)) bestNameScore = Math.max(bestNameScore, 620);
    else if (cardName.includes(name) || name.includes(cardName)) bestNameScore = Math.max(bestNameScore, 360);
  }
  score += bestNameScore;

  let matchedSet = false;
  for (const setTarget of setTargets) {
    const compactTarget = setTarget.replace(/\s+/g, "");
    if (cardSetId && cardSetId === compactTarget) {
      score += 1_900;
      matchedSet = true;
    } else if (cardSet.includes(setTarget) || cardSetId.includes(compactTarget)) {
      score += 850;
      matchedSet = true;
    }
  }
  if (setTargets.length && !matchedSet) score -= 280;

  if (scan.rarity && card.rarity) {
    const scanRarity = normalizeText(scan.rarity);
    const cardRarity = normalizeText(card.rarity);
    if (scanRarity === cardRarity || cardRarity.includes(scanRarity) || scanRarity.includes(cardRarity)) score += 80;
  }

  if (scan.variant && scan.variant !== "Unknown" && card.variant === scan.variant) score += 90;
  if (scan.isFullArt && card.isFullArt) score += 70;
  if (scan.isSecretRare && card.isSecretRare) score += 70;

  if (card.id.startsWith(`tcgdex-${language}-`)) score += 180;
  if (!card.id.startsWith("tcgdex-") && (language === "fr" || language === "en")) score += 100;
  if (card.images?.large || card.images?.small) score += 30;
  if (card.rarity) score += 10;

  // La récence départage uniquement des candidats déjà plausibles.
  if (score > 400) {
    score += Math.min(140, Math.floor(setCodeRecency(card.set?.id) / 10_000_000_000));
  }

  return score;
}

async function searchByDetectedSet(scan: CardScanResult, language: LanguageCode) {
  if (!scan.setName && !scan.setSymbol) return [] as PokemonCard[];

  const sets = await withTimeout(getAllSets(language), [] as any[], `Catalogue ${language}`);
  const candidates = sets
    .map((set: any) => ({ set, score: scoreSet(set, scan) }))
    .filter(({ score }: { score: number }) => score > 0)
    .sort((a: any, b: any) => b.score - a.score)
    .slice(0, MAX_SET_CANDIDATES);

  const results = await Promise.all(
    candidates.map(({ set }: any) =>
      withTimeout(searchCardsBySetId(set.id, language), [] as PokemonCard[], `Extension ${set.id}`)
    )
  );
  return results.flat();
}

async function searchByNames(scan: CardScanResult, language: LanguageCode) {
  const names = getNames(scan).slice(0, MAX_NAME_CANDIDATES);
  if (!names.length) return [] as PokemonCard[];

  const results = await Promise.all(
    names.map((name) => withTimeout(searchCards(name, language), [] as PokemonCard[], `Recherche ${name}`))
  );
  return results.flat();
}

function rankCards(cards: PokemonCard[], scan: CardScanResult, language: LanguageCode) {
  return dedupe(cards)
    .map((card) => ({ card, score: scoreCard(card, scan, language) }))
    .filter(({ score }) => score > -500)
    .sort((a, b) => {
      if (a.score !== b.score) return b.score - a.score;
      return compareCardsNewestFirst(a.card, b.card);
    });
}

/**
 * Recherche dédiée au scanner. Elle réutilise le catalogue, les extensions,
 * les images et le cache de la Recherche standard. La cotation est volontairement
 * déclenchée une seule fois, sur la fiche de la carte finalement validée.
 */
export async function searchCardsForScan(scan: CardScanResult): Promise<PokemonCard[]> {
  const language = toLanguageCode(scan.language);
  const targetNumber = cleanCardNumber(scan.cardNumber);
  const hasDetectedSet = Boolean(scan.setName || scan.setSymbol);
  let candidates: PokemonCard[] = [];

  logger.api(
    `[SCAN SEARCH V5.1] langue=${language}, numéro=${targetNumber || "—"}, extension=${scan.setSymbol || scan.setName || "—"}`
  );

  // Le couple extension + numéro est le signal le plus fiable dans toutes les langues.
  if (hasDetectedSet) candidates.push(...(await searchByDetectedSet(scan, language)));
  candidates.push(...(await searchByNames(scan, language)));

  // Une identité d'une autre langue n'est jamais substituée silencieusement :
  // sans candidat dans la langue détectée, le Scanner signale une absence.
  return rankCards(candidates, scan, language)
    .slice(0, MAX_SCAN_CANDIDATES)
    .map(({ card }) => card);
}
