import {
  cleanPokemonOCRName,
  correctPokemonOCR,
  resolvePokemonName,
  translatePokemonToEnglish,
} from "./pokemonTranslator";

import { findClosestPokemon } from "./levenshtein";

import {
  getCachedPokemon,
  setCachedPokemon,
} from "./pokemonCache";


export async function resolvePokemon(
  rawName: string
): Promise<string> {

  if (!rawName) {
    return "";
  }


  // 1. Nettoyage OCR
  let name = cleanPokemonOCRName(rawName);


  // 2. Correction erreurs OCR
  name = correctPokemonOCR(name);


  // 3. Alias OCR
  name = resolvePokemonName(name);


  // 4. Cache
  const cached = getCachedPokemon(name);

  if (cached) {
    return cached;
  }


  // 5. Traduction Français -> Anglais
  const translated = translatePokemonToEnglish(name);


  if (translated) {

    setCachedPokemon(name, translated);

    return translated;
  }


  // 6. Recherche approximative Levenshtein
  const closest = findClosestPokemon(name);


  if (closest) {

    setCachedPokemon(name, closest);

    return closest;
  }


  // 7. Dernier recours
  setCachedPokemon(name, name);

  return name;
}