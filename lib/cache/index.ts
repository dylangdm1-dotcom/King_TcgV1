// lib/cache/index.ts

type CacheEntry<T> = {
  value: T;
  expires: number;
};

// Utilisation d'une Map globale pour stocker les données en mémoire vive
const cache = new Map<string, CacheEntry<unknown>>();

/**
 * 📥 Récupère un élément du cache s'il est encore valide (TTL)
 */
export function getCache<T>(key: string): T | null {
  const item = cache.get(key);
  if (!item) return null;

  // Si le temps est écoulé, on détruit l'entrée et on renvoie null
  if (Date.now() > item.expires) {
    cache.delete(key);
    return null;
  }

  return item.value as T;
}

/**
 * 📤 Stocke une valeur dans le cache avec une durée de vie (par défaut 5 minutes)
 */
export function setCache<T>(key: string, value: T, ttl = 5 * 60 * 1000): void {
  cache.set(key, {
    value,
    expires: Date.now() + ttl,
  });
}

/**
 * 🧼 Nettoie une clé spécifique ou vide l'intégralité du cache
 */
export function clearCache(key?: string): void {
  if (key) {
    cache.delete(key);
    return;
  }
  cache.clear();
}