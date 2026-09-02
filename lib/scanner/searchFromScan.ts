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
} from "@/lib/setCatalog";
import {
  catalogSetTokensV293,
  normalizeScanLanguageV293,
  normalizeScanNumberV293,
  normalizeScanTextV293,
  scanCardEvidenceV293,
  scanSetCompatibilityV293,
  scanSetTokensV293,
} from "@/lib/scanner/catalogIdentity";

const SEARCH_TIMEOUT_MS = 12_000;
const MAX_SET_CANDIDATES = 5;
const MAX_NAME_CANDIDATES = 5;
const MAX_SCAN_CANDIDATES = 10;

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
      normalizeScanTextV293(card.name),
      normalizeScanNumberV293(card.number),
      normalizeSetId(card.set?.id),
      normalizeScanTextV293(card.variant),
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
  return Array.from(scanSetTokensV293(scan));
}

function scoreSet(set: any, scan: CardScanResult) {
  const targets = getSetTargets(scan);
  if (!targets.length) return 0;

  const compatibility = scanSetCompatibilityV293(scan, set);
  if (!compatibility.compatible) return 0;
  const available = catalogSetTokensV293(set);
  const id = normalizeSetId(set?.id);

  let score = compatibility.exact ? 4_000 : compatibility.compatible ? 1_200 : 0;
  for (const target of targets) {
    if (id && id === normalizeSetId(target)) score += 2_400;
    if (available.has(target)) score += 1_000;
  }

  const release = parseSetReleaseDate(effectiveSetReleaseDate(set?.id, set?.releaseDate));
  if (release) score += Math.min(120, Math.floor(release / 100_000_000_000));
  return score;
}

function scoreCard(card: PokemonCard, scan: CardScanResult, language: LanguageCode) {
  let score = 0;
  const evidence = scanCardEvidenceV293(card, scan);

  if (!evidence.languageExact) return -10_000;
  if (evidence.numberRequested) {
    if (evidence.numberExact) score += 2_200;
    else if (evidence.numberCompatible) score += 520;
    else score -= 700;
  }

  score += evidence.nameExact ? 1_000 : evidence.nameCompatible ? 480 : 0;
  score += evidence.setExact ? 1_900 : evidence.setCompatible ? 850 : 0;
  if (evidence.setRequested && !evidence.setCompatible) score -= 700;

  if (scan.rarity && card.rarity) {
    const scanRarity = normalizeScanTextV293(scan.rarity);
    const cardRarity = normalizeScanTextV293(card.rarity);
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
  const language = normalizeScanLanguageV293(scan.language) as LanguageCode;
  const targetNumber = normalizeScanNumberV293(scan.cardNumber);
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
