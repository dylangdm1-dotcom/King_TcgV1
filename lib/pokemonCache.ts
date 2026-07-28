/**
 * ⚡ Pokémon Cache System V3.6
 * Cache hybride (RAM + LocalStorage) avec normalisation OCR, support TTL et objets cartes.
 */

import { logger } from "../logger";

const STORAGE_KEY = "king_tcg_pokemon_cache";
const MAX_CACHE_SIZE = 500;
const DEFAULT_TTL_MS = 1000 * 60 * 60 * 24; // 24 heures par défaut

interface CachePayload<T = unknown> {
  data: T;
  timestamp: number;
  ttl: number;
}

/**
 * Normalise la clé de cache pour correspondre parfaitement aux noms scannés
 * Ex: "Dracaufeu-GX (1re Édition) ♂" -> "dracaufugx1reedition"
 */
export function normalizeCacheKey(name: string): string {
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
const cardDataMemoryCache = new Map<string, CachePayload>();

/**
 * Récupération du cache simple (RAM + LocalStorage)
 */
export function getCachedPokemon(name: string): string | undefined {
  const key = normalizeCacheKey(name);
  if (!key) return undefined;

  // 1. Recherche RAM
  if (memoryCache.has(key)) {
    logger.cache(`Hit RAM pour le nom : ${key}`);
    return memoryCache.get(key);
  }

  // 2. Recherche LocalStorage
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY}_${key}`);
      if (stored) {
        memoryCache.set(key, stored); // Hydratation RAM
        logger.cache(`Hit LocalStorage pour le nom : ${key}`);
        return stored;
      }
    } catch {
      // Ignoré si indisponible
    }
  }

  return undefined;
}

/**
 * Enregistre un élément simple dans le cache (RAM + LocalStorage)
 */
export function setCachedPokemon(name: string, value: string): void {
  const key = normalizeCacheKey(name);
  if (!key || !value) return;

  if (memoryCache.size >= MAX_CACHE_SIZE) {
    const firstKey = memoryCache.keys().next().value;
    if (firstKey) memoryCache.delete(firstKey);
  }

  memoryCache.set(key, value);

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(`${STORAGE_KEY}_${key}`, value);
    } catch {
      // Ignoré si localStorage plein
    }
  }
  logger.cache(`Mise en cache du nom : ${key}`);
}

/**
 * Stocke un objet complet de carte TCG avec expiration (TTL)
 */
export function setCachedCardData<T>(
  keyName: string,
  data: T,
  ttlMs: number = DEFAULT_TTL_MS
): void {
  const key = normalizeCacheKey(keyName);
  if (!key || !data) return;

  const payload: CachePayload<T> = {
    data,
    timestamp: Date.now(),
    ttl: ttlMs,
  };

  if (cardDataMemoryCache.size >= MAX_CACHE_SIZE) {
    const firstKey = cardDataMemoryCache.keys().next().value;
    if (firstKey) cardDataMemoryCache.delete(firstKey);
  }

  cardDataMemoryCache.set(key, payload);

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(`${STORAGE_KEY}_data_${key}`, JSON.stringify(payload));
    } catch (e) {
      logger.warn("CACHE", `Écriture LocalStorage échouée pour : ${key}`, e);
    }
  }
  logger.cache(`Données carte mises en cache : ${key}`);
}

/**
 * Récupère un objet complet de carte TCG (Vérifie la validité du TTL)
 */
export function getCachedCardData<T>(keyName: string): T | null {
  const key = normalizeCacheKey(keyName);
  if (!key) return null;

  let payload = cardDataMemoryCache.get(key) as CachePayload<T> | undefined;

  if (!payload && typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY}_data_${key}`);
      if (stored) {
        payload = JSON.parse(stored) as CachePayload<T>;
        if (payload) cardDataMemoryCache.set(key, payload);
      }
    } catch {
      // Ignoré
    }
  }

  if (!payload) return null;

  // Vérification de la péremption du cache
  const isExpired = Date.now() - payload.timestamp > payload.ttl;
  if (isExpired) {
    logger.cache(`Cache expiré pour la carte : ${key}`);
    removeCachedCardData(keyName);
    return null;
  }

  logger.cache(`Hit Cache carte complet : ${key}`);
  return payload.data;
}

/**
 * Supprime une carte spécifique du cache
 */
export function removeCachedCardData(keyName: string): void {
  const key = normalizeCacheKey(keyName);
  cardDataMemoryCache.delete(key);
  memoryCache.delete(key);

  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem(`${STORAGE_KEY}_${key}`);
      localStorage.removeItem(`${STORAGE_KEY}_data_${key}`);
    } catch {
      // Ignoré
    }
  }
}

/**
 * Nettoyage complet du cache (RAM + LocalStorage)
 */
export function clearPokemonCache(): void {
  memoryCache.clear();
  cardDataMemoryCache.clear();

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
  logger.cache("Cache intégralement nettoyé.");
}

/**
 * Taille actuelle du cache (Nombre d'entrées)
 */
export function getPokemonCacheSize(): number {
  return memoryCache.size + cardDataMemoryCache.size;
}
