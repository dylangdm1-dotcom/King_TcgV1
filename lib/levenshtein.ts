// lib/levenshtein.ts

import { pokemonNames } from "./pokemonTranslator";


function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[♀♂]/g, "")
    .replace(/[^a-z0-9]/g, "");
}


/**
 * Distance de Levenshtein
 */
function levenshtein(
  a: string,
  b: string
): number {

  const matrix = Array.from(
    {
      length: b.length + 1
    },
    () =>
      new Array(a.length + 1).fill(0)
  );


  for (let i = 0; i <= a.length; i++) {
    matrix[0][i] = i;
  }


  for (let j = 0; j <= b.length; j++) {
    matrix[j][0] = j;
  }


  for (let j = 1; j <= b.length; j++) {

    for (let i = 1; i <= a.length; i++) {

      const cost =
        a[i - 1] === b[j - 1]
          ? 0
          : 1;


      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + cost
      );
    }
  }


  return matrix[b.length][a.length];
}


/**
 * Recherche Pokémon le plus proche
 *
 * Exemple :
 * dracauf
 * -> charizard
 *
 * pikashu
 * -> pikachu
 */
export function findClosestPokemon(
  name: string
): string | null {


  const cleanName = normalizeName(name);


  if (!cleanName) {
    return null;
  }


  let bestMatch: string | null = null;
  let bestDistance = Infinity;


  for (const [frenchName, englishName] of Object.entries(pokemonNames)) {


    const cleanFrench = normalizeName(frenchName);
    const cleanEnglish = normalizeName(englishName);


    const distanceFR = levenshtein(
      cleanName,
      cleanFrench
    );


    const distanceEN = levenshtein(
      cleanName,
      cleanEnglish
    );


    const distance = Math.min(
      distanceFR,
      distanceEN
    );


    if (distance < bestDistance) {

      bestDistance = distance;
      bestMatch = englishName;

    }
  }


  /**
   * Limite dynamique :
   *
   * petits noms :
   * 1 erreur max
   *
   * noms longs :
   * 2 erreurs max
   */
  const maxDistance =
    cleanName.length <= 5
      ? 1
      : 2;


  if (
    bestMatch &&
    bestDistance <= maxDistance
  ) {
    return bestMatch;
  }


  return null;
}