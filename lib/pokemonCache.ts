// lib/pokemonCache.ts

function normalizeCacheKey(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[♀♂]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

const cache = new Map<string, string>();


/**
 * Récupération cache Pokémon
 */
export function getCachedPokemon(
  name: string
): string | undefined {

  const key = normalizeCacheKey(name);

  if (!key) {
    return undefined;
  }

  return cache.get(key);
}


/**
 * Ajout cache Pokémon
 */
export function setCachedPokemon(
  name: string,
  value: string
): void {

  const key = normalizeCacheKey(name);

  if (!key || !value) {
    return;
  }

  cache.set(key, value);
}


/**
 * Nettoyage complet du cache
 */
export function clearPokemonCache(): void {
  cache.clear();
}


/**
 * Taille actuelle du cache
 * Utile pour debug scanner
 */
export function getPokemonCacheSize(): number {
  return cache.size;
}