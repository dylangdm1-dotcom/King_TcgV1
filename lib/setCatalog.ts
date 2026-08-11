import type { PokemonCard } from "./types";

export type SetLike = {
  id?: string;
  name?: string;
  series?: string | { name?: string };
  releaseDate?: string;
};

export const KNOWN_SET_RELEASE_DATES: Record<string, string> = {
  // Données officielles minimales utilisées uniquement quand les API omettent la date.
  m5: "2026-05-22",
  m6: "2026-07-31",
  m6a: "2026-09-16",
};

export const UPCOMING_OFFICIAL_RELEASES = [
  {
    id: "m6a",
    language: "ja" as const,
    name: "30th CELEBRATION",
    releaseDate: "2026-09-16",
    officialPrice: "360 ¥",
    contents: "6 cartes brillantes",
    officialUrl: "https://www.30th.pokemon-card.com/product/m6a",
  },
];


export function localizedSetCode(id: string | undefined, lang: "fr" | "en" | "ja" | "zh-tw" = "en"): string {
  const raw = String(id || "").trim();
  if (!raw) return "";

  // TCGdex uses universal Scarlet & Violet ids such as sv08.5.
  // In the French product line, those sets are displayed as EV8.5.
  if (lang === "fr") {
    const match = raw.match(/^sv0?(\d+)(\.\d+[a-z]?)?$/i);
    if (match) return `EV${Number(match[1])}${match[2] || ""}`;
  }

  return raw;
}

export function normalizeSetId(id?: string): string {
  return String(id || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function setIdAliases(idOrName?: string): string[] {
  const clean = normalizeSetId(idOrName);
  const aliases = new Set<string>();
  if (clean) aliases.add(clean);

  if (["151", "pokemon151", "pokemoncard151"].includes(clean)) {
    aliases.add("sv2a");
  }

  const chinese = clean.match(/^(csv\d+)([a-z]+)$/);
  if (chinese) aliases.add(chinese[1]);

  return Array.from(aliases);
}

export function parseSetReleaseDate(dateStr?: string): number {
  if (!dateStr) return 0;
  const cleanDate = String(dateStr).trim().replace(/\//g, "-");
  const time = new Date(cleanDate).getTime();
  return Number.isFinite(time) ? time : 0;
}

export function effectiveSetReleaseDate(id?: string, releaseDate?: string): string {
  return releaseDate || KNOWN_SET_RELEASE_DATES[normalizeSetId(id)] || "";
}

function suffixScore(rawSuffix?: string): number {
  if (!rawSuffix) return 0;
  return rawSuffix
    .toLowerCase()
    .split("")
    .reduce((score, letter) => score * 27 + Math.max(1, letter.charCodeAt(0) - 96), 0);
}

export function setCodeRecency(id?: string): number {
  const clean = normalizeSetId(id);
  const match = clean.match(/^([a-z]+)(\d+)([a-z]*)(\d*)/);
  if (!match) return 0;

  const prefix = match[1];
  const major = Number(match[2] || 0);
  const letters = suffixScore(match[3]);
  const trailing = Number(match[4] || 0);

  const era: Record<string, number> = {
    m: 1_000,
    me: 1_000,
    csv: 920,
    sv: 900,
    ev: 900,
    swsh: 800,
    eb: 800,
    sm: 700,
    sl: 700,
    xy: 600,
    bw: 500,
    nb: 500,
    hgss: 400,
    dp: 300,
  };

  return (era[prefix] || 100) * 1_000_000_000 + major * 1_000_000 + letters * 1_000 + trailing;
}

export function classifySetGeneration(set: SetLike): string {
  const id = normalizeSetId(set.id);
  const series = typeof set.series === "string" ? set.series : set.series?.name || "";
  const text = `${series} ${set.name || ""}`.toLowerCase();
  const year = Number(effectiveSetReleaseDate(set.id, set.releaseDate).slice(0, 4) || 0);

  if (text.includes("promo") || /(?:^|[^a-z])promo(?:[^a-z]|$)/i.test(id)) return "Promos";
  if (/^(?:m|me)\d+/i.test(id) || text.includes("mega") || text.includes("méga")) return "MEGA";
  if (/^(?:sv|ev|csv)\d+/i.test(id) || text.includes("scarlet") || text.includes("violet") || text.includes("écarlate")) return "Écarlate & Violet";
  if (/^(?:swsh|eb)\d+/i.test(id) || text.includes("sword") || text.includes("shield") || text.includes("épée") || text.includes("bouclier")) return "Épée & Bouclier";
  if (/^(?:sm|sl)\d+/i.test(id) || text.includes("sun") || text.includes("moon") || text.includes("soleil") || text.includes("lune")) return "Soleil & Lune";
  if (/^xy\d+/i.test(id) || text.includes("xy")) return "XY";
  if (/^(?:bw|nb)\d+/i.test(id) || text.includes("black") || text.includes("white") || text.includes("noir") || text.includes("blanc")) return "Noir & Blanc";
  if (/^hgss\d+/i.test(id) || text.includes("heartgold") || text.includes("soulsilver")) return "HeartGold & SoulSilver";
  if (/^dp\d+/i.test(id) || text.includes("diamond") || text.includes("pearl") || text.includes("diamant") || text.includes("perle") || text.includes("platine")) return "Diamant & Perle";

  if (year >= 2023) return "Écarlate & Violet";
  if (year >= 2020) return "Épée & Bouclier";
  if (year >= 2017) return "Soleil & Lune";
  if (year >= 2014) return "XY";
  if (year >= 2011) return "Noir & Blanc";
  return "Séries classiques";
}

export function compareSetsNewestFirst<T extends SetLike>(a: T, b: T): number {
  const timeA = parseSetReleaseDate(effectiveSetReleaseDate(a.id, a.releaseDate));
  const timeB = parseSetReleaseDate(effectiveSetReleaseDate(b.id, b.releaseDate));
  if (timeA !== timeB) return timeB - timeA;

  const codeDiff = setCodeRecency(b.id) - setCodeRecency(a.id);
  if (codeDiff) return codeDiff;
  return String(b.id || "").localeCompare(String(a.id || ""), undefined, { numeric: true, sensitivity: "base" });
}

export function compareCardsNewestFirst(a: PokemonCard, b: PokemonCard): number {
  const dateA = parseSetReleaseDate(effectiveSetReleaseDate(a.set?.id, a.set?.releaseDate));
  const dateB = parseSetReleaseDate(effectiveSetReleaseDate(b.set?.id, b.set?.releaseDate));
  if (dateA !== dateB) return dateB - dateA;

  const setDiff = setCodeRecency(b.set?.id) - setCodeRecency(a.set?.id);
  if (setDiff) return setDiff;
  return String(b.number || "").localeCompare(String(a.number || ""), undefined, { numeric: true });
}

export function isFutureRelease(set: SetLike, now = new Date()): boolean {
  const timestamp = parseSetReleaseDate(effectiveSetReleaseDate(set.id, set.releaseDate));
  if (!timestamp) return false;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return timestamp > today;
}
