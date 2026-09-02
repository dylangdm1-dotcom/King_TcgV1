import type { CardScanResult, PokemonCard } from "@/lib/types";
import { normalizeSetId, setIdAliases } from "@/lib/setCatalog";

export type ScanCatalogLanguageV293 = "fr" | "en" | "ja" | "zh-tw";

export function normalizeScanLanguageV293(value?: string | null): ScanCatalogLanguageV293 {
  const language = String(value ?? "fr").toLowerCase().replace("_", "-").trim();
  if (["ja", "jp", "jpn", "japanese", "japonais", "日本語"].includes(language)) return "ja";
  if (["zh", "zh-cn", "zh-tw", "cn", "tw", "chinese", "chinois", "简体中文", "繁體中文"].includes(language)) return "zh-tw";
  if (["en", "eng", "english", "anglais"].includes(language)) return "en";
  return "fr";
}

export function scanLanguageLabelV293(value?: string | null): "FR" | "EN" | "JP" | "CN" {
  const language = normalizeScanLanguageV293(value);
  if (language === "ja") return "JP";
  if (language === "zh-tw") return "CN";
  return language.toUpperCase() as "FR" | "EN";
}

export function normalizeScanTextV293(value?: string | null): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\u3040-\u30ff\u3400-\u9fff]+/g, " ")
    .trim();
}

export function normalizeScanNumberV293(value?: string | null): string {
  const firstPart = String(value ?? "").trim().toLowerCase().split("/")[0] || "";
  return firstPart.replace(/[^a-z0-9]/g, "").replace(/^0+(?=\d)/, "");
}

function setTokens(values: Array<string | undefined | null>): Set<string> {
  const tokens = new Set<string>();
  for (const value of values) {
    if (!value) continue;
    const text = normalizeScanTextV293(value);
    const compact = normalizeSetId(value);
    if (text) tokens.add(text);
    if (compact) tokens.add(compact);
    for (const alias of setIdAliases(value)) tokens.add(alias);
  }
  return tokens;
}

export function scanSetTokensV293(scan: CardScanResult): Set<string> {
  return setTokens([scan.setSymbol, scan.setName]);
}

export function catalogSetTokensV293(set: any): Set<string> {
  return setTokens([
    set?.id,
    set?.canonicalId,
    set?.displayCode,
    set?.name,
    typeof set?.series === "string" ? set.series : set?.series?.name,
    ...(Array.isArray(set?.aliases) ? set.aliases : []),
    ...(Array.isArray(set?.mergedSetIds) ? set.mergedSetIds : []),
  ]);
}

function compatibleText(left: string, right: string): boolean {
  return left.length >= 5 && right.length >= 5 && (left.includes(right) || right.includes(left));
}

export function scanSetCompatibilityV293(scan: CardScanResult, set: any) {
  const wanted = scanSetTokensV293(scan);
  const available = catalogSetTokensV293(set);
  const exact = Array.from(wanted).some((token) => available.has(token));
  const compatible = exact || Array.from(wanted).some((left) =>
    Array.from(available).some((right) => compatibleText(left, right))
  );
  return { requested: wanted.size > 0, exact, compatible };
}

export function scanCardEvidenceV293(card: PokemonCard, scan: CardScanResult) {
  const language = normalizeScanLanguageV293(scan.language);
  const languageExact = !card.dataLanguage || card.dataLanguage === language;
  const wantedNumber = normalizeScanNumberV293(scan.cardNumber);
  const cardNumber = normalizeScanNumberV293(card.number);
  const numberExact = Boolean(wantedNumber) && wantedNumber === cardNumber;
  const numberCompatible = numberExact || Boolean(
    wantedNumber && cardNumber
    && wantedNumber.length >= 2
    && cardNumber.length >= 2
    && (wantedNumber.endsWith(cardNumber) || cardNumber.endsWith(wantedNumber))
  );
  const set = scanSetCompatibilityV293(scan, card.set);
  const wantedNames = [scan.cardName, scan.pokemonName, ...(scan.possibleNames || [])]
    .map(normalizeScanTextV293)
    .filter(Boolean);
  const cardName = normalizeScanTextV293(card.name);
  const nameExact = wantedNames.some((name) => name === cardName);
  const nameCompatible = nameExact || wantedNames.some((name) => compatibleText(name, cardName));
  const signalCount = Number(numberExact) + Number(set.compatible) + Number(nameCompatible);

  return {
    language,
    languageExact,
    numberRequested: Boolean(wantedNumber),
    numberExact,
    numberCompatible,
    setRequested: set.requested,
    setExact: set.exact,
    setCompatible: set.compatible,
    nameExact,
    nameCompatible,
    signalCount,
  };
}

export function scannerCacheKeyV293(scan: CardScanResult): string {
  const language = normalizeScanLanguageV293(scan.language);
  const names = normalizeScanTextV293(scan.cardName || scan.pokemonName);
  const number = normalizeScanNumberV293(scan.cardNumber) || "no-number";
  const set = Array.from(scanSetTokensV293(scan)).sort()[0] || "no-set";
  return `scan_v293_${language}_${set}_${number}_${names || "no-name"}`;
}
