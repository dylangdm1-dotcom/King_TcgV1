// lib/pokemonTranslator.ts

/**
 * =====================================================
 * 🧠 POKÉMON TRANSLATOR — KING_TCG V5
 * =====================================================
 *
 * Support :
 * - Traduction FR ⇄ EN
 * - Générations 1 à 9
 * - Pokémon Paradoxes
 * - Formes régionales
 * - Corrections OCR
 * - Promos TCG
 * - Sous-sets TG / GG / SV
 * - Suffixes EX / GX / V / VMAX / VSTAR / etc.
 *
 * IMPORTANT :
 * Ce fichier gère uniquement :
 * - l'identification du nom Pokémon
 * - la normalisation OCR
 * - la traduction FR / EN
 *
 * Il ne gère aucun prix.
 * =====================================================
 */

// =====================================================
// 🔧 CORRECTION OCR
// =====================================================

export function fixOCRCharacterConfusion(
  text: string
): string {
  if (!text) return "";

  return String(text)
    // Normalisation apostrophes
    .replace(/['’`]/g, "")

    // O / 0
    .replace(/\b[Oo](\d+)\b/g, "0$1")
    .replace(/\b(\d+)[Oo]\b/g, "$10")

    // I / l / 1
    .replace(/\b[IiLl](\d+)\b/g, "1$1")

    // S / 5
    .replace(/\b[Ss](\d+)\b/g, "5$1")

    // B / 8
    .replace(/\b[Bb](\d+)\b/g, "8$1");
}

// =====================================================
// 🧠 ALIASES OCR
// =====================================================

const ocrAliases: Record<string, string> = {
  dracaufu: "dracaufeu",
  dracaufe: "dracaufeu",
  dracauf: "dracaufeu",

  charizard: "charizard",

  pikashu: "pikachu",
  pikatchu: "pikachu",
  pikachu: "pikachu",

  salamche: "salameche",
  salamech: "salameche",

  carapace: "carapuce",

  ectoplasa: "ectoplasma",

  mewtwoo: "mewtwo",
  mewtoo: "mewtwo",

  florizare: "florizarre",

  evolii: "evoli",

  tortankk: "tortank",

  noadkoko: "noadkoko",
  noadkokodalola: "noadkokodalola",

  mirmidon: "miraidon",
  coraidon: "koraidon",
};

// =====================================================
// 🃏 DICTIONNAIRE POKÉMON
// =====================================================

export const pokemonNames: Record<
  string,
  string
> = {
  // ===================================================
  // GEN 1
  // ===================================================

  bulbizarre: "bulbasaur",
  herbizarre: "ivysaur",
  florizarre: "venusaur",

  salameche: "charmander",
  reptincel: "charmeleon",
  dracaufeu: "charizard",

  carapuce: "squirtle",
  carabaffe: "wartortle",
  tortank: "blastoise",

  chenipan: "caterpie",
  chrysacier: "metapod",
  papilusion: "butterfree",

  aspicot: "weedle",
  coconfort: "kakuna",
  dardargnan: "beedrill",

  roucool: "pidgey",
  roucoups: "pidgeotto",
  roucarnage: "pidgeot",

  rattata: "rattata",
  ratatac: "raticate",

  piafabec: "spearow",
  rapasdepic: "fearow",

  abo: "ekans",
  arbok: "arbok",

  pikachu: "pikachu",
  raichu: "raichu",

  sablette: "sandshrew",
  sablaireau: "sandslash",

  nidoranf: "nidoran-f",
  nidorina: "nidorina",
  nidoqueen: "nidoqueen",

  nidoranm: "nidoran-m",
  nidorino: "nidorino",
  nidoking: "nidoking",

  melofee: "clefairy",
  melodelfe: "clefable",

  goupix: "vulpix",
  feunard: "ninetales",

  rondoudou: "jigglypuff",
  groudoudou: "wigglytuff",

  nosferapti: "zubat",
  nosferalto: "golbat",

  mystherbe: "oddish",
  ortide: "gloom",
  rafflesia: "vileplume",

  paras: "paras",
  parasect: "parasect",

  mimitoss: "venonat",
  aeromite: "venomoth",

  taupiqueur: "diglett",
  triopikeur: "dugtrio",

  miaouss: "meowth",
  persian: "persian",

  psykokwak: "psyduck",
  akwakwak: "golduck",

  ferosinge: "mankey",
  colossinge: "primeape",

  caninos: "growlithe",
  arcanin: "arcanine",

  ptitard: "poliwag",
  tetarte: "poliwhirl",
  tartard: "poliwrath",

  abra: "abra",
  kadabra: "kadabra",
  alakazam: "alakazam",

  machoc: "machop",
  machopeur: "machoke",
  mackogneur: "machamp",

  chetiflor: "bellsprout",
  boustiflor: "weepinbell",
  empiflor: "victreebel",

  tentacool: "tentacool",
  tentacruel: "tentacruel",

  racaillou: "geodude",
  gravalanch: "graveler",
  grolem: "golem",

  ponyta: "ponyta",
  galopa: "rapidash",

  ramoloss: "slowpoke",
  rameolos: "slowpoke",

  flagadoss: "slowbro",

  magneti: "magnemite",
  magneton: "magneton",

  canarticho: "farfetchd",
  doduo: "doduo",
  dodrio: "dodrio",

  otaria: "seel",
  lamantine: "dewgong",

  tadmorv: "grimer",
  grotadmorv: "muk",

  kokiyas: "shellder",
  crustabri: "cloyster",

  fantominus: "gastly",
  spectrum: "haunter",
  ectoplasma: "gengar",

  onix: "onix",

  sophorifik: "drowzee",
  hypnomade: "hypno",

  krabby: "krabby",
  krabboss: "kingler",

  voltorbe: "voltorb",
  electrode: "electrode",

  noeunoeuf: "exeggcute",
  noadkoko: "exeggutor",

  osselet: "cubone",
  osseleur: "marowak",
  osseletueur: "marowak",
  ossatueur: "marowak",

  kicklee: "hitmonlee",
  tygnon: "hitmonchan",

  excelangue: "lickitung",

  smogo: "koffing",
  smogogo: "weezing",

  rhinocorn: "rhyhorn",
  rhinoferos: "rhydon",

  leveinard: "chansey",
  saquedeneu: "tangela",

  kangourex: "kangaskhan",
  hypocean: "seadra",

  poissirene: "goldeen",
  poisseneche: "goldeen",
  poissoroy: "seaking",

  stari: "staryu",
  staross: "starmie",

  mmime: "mr mime",
  mrmime: "mr mime",
  m_mime: "mr mime",

  insecateur: "scyther",
  lippoutou: "jynx",
  elektek: "electabuzz",
  magmar: "magmar",

  scarabrute: "pinsir",
  tauros: "tauros",

  magicarpe: "magikarp",
  leviator: "gyarados",

  lokhlass: "lapras",
  metamorph: "ditto",

  evoli: "eevee",
  aquali: "vaporeon",
  voltali: "jolteon",
  pyroli: "flareon",

  porygon: "porygon",

  amonita: "omanyte",
  amonistar: "omastar",

  kabuto: "kabuto",
  kabutops: "kabutops",

  ptera: "aerodactyl",

  ronflex: "snorlax",

  artikodin: "articuno",
  electhor: "zapdos",
  sulfura: "moltres",

  minidraco: "dratini",
  draco: "dragonair",
  dracolosse: "dragonite",

  mewtwo: "mewtwo",
  mew: "mew",

  // ===================================================
  // GEN 2
  // ===================================================

  germignon: "chikorita",
  macronium: "bayleef",
  meganium: "meganium",

  hericendre: "cyndaquil",
  feurisson: "quilava",
  typhlosion: "typhlosion",

  kaiminus: "totodile",
  crocodil: "croconaw",
  aligatueur: "feraligatr",

  pichu: "pichu",
  togetic: "togetic",
  togepi: "togepi",

  wattouat: "mareep",
  lainergie: "flaaffy",
  pharamp: "ampharos",

  mentali: "espeon",
  noctali: "umbreon",

  cizayox: "scizor",
  tyranocif: "tyranitar",

  lugia: "lugia",
  hooh: "ho-oh",
  celebi: "celebi",

  // ===================================================
  // GEN 3
  // ===================================================

  arcko: "treecko",
  massko: "grovyle",
  jungko: "sceptile",

  poussifeu: "torchic",
  galifeu: "combusken",
  braségali: "blaziken",
  brasegali: "blaziken",

  gobou: "mudkip",
  flobio: "marshtomp",
  laggron: "swampert",

  tarsal: "ralts",
  kirlia: "kirlia",
  gardevoir: "gardevoir",

  drattak: "salamence",
  metalosse: "metagross",

  rayquaza: "rayquaza",
  jirachi: "jirachi",
  deoxys: "deoxys",

  // ===================================================
  // GEN 4
  // ===================================================

  tortipouss: "turtwig",
  boskara: "grotle",
  torterra: "torterra",

  ouisticram: "chimchar",
  chimpenfeu: "monferno",
  simiabraz: "infernape",

  tiplouf: "piplup",
  prinplouf: "prinplup",
  pingoleon: "empoleon",

  lucario: "lucario",
  carchacrok: "garchomp",

  phyllali: "leafeon",
  givrali: "glaceon",
  gallame: "gallade",

  dialga: "dialga",
  palkia: "palkia",
  giratina: "giratina",
  arceus: "arceus",

  // ===================================================
  // GEN 5
  // ===================================================

  victini: "victini",
  zoroark: "zoroark",
  trioxhydre: "hydreigon",

  reshiram: "reshiram",
  zekrom: "zekrom",
  kyurem: "kyurem",

  // ===================================================
  // GEN 6
  // ===================================================

  grenousse: "froakie",
  croaporal: "frogadier",
  amphinobi: "greninja",

  nymphali: "sylveon",
  zygarde: "zygarde",

  // ===================================================
  // GEN 7
  // ===================================================

  brindibou: "rowlet",
  effleche: "dartrix",
  archeduc: "decidueye",

  mimiqui: "mimikyu",

  solgaleo: "solgaleo",
  lunala: "lunala",

  // ===================================================
  // GEN 8
  // ===================================================

  ouistempo: "grookey",
  badabouin: "thwackey",
  gorillume: "rillaboom",

  flambino: "scorbunny",
  larméléon: "sobble",
  larmeon: "sobble",

  zacian: "zacian",
  zamazenta: "zamazenta",

  // ===================================================
  // GEN 9
  // ===================================================

  poussacha: "sprigatito",
  matourgeon: "floragato",
  miascarade: "meowscarada",

  chochodile: "fuecoco",
  crocodel: "crocalor",
  flamigator: "skeledirge",

  coiffeton: "quaxly",
  canarbello: "quaxwell",
  palmaval: "quaquaval",

  mordudor: "gimmighoul",
  gromago: "gholdengo",

  koraidon: "koraidon",
  miraidon: "miraidon",

  charbambin: "charcadet",
  carmadura: "armarouge",
  malvalame: "ceruledge",

  ogerpon: "ogerpon",
  terapagos: "terapagos",
  flamenroule: "flamigo",

  courrousinge: "annihilape",
  pomdramour: "dipplin",
  pecharant: "pecharunt",

  // ===================================================
  // PARADOXES
  // ===================================================

  "roue-de-fer": "iron-treads",
  rouedefer: "iron-treads",
  tetsuo: "iron-treads",

  pachyfer: "iron-thorns",

  "paume-de-fer": "iron-hands",
  paumedefer: "iron-hands",

  "hotte-de-fer": "iron-bundle",
  hottedefer: "iron-bundle",

  "garde-de-fer": "iron-valiant",
  gardedefer: "iron-valiant",

  "rugi-lune": "roaring-moon",
  rugilune: "roaring-moon",

  "flotte-meche": "flutter-mane",
  flottemeche: "flutter-mane",

  // ===================================================
  // FORMES RÉGIONALES
  // ===================================================

  taupiqueurdepaldea: "diglett",
  zoruahisui: "zorua",
  zoroarkhisui: "zoroark",

  goupixdalola: "vulpix",
  feunarddalola: "ninetales",

  miaoussdegalar: "meowth",
};

// =====================================================
// 🔄 INDEX EN → FR
// =====================================================

const englishToFrenchNames: Record<
  string,
  string
> = Object.entries(
  pokemonNames
).reduce(
  (acc, [frenchName, englishName]) => {
    const key = englishName
      .toLowerCase()
      .replace(
        /[^a-z0-9]/g,
        ""
      );

    if (!acc[key]) {
      acc[key] = frenchName;
    }

    return acc;
  },
  {} as Record<string, string>
);

// =====================================================
// 🔤 NORMALISATION NOM
// =====================================================

function normalizeName(
  name: string
): string {
  if (!name) return "";

  const fixed =
    fixOCRCharacterConfusion(
      name
    );

  return fixed
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .replace(
      /[♀♂]/g,
      ""
    )
    .replace(
      /[^a-z0-9]/g,
      ""
    );
}

// =====================================================
// 🇫🇷 EN → FR
// =====================================================

export function translatePokemonToFrench(
  name: string
): string {
  const clean =
    normalizeName(name);

  if (!clean) return "";

  const result =
    englishToFrenchNames[
      clean
    ];

  if (!result) {
    return name;
  }

  return (
    result.charAt(0).toUpperCase() +
    result.slice(1)
  );
}

// =====================================================
// 🔵 ALIAS API
// =====================================================

export function getFrenchPokemonName(
  name: string
): string {
  return translatePokemonToFrench(
    name
  );
}

// =====================================================
// 🧹 NETTOYAGE SUFFIXES TCG
// =====================================================

export function cleanTCGSuffix(
  name: string
): string {
  if (!name) return "";

  return String(name)
    // Promos
    .replace(
      /\b(swsh|svp|sm|xy|bw|hgss|dp|promo)\s*\d*\b/gi,
      ""
    )

    // Raretés / variantes
    .replace(
      /\b(ex|gx|vmax|vstar|v|radiant|shiny|prime|ar|sar|ir|ur|hr|tera|ancient|future)\b/gi,
      ""
    )

    // Formes régionales
    .replace(
      /\b(d'alola|d alola|alola|hisui|de hisui|galar|de galar|paldea|de paldea)\b/gi,
      ""
    )

    .replace(
      /\s+/g,
      " "
    )
    .trim();
}

// =====================================================
// 🔵 ALIAS RECHERCHE
// =====================================================

export function cleanCardNameForSearch(
  name: string
): string {
  return cleanTCGSuffix(name);
}

// =====================================================
// 🔎 EXTRACTION SUFFIXE TCG
// =====================================================

function extractTCGSuffix(
  name: string
): string {
  if (!name) return "";

  const cleaned =
    String(name)
      .replace(
        /\b(d'alola|d alola|alola|hisui|de hisui|galar|de galar|paldea|de paldea)\b/gi,
        ""
      )
      .trim();

  // ---------------------------------------------------
  // PROMOS
  // ---------------------------------------------------

  const promoMatch =
    cleaned.match(
      /\b(swsh|svp|sm|xy|promo)\s*\d*\b/i
    );

  if (promoMatch) {
    return promoMatch[0]
      .replace(/\s+/g, "")
      .toUpperCase();
  }

  // ---------------------------------------------------
  // SUBSETS
  // ---------------------------------------------------

  const subsetMatch =
    cleaned.match(
      /\b(tg|gg|sv)\s*\d+\b/i
    );

  if (subsetMatch) {
    return subsetMatch[0]
      .replace(/\s+/g, "")
      .toUpperCase();
  }

  // ---------------------------------------------------
  // SUFFIXES CLASSIQUES
  // ---------------------------------------------------

  const suffixMatch =
    cleaned.match(
      /\b(ex|gx|vmax|vstar|radiant|shiny|prime|ar|sar|ir|ur|hr|tera)\b/i
    );

  if (suffixMatch) {
    return suffixMatch[1].toLowerCase();
  }

  // V seul en fin de nom
  if (
    /\bv$/i.test(
      cleaned
    )
  ) {
    return "v";
  }

  return "";
}

// =====================================================
// 🇬🇧 FR → EN
// =====================================================

export function translatePokemonToEnglish(
  name: string
): string | null {
  if (!name) return null;

  const suffix =
    extractTCGSuffix(name);

  const cleanBase =
    cleanTCGSuffix(name);

  const normalized =
    normalizeName(cleanBase);

  if (!normalized) {
    return null;
  }

  // Nom français
  const translated =
    pokemonNames[
      normalized
    ];

  if (translated) {
    return suffix
      ? `${translated} ${suffix}`
      : translated;
  }

  // Nom déjà anglais
  const englishMatch =
    Object.values(
      pokemonNames
    ).find(
      (englishName) =>
        englishName
          .toLowerCase()
          .replace(
            /[^a-z0-9]/g,
            ""
          ) === normalized
    );

  if (englishMatch) {
    return suffix
      ? `${englishMatch} ${suffix}`
      : englishMatch;
  }

  return null;
}

// =====================================================
// 🔵 NOM POKÉMON
// =====================================================

export function translatePokemonName(
  name: string
): string {
  return (
    translatePokemonToEnglish(
      name
    ) ?? name
  );
}

// =====================================================
// 🧠 RÉSOLUTION OCR
// =====================================================

export function resolvePokemonName(
  name: string
): string {
  const clean =
    normalizeName(name);

  if (!clean) return "";

  return (
    ocrAliases[clean] ??
    name
  );
}

// =====================================================
// 🧹 NETTOYAGE OCR
// =====================================================

export function cleanPokemonOCRName(
  name: string
): string {
  if (!name) return "";

  const fixed =
    fixOCRCharacterConfusion(
      name
    );

  return fixed
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .replace(
      /[♀♂]/g,
      ""
    )
    .replace(
      /[^a-z0-9\- ]/g,
      ""
    )
    .replace(
      /\s+/g,
      " "
    )
    .trim();
}

// =====================================================
// 🎯 CORRECTION OCR
// =====================================================

export function correctPokemonOCR(
  name: string
): string {
  const clean =
    cleanPokemonOCRName(name);

  const normalized =
    normalizeName(clean);

  return (
    ocrAliases[normalized] ??
    clean
  );
}

// =====================================================
// 🃏 RÉSOLUTION CARTE TCG
// =====================================================

export function resolveTCGCardName(
  rawName: string
) {
  const original =
    rawName;

  let cleaned =
    cleanPokemonOCRName(
      rawName
    );

  cleaned =
    correctPokemonOCR(
      cleaned
    );

  const suffix =
    extractTCGSuffix(
      cleaned
    );

  const baseName =
    cleanTCGSuffix(
      cleaned
    );

  const correctedName =
    resolvePokemonName(
      baseName
    );

  const pokemon =
    translatePokemonToEnglish(
      correctedName
    ) ??
    correctedName;

  return {
    original,
    pokemon,
    suffix:
      suffix || null,
    confidence:
      pokemon !== baseName
        ? 95
        : 70,
  };
}