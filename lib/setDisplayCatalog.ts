export type SetDisplayLanguage = "fr" | "en" | "ja" | "zh-tw";

export type SetDisplayMeta = {
  code: string;
  name: string;
  year?: number;
  era: string;
  aliases?: string[];
  sourceIds?: string[];
};

function normalize(value?: string): string {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const JP: SetDisplayMeta[] = [
  { code: "M6", name: "Storm Emeralda", year: 2026, era: "Mega Evolution", sourceIds: ["m6"] },
  { code: "M5", name: "Abyss Eye", year: 2026, era: "Mega Evolution", sourceIds: ["m5"] },
  { code: "PBL", name: "Pitch Black", year: 2026, era: "Mega Evolution", sourceIds: ["m4"] },
  { code: "POR", name: "Perfect Order", year: 2026, era: "Mega Evolution", sourceIds: ["m3"] },
  { code: "ASC", name: "Ascended Heroes", year: 2026, era: "Mega Evolution", sourceIds: ["m2a"] },
  { code: "PFL", name: "Phantasmal Flames", year: 2026, era: "Mega Evolution", sourceIds: ["m2"] },
  { code: "MEG", name: "Mega Evolution", year: 2025, era: "Mega Evolution", sourceIds: ["m1s", "m1l"] },
  { code: "WHT", name: "White Flare", year: 2025, era: "Scarlet & Violet", sourceIds: ["sv11w"] },
  { code: "BLK", name: "Black Bolt", year: 2025, era: "Scarlet & Violet", sourceIds: ["sv11b"] },
  { code: "GTR", name: "Glory of the Team Rocket", year: 2025, era: "Scarlet & Violet", sourceIds: ["sv10"] },
  { code: "HWA", name: "Heat Wave Arena", year: 2025, era: "Scarlet & Violet", sourceIds: ["sv9a"] },
  { code: "BTP", name: "Battle Partners", year: 2025, era: "Scarlet & Violet", sourceIds: ["sv9"] },
  { code: "TFE", name: "Terastal Fest ex", year: 2024, era: "Scarlet & Violet", sourceIds: ["sv8a"] },
  { code: "SEB", name: "Super Electric Breaker", year: 2024, era: "Scarlet & Violet", sourceIds: ["sv8"] },
  { code: "PDR", name: "Paradise Dragona", year: 2024, era: "Scarlet & Violet", sourceIds: ["sv7a"] },
  { code: "STM", name: "Stellar Miracle", year: 2024, era: "Scarlet & Violet", sourceIds: ["sv7"] },
  { code: "NIW", name: "Night Wanderer", year: 2024, era: "Scarlet & Violet", sourceIds: ["sv6a"] },
  { code: "MOC", name: "Mask of Change", year: 2024, era: "Scarlet & Violet", sourceIds: ["sv6"] },
  { code: "CRH", name: "Crimson Haze", year: 2024, era: "Scarlet & Violet", sourceIds: ["sv5a"] },
  { code: "CYJ", name: "Cyber Judge", year: 2024, era: "Scarlet & Violet", sourceIds: ["sv5m"] },
  { code: "WFR", name: "Wild Force", year: 2024, era: "Scarlet & Violet", sourceIds: ["sv5k"] },
  { code: "SVE", name: "Shiny Treasure ex", year: 2023, era: "Scarlet & Violet", sourceIds: ["sv4a"] },
  { code: "FFL", name: "Future Flash", year: 2023, era: "Scarlet & Violet", sourceIds: ["sv4m"] },
  { code: "ANR", name: "Ancient Roar", year: 2023, era: "Scarlet & Violet", sourceIds: ["sv4k"] },
  { code: "RSU", name: "Raging Surf", year: 2023, era: "Scarlet & Violet", sourceIds: ["sv3a"] },
  { code: "RBF", name: "Ruler of the Black Flame", year: 2023, era: "Scarlet & Violet", sourceIds: ["sv3"] },
  { code: "151", name: "Pokémon Card 151", year: 2023, era: "Scarlet & Violet", sourceIds: ["sv2a"] },
  { code: "CLB", name: "Clay Burst", year: 2023, era: "Scarlet & Violet", sourceIds: ["sv2d"] },
  { code: "SNH", name: "Snow Hazard", year: 2023, era: "Scarlet & Violet", sourceIds: ["sv2p"] },
  { code: "TRB", name: "Triplet Beat", year: 2023, era: "Scarlet & Violet", sourceIds: ["sv1a"] },
  { code: "VEX", name: "Violet ex", year: 2023, era: "Scarlet & Violet", sourceIds: ["sv1v"] },
  { code: "SEX", name: "Scarlet ex", year: 2023, era: "Scarlet & Violet", sourceIds: ["sv1s"] },
  { code: "VSU", name: "VSTAR Universe", year: 2022, era: "Sword & Shield", sourceIds: ["S12a"] },
  { code: "PTG", name: "Paradigm Trigger", year: 2022, era: "Sword & Shield", sourceIds: ["S12"] },
  { code: "IAC", name: "Incandescent Arcana", year: 2022, era: "Sword & Shield", sourceIds: ["S11a"] },
  { code: "LOR", name: "Lost Abyss", year: 2022, era: "Sword & Shield", sourceIds: ["S11"] },
  { code: "PGO", name: "Pokémon GO", year: 2022, era: "Sword & Shield", sourceIds: ["S10b"] },
  { code: "DPT", name: "Dark Phantasma", year: 2022, era: "Sword & Shield", sourceIds: ["S10a"] },
  { code: "SPJ", name: "Space Juggler", year: 2022, era: "Sword & Shield", sourceIds: ["S10P"] },
  { code: "TMZ", name: "Time Gazer", year: 2022, era: "Sword & Shield", sourceIds: ["S10D"] },
  { code: "BRG", name: "Battle Region", year: 2022, era: "Sword & Shield", sourceIds: ["S9a"] },
  { code: "STB", name: "Star Birth", year: 2021, era: "Sword & Shield", sourceIds: ["S9"] },
  { code: "VMC", name: "VMAX Climax", year: 2021, era: "Sword & Shield", sourceIds: ["S8b"] },
  { code: "25A", name: "25th Anniversary Collection", year: 2021, era: "Sword & Shield", sourceIds: ["S8a"] },
  { code: "FST", name: "Fusion Strike", year: 2021, era: "Sword & Shield", sourceIds: ["S8"] },
  { code: "BSS", name: "Blue Sky Stream", year: 2021, era: "Sword & Shield", sourceIds: ["S7R"] },
  { code: "SKP", name: "Skyscraping Perfection", year: 2021, era: "Sword & Shield", sourceIds: ["S7D"] },
  { code: "EVH", name: "Eevee Heroes", year: 2021, era: "Sword & Shield", sourceIds: ["S6a"] },
  { code: "JBS", name: "Jet-Black Spirit", year: 2021, era: "Sword & Shield", sourceIds: ["S6K"] },
  { code: "SLL", name: "Silver Lance", year: 2021, era: "Sword & Shield", sourceIds: ["S6H"] },
  { code: "PLF", name: "Peerless Fighters", year: 2021, era: "Sword & Shield", sourceIds: ["S5a"] },
  { code: "RSM", name: "Rapid Strike Master", year: 2021, era: "Sword & Shield", sourceIds: ["S5R"] },
  { code: "SSM", name: "Single Strike Master", year: 2021, era: "Sword & Shield", sourceIds: ["S5I"] },
  { code: "SSV", name: "Shiny Star V", year: 2020, era: "Sword & Shield", sourceIds: ["S4a"] },
  { code: "AVT", name: "Amazing Volt Tackle", year: 2020, era: "Sword & Shield", sourceIds: ["S4"] },
  { code: "IFZ", name: "Infinity Zone", year: 2020, era: "Sword & Shield", sourceIds: ["S3"] },
  { code: "RCL", name: "Rebellion Clash", year: 2020, era: "Sword & Shield", sourceIds: ["S2"] },
  { code: "SWS", name: "Sword & Shield", year: 2019, era: "Sword & Shield" },
  { code: "GUS", name: "GX Ultra Shiny", year: 2018, era: "Sun & Moon", sourceIds: ["SM8b"] },
  { code: "TGB", name: "Tag Bolt", year: 2018, era: "Sun & Moon", sourceIds: ["SM9"] },
  { code: "DCL", name: "Darkness that Consumes Light", year: 2017, era: "Sun & Moon", sourceIds: ["SM3N"] },
  { code: "SLG", name: "Shining Legends", year: 2017, era: "Sun & Moon", sourceIds: ["SM3+"] },
  { code: "CLM", name: "Collection Moon", year: 2016, era: "Sun & Moon", sourceIds: ["SM1M"] },
  { code: "CLS", name: "Collection Sun", year: 2016, era: "Sun & Moon", sourceIds: ["SM1S"] },
  { code: "20A", name: "Expansion Pack 20th Anniversary", year: 2016, era: "XY", sourceIds: ["CP6"] },
  { code: "APK", name: "Awakening Psychic King", year: 2016, era: "XY", sourceIds: ["XY10"] },
  { code: "RBH", name: "Rage of the Broken Heavens", year: 2015, era: "XY", sourceIds: ["XY9"] },
  { code: "BLS", name: "Blue Shock", year: 2015, era: "XY", sourceIds: ["XY8a"] },
  { code: "RDF", name: "Red Flash", year: 2015, era: "XY", sourceIds: ["XY8b"] },
  { code: "BDR", name: "Bandit Ring", year: 2015, era: "XY", sourceIds: ["XY7"] },
  { code: "EMB", name: "Emerald Break", year: 2015, era: "XY", sourceIds: ["XY6"] },
  { code: "DCR", name: "Double Crisis", year: 2015, era: "XY", sourceIds: ["CP1"] },
  { code: "GVO", name: "Gaia Volcano", year: 2014, era: "XY", sourceIds: ["XY5a"] },
  { code: "TST", name: "Tidal Storm", year: 2014, era: "XY", sourceIds: ["XY5b"] },
  { code: "PTG", name: "Phantom Gate", year: 2014, era: "XY", sourceIds: ["XY4"] },
  { code: "RSF", name: "Rising Fist", year: 2014, era: "XY", sourceIds: ["XY3"] },
  { code: "WBL", name: "Wild Blaze", year: 2014, era: "XY", sourceIds: ["XY2"] },
  { code: "CLX", name: "Collection X", year: 2013, era: "XY", sourceIds: ["XY1a"] },
  { code: "CLY", name: "Collection Y", year: 2013, era: "XY", sourceIds: ["XY1b"] },
  { code: "MLC", name: "Megalo Cannon", year: 2013, era: "Black & White" },
  { code: "PLG", name: "Plasma Gale", year: 2012, era: "Black & White" },
  { code: "FRB", name: "Freeze Bolt", year: 2011, era: "Black & White" },
  { code: "CLF", name: "Cold Flare", year: 2011, era: "Black & White" },
  { code: "RDC", name: "Red Collection", year: 2010, era: "Black & White" },
  { code: "BKC", name: "Black Collection", year: 2010, era: "Black & White" },
  { code: "WHC", name: "White Collection", year: 2010, era: "Black & White" },
  { code: "ADA", name: "Advent of Arceus", year: 2009, era: "Platinum" },
  { code: "BOF", name: "Beat of the Frontier", year: 2009, era: "Platinum" },
  { code: "GAC", name: "Galactic's Conquest", year: 2008, era: "Platinum" },
  { code: "IFS", name: "Intense Fight in the Destroyed Sky", year: 2008, era: "Diamond & Pearl" },
  { code: "SHD", name: "Shining Darkness", year: 2007, era: "Diamond & Pearl" },
  { code: "SOT", name: "Secret of the Lakes", year: 2007, era: "Diamond & Pearl" },
  { code: "STC", name: "Space-Time Creation", year: 2006, era: "Diamond & Pearl" },
  { code: "ODF", name: "Offense and Defense of the Furthest Ends", year: 2006, era: "PCG" },
  { code: "MCC", name: "Miracle Crystal", year: 2006, era: "PCG" },
  { code: "HPH", name: "Holon Phantom", year: 2006, era: "PCG" },
  { code: "HRT", name: "Holon Research Tower", year: 2006, era: "PCG" },
  { code: "MFS", name: "Mirage Forest", year: 2005, era: "PCG", sourceIds: ["PCG5"] },
  { code: "GSS", name: "Golden Sky, Silvery Ocean", year: 2004, era: "PCG", sourceIds: ["PCG4"] },
  { code: "RGB", name: "Rocket Gang Strikes Back", year: 2004, era: "PCG", sourceIds: ["PCG3"] },
  { code: "CBS", name: "Clash of the Blue Sky", year: 2004, era: "ADV", sourceIds: ["PCG2"] },
  { code: "FOL", name: "Flight of Legends", year: 2004, era: "ADV", sourceIds: ["PCG1"] },
  { code: "RTH", name: "Rulers of the Heavens", year: 2004, era: "ADV", sourceIds: ["ADV3"] },
  { code: "MVA", name: "Magma VS Aqua: Two Ambitions", year: 2003, era: "ADV", sourceIds: ["ADV4"] },
  { code: "MOD", name: "Miracle of the Desert", year: 2003, era: "ADV", sourceIds: ["ADV2"] },
  { code: "ADV", name: "ADV Expansion Pack", year: 2003, era: "ADV", sourceIds: ["ADV1"] },
  { code: "MSM", name: "Mysterious Mountains", year: 2002, era: "e-Series", sourceIds: ["E5"] },
  { code: "SPE", name: "Split Earth", year: 2002, era: "e-Series", sourceIds: ["E4"] },
  { code: "WFS", name: "Wind from the Sea", year: 2002, era: "e-Series", sourceIds: ["E3"] },
  { code: "TNM", name: "The Town on No Map", year: 2002, era: "e-Series", sourceIds: ["E2"] },
  { code: "BEP", name: "Base Expansion Pack", year: 2001, era: "e-Series", sourceIds: ["E1"] },
  { code: "NDS", name: "Neo Destiny", year: 2000, era: "Neo", sourceIds: ["neo4"] },
  { code: "NRE", name: "Neo Revelation", year: 2000, era: "Neo", sourceIds: ["neo3"] },
  { code: "NDC", name: "Neo Discovery", year: 2000, era: "Neo", sourceIds: ["neo2"] },
  { code: "NGS", name: "Neo Genesis", year: 1999, era: "Neo", sourceIds: ["neo1"] },
  { code: "GCH", name: "Gym Challenge", year: 1998, era: "Original", sourceIds: ["PMCG6"] },
  { code: "GHE", name: "Gym Heroes", year: 1998, era: "Original", sourceIds: ["PMCG5"] },
  { code: "TRK", name: "Team Rocket", year: 1997, era: "Original", sourceIds: ["PMCG4"] },
  { code: "FOS", name: "Fossile", year: 1997, era: "Original", aliases: ["Fossil"], sourceIds: ["PMCG3"] },
  { code: "JUN", name: "Pokémon Jungle", year: 1997, era: "Original", aliases: ["Jungle"], sourceIds: ["PMCG2"] },
  { code: "EXP", name: "Expansion Pack", year: 1996, era: "Original", sourceIds: ["PMCG1"] },
];

const CN: SetDisplayMeta[] = [
  { code: "CBB6C", name: "Gem Pack Vol. 6", year: 2026, era: "Simplified Chinese", aliases: ["Gem Pack Volume 6"] },
  { code: "CSV10C", name: "Chasing Glory Together", year: 2026, era: "Simplified Chinese", sourceIds: ["csv10c"] },
  { code: "CSV9.5C", name: "Grand Terastal Gathering", year: 2026, era: "Simplified Chinese", sourceIds: ["csv9.5c", "csv9.5"], aliases: ["Terastal Gathering"] },
  { code: "CBB5C", name: "Gem Pack Vol. 5", year: 2026, era: "Simplified Chinese", aliases: ["Gem Pack Volume 5"] },
  { code: "CSV9C", name: "Stellar Crystal", year: 2026, era: "Simplified Chinese", sourceIds: ["csv9c"] },
  { code: "CSV8C", name: "Brilliant Fantasy", year: 2026, era: "Simplified Chinese", sourceIds: ["csv8c"] },
  { code: "CBB4C", name: "Gem Pack Vol. 4", year: 2026, era: "Simplified Chinese", aliases: ["Gem Pack Volume 4"] },
  { code: "CSV7C", name: "Blade Awakened", year: 2026, era: "Simplified Chinese", sourceIds: ["csv7c"], aliases: ["Blade Awakenings"] },
  { code: "CSV6C", name: "Arcane Truth", year: 2025, era: "Simplified Chinese", sourceIds: ["csv6c"] },
  { code: "CBB3C", name: "Gem Pack Vol. 3", year: 2025, era: "Simplified Chinese", aliases: ["Gem Pack Volume 3"] },
  { code: "151C", name: "Collect 151 Gathering", year: 2025, era: "Simplified Chinese", aliases: ["Collect 151 Gathering"] },
  { code: "CSV5C", name: "Dark Crystal Blaze", year: 2025, era: "Simplified Chinese", sourceIds: ["csv5c"] },
  { code: "151C", name: "Collect 151 Surprise", year: 2025, era: "Simplified Chinese" },
  { code: "CSV4C", name: "Bonus Round", year: 2025, era: "Simplified Chinese", sourceIds: ["csv4c"] },
  { code: "151C", name: "Collect 151 Hope", year: 2025, era: "Simplified Chinese" },
  { code: "CSV3C", name: "Fearless Terastal", year: 2025, era: "Simplified Chinese", sourceIds: ["csv3c"] },
  { code: "CBB2C", name: "Gem Pack Vol. 2", year: 2025, era: "Simplified Chinese", aliases: ["Gem Pack Volume 2"] },
  { code: "151C", name: "Collect 151 Journey", year: 2025, era: "Simplified Chinese", aliases: ["Collect 151"] },
  { code: "CSV2C", name: "Miracle Journey", year: 2025, era: "Simplified Chinese", sourceIds: ["csv2c"] },
  { code: "CBB1C", name: "Gem Pack Vol. 1", year: 2025, era: "Simplified Chinese", aliases: ["Gem Pack Volume 1"] },
  { code: "CSV1C", name: "Eternal Beginnings", year: 2025, era: "Simplified Chinese", sourceIds: ["csv1c"], aliases: ["Eternal Birth"] },
  { code: "CS4.5", name: "Final Flame Dance", year: 2024, era: "Simplified Chinese" },
  { code: "CS3.5", name: "Scorching Skies", year: 2024, era: "Simplified Chinese" },
  { code: "CS5.5", name: "Shadow of Glory", year: 2024, era: "Simplified Chinese", aliases: ["Shadow of Glory"] },
  { code: "CS3.3", name: "Brave Stars", year: 2024, era: "Simplified Chinese" },
  { code: "CSV2.5", name: "Nine Colours Gathering", year: 2024, era: "Simplified Chinese", aliases: ["Nine Colors Gathering - Origin", "Nine Colors Gathering - Friends"] },
  { code: "CS2.5", name: "Brilliant Counterattack", year: 2023, era: "Simplified Chinese" },
  { code: "CS2B", name: "Golden Energy", year: 2023, era: "Simplified Chinese" },
  { code: "CSV1C", name: "Vivid Portrayals", year: 2023, era: "Simplified Chinese", aliases: ["Vivid Portrayals Indigo", "Vivid Portrayals Obsidian"] },
  { code: "CS1B", name: "Shining Synergy", year: 2023, era: "Simplified Chinese", aliases: ["Shining Synergy Summon", "Shining Synergy Supreme", "Shining Synergy Shower"] },
  { code: "CS1.5", name: "Dynamax Tactics", year: 2023, era: "Simplified Chinese", aliases: ["Dynamax Clash Flame", "Dynamax Clash Thunder"] },
  { code: "CSM1", name: "Storming Emergence", year: 2022, era: "Simplified Chinese", aliases: ["Storming Emergence Abundant", "Storming Emergence Verdant", "Storming Emergence Radiant"] },
];

const FR: SetDisplayMeta[] = [
  { code: "ME06", name: "Règne Delta", year: 2026, era: "Méga-Évolution", aliases: ["Delta Reign"] },
  { code: "ME05", name: "Nuit Noire", year: 2026, era: "Méga-Évolution", aliases: ["Pitch Black"], sourceIds: ["m5"] },
  { code: "ME04", name: "Chaos Ascendant", year: 2026, era: "Méga-Évolution", aliases: ["Chaos Rising"], sourceIds: ["m4"] },
  { code: "ME03", name: "Équilibre Parfait", year: 2026, era: "Méga-Évolution", aliases: ["Perfect Order"], sourceIds: ["m3"] },
  { code: "ME02.5", name: "Héros Transcendants", year: 2026, era: "Méga-Évolution", aliases: ["Ascended Heroes", "Héros Ascendants"], sourceIds: ["m2a"] },
  { code: "ME02", name: "Flammes Fantasmagoriques", year: 2026, era: "Méga-Évolution", aliases: ["Phantasmal Flames"], sourceIds: ["m2"] },
  { code: "ME01", name: "Méga-Évolution", year: 2025, era: "Méga-Évolution", aliases: ["Mega Evolution"] },
  { code: "EV10.5", name: "Foudre Noire", year: 2025, era: "Écarlate et Violet" },
  { code: "EV10", name: "Flamme Blanche", year: 2025, era: "Écarlate et Violet" },
  { code: "EV09", name: "Évolutions Prismatiques", year: 2025, era: "Écarlate et Violet" },
  { code: "EV08.5", name: "Rivalités Destinées", year: 2025, era: "Écarlate et Violet" },
  { code: "EV08", name: "Étincelles Déferlantes", year: 2024, era: "Écarlate et Violet" },
  { code: "EV07", name: "Couronne Stellaire", year: 2024, era: "Écarlate et Violet" },
  { code: "EV06.5", name: "Fable Nébuleuse", year: 2024, era: "Écarlate et Violet" },
  { code: "EV06", name: "Mascarade Crépusculaire", year: 2024, era: "Écarlate et Violet" },
  { code: "EV05", name: "Forces Temporelles", year: 2024, era: "Écarlate et Violet" },
  { code: "EV04.5", name: "Destinées de Paldea", year: 2024, era: "Écarlate et Violet" },
  { code: "EV04", name: "Faille Paradoxe", year: 2023, era: "Écarlate et Violet" },
  { code: "EV03.5", name: "Pokémon 151", year: 2023, era: "Écarlate et Violet" },
  { code: "EV03", name: "Évolutions à Paldea", year: 2023, era: "Écarlate et Violet" },
  { code: "EV02", name: "Flammes Obsidiennes", year: 2023, era: "Écarlate et Violet" },
  { code: "EV01", name: "Écarlate et Violet", year: 2023, era: "Écarlate et Violet" },
  { code: "EB12.5", name: "Zénith Suprême", year: 2023, era: "Épée et Bouclier" },
  { code: "EB12", name: "Tempête Argentée", year: 2022, era: "Épée et Bouclier" },
  { code: "EB11", name: "Origine Perdue", year: 2022, era: "Épée et Bouclier" },
  { code: "EB10.5", name: "Pokémon GO", year: 2022, era: "Épée et Bouclier" },
  { code: "EB10", name: "Astres Radieux", year: 2022, era: "Épée et Bouclier" },
  { code: "EB09", name: "Stars Étincelantes", year: 2022, era: "Épée et Bouclier" },
  { code: "EB08", name: "Poing de Fusion", year: 2021, era: "Épée et Bouclier" },
  { code: "EB07.5", name: "Célébrations", year: 2021, era: "Épée et Bouclier" },
  { code: "EB07", name: "Évolution Céleste", year: 2021, era: "Épée et Bouclier" },
  { code: "EB06", name: "Règne de Glace", year: 2021, era: "Épée et Bouclier" },
  { code: "EB05", name: "Styles de Combat", year: 2021, era: "Épée et Bouclier" },
  { code: "EB04.5", name: "Destinées Radieuses", year: 2021, era: "Épée et Bouclier" },
  { code: "EB04", name: "Voltage Éclatant", year: 2020, era: "Épée et Bouclier" },
  { code: "EB03.5", name: "La Voie du Maître", year: 2020, era: "Épée et Bouclier" },
  { code: "EB03", name: "Ténèbres Embrasées", year: 2020, era: "Épée et Bouclier" },
  { code: "EB02", name: "Clash des Rebelles", year: 2020, era: "Épée et Bouclier" },
  { code: "EB01", name: "Épée et Bouclier", year: 2020, era: "Épée et Bouclier" },
  { code: "SL12", name: "Éclipse Cosmique", year: 2019, era: "Soleil et Lune" },
  { code: "SL11.5", name: "Destinées Occultes", year: 2019, era: "Soleil et Lune" },
  { code: "SL11", name: "Harmonie des Esprits", year: 2019, era: "Soleil et Lune" },
  { code: "SL10", name: "Alliance Infaillible", year: 2019, era: "Soleil et Lune" },
  { code: "SL09", name: "Duo de Choc", year: 2019, era: "Soleil et Lune" },
  { code: "SL08", name: "Tonnerre Perdu", year: 2018, era: "Soleil et Lune" },
  { code: "SL07.5", name: "Majesté Dragon", year: 2018, era: "Soleil et Lune" },
  { code: "SL07", name: "Tempête Céleste", year: 2018, era: "Soleil et Lune" },
  { code: "SL06", name: "Lumière Interdite", year: 2018, era: "Soleil et Lune" },
  { code: "SL05", name: "Ultra-Prisme", year: 2018, era: "Soleil et Lune" },
  { code: "SL04.5", name: "Légendes Brillantes", year: 2017, era: "Soleil et Lune" },
  { code: "SL04", name: "Invasion Carmin", year: 2017, era: "Soleil et Lune" },
  { code: "SL03.5", name: "Ombres Ardentes", year: 2017, era: "Soleil et Lune" },
  { code: "SL03", name: "Ombres Ardentes", year: 2017, era: "Soleil et Lune" },
  { code: "SL02", name: "Gardiens Ascendants", year: 2017, era: "Soleil et Lune" },
  { code: "SL01", name: "Soleil et Lune", year: 2017, era: "Soleil et Lune" },
  { code: "XY12", name: "Évolutions", year: 2016, era: "XY" },
  { code: "XY11", name: "Offensive Vapeur", year: 2016, era: "XY" },
  { code: "XY10", name: "Impact des Destins", year: 2016, era: "XY" },
  { code: "XY09", name: "Rupture Turbo", year: 2016, era: "XY" },
  { code: "XY08", name: "Impulsion Turbo", year: 2015, era: "XY" },
  { code: "XY07.5", name: "Générations", year: 2016, era: "XY" },
  { code: "XY07", name: "Origines Antiques", year: 2015, era: "XY" },
  { code: "XY06", name: "Ciel Rugissant", year: 2015, era: "XY" },
  { code: "XY05", name: "Primo-Choc", year: 2015, era: "XY" },
  { code: "XY04", name: "Vigueur Spectrale", year: 2014, era: "XY" },
  { code: "XY03", name: "Poing Furieux", year: 2014, era: "XY" },
  { code: "XY02", name: "Étincelles", year: 2014, era: "XY" },
  { code: "XY01", name: "XY", year: 2014, era: "XY" },
];

function languageCatalog(lang: SetDisplayLanguage): SetDisplayMeta[] {
  if (lang === "fr") return FR;
  if (lang === "ja") return JP;
  if (lang === "zh-tw") return CN;
  return [];
}

export function getSetDisplayCatalog(lang: SetDisplayLanguage): readonly SetDisplayMeta[] {
  return languageCatalog(lang);
}

export function getSetDisplayMeta(
  lang: SetDisplayLanguage,
  id?: string,
  name?: string
): SetDisplayMeta | undefined {
  const catalog = languageCatalog(lang);
  if (!catalog.length) return undefined;

  const normalizedName = normalize(name);
  if (normalizedName) {
    const byName = catalog.find((entry) => {
      if (normalize(entry.name) === normalizedName) return true;
      return (entry.aliases || []).some((alias) => normalize(alias) === normalizedName);
    });
    if (byName) return byName;
  }

  const normalizedId = normalize(id).replace(/ /g, "");
  if (normalizedId) {
    const byId = catalog.find((entry) =>
      (entry.sourceIds || []).some((sourceId) => normalize(sourceId).replace(/ /g, "") === normalizedId)
    );
    if (byId) return byId;
  }

  return undefined;
}
