import {
  adaptPokemonTcgApiSetV2,
  adaptPokewalletSetV2,
  adaptTcgdexSetV2,
} from "../adapters";
import type { CatalogLanguageV2 } from "../schema";
import type { CatalogDiscoveredSetV2, CatalogProviderSourceV2 } from "./types";
import {
  CATALOG_INDEX_CACHE_V2,
  CATALOG_SET_CACHE_V2,
  CatalogHttpClientV2,
} from "./http";

type Json = Record<string, unknown>;
const record = (value: unknown): Json => value && typeof value === "object" && !Array.isArray(value) ? value as Json : {};
const text = (value: unknown): string => typeof value === "string" || typeof value === "number" ? String(value).trim() : "";
const rows = (value: unknown): unknown[] => Array.isArray(value) ? value : [];

interface SourceOptionsV2 {
  http: CatalogHttpClientV2;
  now?: () => number;
}

function syncedAt(now?: () => number): string {
  return new Date((now ?? Date.now)()).toISOString();
}

export function createTcgdexSourceV2(options: SourceOptionsV2 & {
  language: Exclude<CatalogLanguageV2, "zh-tw">;
  baseUrl?: string;
}): CatalogProviderSourceV2 {
  const baseUrl = options.baseUrl ?? "https://api.tcgdex.net/v2";
  return {
    provider: "tcgdex",
    language: options.language,
    async discoverSets() {
      const result = await options.http.getJson<unknown>({
        url: `${baseUrl}/${options.language}/sets`,
        cacheKey: `tcgdex:${options.language}:sets`,
        policy: CATALOG_INDEX_CACHE_V2,
      });
      const container = record(result.data);
      return rows(Array.isArray(result.data) ? result.data : container.data).map((entry) => {
        const raw = record(entry);
        const id = text(raw.id);
        return { sourceId: id, code: id, name: text(raw.name) || id, raw: entry };
      }).filter((entry) => Boolean(entry.sourceId));
    },
    async loadSet(reference) {
      const result = await options.http.getJson<unknown>({
        url: `${baseUrl}/${options.language}/sets/${encodeURIComponent(reference.sourceId)}`,
        cacheKey: `tcgdex:${options.language}:set:${reference.sourceId}`,
        policy: CATALOG_SET_CACHE_V2,
      });
      return adaptTcgdexSetV2(result.data, {
        language: options.language,
        syncedAt: syncedAt(options.now),
        sourceUrl: `${baseUrl}/${options.language}/sets/${reference.sourceId}`,
      });
    },
  };
}

export function createPokemonTcgApiSourceV2(options: SourceOptionsV2 & {
  apiKey?: string;
  baseUrl?: string;
  pageSize?: number;
}): CatalogProviderSourceV2 {
  const baseUrl = options.baseUrl ?? "https://api.pokemontcg.io/v2";
  const pageSize = Math.min(250, Math.max(1, options.pageSize ?? 250));
  const headers = options.apiKey ? { "X-Api-Key": options.apiKey } : undefined;
  return {
    provider: "pokemon_tcg_api",
    language: "en",
    async discoverSets() {
      const discovered: CatalogDiscoveredSetV2[] = [];
      for (let page = 1; page <= 100; page += 1) {
        const result = await options.http.getJson<unknown>({
          url: `${baseUrl}/sets?page=${page}&pageSize=${pageSize}`,
          cacheKey: `pokemon-tcg-api:en:sets:${page}:${pageSize}`,
          policy: CATALOG_INDEX_CACHE_V2,
          headers,
        });
        const body = record(result.data);
        const pageRows = rows(body.data);
        for (const entry of pageRows) {
          const raw = record(entry);
          const id = text(raw.id);
          if (id) discovered.push({ sourceId: id, code: id, name: text(raw.name) || id, raw: entry });
        }
        const totalCount = Number(body.totalCount ?? discovered.length);
        if (pageRows.length < pageSize || discovered.length >= totalCount) break;
      }
      return discovered;
    },
    async loadSet(reference) {
      let rawSet = reference.raw;
      if (!rawSet) {
        const setResult = await options.http.getJson<unknown>({
          url: `${baseUrl}/sets/${encodeURIComponent(reference.sourceId)}`,
          cacheKey: `pokemon-tcg-api:en:set:${reference.sourceId}`,
          policy: CATALOG_SET_CACHE_V2,
          headers,
        });
        rawSet = record(setResult.data).data ?? setResult.data;
      }
      const cards: unknown[] = [];
      for (let page = 1; page <= 100; page += 1) {
        const result = await options.http.getJson<unknown>({
          url: `${baseUrl}/cards?q=${encodeURIComponent(`set.id:${reference.sourceId}`)}&page=${page}&pageSize=${pageSize}`,
          cacheKey: `pokemon-tcg-api:en:cards:${reference.sourceId}:${page}:${pageSize}`,
          policy: CATALOG_SET_CACHE_V2,
          headers,
        });
        const body = record(result.data);
        const pageRows = rows(body.data);
        cards.push(...pageRows);
        const totalCount = Number(body.totalCount ?? cards.length);
        if (pageRows.length < pageSize || cards.length >= totalCount) break;
      }
      return adaptPokemonTcgApiSetV2(rawSet, { data: cards }, {
        language: "en",
        syncedAt: syncedAt(options.now),
        sourceUrl: `${baseUrl}/sets/${reference.sourceId}`,
      });
    },
  };
}

export function createPokewalletSourceV2(options: SourceOptionsV2 & {
  apiKey?: string;
  baseUrl?: string;
  publicBaseUrl?: string;
  fallbackSets?: Array<{ code: string; name: string; language?: string; setId?: string }>;
  pageSize?: number;
}): CatalogProviderSourceV2 {
  const baseUrl = options.baseUrl ?? "https://api.pokewallet.io";
  const publicBaseUrl = options.publicBaseUrl ?? "https://www.pokewallet.io/api/catalog";
  const pageSize = Math.min(200, Math.max(1, options.pageSize ?? 200));
  const headers = options.apiKey ? { "X-API-Key": options.apiKey } : undefined;
  return {
    provider: "pokewallet",
    language: "zh-tw",
    async discoverSets() {
      if (options.apiKey) {
        try {
          const result = await options.http.getJson<unknown>({
            url: `${baseUrl}/sets`,
            cacheKey: "pokewallet:zh-tw:sets",
            policy: CATALOG_INDEX_CACHE_V2,
            headers,
          });
          const body = record(result.data);
          const candidates = rows(body.data ?? body.sets).map((entry) => record(entry));
          const chinese = candidates.filter((entry) => text(entry.language).toLowerCase() === "chn");
          if (chinese.length) return chinese.map((entry) => ({
            sourceId: text(entry.set_id ?? entry.id),
            code: text(entry.set_code ?? entry.code ?? entry.set_id),
            name: text(entry.name ?? entry.set_name ?? entry.set_code),
            raw: entry,
          })).filter((entry) => Boolean(entry.sourceId && entry.code));
        } catch {
          // Le manifeste local prend le relais sans effacer le snapshot existant.
        }
      }
      return (options.fallbackSets ?? []).map((entry) => ({
        sourceId: entry.setId || entry.code,
        code: entry.code,
        name: entry.name,
        raw: { set_id: entry.setId, set_code: entry.code, name: entry.name, language: entry.language ?? "chn" },
      }));
    },
    async loadSet(reference) {
      if (options.apiKey) {
        try {
          const cards: unknown[] = [];
          let setData: unknown = reference.raw;
          for (let page = 1; page <= 50; page += 1) {
            const result = await options.http.getJson<unknown>({
              url: `${baseUrl}/sets/${encodeURIComponent(reference.sourceId)}?language=chn&page=${page}&limit=${pageSize}`,
              cacheKey: `pokewallet:zh-tw:set:${reference.sourceId}:${page}:${pageSize}`,
              policy: CATALOG_SET_CACHE_V2,
              headers,
            });
            const body = record(result.data);
            setData = body.set ?? setData;
            const pageRows = rows(body.cards ?? record(body.data).cards);
            cards.push(...pageRows);
            const totalCards = Number(record(body.set).total_cards ?? record(body.set).card_count ?? cards.length);
            const totalPages = Number(body.total_pages ?? Math.ceil(totalCards / pageSize));
            if (pageRows.length < pageSize || page >= totalPages) break;
          }
          if (cards.length === 0) throw new Error("Extension PokéWallet vide.");
          return adaptPokewalletSetV2({ set: setData, cards }, {
            language: "zh-tw",
            syncedAt: syncedAt(options.now),
            sourceUrl: `${baseUrl}/sets/${reference.sourceId}`,
          });
        } catch {
          // Le catalogue public est le repli contrôlé pour cette extension uniquement.
        }
      }
      const result = await options.http.getJson<unknown>({
        url: `${publicBaseUrl}/sets/${encodeURIComponent(reference.code)}/cards?game=pokemon`,
        cacheKey: `pokewallet-public:zh-tw:set:${reference.code}`,
        policy: CATALOG_SET_CACHE_V2,
        retries: 1,
      });
      const body = record(result.data);
      const cards = rows(body.data ?? body.cards ?? result.data);
      return adaptPokewalletSetV2({
        set: { ...record(reference.raw), set_code: reference.code, name: reference.name, language: "chn", card_count: cards.length },
        cards,
      }, {
        language: "zh-tw",
        syncedAt: syncedAt(options.now),
        sourceUrl: `${publicBaseUrl}/sets/${reference.code}/cards`,
      });
    },
  };
}
