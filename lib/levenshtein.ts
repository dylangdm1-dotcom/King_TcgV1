// lib/levenshtein.ts

import { pokemonNames } from "./pokemonTranslator";

// =====================================================
// 🧠 NORMALISATION
// =====================================================

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[♀♂]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

// =====================================================
// 📚 INDEX DES NOMS POKÉMON
// =====================================================
//
// Les noms sont normalisés une seule fois au chargement
// du module afin d'éviter de refaire le travail à chaque
// comparaison.
//

const normalizedPokemonNames = Object.entries(
  pokemonNames
).map(([frenchName, englishName]) => ({
  frenchName: normalizeName(frenchName),
  englishName: normalizeName(englishName),
  result: englishName,
}));

// =====================================================
// 🔢 DISTANCE DE LEVENSHTEIN
// =====================================================

function levenshtein(
  a: string,
  b: string
): number {
  if (a === b) {
    return 0;
  }

  if (!a.length) {
    return b.length;
  }

  if (!b.length) {
    return a.length;
  }

  const matrix = Array.from(
    {
      length: b.length + 1,
    },
    () =>
      new Array(
        a.length + 1
      ).fill(0)
  );

  for (
    let i = 0;
    i <= a.length;
    i++
  ) {
    matrix[0][i] = i;
  }

  for (
    let j = 0;
    j <= b.length;
    j++
  ) {
    matrix[j][0] = j;
  }

  for (
    let j = 1;
    j <= b.length;
    j++
  ) {
    for (
      let i = 1;
      i <= a.length;
      i++
    ) {
      const cost =
        a[i - 1] ===
        b[j - 1]
          ? 0
          : 1;

      matrix[j][i] =
        Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] +
            cost
        );
    }
  }

  return matrix[b.length][a.length];
}

// =====================================================
// 🔎 RECHERCHE POKÉMON LE PLUS PROCHE
// =====================================================
//
// Exemples :
// dracauf  → Charizard
// pikashu  → Pikachu
//
// Retourne le nom anglais utilisé par le projet.
//

export function findClosestPokemon(
  name: string
): string | null {
  const cleanName =
    normalizeName(name);

  if (!cleanName) {
    return null;
  }

  let bestMatch:
    | string
    | null = null;

  let bestDistance =
    Infinity;

  for (
    const pokemon of
      normalizedPokemonNames
  ) {
    const distanceFR =
      levenshtein(
        cleanName,
        pokemon.frenchName
      );

    const distanceEN =
      levenshtein(
        cleanName,
        pokemon.englishName
      );

    const distance =
      Math.min(
        distanceFR,
        distanceEN
      );

    if (
      distance <
      bestDistance
    ) {
      bestDistance =
        distance;

      bestMatch =
        pokemon.result;
    }
  }

  // ===================================================
  // 🎯 LIMITE DYNAMIQUE
  // ===================================================

  const maxDistance =
    cleanName.length <= 5
      ? 1
      : 2;

  if (
    bestMatch &&
    bestDistance <=
      maxDistance
  ) {
    return bestMatch;
  }

  return null;
}