/**
 * 🧠 Pokémon Translator King TCG V3
 *
 * Gestion :
 * - Traduction Français ⇄ Anglais
 * - Correction OCR scanner
 * - Gestion suffixes TCG (ex, GX, V, VMAX, VSTAR...)
 * - Résolution des noms pour recherche API Pokémon TCG
 */
 const ocrAliases: Record<string, string> = {
  // erreurs OCR fréquentes
  dracaufu: "dracaufeu",
  dracaufe: "dracaufeu",
  dracauf: "dracaufeu",
  "dracauf eu": "dracaufeu",
  pikashu: "pikachu",
  pikatchu: "pikachu",
  "pikach u": "pikachu",
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
  "noadkoko d alola": "noadkokodalola",
};

export const pokemonNames: Record<string, string> = {
  // Gen 1
  bulbizarre: "bulbasaur", herbizarre: "ivysaur", florizarre: "venusaur",
  salameche: "charmander", reptincel: "charmeleon", dracaufeu: "charizard",
  carapuce: "squirtle", carabaffe: "wartortle", tortank: "blastoise",
  chenipan: "caterpie", chrysacier: "metapod", papilusion: "butterfree",
  aspicot: "weedle", coconfort: "kakuna", dardargnan: "beedrill",
  roucool: "pidgey", roucoups: "pidgeotto", roucarnage: "pidgeot",
  rattata: "rattata", rattatac: "raticate",
  piafabec: "spearow", rapasdepic: "fearow",
  abo: "ekans", arbok: "arbok",
  pikachu: "pikachu", raichu: "raichu",
  sablette: "sandshrew", sablaireau: "sandslash",
  nidoranf: "nidoran-f", nidorina: "nidorina", nidoqueen: "nidoqueen",
  nidoranm: "nidoran-m", nidorino: "nidorino", nidoking: "nidoking",
  melofee: "clefairy", melodelfe: "clefable",
  goupix: "vulpix", feunard: "ninetales",
  rondoudou: "jigglypuff", groudoudou: "wigglytuff",
  nosferapti: "zubat", nosferalto: "golbat",
  mystherbe: "oddish", ortide: "gloom", rafflesia: "vileplume",
  paras: "paras", parasect: "parasect",
  mimitoss: "venonat", aeromite: "venomoth",
  taupiqueur: "diglett", triopikeur: "dugtrio",
  miaouss: "meowth", persian: "persian",
  psykokwak: "psyduck", akwakwak: "golduck",
  ferosinge: "mankey", colossinge: "primeape",
  caninos: "growlithe", arcanin: "arcanine",
  ptitard: "poliwag", tetarte: "poliwhirl", tartard: "poliwrath",
  abra: "abra", kadabra: "kadabra", alakazam: "alakazam",
  machoc: "machop", machopeur: "machoke", mackogneur: "machamp",
  chetiflor: "bellsprout", boustiflor: "weepinbell", empiflor: "victreebel",
  tentacool: "tentacool", tentacruel: "tentacruel",
  racaillou: "geodude", gravalanch: "graveler", grolem: "golem",
  ponyta: "ponyta", galopa: "rapidash",
  rameolos: "slowpoke", flagadoss: "slowbro",
  magneti: "magnemite", magneton: "magneton",
  canarticho: "farfetchd",
  doduo: "doduo", dodrio: "dodrio",
  otaria: "seel", lamantine: "dewgong",
  tadmorv: "grimer", grotadmorv: "muk",
  kokiyas: "shellder", crustabri: "cloyster",
  fantominus: "gastly", spectrum: "haunter", ectoplasma: "gengar",
  onix: "onix",
  sophorifik: "drowzee", hypnomade: "hypno",
  krabby: "krabby", krabboss: "kingler",
  voltorbe: "voltorb", electrode: "electrode",
  noeunoeuf: "exeggcute", noadkoko: "exeggutor",
  osselelet: "cubone", ossatueur: "marowak",
  kicklee: "hitmonlee", tygnon: "hitmonchan",
  excelangue: "lickitung",
  smogo: "koffing", smogogo: "weezing",
  rhinocorn: "rhyhorn", rhinoferos: "rhydon",
  leveinard: "chansey", saquedeneu: "tangela", kangourex: "kangaskhan",
  hypocean: "seadra",
  poisseneche: "goldeen", poissoroy: "seaking",
  stari: "staryu", staross: "starmie",
  mmime: "mr-mime", mrmime: "mr-mime", m_mime: "mr-mime",
  insecateur: "scyther", lippoutou: "jynx", elektek: "electabuzz", magmar: "magmar",
  scarabrute: "pinsir", tauros: "tauros",
  magicarpe: "magikarp", leviator: "gyarados", lokhlass: "lapras", metamorph: "ditto",
  evoli: "eevee", aquali: "vaporeon", voltali: "jolteon", pyroli: "flareon",
  porygon: "porygon", amonita: "omanyte", amonistar: "omastar",
  kabuto: "kabuto", kabutops: "kabutops", ptera: "aerodactyl", ronflex: "snorlax",
  artikodin: "articuno", electhor: "zapdos", sulfura: "moltres",
  minidraco: "dratini", draco: "dragonair", dracolosse: "dragonite",
  mewtwo: "mewtwo", mew: "mew",

  // Gen 2
  germignon: "chikorita", macronium: "bayleef", meganium: "meganium",
  hericendre: "cyndaquil", feurisson: "quilava", typhlosion: "typhlosion",
  kaiminus: "totodile", crocrodil: "croconaw", aligatueur: "feraligatr",
  furet: "sentret", fouinar: "furret", hoothoot: "hoothoot", noarfang: "noctowl",
  ledyba: "ledyba", ledian: "ledian", mimigal: "spinarak", migalos: "ariados",
  nostenfer: "crobat", loupio: "chinchou", lanturn: "lanturn",
  pichu: "pichu", melo: "cleffa", toudoudou: "igglybuff", togepi: "togepi", togetic: "togetic",
  natu: "natu", xatu: "xatu", wattouat: "mareep", lainergie: "flaaffy", pharamp: "ampharos",
  joliflor: "bellossom", marill: "marill", azumarill: "azumarill", simularbre: "sudowoodo",
  tarpaud: "politoed", granivol: "hoppip", floravol: "skiploom", cotovol: "jumpluff",
  capumain: "aipom", tournegrin: "sunkern", heliastronc: "sunflora", yanma: "yanma",
  axoloto: "wooper", maraiste: "quagsire", mentali: "espeon", noctali: "umbreon",
  cornebre: "murkrow", roigada: "slowking", feuforeve: "misdreavus", zarbi: "unown",
  qulbutoke: "wobbuffet", girafarig: "girafarig", foretress: "forretress", insolourdo: "dunsparce",
  scorplane: "gligar", steelix: "steelix", snubbull: "snubbull", granbull: "granbull",
  qwilfish: "qwilfish", cizayox: "scizor", caratroc: "shuckle", scarhino: "heracross",
  farfuret: "sneasel", teddiursa: "teddiursa", ursaring: "ursaring",
  limagma: "slugma", volcaropod: "magcargo", marcacrin: "swinub", cochignon: "piloswine",
  corayon: "corsola", remoraid: "remoraid", octillery: "octillery", cadoizo: "delibird",
  demanta: "mantine", airmure: "skarmory", malosse: "houndour", demolosse: "houndoom",
  hyporoi: "kingdra", phanpy: "phanpy", donphan: "donphan", porygon2: "porygon2",
  cerfrousse: "stantler", queulorior: "smeargle", debugant: "tyrogue", kapoera: "hitmontop",
  lippouti: "smoochum", elekid: "elekid", magby: "magby", ecremeuh: "miltank",
  leuphorie: "blissey", raikou: "raikou", entei: "entei", suicune: "suicune",
  embrilex: "larvitar", ymphect: "pupitar", tyranocif: "tyranitar",
  lugia: "lugia", hooh: "ho-oh", celebi: "celebi",

  // Gen 3
  arcko: "treecko", massko: "grovyle", jungko: "sceptile",
  poussifeu: "torchic", galifeu: "combusken", brasegali: "blaziken",
  gobou: "mudkip", flobio: "marshtomp", laggron: "swampert",
  medhyena: "poochyena", grahyena: "mightyena", zigzaton: "zigzagoon", lineon: "linoone",
  chenipotte: "wurmple", armulys: "silcoon", charmillon: "beautifly", blindalys: "cascoon", papinox: "dustox",
  nenupiot: "lotad", lombre: "lombre", ludicolo: "ludicolo",
  grainipiot: "seedot", pifeuil: "nuzleaf", tengalice: "shiftry",
  nirondelle: "taillow", heledelle: "swellow", goelise: "wingull", pelipper: "pelipper",
  tarsal: "ralts", kirlia: "kirlia", gardevoir: "gardevoir",
  arakdo: "surskit", maskadra: "masquerain", balignon: "shroomish", chapignon: "breloom",
  parecool: "slakoth", vigoroth: "vigoroth", monaflemit: "slaking",
  ningale: "nincada", ninjask: "ninjask", munja: "shedinja",
  chuchmur: "whismur", ramboum: "loudred", brouhabam: "exploud",
  makuhita: "makuhita", hariyama: "hariyama", azurill: "azurill", tarinor: "nosepass",
  skitty: "skitty", delcatty: "delcatty", tenefix: "sableye", mysdibule: "mawile",
  galekid: "aron", galegon: "lairon", galeking: "aggron",
  meditikka: "meditite", charmina: "medicham", dynavolt: "electrike", elecsprint: "manectric",
  posipi: "plusle", negapi: "minun", muciole: "volbeat", lumivole: "illumise",
  roselia: "roselia", gloupti: "gulpin", avaltout: "swalot",
  carvanha: "carvanha", sharpedo: "sharpedo", wailmer: "wailmer", wailord: "wailord",
  chamallot: "numel", camerupt: "camerupt", chartor: "torkoal",
  spoink: "spoink", groret: "grumpig", spinda: "spinda",
  kraknoix: "trapinch", vibraninf: "vibrava", libegon: "flygon",
  cacnea: "cacnea", cacturne: "cacturne", tyrondelle: "swablu", altaria: "altaria",
  mangriff: "zangoose", seviper: "seviper", seleroc: "lunatone", solaroc: "solrock",
  barloche: "barboach", barbicha: "whiscash", ecrapince: "corphish", colhomard: "crawdaunt",
  balbuto: "baltoy", kaorine: "claydol", lilia: "lileep", vacilys: "cradily",
  anorith: "anorith", armaldo: "armaldo", barpau: "feebas", milobellus: "milotic",
  morpheo: "castform", kecleon: "kecleon", polichombr: "shuppet", branette: "banette",
  teraclope: "duskull", tropius: "tropius", eoko: "chimecho", absol: "absol", okeoke: "wynaut",
  stalgamin: "snorunt", oniglali: "glalie", momartik: "froslass",
  obalie: "spheal", phogleur: "sealeo", kaimorse: "walrein",
  coquiperl: "clamperl", serpang: "huntail", rosabyss: "gorebyss",
  relicanth: "relicanth", lovdisc: "luvdisc",
  draby: "bagon", drackhaus: "shelgon", drattak: "salamence",
  terhal: "beldum", metang: "metang", metalosse: "metagross",
  regirock: "regirock", regice: "regice", registeel: "registeel",
  latias: "latias", latios: "latios", kyogre: "kyogre", groudon: "groudon", rayquaza: "rayquaza",
  jirachi: "jirachi", deoxys: "deoxys",

  // Gen 4 à 9
  tortipouss: "turtwig", boskara: "grotle", torterra: "torterra",
  ouisticram: "chimchar", chimpenfeu: "monferno", simiabraz: "infernape",
  tiplouf: "piplup", prinplouf: "prinplup", pingoleon: "empoleon",
  etourmi: "starly", etourvol: "staravia", etouraptor: "staraptor",
  keunotor: "bidoof", castorno: "bibarel", lixy: "shinx", luxio: "luxio", luxray: "luxray",
  roserade: "roserade", kranidos: "cranidos", charkos: "rampardos",
  dinoclier: "shieldon", bastiodon: "bastiodon", apireine: "vespiquen",
  pachirisu: "pachirisu", mustebouee: "buizel", musteflott: "floatzel",
  sancoki: "shellos", tritosor: "gastrodon", baudrive: "drifloon", goinfrex: "munchlax",
  laporeille: "buneary", lockpin: "lopunny", chaglam: "glameow",
  moufouette: "stunky", moufflair: "skuntank", archeomire: "bronzor", archeodong: "bronzong",
  pijako: "chatot", spiritomb: "spiritomb", griknot: "gible", carmache: "gabite", carchacrok: "garchomp",
  riolu: "riolu", lucario: "lucario", hippopotas: "hippopotas", hippodocus: "hippowdon",
  rapion: "skorupi", drascore: "drapion", cradopaud: "croagunk", coatox: "toxicroak",
  vortente: "carnivine", ecayon: "finneon", lumineon: "lumineon", blizzi: "snover", blizzaroi: "abomasnow",
  rhinastoc: "rhyperior", elekable: "electivire", maganon: "magmortar", togekiss: "togekiss",
  yanmega: "yanmega", phyllali: "leafeon", givrali: "glaceon", scorvol: "gliscor", mammochon: "mamoswine",
  gallame: "gallade", tarinorme: "probopass", noctunoir: "dusknoir",
  crehelf: "uxie", crefollet: "mesprit", crefadet: "azelf",
  dialga: "dialga", palkia: "palkia", heatran: "heatran", regigigas: "regigigas",
  giratina: "giratina", cresselia: "cresselia", phione: "phione", manaphy: "manaphy",
  darkrai: "darkrai", shaymin: "shaymin", arceus: "arceus", motisma: "rotom",

  // Gen 5+
  victini: "victini", gruikui: "tepig", grotichon: "pignite", roitiflam: "emboar",
  moustillon: "oshawott", mateloutre: "dewott", clamiral: "samurott",
  vipelierre: "snivy", lianaja: "servine", majaspic: "serperior",
  ponchiot: "lillipup", mastouffe: "stoutland", chacripan: "purrloin", leopardus: "liepard",
  feuillajou: "pansage", flamajou: "pansear", flotajou: "panpour",
  munna: "munna", mushana: "musharna", zebribon: "blitzle", zebrika: "zebstrika",
  rototaupe: "drilbur", minotaupe: "excadrill", nanmeouie: "audino", betochef: "conkeldurr",
  coupenotte: "axew", incisache: "fraxure", tranchodon: "haxorus",
  venipatte: "venipede", brutapode: "scolipede", doudouvet: "cottonee", farfaduvet: "whimsicott",
  petilil: "petilil", fragilady: "lilligant", zorua: "zorua", zoroark: "zoroark",
  chinchidou: "minccino", cinccino: "cinccino", solochi: "deino", diamat: "zweilous", trioxhydre: "hydreigon",
  pyronille: "larvesta", pyrax: "volcarona", cobaltium: "cobalion", terrakium: "terrakion", viridium: "virizion",
  reshiram: "reshiram", zekrom: "zekrom", kyurem: "kyurem", genesect: "genesect",

  // Gen 6
  marisson: "chespin", feunnec: "fennekin", roussil: "braixen", goupelin: "delphox",
  grenousse: "froakie", croaporal: "frogadier", amphinobi: "greninja",
  passerouge: "fletchling", flambusard: "talonflame", monorpale: "honedge", exagide: "aegislash",
  sonistrelle: "noibat", bruyverne: "noivern", zygarde: "zygarde", diancie: "diancie",
  hoopa: "hoopa", volcanion: "volcanion", nymphali: "sylveon",

  // Gen 7
  brindibou: "rowlet", archeduc: "decidueye", flamiaou: "litten", felinferno: "incineroar",
  otaquin: "popplio", oratoria: "primarina", rocabot: "rockruff", lougaroc: "lycanroc",
  mimiqui: "mimikyu", solgaleo: "solgaleo", lunala: "lunala", necrozma: "necrozma",
  meltan: "meltan", melmetal: "melmetal",

  // Gen 8
  ouistempo: "grookey", gorigandr: "rillaboom", flambino: "scorbunny", pyrobut: "cinderace",
  larmeon: "sobble", lezargus: "inteleon", moumouton: "wooloo",
  zacian: "zacian", zamazenta: "zamazenta", eternatus: "eternatus", shifours: "urshifu",

  // Gen 9
  poussacha: "sprigatito", miascarade: "meowscarada", chochodile: "fuecoco", flamigator: "skeledirge",
  coiffeton: "quaxly", palmaval: "quaquaval", gromago: "gholdengo", mordudor: "gimmighoul",
  koraidon: "koraidon", miraidon: "miraidon",

  // Formes / Variantes TCG
  taupiqueurdepaldea: "diglett",
  triopikeurdepaldea: "dugtrio",
  flamenroule: "flamigo",
  zoruahisui: "zorua",
  zoroarkhisui: "zoroark",
  arcaninhisui: "arcanine",
  voltorbehisui: "voltorb",
  electrodehisui: "electrode",
  bruyvernehisui: "noivern",
};

const englishToFrenchNames: Record<string, string> = Object.entries(
  pokemonNames
).reduce((acc, [fr, en]) => {
  acc[en] = fr;
  return acc;
}, {} as Record<string, string>);

function normalizeName(name: string): string {
  if (!name) return "";
  return name
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[♀♂]/g, "")
    .replace(/[.'’_-]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

export function translatePokemonToFrench(name: string): string {
  const clean = normalizeName(name);
  if (!clean) return "";

  const result = englishToFrenchNames[clean];
  if (!result) {
    return name;
  }

  return result.charAt(0).toUpperCase() + result.slice(1);
}

export function cleanTCGSuffix(name: string): string {
  if (!name) return "";

  return name
    .replace(
      /\b(ex|EX|gx|GX|v|V|vmax|VMAX|vstar|VSTAR|radiant|shiny|prime|AR|SAR|IR)\b/gi,
      ""
    )
    .replace(
      /\b(d'alola|d alola|alola|hisui|de hisui)\b/gi,
      ""
    )
    .replace(/\s+/g, " ")
    .trim();
}


function extractTCGSuffix(name: string): string {
  if (!name) return "";

  const cleaned = name
    .replace(
      /\b(d'alola|d alola|alola|hisui|de hisui)\b/gi,
      ""
    )
    .trim();

  const match = cleaned.match(
    /\b(ex|EX|gx|GX|v|V|vmax|VMAX|vstar|VSTAR|radiant|shiny|prime|AR|SAR|IR)\b/i
  );

  return match ? match[1].toLowerCase() : "";
}
export function translatePokemonToEnglish(name: string): string | null {
  if (!name) return null;

  const suffix = extractTCGSuffix(name);
  const cleanBase = cleanTCGSuffix(name);
  const normalized = normalizeName(cleanBase);

  if (!normalized) {
    return null;
  }

  const translated = pokemonNames[normalized];
  if (translated) {
    return suffix ? `${translated} ${suffix}` : translated;
  }

  return null;
}

export function translatePokemonName(name: string): string {
  return translatePokemonToEnglish(name) ?? name;
}

export function resolvePokemonName(name: string): string {
  const clean = normalizeName(name);
  if (!clean) {
    return "";
  }
  return ocrAliases[clean] ?? name;
}

export function cleanPokemonOCRName(name: string): string {
  if (!name) return "";
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[♀♂]/g, "")
    .replace(/[^a-z0-9\- ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function correctPokemonOCR(name: string): string {
  const clean = cleanPokemonOCRName(name);

  const corrections: Record<string, string> = {
    // Dracaufeu
    dracauf: "dracaufeu",
    dracaufe: "dracaufeu",
    "dracauf eu": "dracaufeu",

    // Charizard
    "chariz ard": "charizard",

    // Pikachu
    pikach: "pikachu",
    "pikach u": "pikachu",
    pikashu: "pikachu",

    // Mewtwo
    mewtwoo: "mewtwo",

    // Salamèche
    salamech: "salameche",

    // Florizarre
    florizare: "florizarre",

    // Tortank
    tortankk: "tortank",

    // Evolition
    evolii: "evoli",
  };

  return corrections[clean] ?? clean;
}

/**
 * 🃏 Résolution complète King TCG V3
 *
 * Exemple :
 * "Dracauf eu ex"
 * retourne :
 * {
 *   original:"Dracauf eu ex",
 *   pokemon:"charizard",
 *   suffix:"ex",
 *   confidence:95
 * }
 */
export function resolveTCGCardName(rawName: string) {
  const original = rawName;

  let cleaned = cleanPokemonOCRName(rawName);
  cleaned = correctPokemonOCR(cleaned);

  const suffix = extractTCGSuffix(cleaned);
  const baseName = cleanTCGSuffix(cleaned);

  const correctedName = resolvePokemonName(baseName);

  const pokemon =
    translatePokemonToEnglish(correctedName) ?? correctedName;

  return {
    original,
    pokemon,
    suffix: suffix || null,
    confidence: pokemon !== baseName ? 95 : 60,
  };
}
