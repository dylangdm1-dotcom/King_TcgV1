/**
 * 🧠 Pokémon Translator King TCG V3.5 (Version Finale & Validée)
 *
 * Support :
 * - Traduction FR ⇄ EN (Gen 1 à Gen 9 + Paradoxes)
 * - Anti-Confusion OCR (0/O, 1/I, 5/S, 8/B)
 * - Matcher Sub-sets (Trainer Gallery TG, Galarian Gallery GG, Shiny Vault SV)
 * - Formes Régionales & Paradoxes (Paldea, Hisui, Alola, Galar, Iron/Passé/Futur)
 * - Promos TCG (SVP, SWSH, SM, XY, PROMO)
 */

 import { logger } from "./cache/logger";

 // Normalisation pré-OCR pour corriger les confusions de caractères typiques
 export function fixOCRCharacterConfusion(text: string): string {
   if (!text) return "";
   return text
     // Normalise l'apostrophe et espaces bizarres
     .replace(/['’`]/g, "")
     // Corrections contextuelles de numéros
     .replace(/\b[O|o](\d+)\b/g, "0$1") // O153 -> 0153
     .replace(/\b(\d+)[O|o]\b/g, "$10") // 15O -> 150
     .replace(/\b[I|l](\d+)\b/g, "1$1") // I12 -> 112
     .replace(/\bS(\d+)\b/g, "5$1")     // S12 -> 512
     .replace(/\bB(\d+)\b/g, "8$1");    // B12 -> 812
 }
 
 const ocrAliases: Record<string, string> = {
   // Erreurs OCR très fréquentes
   dracaufu: "dracaufeu",
   dracaufe: "dracaufeu",
   dracauf: "dracaufeu",
   dracaufeu: "dracaufeu",
   "dracauf eu": "dracaufeu",
   charizard: "charizard",
   "chariz ard": "charizard",
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
   mirmidon: "miraidon",
   coraidon: "koraidon",
 };
 
 export const pokemonNames: Record<string, string> = {
   // Gen 1
   bulbizarre: "bulbasaur", herbizarre: "ivysaur", florizarre: "venusaur",
   salameche: "charmander", reptincel: "charmeleon", dracaufeu: "charizard",
   carapuce: "squirtle", carabaffe: "wartortle", tortank: "blastoise",
   chenipan: "caterpie", chrysacier: "metapod", papilusion: "butterfree",
   aspicot: "weedle", coconfort: "kakuna", dardargnan: "beedrill",
   roucool: "pidgey", roucoups: "pidgeotto", roucarnage: "pidgeot",
   rattata: "raticate", piafabec: "spearow", rapasdepic: "fearow",
   abo: "ekans", arbok: "arbok", pikachu: "pikachu", raichu: "raichu",
   sablette: "sandshrew", sablaireau: "sandslash",
   nidoranf: "nidoran-f", nidorina: "nidorina", nidoqueen: "nidoqueen",
   nidoranm: "nidoran-m", nidorino: "nidorino", nidoking: "nidoking",
   melofee: "clefairy", melodelfe: "clefable", goupix: "vulpix", feunard: "ninetales",
   rondoudou: "jigglypuff", groudoudou: "wigglytuff", nosferapti: "zubat", nosferalto: "golbat",
   mystherbe: "oddish", ortide: "gloom", rafflesia: "vileplume", paras: "paras", parasect: "parasect",
   mimitoss: "venonat", aeromite: "venomoth", taupiqueur: "diglett", triopikeur: "dugtrio",
   miaouss: "meowth", persian: "persian", psykokwak: "psyduck", akwakwak: "golduck",
   ferosinge: "mankey", colossinge: "primeape", caninos: "growlithe", arcanin: "arcanine",
   ptitard: "poliwag", tetarte: "poliwhirl", tartard: "poliwrath",
   abra: "abra", kadabra: "kadabra", alakazam: "alakazam",
   machoc: "machop", machopeur: "machoke", mackogneur: "machamp",
   chetiflor: "bellsprout", boustiflor: "weepinbell", empiflor: "victreebel",
   tentacool: "tentacool", tentacruel: "tentacruel", racaillou: "geodude", gravalanch: "graveler", grolem: "golem",
   ponyta: "ponyta", galopa: "rapidash", rameolos: "slowpoke", flagadoss: "slowbro",
   magneti: "magnemite", magneton: "magneton", canarticho: "farfetchd", doduo: "doduo", dodrio: "dodrio",
   otaria: "seel", lamantine: "dewgong", tadmorv: "grimer", grotadmorv: "muk",
   kokiyas: "shellder", crustabri: "cloyster", fantominus: "gastly", spectrum: "haunter", ectoplasma: "gengar",
   onix: "onix", sophorifik: "drowzee", hypnomade: "hypno", krabby: "krabby", krabboss: "kingler",
   voltorbe: "voltorb", electrode: "electrode", noeunoeuf: "exeggcute", noadkoko: "exeggutor",
   osselelet: "cubone", ossatueur: "marowak", kicklee: "hitmonlee", tygnon: "hitmonchan", excelangue: "lickitung",
   smogo: "koffing", smogogo: "weezing", rhinocorn: "rhyhorn", rhinoferos: "rhydon",
   leveinard: "chansey", saquedeneu: "tangela", kangourex: "kangaskhan", hypocean: "seadra",
   poisseneche: "goldeen", poissoroy: "seaking", stari: "staryu", staross: "starmie",
   mmime: "mr. mime", mrmime: "mr. mime", m_mime: "mr. mime",
   insecateur: "scyther", lippoutou: "jynx", elektek: "electabuzz", magmar: "magmar",
   scarabrute: "pinsir", tauros: "tauros", magicarpe: "magikarp", leviator: "gyarados", lokhlass: "lapras", metamorph: "ditto",
   evoli: "eevee", aquali: "vaporeon", voltali: "jolteon", pyroli: "flareon",
   porygon: "porygon", amonita: "omanyte", amonistar: "omastar", kabuto: "kabuto", kabutops: "kabutops",
   ptera: "aerodactyl", ronflex: "snorlax", artikodin: "articuno", electhor: "zapdos", sulfura: "moltres",
   minidraco: "dratini", draco: "dragonair", dracolosse: "dragonite", mewtwo: "mewtwo", mew: "mew",
 
   // Gen 2 à Gen 8 (Essentiels TCG)
   germignon: "chikorita", hericendre: "cyndaquil", kaiminus: "totodile",
   pichu: "pichu", togepi: "togepi", wattouat: "mareep", pharamp: "ampharos",
   mentali: "espeon", noctali: "umbreon", cizayox: "scizor", tyranocif: "tyranitar",
   lugia: "lugia", hooh: "ho-oh", celebi: "celebi",
   arcko: "treecko", poussifeu: "torchic", gobou: "mudkip",
   tarsal: "ralts", gardevoir: "gardevoir", drattak: "salamence", metalosse: "metagross",
   rayquaza: "rayquaza", jirachi: "jirachi", deoxys: "deoxys",
   tortipouss: "turtwig", ouisticram: "chimchar", tiplouf: "piplup",
   lucario: "lucario", carchacrok: "garchomp", phyllali: "leafeon", givrali: "glaceon", gallame: "gallade",
   dialga: "dialga", palkia: "palkia", giratina: "giratina", arceus: "arceus",
   victini: "victini", zoroark: "zoroark", trioxhydre: "hydreigon", reshiram: "reshiram", zekrom: "zekrom", kyurem: "kyurem",
   grenousse: "froakie", amphinobi: "greninja", nymphali: "sylveon", zygarde: "zygarde",
   brindibou: "rowlet", mimiqui: "mimikyu", solgaleo: "solgaleo", lunala: "lunala",
   ouistempo: "grookey", flambino: "scorbunny", larmeon: "sobble", zacian: "zacian", zamazenta: "zamazenta",
 
   // Gen 9 & Paradoxes (Scarlet & Violet)
   poussacha: "sprigatito", matourgeon: "floragato", miascarade: "meowscarada",
   chochodile: "fuecoco", crocodel: "crocalor", flamigator: "skeledirge",
   coiffeton: "quaxly", canarbello: "quaxwell", palmaval: "quaquaval",
   gromago: "gholdengo", mordudor: "gimmighoul", koraidon: "koraidon", miraidon: "miraidon",
   charbambin: "charcadet", carmadura: "armarouge", malvalame: "ceruledge",
   "roue-de-fer": "iron-treads", tetsuo: "iron-treads", "pachyfer": "iron-thorns",
   "paume-de-fer": "iron-hands", paumedefer: "iron-hands", "hotte-de-fer": "iron-bundle", hottedefer: "iron-bundle",
   "garde-de-fer": "iron-valiant", gardedefer: "iron-valiant",
   "rugi-lune": "roaring-moon", rugilune: "roaring-moon",
   "flotte-meche": "flutter-mane", flottemeche: "flutter-mane",
   "courrousinge": "annihilape", pomdramour: "dipplin", pecharant: "pecharant",
   ogerpon: "ogerpon", terapagos: "terapagos", flamenroule: "flamigo",
 
   // Regionales
   taupiqueurdepaldea: "diglett", zoruahisui: "zorua", zoroarkhisui: "zoroark",
   goupixdalola: "vulpix", feunarddalola: "ninetales", miaoussdegalar: "meowth",
 };
 
 const englishToFrenchNames: Record<string, string> = Object.entries(
   pokemonNames
 ).reduce((acc, [fr, en]) => {
   acc[en.toLowerCase().replace(/[^a-z0-9]/g, "")] = fr;
   return acc;
 }, {} as Record<string, string>);
 
 function normalizeName(name: string): string {
   if (!name) return "";
   const fixed = fixOCRCharacterConfusion(name);
   return fixed
     .toLowerCase()
     .trim()
     .normalize("NFD")
     .replace(/[\u0300-\u036f]/g, "")
     .replace(/[♀♂]/g, "")
     .replace(/[^a-z0-9]/g, "");
 }
 
 export function translatePokemonToFrench(name: string): string {
   const clean = normalizeName(name);
   if (!clean) return "";
 
   const result = englishToFrenchNames[clean];
   if (!result) return name;
 
   return result.charAt(0).toUpperCase() + result.slice(1);
 }
 
 // 🟢 Alias exporté pour la route API /api/scan/route.ts
 export function getFrenchPokemonName(name: string): string {
   return translatePokemonToFrench(name);
 }
 
 /**
  * Nettoie les suffixes de rareté TCG, mots-clés et promos
  */
 export function cleanTCGSuffix(name: string): string {
   if (!name) return "";
 
   return name
     .replace(/\b(swsh|svp|sm|xy|bw|hgss|dp|promo)\s*\d*\b/gi, "")
     .replace(
       /\b(ex|EX|gx|GX|v|V|vmax|VMAX|vstar|VSTAR|radiant|shiny|prime|AR|SAR|IR|UR|HR|TERA|ANCIENT|FUTURE)\b/gi,
       ""
     )
     .replace(
       /\b(d'alola|d alola|alola|hisui|de hisui|galar|de galar|paldea|de paldea)\b/gi,
       ""
     )
     .replace(/\s+/g, " ")
     .trim();
 }
 
 // 🟢 Alias exporté pour le nettoyage de recherche TCG
 export function cleanCardNameForSearch(name: string): string {
   return cleanTCGSuffix(name);
 }
 
 /**
  * Extrait le suffixe TCG (Rareté, Promos, Sub-sets TG/GG)
  */
 function extractTCGSuffix(name: string): string {
   if (!name) return "";
 
   const cleaned = name
     .replace(
       /\b(d'alola|d alola|alola|hisui|de hisui|galar|de galar|paldea|de paldea)\b/gi,
       ""
     )
     .trim();
 
   // 1. Promos (SWSH254, SVP001)
   const promoMatch = cleaned.match(/\b(swsh|svp|sm|xy|promo)\s*\d*\b/i);
   if (promoMatch) return promoMatch[0].toUpperCase();
 
   // 2. Sub-sets (TG01, GG12)
   const subsetMatch = cleaned.match(/\b(tg|gg|sv)\s*\d+\b/i);
   if (subsetMatch) return subsetMatch[0].toUpperCase();
 
   // 3. Suffixes TCG Classiques
   const match = cleaned.match(
     /\b(ex|EX|gx|GX|vmax|VMAX|vstar|VSTAR|radiant|shiny|prime|AR|SAR|IR|UR|HR|tera)\b/i
   ) || cleaned.match(/\b(v|V)$/i);
 
   return match ? match[1].toLowerCase() : "";
 }
 
 export function translatePokemonToEnglish(name: string): string | null {
   if (!name) return null;
 
   const suffix = extractTCGSuffix(name);
   const cleanBase = cleanTCGSuffix(name);
   const normalized = normalizeName(cleanBase);
 
   if (!normalized) return null;
 
   const translated = pokemonNames[normalized];
   if (translated) {
     return suffix ? `${translated} ${suffix}` : translated;
   }
 
   // Si c'est déjà en anglais
   if (Object.values(pokemonNames).some(en => en.toLowerCase().replace(/[^a-z0-9]/g, "") === normalized)) {
     return suffix ? `${cleanBase} ${suffix}` : cleanBase;
   }
 
   return null;
 }
 
 export function translatePokemonName(name: string): string {
   return translatePokemonToEnglish(name) ?? name;
 }
 
 export function resolvePokemonName(name: string): string {
   const clean = normalizeName(name);
   if (!clean) return "";
   return ocrAliases[clean] ?? name;
 }
 
 export function cleanPokemonOCRName(name: string): string {
   if (!name) return "";
   const fixed = fixOCRCharacterConfusion(name);
   return fixed
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
   return ocrAliases[clean] ?? clean;
 }
 
 export function resolveTCGCardName(rawName: string) {
   const original = rawName;
 
   let cleaned = cleanPokemonOCRName(rawName);
   cleaned = correctPokemonOCR(cleaned);
 
   const suffix = extractTCGSuffix(cleaned);
   const baseName = cleanTCGSuffix(cleaned);
   const correctedName = resolvePokemonName(baseName);
 
   const pokemon = translatePokemonToEnglish(correctedName) ?? correctedName;
 
   return {
     original,
     pokemon,
     suffix: suffix || null,
     confidence: pokemon !== baseName ? 95 : 70,
   };
 }