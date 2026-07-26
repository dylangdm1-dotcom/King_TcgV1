// lib/resolvePokemon.ts

import {
  cleanPokemonOCRName,
  correctPokemonOCR,
  resolvePokemonName,
  translatePokemonToEnglish,
  cleanTCGSuffix,
} from "./pokemonTranslator";

import { findClosestPokemon } from "./levenshtein";

import {
  getCachedPokemon,
  setCachedPokemon,
} from "./pokemonCache";



/**
 * Nettoyage spécifique TCG
 * Garde uniquement le nom exploitable
 */
function cleanTCGName(
  name: string
): string {

  return name
    .replace(/\s+/g, " ")
    .replace(/[-_]/g, " ")
    .trim();
}



/**
 * Résolution complète OCR → Pokémon anglais
 *
 * Exemple :
 *
 * "Dracauf eu ex"
 *
 * devient :
 *
 * "charizard"
 */
export async function resolvePokemon(
  rawName: string
): Promise<string> {


  if (!rawName) {
    return "";
  }


  /**
   * 1 - Nettoyage OCR brut
   */
  let name =
    cleanPokemonOCRName(rawName);



  /**
   * 2 - Nettoyage caractères TCG
   */
  name =
    cleanTCGName(name);



  /**
   * 3 - Correction erreurs OCR
   */
  name =
    correctPokemonOCR(name);



  /**
   * 4 - Alias connus
   */
  name =
    resolvePokemonName(name);



  /**
   * 5 - Retirer suffixes TCG
   *
   * Dracaufeu ex
   * devient
   * Dracaufeu
   */
  const baseName =
    cleanTCGSuffix(name);



  /**
   * 6 - Cache
   */
  const cached =
    getCachedPokemon(baseName);


  if (cached) {
    return cached;
  }



  /**
   * 7 - Traduction directe FR → EN
   */
  const translated =
    translatePokemonToEnglish(baseName);


  if (translated) {

    setCachedPokemon(
      baseName,
      translated
    );

    return translated;
  }



  /**
   * 8 - Recherche approximative
   */
  const closest =
    findClosestPokemon(baseName);



  if (closest) {

    setCachedPokemon(
      baseName,
      closest
    );

    return closest;
  }



  /**
   * 9 - Dernier recours
   *
   * On garde le nom nettoyé
   * plutôt que planter le scan
   */
  setCachedPokemon(
    baseName,
    baseName
  );


  return baseName;
}