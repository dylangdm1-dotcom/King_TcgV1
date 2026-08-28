import { pokemonNames } from "../pokemonTranslator";

export type PriceChartingLanguageV281 = "en" | "fr" | "ja";

const QUERY_NOISE = new Set([
  "pokemon", "pokémon", "card", "carte", "cards", "cartes", "tcg", "ccg",
  "psa", "grade", "graded", "note", "french", "francais", "francaise",
]);

function normalize(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\u3040-\u30ff\u3400-\u9fff]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function containsPhrase(haystack: string, needle: string): boolean {
  return Boolean(needle) && ` ${haystack} `.includes(` ${needle} `);
}

function frenchPokemonGroups(query: string): string[][] {
  const normalizedQuery = normalize(query);
  const groups: string[][] = [];
  const seen = new Set<string>();

  for (const [french, english] of Object.entries(pokemonNames)) {
    const normalizedFrench = normalize(french);
    const normalizedEnglish = normalize(english);
    if (
      !containsPhrase(normalizedQuery, normalizedFrench) &&
      !containsPhrase(normalizedQuery, normalizedEnglish)
    ) continue;

    const key = [normalizedFrench, normalizedEnglish].sort().join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    groups.push(Array.from(new Set([normalizedFrench, normalizedEnglish])).filter(Boolean));
  }

  return groups;
}

function translatedFrenchQuery(query: string): string {
  let translated = normalize(query);
  const entries = Object.entries(pokemonNames).sort(
    ([left], [right]) => normalize(right).length - normalize(left).length
  );

  for (const [french, english] of entries) {
    const normalizedFrench = normalize(french);
    if (!normalizedFrench || !containsPhrase(translated, normalizedFrench)) continue;
    translated = ` ${translated} `
      .replace(new RegExp(` ${normalizedFrench.replace(/\s+/g, "\\s+")} `, "g"), ` ${normalize(english)} `)
      .replace(/\s+/g, " ")
      .trim();
  }

  return translated;
}

export function priceChartingSearchTermsV281(
  query: string,
  language: PriceChartingLanguageV281
): string[] {
  const clean = normalize(query);
  if (!clean) return [];
  if (language !== "fr") return [query.trim()];

  return Array.from(new Set([clean, translatedFrenchQuery(clean)]))
    .filter(Boolean)
    .map((term) => `${term} French`);
}

export function matchesPriceChartingQueryV281(
  query: string,
  candidate: unknown,
  language: PriceChartingLanguageV281
): boolean {
  if (language !== "fr") return true;

  const haystack = normalize(candidate);
  const groups = frenchPokemonGroups(query);
  if (groups.length > 0) {
    return groups.every((aliases) => aliases.some((alias) => containsPhrase(haystack, alias)));
  }

  const tokens = normalize(query)
    .split(" ")
    .filter((token) => token.length >= 2 && !QUERY_NOISE.has(token) && !/^\d+$/.test(token));

  return tokens.length > 0 && tokens.every((token) => containsPhrase(haystack, token));
}
