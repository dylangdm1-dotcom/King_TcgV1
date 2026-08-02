// lib/cache/index.ts

/**
 * ==========================================================
 * KING TCG - CACHE ENGINE
 * Cache mémoire avec TTL
 * ==========================================================
 */

type CacheEntry<T> = {
  value: T;
  expires: number;
};

/**
 * Cache global en mémoire.
 *
 * ⚠️ Ce cache est volontairement RAM-only.
 * Il est donc réinitialisé lors d'un reload serveur,
 * d'un nouveau processus ou d'un redémarrage de l'application.
 */
const cache = new Map<string, CacheEntry<unknown>>();

const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Normalise une clé de cache.
 */
function normalizeKey(key: string): string {
  return String(key ?? "").trim();
}

/**
 * 📥 Récupère une valeur du cache si elle est encore valide.
 */
export function getCache<T>(
  key: string
): T | null {
  const normalizedKey = normalizeKey(key);

  if (!normalizedKey) {
    return null;
  }

  const item = cache.get(normalizedKey);

  if (!item) {
    return null;
  }

  /**
   * Entrée expirée.
   */
  if (
    !Number.isFinite(item.expires) ||
    Date.now() >= item.expires
  ) {
    cache.delete(normalizedKey);
    return null;
  }

  return item.value as T;
}

/**
 * 📤 Stocke une valeur dans le cache avec TTL.
 *
 * TTL par défaut : 5 minutes.
 */
export function setCache<T>(
  key: string,
  value: T,
  ttl = DEFAULT_TTL
): void {
  const normalizedKey = normalizeKey(key);

  if (!normalizedKey) {
    return;
  }

  /**
   * Protection contre les TTL invalides.
   *
   * Un TTL nul ou négatif provoque une expiration immédiate.
   */
  const safeTTL =
    typeof ttl === "number" &&
    Number.isFinite(ttl) &&
    ttl > 0
      ? ttl
      : 0;

  cache.set(normalizedKey, {
    value,
    expires: Date.now() + safeTTL,
  });
}

/**
 * 🧼 Supprime une clé spécifique
 * ou vide entièrement le cache.
 */
export function clearCache(
  key?: string
): void {
  if (key !== undefined) {
    const normalizedKey =
      normalizeKey(key);

    if (normalizedKey) {
      cache.delete(normalizedKey);
    }

    return;
  }

  cache.clear();
}

/**
 * 📊 Retourne le nombre d'entrées actuellement
 * présentes dans le cache.
 *
 * Les entrées expirées sont supprimées
 * avant de calculer la taille.
 */
export function getCacheSize(): number {
  const now = Date.now();

  for (const [key, item] of Array.from(cache.entries())) {
    if (
      !Number.isFinite(item.expires) ||
      now >= item.expires
    ) {
      cache.delete(key);
    }
  }

  return cache.size;
}

/**
 * 🧹 Nettoie uniquement les entrées expirées.
 */
 export function cleanupCache(): void {
  const now = Date.now();

  for (const [key, item] of Array.from(cache.entries())) {
    if (
      !Number.isFinite(item.expires) ||
      now >= item.expires
    ) {
      cache.delete(key);
    }
  }
}