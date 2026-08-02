// lib/pokemonCache.ts

/**
 * =====================================================
 * ⚡ KING_TCG POKÉMON CACHE V5
 * =====================================================
 *
 * Cache hybride :
 * - RAM
 * - LocalStorage
 * - normalisation OCR
 * - TTL pour les objets cartes
 * - limite de taille
 *
 * IMPORTANT :
 * Ce cache ne calcule aucun prix.
 * Les données de marché restent sous la responsabilité
 * du Market Engine.
 * =====================================================
 */

import { logger } from "./cache/logger";

// =====================================================
// ⚙️ CONFIGURATION
// =====================================================

const STORAGE_KEY =
  "king_tcg_pokemon_cache";

const MAX_CACHE_SIZE = 500;

const DEFAULT_TTL_MS =
  1000 *
  60 *
  60 *
  24;

// =====================================================
// 📦 TYPES
// =====================================================

interface CachePayload<T = unknown> {
  data: T;
  timestamp: number;
  ttl: number;
}

// =====================================================
// 🔤 NORMALISATION
// =====================================================

/**
 * Normalise une clé de cache afin de faire correspondre
 * correctement les noms issus de l'OCR.
 *
 * Exemple :
 *
 * "Dracaufeu-GX (1re Édition) ♂"
 * ↓
 * "dracaufugx1reedition"
 */
export function normalizeCacheKey(
  name: string
): string {
  if (!name) {
    return "";
  }

  return String(name)
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(
      /\p{Diacritic}/gu,
      ""
    )
    .replace(/[♀♂]/g, "")
    .replace(
      /[^a-z0-9]/g,
      ""
    );
}

// =====================================================
// 💾 CACHE MÉMOIRE
// =====================================================

const memoryCache =
  new Map<string, string>();

const cardDataMemoryCache =
  new Map<
    string,
    CachePayload
  >();

// =====================================================
// 🧹 LIMITATION CACHE
// =====================================================

function enforceCacheLimit<T>(
  cache: Map<string, T>
): void {
  while (
    cache.size >=
    MAX_CACHE_SIZE
  ) {
    const firstKey =
      cache.keys().next().value;

    if (
      typeof firstKey !==
      "string"
    ) {
      break;
    }

    cache.delete(
      firstKey
    );
  }
}

// =====================================================
// 🔎 CACHE SIMPLE — LECTURE
// =====================================================

export function getCachedPokemon(
  name: string
): string | undefined {
  const key =
    normalizeCacheKey(name);

  if (!key) {
    return undefined;
  }

  // ---------------------------------------------------
  // RAM
  // ---------------------------------------------------

  if (
    memoryCache.has(key)
  ) {
    logger.cache(
      `Hit RAM pour le nom : ${key}`
    );

    return memoryCache.get(
      key
    );
  }

  // ---------------------------------------------------
  // LOCAL STORAGE
  // ---------------------------------------------------

  if (
    typeof window !==
    "undefined"
  ) {
    try {
      const stored =
        localStorage.getItem(
          `${STORAGE_KEY}_${key}`
        );

      if (stored) {
        enforceCacheLimit(
          memoryCache
        );

        memoryCache.set(
          key,
          stored
        );

        logger.cache(
          `Hit LocalStorage pour le nom : ${key}`
        );

        return stored;
      }
    } catch {
      // LocalStorage indisponible
    }
  }

  return undefined;
}

// =====================================================
// 💾 CACHE SIMPLE — ÉCRITURE
// =====================================================

export function setCachedPokemon(
  name: string,
  value: string
): void {
  const key =
    normalizeCacheKey(name);

  if (
    !key ||
    !value
  ) {
    return;
  }

  enforceCacheLimit(
    memoryCache
  );

  memoryCache.set(
    key,
    value
  );

  if (
    typeof window !==
    "undefined"
  ) {
    try {
      localStorage.setItem(
        `${STORAGE_KEY}_${key}`,
        value
      );
    } catch {
      // LocalStorage plein ou indisponible
    }
  }

  logger.cache(
    `Mise en cache du nom : ${key}`
  );
}

// =====================================================
// 🃏 CACHE CARTE — ÉCRITURE
// =====================================================

export function setCachedCardData<T>(
  keyName: string,
  data: T,
  ttlMs: number =
    DEFAULT_TTL_MS
): void {
  const key =
    normalizeCacheKey(
      keyName
    );

  if (
    !key ||
    data === null ||
    data === undefined
  ) {
    return;
  }

  const safeTtl =
    typeof ttlMs ===
      "number" &&
    Number.isFinite(
      ttlMs
    ) &&
    ttlMs > 0
      ? ttlMs
      : DEFAULT_TTL_MS;

  const payload:
    CachePayload<T> = {
    data,
    timestamp: Date.now(),
    ttl: safeTtl,
  };

  enforceCacheLimit(
    cardDataMemoryCache
  );

  cardDataMemoryCache.set(
    key,
    payload
  );

  if (
    typeof window !==
    "undefined"
  ) {
    try {
      localStorage.setItem(
        `${STORAGE_KEY}_data_${key}`,
        JSON.stringify(
          payload
        )
      );
    } catch (error) {
      logger.warn(
        "CACHE",
        `Écriture LocalStorage échouée pour : ${key}`,
        error
      );
    }
  }

  logger.cache(
    `Données carte mises en cache : ${key}`
  );
}

// =====================================================
// 🔎 CACHE CARTE — LECTURE
// =====================================================

export function getCachedCardData<T>(
  keyName: string
): T | null {
  const key =
    normalizeCacheKey(
      keyName
    );

  if (!key) {
    return null;
  }

  let payload =
    cardDataMemoryCache.get(
      key
    ) as
      | CachePayload<T>
      | undefined;

  // ---------------------------------------------------
  // LOCAL STORAGE
  // ---------------------------------------------------

  if (
    !payload &&
    typeof window !==
      "undefined"
  ) {
    try {
      const stored =
        localStorage.getItem(
          `${STORAGE_KEY}_data_${key}`
        );

      if (stored) {
        const parsed =
          JSON.parse(
            stored
          ) as CachePayload<T>;

        if (
          parsed &&
          typeof parsed.timestamp ===
            "number" &&
          typeof parsed.ttl ===
            "number"
        ) {
          payload = parsed;

          enforceCacheLimit(
            cardDataMemoryCache
          );

          cardDataMemoryCache.set(
            key,
            payload
          );
        }
      }
    } catch {
      // Données invalides ou LocalStorage indisponible
    }
  }

  if (!payload) {
    return null;
  }

  // ---------------------------------------------------
  // TTL
  // ---------------------------------------------------

  const isExpired =
    Date.now() -
      payload.timestamp >
    payload.ttl;

  if (isExpired) {
    logger.cache(
      `Cache expiré pour la carte : ${key}`
    );

    removeCachedCardData(
      key
    );

    return null;
  }

  logger.cache(
    `Hit Cache carte complet : ${key}`
  );

  return payload.data;
}

// =====================================================
// 🗑️ SUPPRESSION D'UNE CARTE
// =====================================================

export function removeCachedCardData(
  keyName: string
): void {
  const key =
    normalizeCacheKey(
      keyName
    );

  if (!key) {
    return;
  }

  cardDataMemoryCache.delete(
    key
  );

  memoryCache.delete(
    key
  );

  if (
    typeof window !==
    "undefined"
  ) {
    try {
      localStorage.removeItem(
        `${STORAGE_KEY}_${key}`
      );

      localStorage.removeItem(
        `${STORAGE_KEY}_data_${key}`
      );
    } catch {
      // LocalStorage indisponible
    }
  }
}

// =====================================================
// 🧹 NETTOYAGE COMPLET
// =====================================================

export function clearPokemonCache(): void {
  memoryCache.clear();
  cardDataMemoryCache.clear();

  if (
    typeof window !==
    "undefined"
  ) {
    try {
      const keysToRemove =
        Object.keys(
          localStorage
        ).filter((key) =>
          key.startsWith(
            STORAGE_KEY
          )
        );

      keysToRemove.forEach(
        (key) => {
          localStorage.removeItem(
            key
          );
        }
      );
    } catch {
      // LocalStorage indisponible
    }
  }

  logger.cache(
    "Cache intégralement nettoyé."
  );
}

// =====================================================
// 📊 TAILLE DU CACHE
// =====================================================

export function getPokemonCacheSize(): number {
  return (
    memoryCache.size +
    cardDataMemoryCache.size
  );
}
