/**
 * Recherche carte Pokémon après OCR
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
 function cleanOCRName(
   text: string
 ): string {
 
   return text
 
     .replace(
       /[^a-zA-Z0-9À-ÿ '-]/g,
       ""
     )
 
     .replace(
       /\s+/g,
       " "
     )
 
     .trim();
 
 }
 
 
 
 /**
  * Normalisation numéro carte
  */
 function normalizeCardNumber(
   number: string | null
 ): string | null {
 
 
   if (!number) {
     return null;
   }
 
 
   return number
 
     .replace(
       /\s/g,
       ""
     )
 
     .trim();
 
 }
 
 
 
 /**
  * Compare deux numéros
  * 089/193 = 89/193
  */
 function compareCardNumbers(
   a?: string,
   b?: string | null
 ): boolean {
 
 
   if (!a || !b) {
     return false;
   }
 
 
   const clean = (
     value: string
   ) => {
 
     const parts =
       value.split("/");
 
 
     return parts
       .map(
         (v) =>
           v.replace(/^0+/, "")
       )
       .join("/");
 
   };
 
 
   return clean(a) === clean(b);
 
 }
 
 
 
 
 
 /**
  * Choisit la meilleure carte
  */
 function selectBestCard(
   cards: any[],
   number: string | null
 ) {
 
 
   if (!cards.length) {
     return null;
   }
 
 
 
   if (!number) {
     return cards[0];
   }
 
 
 
   const exact =
     cards.find(
       (card) =>
         compareCardNumbers(
           card.number,
           number
         )
     );
 
 
 
   return exact ?? cards[0];
 
 }
 
 
 
 
 
 export async function lookupPokemonCard(
   rawName: string,
   cardNumber: string | null
 ): Promise<PokemonLookupResult | null> {
 
 
   try {
 
 
     const cleanedName =
       cleanOCRName(rawName);
 
 
 
     if (!cleanedName) {
       return null;
     }
 
 
 
     const translatedName =
       translatePokemonName(
         cleanedName
       );
 
 
 
     const normalizedNumber =
       normalizeCardNumber(
         cardNumber
       );
 
 
 
 
 
     /**
      * Recherche précise
      * Nom + numéro
      */
     if (normalizedNumber) {
 
 
       const query =
         `${translatedName} ${normalizedNumber}`;
 
 
 
       const results =
         await searchCards(
           query
         );
 
 
 
       if (
         results &&
         results.length
       ) {
 
 
         const best =
           selectBestCard(
             results,
             normalizedNumber
           );
 
 
 
         if (best) {
 
 
           return {
 
             card: best,
 
             queryUsed:
               query,
 
             confidence:
               compareCardNumbers(
                 best.number,
                 normalizedNumber
               )
                 ? 100
                 : 90,
 
           };
 
         }
 
       }
 
     }
 
 
 
 
 
     /**
      * Recherche par nom uniquement
      */
     const nameResults =
       await searchCards(
         translatedName
       );
 
 
 
     if (
       nameResults &&
       nameResults.length
     ) {
 
 
       const best =
         selectBestCard(
           nameResults,
           normalizedNumber
         );
 
 
 
       return {
 
         card: best,
 
         queryUsed:
           translatedName,
 
         confidence:
           normalizedNumber &&
           compareCardNumbers(
             best?.number,
             normalizedNumber
           )
             ? 95
             : 75,
 
       };
 
     }
 
 
 
 
 
 
 
     /**
      * Dernier secours :
      * texte OCR brut
      */
     const rawResults =
       await searchCards(
         cleanedName
       );
 
 
 
     if (
       rawResults &&
       rawResults.length
     ) {
 
 
       return {
 
         card:
           rawResults[0],
 
         queryUsed:
           cleanedName,
 
         confidence:
           50,
 
       };
 
     }
 
 
 
     return null;
 
 
 
   } catch(error) {
 
 
     console.error(
       "Pokemon lookup error:",
       error
     );
 
 
     return null;
 
   }
 
 }