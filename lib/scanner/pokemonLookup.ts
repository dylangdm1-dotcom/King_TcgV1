/**
 * Recherche carte Pokémon après OCR / Scan Vision
 * King TCG Scanner V2
 */

 import { searchCards } from "../pokemon";
 import { translatePokemonName } from "../pokemonTranslator";
 
 export interface PokemonLookupResult {
   card: any;
   queryUsed: string;
   confidence: number;
 }
 
 /**
  * Nettoyage texte OCR
  */
 function cleanOCRName(text: string): string {
   return text
     .replace(/[^a-zA-Z0-9À-ÿ '-]/g, "")
     .replace(/\s+/g, " ")
     .trim();
 }
 
 /**
  * Normalisation numéro carte
  */
 function normalizeCardNumber(number: string | null): string | null {
   if (!number) return null;
   return number.replace(/\s/g, "").trim();
 }
 
 /**
  * Compare deux numéros (ex: 089/193 = 89)
  */
 function compareCardNumbers(a?: string, b?: string | null): boolean {
   if (!a || !b) return false;
 
   const clean = (value: string) => {
     const mainNum = value.split("/")[0];
     return mainNum.replace(/^0+/, "");
   };
 
   return clean(a) === clean(b);
 }
 
 /**
  * Choisit la meilleure carte parmi les résultats
  */
 function selectBestCard(cards: any[], number: string | null) {
   if (!cards.length) return null;
 
   if (!number) return cards[0];
 
   // Chercher une correspondance exacte sur le numéro
   const exactNumberMatch = cards.find((card) =>
     compareCardNumbers(card.number, number)
   );
 
   return exactNumberMatch ?? cards[0];
 }
 
 export async function lookupPokemonCard(
   rawName: string,
   cardNumber: string | null
 ): Promise<PokemonLookupResult | null> {
   try {
     const cleanedName = cleanOCRName(rawName);
 
     if (!cleanedName && !cardNumber) {
       return null;
     }
 
     const translatedName = translatePokemonName(cleanedName);
     const normalizedNumber = normalizeCardNumber(cardNumber);
 
     /**
      * 1. Recherche prioritaire : Nom traduit + numéro
      */
     if (normalizedNumber) {
       const query = translatedName
         ? `${translatedName} ${normalizedNumber}`
         : normalizedNumber;
 
       const results = await searchCards(query);
 
       if (results && results.length) {
         const best = selectBestCard(results, normalizedNumber);
 
         if (best) {
           const isExact = compareCardNumbers(best.number, normalizedNumber);
           return {
             card: best,
             queryUsed: query,
             confidence: isExact ? 100 : 85,
           };
         }
       }
     }
 
     /**
      * 2. Recherche par nom uniquement
      */
     if (translatedName) {
       const nameResults = await searchCards(translatedName);
 
       if (nameResults && nameResults.length) {
         const best = selectBestCard(nameResults, normalizedNumber);
 
         return {
           card: best,
           queryUsed: translatedName,
           confidence:
             normalizedNumber && compareCardNumbers(best?.number, normalizedNumber)
               ? 95
               : 75,
         };
       }
     }
 
     /**
      * 3. Dernier secours : texte brut OCR
      */
     if (cleanedName) {
       const rawResults = await searchCards(cleanedName);
 
       if (rawResults && rawResults.length) {
         return {
           card: rawResults[0],
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