/**
 * Recherche carte Pokémon après OCR / Scan Vision
 * King TCG Scanner V3
 */

 import { searchCards } from "../pokemon";
 import * as ResolverModule from "../resolvePokemon";
 
 // Détection dynamique de la fonction de résolution
 const resolvePokemon: (name: string) => Promise<string> =
   (ResolverModule as any).resolvePokemon ||
   (ResolverModule as any).resolvePokemonName ||
   Object.values(ResolverModule).find((exp) => typeof exp === "function") ||
   ((name: string) => Promise.resolve(name));
 
 export interface PokemonLookupResult {
   card: any;
   queryUsed: string;
   confidence: number;
 }
 
 /**
  * Nettoyage texte OCR
  */
 function cleanOCRName(text: string): string {
   if (!text) return "";
   return text
     .replace(/[^a-zA-Z0-9À-ÿ '-]/g, "")
     .replace(/\s+/g, " ")
     .trim();
 }
 
 /**
  * Retire les suffixes TCG
  */
 function removeTCGSuffix(name: string): string {
   if (!name) return "";
   return name
     .replace(
       /\b(ex|EX|gx|GX|v|V|vmax|VMAX|vstar|VSTAR|radiant|shiny|prime|AR|SAR|IR)\b/gi,
       ""
     )
     .replace(/\s+/g, " ")
     .trim();
 }
 
 /**
  * Normalisation numéro carte
  */
 function normalizeCardNumber(number: string | null): string | null {
   if (!number) return null;
 
   return number
     .replace(/\s/g, "")
     .split("/")[0]
     .replace(/^0+/, "")
     .trim();
 }
 
 /**
  * Compare deux numéros
  */
 function compareCardNumbers(a?: string, b?: string | null): boolean {
   if (!a || !b) return false;
 
   const clean = (value: string) => value.split("/")[0].replace(/^0+/, "");
 
   return clean(a) === clean(b);
 }
 
 /**
  * Choix meilleure carte
  */
 function selectBestCard(cards: any[], number: string | null) {
   if (!Array.isArray(cards) || !cards.length) return null;
 
   if (!number) {
     return cards[0];
   }
 
   const exact = cards.find((card) => compareCardNumbers(card.number, number));
 
   return exact ?? cards[0];
 }
 
 /**
  * Recherche principale
  */
 export async function lookupPokemonCard(
   rawName: string,
   cardNumber: string | null
 ): Promise<PokemonLookupResult | null> {
   try {
     let cleanedName = cleanOCRName(rawName);
     cleanedName = removeTCGSuffix(cleanedName);
 
     if (!cleanedName && !cardNumber) {
       return null;
     }
 
     /**
      * Résolution intelligente :
      * OCR FR / Fautes / Traduction EN
      */
     const pokemonName = await resolvePokemon(cleanedName);
 
     const normalizedNumber = normalizeCardNumber(cardNumber);
 
     /**
      * 1 - Nom + numéro
      */
     if (normalizedNumber && pokemonName) {
       const query = `${pokemonName} ${normalizedNumber}`;
       const results = await searchCards(query);
 
       if (results?.length) {
         const best = selectBestCard(results, normalizedNumber);
 
         if (best) {
           return {
             card: best,
             queryUsed: query,
             confidence: compareCardNumbers(best.number, normalizedNumber)
               ? 100
               : 85,
           };
         }
       }
     }
 
     /**
      * 2 - Nom seul
      */
     if (pokemonName) {
       const results = await searchCards(pokemonName);
 
       if (results?.length) {
         const best = selectBestCard(results, normalizedNumber);
 
         return {
           card: best,
           queryUsed: pokemonName,
           confidence:
             normalizedNumber && compareCardNumbers(best?.number, normalizedNumber)
               ? 95
               : 75,
         };
       }
     }
 
     /**
      * 3 - Dernier secours OCR brut
      */
     if (cleanedName) {
       const results = await searchCards(cleanedName);
 
       if (results?.length) {
         return {
           card: results[0],
           queryUsed: cleanedName,
           confidence: 50,
         };
       }
     }
 
     return null;
   } catch (error) {
     console.error("Pokemon lookup error:", error);
     return null;
   }
 }