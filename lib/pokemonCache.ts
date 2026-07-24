const cache = new Map<string, string>();

export function getCachedPokemon(name: string): string | undefined {
  return cache.get(name);
}

export function setCachedPokemon(name: string, value: string): void {
  cache.set(name, value);
}

export function clearPokemonCache(): void {
  cache.clear();
}