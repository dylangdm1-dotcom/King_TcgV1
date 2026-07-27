// lib/pokemonCache.ts

const STORAGE_KEY = "king_tcg_pokemon_cache";
const MAX_CACHE_SIZE = 500;

/**
 * Normalise la clé de cache pour correspondre parfaitement aux noms scannés
 * Ex: "Dracaufeu-GX (1re Édition) ♂" -> "dracaufugx1reedition"
 */
function normalizeCacheKey(name: string): string {
  if (!name) return "";
  return name
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[♀♂]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

// Map en mémoire vive
const memoryCache = new Map<string, string>();

/**
 * Récupération du cache (Vérifie d'abord en mémoire RAM, puis dans localStorage)
 */
export function getCachedPokemon(name: string): string | undefined {
  const key = normalizeCacheKey(name);
  if (!key) return undefined;

  // 1. Recherche RAM
  if (memoryCache.has(key)) {
    return memoryCache.get(key);
  }

  // 2. Recherche LocalStorage (Navigateur)
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY}_${key}`);
      if (stored) {
        memoryCache.set(key, stored); // Hydratation de la RAM
        return stored;
      }
    } catch {
      // Ignoré si indisponible
    }
  }

  return undefined;
}

/**
 * Enregistre un élément dans le cache (RAM + LocalStorage)
 */
export function setCachedPokemon(name: string, value: string): void {
  const key = normalizeCacheKey(name);
  if (!key || !value) return;

  // Évite l'engorgement de la mémoire RAM
  if (memoryCache.size >= MAX_CACHE_SIZE) {
    const firstKey = memoryCache.keys().next().value;
    if (firstKey) memoryCache.delete(firstKey);
  }

  memoryCache.set(key, value);

  // Sauvegarde persistante
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(`${STORAGE_KEY}_${key}`, value);
    } catch {
      // Ignoré si localStorage est plein
    }
  }
}

/**
 * Nettoyage complet du cache (RAM + LocalStorage)
 */
export function clearPokemonCache(): void {
  memoryCache.clear();

  if (typeof window !== "undefined") {
    try {
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith(STORAGE_KEY)) {
          localStorage.removeItem(key);
        }
      });
    } catch {
      // Ignoré
    }
  }
}

/**
 * Taille actuelle du cache (Nombre d'entrées)
 */
export function getPokemonCacheSize(): number {
  return memoryCache.size;
}