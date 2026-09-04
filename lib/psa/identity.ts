export type PSALanguageV280 = "en" | "fr" | "ja";

export type PSAEditionV280 = "first-edition" | "unlimited";
export type PSAVariantV280 =
  | "standard"
  | "holo"
  | "reverse"
  | "shadowless"
  | "promo";

export type PSACardIdentityV280 = {
  key: string;
  language: PSALanguageV280;
  cardName: string;
  normalizedName: string;
  cardNumber: string;
  setKey: string;
  setName: string;
  edition: PSAEditionV280;
  variant: PSAVariantV280;
  releaseYear?: number;
};

const SET_ALIASES: Array<{ pattern: RegExp; key: string; name: string }> = [
  { pattern: /\b(?:base\s*set|set\s*de\s*base|set\s*base)\b/i, key: "base-set", name: "Base Set" },
  { pattern: /\bjungle\b/i, key: "jungle", name: "Jungle" },
  { pattern: /\bfossil\b/i, key: "fossil", name: "Fossil" },
  { pattern: /\bteam\s*rocket\b/i, key: "team-rocket", name: "Team Rocket" },
  { pattern: /\bneo\s*genesis\b/i, key: "neo-genesis", name: "Neo Genesis" },
  { pattern: /\bneo\s*discovery\b/i, key: "neo-discovery", name: "Neo Discovery" },
  { pattern: /\bneo\s*revelation\b/i, key: "neo-revelation", name: "Neo Revelation" },
  { pattern: /\bneo\s*destiny\b/i, key: "neo-destiny", name: "Neo Destiny" },
  { pattern: /\b(?:pokemon\s*)?151\b/i, key: "151", name: "151" },
  { pattern: /\bpaldean\s*fates\b/i, key: "paldean-fates", name: "Paldean Fates" },
  { pattern: /\bhidden\s*fates\b/i, key: "hidden-fates", name: "Hidden Fates" },
  { pattern: /\bevolving\s*skies\b/i, key: "evolving-skies", name: "Evolving Skies" },
];

export function normalizePSATextV280(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\u3040-\u30ff\u3400-\u9fff]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function keyToken(value: unknown): string {
  return normalizePSATextV280(value).replace(/\s+/g, "-") || "unknown";
}

export function normalizePSACardNumberV280(value: unknown): string {
  const raw = String(value ?? "").trim().toUpperCase().replace(/\s+/g, "");
  const fraction = raw.match(/(?:#)?([A-Z]*0*\d{1,4})\/([A-Z]*0*\d{1,4})/);
  if (fraction) {
    const left = fraction[1].replace(/^(\D*)0+(?=\d)/, "$1");
    const right = fraction[2].replace(/^(\D*)0+(?=\d)/, "$1");
    return `${left}/${right}`;
  }
  const single = raw.match(/(?:^|#)([A-Z]*0*\d{1,4})(?:\b|$)/);
  return single?.[1]?.replace(/^(\D*)0+(?=\d)/, "$1") || "";
}

export function extractPSACardNumberV280(value: unknown): string {
  const text = String(value ?? "");
  const fraction = text.match(/\b([A-Z]*\d{1,4}\s*\/\s*[A-Z]*\d{1,4})\b/i)?.[1];
  if (fraction) return normalizePSACardNumberV280(fraction);
  const numbered = text.match(/#\s*([A-Z]*\d{1,4})\b/i)?.[1];
  return normalizePSACardNumberV280(numbered || "");
}

export function psaEditionV280(value: unknown): PSAEditionV280 {
  return /\b(?:1st\s*edition|first\s*edition|edition\s*1|1(?:e|ere|ère)\s*edition|premiere\s*edition|première\s*édition)\b/i.test(String(value ?? ""))
    ? "first-edition"
    : "unlimited";
}

export function psaVariantV280(value: unknown): PSAVariantV280 {
  const text = normalizePSATextV280(value);
  if (/\bshadowless\b/.test(text)) return "shadowless";
  if (/\breverse(?: holo| holographic| holofoil)?\b/.test(text)) return "reverse";
  if (/\bpromo\b/.test(text)) return "promo";
  // "Holo" is frequently omitted from seller titles for inherently holo cards.
  // Reverse/Promo/Shadowless remain distinct; plain Holo joins Standard.
  return "standard";
}

export function psaSetIdentityV280(
  value: unknown,
  strictKnownOnly = false
): { key: string; name: string } {
  const text = String(value ?? "");
  const known = SET_ALIASES.find(({ pattern }) => pattern.test(text));
  if (known) return { key: known.key, name: known.name };
  if (strictKnownOnly) return { key: "unknown", name: "Extension non identifiée" };

  const cleaned = normalizePSATextV280(text)
    .replace(/\b(?:pokemon|pokémon|cards?|cartes?|tcg|ccg|english|anglais|french|francais|japanese|japonais)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return { key: keyToken(cleaned), name: cleaned || "Extension non identifiée" };
}

function releaseYear(value: unknown): number | undefined {
  const year = Number(String(value ?? "").match(/\b(19\d{2}|20\d{2})\b/)?.[1]);
  return year >= 1996 && year <= new Date().getFullYear() + 1 ? year : undefined;
}

export function cleanPSACardNameV280(value: unknown, setName?: unknown): string {
  let name = normalizePSATextV280(value)
    .replace(/\bpsa\s*(?:gem\s*mint\s*)?(?:10|9|8|7|6|5|4|3|2|1)\b/g, " ")
    .replace(/\b(?:grade|note)\s*(?:10|9|8|7|6|5|4|3|2|1)\b/g, " ")
    .replace(/\b(?:near\s*mint|gem\s*mint|mint|nm|graded|gradee|slab|certified)\b/g, " ")
    .replace(/\b(?:pokemon|pokémon|cards?|cartes?|tcg|ccg|english|anglais|french|francais|japanese|japonais)\b/g, " ")
    .replace(/#?\s*[a-z]*\d{1,4}(?:\s*\/\s*\d{1,4})?/g, " ")
    .replace(/\b(?:19\d{2}|20\d{2})\b/g, " ");

  const normalizedSet = normalizePSATextV280(setName);
  if (normalizedSet && normalizedSet !== "unknown") {
    name = name.replace(normalizedSet, " ");
  }

  name = name
    .replace(/\b(?:first\s*edition|1st\s*edition|shadowless|reverse|holofoil|holographic|holo|promo)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return name || "carte-inconnue";
}

/** Conserve les formes utiles (VMAX, VSTAR, ex, GX...) absentes du champ eBay. */
export function psaDisplayCardNameV302(query: unknown, title: unknown): string {
  const base = String(query ?? "").trim();
  if (!base) return "Carte Pokémon";

  const haystack = normalizePSATextV280(title);
  const normalizedBase = normalizePSATextV280(base);
  const isMega = phraseInNormalizedText(haystack, `mega ${normalizedBase}`) ||
    phraseInNormalizedText(haystack, `m ${normalizedBase}`);
  const form = ["vmax", "vstar", "gx", "ex", "v"].find((candidate) =>
    new RegExp(`\\b${candidate}\\b`, "i").test(haystack)
  );
  const axis = isMega && /\b(?:x|y)\b/i.test(haystack)
    ? haystack.match(/\b(x|y)\b/i)?.[1]?.toUpperCase()
    : "";

  return [isMega ? `Méga-${base}` : base, axis, form === "ex" ? "ex" : form?.toUpperCase()]
    .filter(Boolean)
    .join(" ");
}

function phraseInNormalizedText(text: string, phrase: string): boolean {
  return Boolean(phrase) && ` ${text} `.includes(` ${phrase} `);
}

export function buildPSACardIdentityV280(input: {
  language: PSALanguageV280;
  cardName?: string;
  setName?: string;
  cardNumber?: string;
  title?: string;
  query?: string;
}): PSACardIdentityV280 {
  const evidence = `${input.title || ""} ${input.setName || ""}`;
  const set = input.setName
    ? psaSetIdentityV280(input.setName)
    : psaSetIdentityV280(input.title || "", true);
  const cardNumber = normalizePSACardNumberV280(input.cardNumber) || extractPSACardNumberV280(input.title);
  const normalizedName = cleanPSACardNameV280(input.cardName || input.query || input.title, set.name);
  const edition = psaEditionV280(evidence);
  const variant = /^(?:SWSH|SVP|SM|XY|BW)\d+$/i.test(cardNumber)
    ? "promo"
    : psaVariantV280(evidence);
  const year = releaseYear(evidence);

  // A fraction number is usually set-specific. A single number needs the set
  // or year to avoid merging unrelated cards such as several Pikachu #25.
  const setDiscriminator = cardNumber.includes("/")
    ? set.key === "unknown" ? "fraction-number" : set.key
    : `${set.key}:${year || "unknown-year"}`;
  const key = [
    "psa-v302",
    input.language,
    keyToken(normalizedName),
    keyToken(cardNumber || "unknown-number"),
    keyToken(setDiscriminator),
    edition,
    variant,
  ].join("|");

  return {
    key,
    language: input.language,
    cardName: normalizedName,
    normalizedName,
    cardNumber,
    setKey: set.key,
    setName: set.name,
    edition,
    variant,
    releaseYear: year,
  };
}

export function isSinglePokemonPSAProductV280(value: unknown): boolean {
  const text = normalizePSATextV280(value);
  if (!/\bpokemon\b/.test(text)) return false;
  if (
    /\b(?:lot|bundle|booster|display|box|case|pack|sealed|mystery|proxy|custom|fan art|digital|code|online|sticker|poster|magazine|guide|coin|pin|figure|figurine|plush|peluche|toy|jouet|video game|jeu video|console|nintendo ds|nintendo 3ds|nintendo switch|game boy|gameboy|wii|playstation|xbox|amiibo|dvd|blu ray)\b/.test(text)
  ) return false;

  const psaEvidence = /\bpsa\s*(?:gem\s*mint\s*)?(?:10|9|8|7|6|5|4|3|2|1)\b/.test(text);
  const cardEvidence = /\b(?:card|carte|tcg|ccg)\b/.test(text) || Boolean(extractPSACardNumberV280(value));
  return psaEvidence && cardEvidence;
}
