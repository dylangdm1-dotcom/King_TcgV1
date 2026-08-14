export type RegionalSetEntry = {
  code: string;
  name: string;
  era: string;
  /** Codes réellement employés par le fournisseur lorsque le code public King_TCG diffère. */
  providerCodes?: string[];
  /** Métadonnées éditoriales vérifiées, utilisées quand le fournisseur est en retard. */
  releaseDate?: string;
  officialCount?: number;
};

export const JAPANESE_SET_CATALOG: RegionalSetEntry[] = [
  { code: "M6", name: "Storm Emeralda", era: "Mega Evolution" },
  { code: "M5", name: "Abyss Eye", era: "Mega Evolution" },
  { code: "M4", name: "Ninja Spinner", era: "Mega Evolution" },
  { code: "M3", name: "Nihil Zero", era: "Mega Evolution" },
  { code: "M2A", name: "MEGA Dream ex", era: "Mega Evolution" },
  { code: "M2", name: "Inferno X", era: "Mega Evolution" },
  { code: "M1S", name: "Mega Symphonia", era: "Mega Evolution" },
  { code: "M1L", name: "Mega Brave", era: "Mega Evolution" },
  { code: "SV11W", name: "White Flare", era: "Scarlet & Violet" },
  { code: "SV11B", name: "Black Bolt", era: "Scarlet & Violet" },
  { code: "SV10", name: "Glory of the Team Rocket", era: "Scarlet & Violet" },
  { code: "SV9A", name: "Heat Wave Arena", era: "Scarlet & Violet" },
  { code: "SV9", name: "Battle Partners", era: "Scarlet & Violet" },
  { code: "SV8A", name: "Terastal Fest ex", era: "Scarlet & Violet" },
  { code: "SV8", name: "Super Electric Breaker", era: "Scarlet & Violet" },
  { code: "SV7A", name: "Paradise Dragona", era: "Scarlet & Violet" },
  { code: "SV7", name: "Stellar Miracle", era: "Scarlet & Violet" },
  { code: "SV6A", name: "Night Wanderer", era: "Scarlet & Violet" },
  { code: "SV6", name: "Mask of Change", era: "Scarlet & Violet" },
  { code: "SV5A", name: "Crimson Haze", era: "Scarlet & Violet" },
  { code: "SV5M", name: "Cyber Judge", era: "Scarlet & Violet" },
  { code: "SV5K", name: "Wild Force", era: "Scarlet & Violet" },
  { code: "SV4A", name: "Shiny Treasure ex", era: "Scarlet & Violet" },
  { code: "SV3A", name: "Raging Surf", era: "Scarlet & Violet" },
  { code: "SV3", name: "Ruler of the Black Flame", era: "Scarlet & Violet" },
  { code: "SV2A", name: "Pokémon Card 151", era: "Scarlet & Violet" },
  { code: "SV2D", name: "Clay Burst", era: "Scarlet & Violet" },
  { code: "SV2P", name: "Snow Hazard", era: "Scarlet & Violet" },
  { code: "SV1A", name: "Triplet Beat", era: "Scarlet & Violet" },
  { code: "SV1V", name: "Violet ex", era: "Scarlet & Violet" },
  { code: "SV1S", name: "Scarlet ex", era: "Scarlet & Violet" },
];

// Manifeste vérifié par l'audit exhaustif TCGdex du 14/08/2026.
// L'index japonais annonce aussi de nombreuses extensions dont la route
// détaillée renvoie actuellement zéro carte. King_TCG ne doit rendre
// cliquables que les extensions effectivement ouvrables. Ce manifeste est
// réévalué par `npm run audit:data -- --all` à chaque mise à jour catalogue ;
// les futures séries restent affichables comme annonces sans cartes inventées.
const JAPANESE_TCGDEX_AVAILABLE_SET_IDS = new Set([
  "web1", "vs1", "svls", "svln", "svk", "sv9a", "sv9", "sv8a", "sv8",
  "sv7a", "sv7", "sv6", "sv5k", "sv5a", "sv4m", "sv4k", "sv4a", "sv3a",
  "sv3", "sv2p", "sv2d", "sv2a", "sv1v", "sv1s", "sv1a", "sv11w",
  "sv11b", "sv10", "sm12a", "sm12", "sm11b", "sm10", "s9a", "s9",
  "s12a", "s12", "pmcg6", "pmcg5", "pmcg4", "pmcg3", "pmcg2", "pmcg1",
  "pcg9", "pcg8", "pcg7", "pcg6", "pcg5", "pcg4", "pcg3", "pcg2",
  "pcg1", "neo4", "neo3", "neo2", "neo1", "m-p", "mc", "m5", "m4",
  "m3", "m2a", "m2", "m1s", "m1l", "e5", "e4", "e3", "e2", "e1",
  "cp1",
]);

export function hasVerifiedJapaneseCards(value: unknown): boolean {
  const code = String(value || "").trim().toLowerCase();
  return JAPANESE_TCGDEX_AVAILABLE_SET_IDS.has(code);
}

export const CHINESE_SET_CATALOG: RegionalSetEntry[] = [
  { code: "CBB6C", name: "Gem Pack Volume 6", era: "Simplified Chinese", releaseDate: "2026-08-07", officialCount: 196 },
  { code: "CSV10C", name: "Chasing Glory Together", era: "Scarlet & Violet", releaseDate: "2026-07-16", officialCount: 287 },
  { code: "CSV9.5C", name: "Grand Terastal Gathering", era: "Simplified Chinese", providerCodes: ["CSV95C", "CSV9.5C"] },
  { code: "CSV9C", name: "Stellar Crystal", era: "Scarlet & Violet" },
  { code: "CBB5C", name: "Gem Pack Volume 5", era: "Scarlet & Violet" },
  { code: "CSV8C", name: "Brilliant Fantasy", era: "Scarlet & Violet" },
  { code: "CBB4C", name: "Gem Pack Volume 4", era: "Scarlet & Violet" },
  { code: "CSV7C", name: "Blade Awakenings", era: "Scarlet & Violet" },
  { code: "CSVL2C", name: "Travel Special Pack", era: "Scarlet & Violet" },
  { code: "CSV6C", name: "Arcane Truth", era: "Scarlet & Violet" },
  { code: "CBB3C", name: "Gem Pack Volume 3", era: "Scarlet & Violet" },
  { code: "CSV5C", name: "Dark Crystal Blaze", era: "Scarlet & Violet" },
  { code: "CSV4C", name: "Bonus Round", era: "Scarlet & Violet" },
  { code: "CSVL1C", name: "Departure Special Pack", era: "Scarlet & Violet" },
  { code: "CBB2C", name: "Gem Pack Volume 2", era: "Scarlet & Violet" },
  { code: "CSV3C", name: "Fearless Terastal", era: "Scarlet & Violet" },
  { code: "CSV2C", name: "Miracle Journey", era: "Scarlet & Violet" },
  { code: "CBB1C", name: "Gem Pack Volume 1", era: "Scarlet & Violet" },
  { code: "151C", name: "Collect 151", era: "Scarlet & Violet" },
  { code: "CSV1C", name: "Eternal Birth", era: "Scarlet & Violet" },
  { code: "CS65C", name: "Victory Star Guide", era: "Sword & Shield", providerCodes: ["CS6.5C"] },
  { code: "CS6BC", name: "Azure Shadow - Pursuit", era: "Sword & Shield" },
  { code: "CS6AC", name: "Azure Shadow - Roar", era: "Sword & Shield" },
  { code: "CS55C", name: "Shadow of Glory", era: "Sword & Shield", providerCodes: ["CS5.5C"] },
  { code: "CS5BC", name: "Brave Stars - Brave", era: "Sword & Shield" },
  { code: "CS5AC", name: "Brave Stars - Charm", era: "Sword & Shield" },
  { code: "CS4BC", name: "Nine Colors Gathering - Origin", era: "Sword & Shield" },
  { code: "CS4AC", name: "Nine Colors Gathering - Friends", era: "Sword & Shield" },
  { code: "CS3BC", name: "Primordial Arts Torrent", era: "Sword & Shield" },
  { code: "CS3AC", name: "Primordial Arts Overgrow", era: "Sword & Shield" },
  { code: "CS2BC", name: "Vivid Portrayals Indigo", era: "Sword & Shield" },
  { code: "CS2AC", name: "Vivid Portrayals Obsidian", era: "Sword & Shield" },
  { code: "CS1BC", name: "Dynamax Clash Flame", era: "Sword & Shield" },
  { code: "CS1AC", name: "Dynamax Clash Thunder", era: "Sword & Shield" },
  { code: "CSM2CC", name: "Shining Synergy Summon", era: "Sun & Moon" },
  { code: "CSM2BC", name: "Shining Synergy Supreme", era: "Sun & Moon" },
  { code: "CSM2AC", name: "Shining Synergy Shower", era: "Sun & Moon" },
  { code: "CSM1CC", name: "Storming Emergence Abundant", era: "Sun & Moon" },
  { code: "CSM1BC", name: "Storming Emergence Verdant", era: "Sun & Moon" },
  { code: "CSM1AC", name: "Storming Emergence Radiant", era: "Sun & Moon" },
  { code: "30THP", name: "30th Anniversary Celebration", era: "Promos", providerCodes: ["30TH-P"] },
  { code: "NRGY", name: "Energies", era: "Promos", providerCodes: ["CSEC"] },
];

export function chineseProviderCodeCandidates(value: unknown): string[] {
  const requested = String(value || "").trim();
  if (!requested) return [];
  const normalized = requested.toLowerCase().replace(/[^a-z0-9]/g, "");
  const entry = CHINESE_SET_CATALOG.find((item) => {
    const codes = [item.code, ...(item.providerCodes ?? [])];
    return codes.some(
      (code) => code.toLowerCase().replace(/[^a-z0-9]/g, "") === normalized
    );
  });
  return Array.from(new Set([...(entry?.providerCodes ?? []), entry?.code, requested].filter(Boolean))) as string[];
}

const CHINESE_SET_CODES = new Set(
  CHINESE_SET_CATALOG.map((entry) => entry.code.toLowerCase().replace(/[^a-z0-9]/g, ""))
);

/**
 * Empêche les produits chinois simplifiés renvoyés par un index asiatique
 * partagé d'être présentés comme des extensions japonaises.
 */
export function isSimplifiedChineseSetCode(value: unknown): boolean {
  const code = String(value || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!code) return false;
  return CHINESE_SET_CODES.has(code) || /^(?:cs|cbb)/.test(code);
}
