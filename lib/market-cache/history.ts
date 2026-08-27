import type { MarketHistoryPoint } from "../types";
import { recordHistoryWriteV277 } from "./metrics";
import {
  executeMarketRedisCommandV277,
  isMarketRedisConfiguredV277,
  type MarketCacheBackendV276,
} from "./persistent";

export const MARKET_HISTORY_MAX_POINTS_V277 = 365;
export const MARKET_HISTORY_RETENTION_MS_V277 = 400 * 24 * 60 * 60 * 1000;

type HistoryGlobal = typeof globalThis & {
  __kingTcgMarketHistoryV277?: Map<string, MarketHistoryPoint[]>;
};

const sharedGlobal = globalThis as HistoryGlobal;
const memoryHistory = sharedGlobal.__kingTcgMarketHistoryV277 ?? new Map<string, MarketHistoryPoint[]>();
sharedGlobal.__kingTcgMarketHistoryV277 = memoryHistory;

const HISTORY_KEY_PREFIX = "king-tcg:market-history:v1:";
const UPSERT_DAILY_HISTORY_SCRIPT = `
local history = {}
local raw = redis.call('GET', KEYS[1])
if raw then
  local ok, decoded = pcall(cjson.decode, raw)
  if ok and type(decoded) == 'table' then history = decoded end
end
local point = cjson.decode(ARGV[1])
local last = history[#history]
if last and last['day'] == point['day'] then
  history[#history] = point
else
  table.insert(history, point)
end
local maximum = tonumber(ARGV[2])
while #history > maximum do table.remove(history, 1) end
local encoded = cjson.encode(history)
redis.call('SET', KEYS[1], encoded, 'PX', ARGV[3])
return encoded
`.trim();

function historyKey(key: string): string {
  return `${HISTORY_KEY_PREFIX}${key}`;
}

function finitePrice(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Number(parsed.toFixed(2)) : 0;
}

function normalizedPoint(point: MarketHistoryPoint): MarketHistoryPoint | null {
  const date = Number(point.date);
  const average = finitePrice(point.average);
  if (!Number.isFinite(date) || date <= 0 || average <= 0) return null;
  return {
    date,
    day: point.day || new Date(date).toISOString().slice(0, 10),
    cardmarket: finitePrice(point.cardmarket),
    ebay: finitePrice(point.ebay),
    tcgplayer: finitePrice(point.tcgplayer),
    justtcg: finitePrice(point.justtcg),
    average,
    origin: "observed",
    language: point.language,
    condition: String(point.condition || "Near Mint").slice(0, 40),
    printingVariant: String(point.printingVariant || "Normal").slice(0, 80),
    confidence: point.confidence,
    sourceCount: Math.max(0, Math.min(20, Number(point.sourceCount || 0))),
    sourceClassifications: point.sourceClassifications,
  };
}

function parseHistory(raw: unknown): MarketHistoryPoint[] | null {
  if (typeof raw !== "string" || !raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed
      .map((point) => normalizedPoint(point as MarketHistoryPoint))
      .filter((point): point is MarketHistoryPoint => Boolean(point))
      .slice(-MARKET_HISTORY_MAX_POINTS_V277);
  } catch {
    return null;
  }
}

function upsertMemory(key: string, point: MarketHistoryPoint): MarketHistoryPoint[] {
  const current = [...(memoryHistory.get(key) || [])];
  const last = current[current.length - 1];
  if (last?.day === point.day) current[current.length - 1] = point;
  else current.push(point);
  const bounded = current.slice(-MARKET_HISTORY_MAX_POINTS_V277);
  memoryHistory.set(key, bounded);
  return bounded;
}

export async function appendMarketHistoryV277(options: {
  key: string;
  point: MarketHistoryPoint;
}): Promise<{
  history: MarketHistoryPoint[];
  backend: MarketCacheBackendV276;
}> {
  const point = normalizedPoint(options.point);
  if (!point) {
    return { history: memoryHistory.get(options.key) || [], backend: "memory" };
  }
  const local = upsertMemory(options.key, point);
  if (!isMarketRedisConfiguredV277()) {
    recordHistoryWriteV277("memory");
    return { history: local, backend: "memory" };
  }
  try {
    const raw = await executeMarketRedisCommandV277([
      "EVAL",
      UPSERT_DAILY_HISTORY_SCRIPT,
      1,
      historyKey(options.key),
      JSON.stringify(point),
      MARKET_HISTORY_MAX_POINTS_V277,
      MARKET_HISTORY_RETENTION_MS_V277,
    ]);
    const remote = parseHistory(raw) || local;
    memoryHistory.set(options.key, remote);
    recordHistoryWriteV277("redis-rest");
    return { history: remote, backend: "redis-rest" };
  } catch {
    recordHistoryWriteV277("memory");
    return { history: local, backend: "memory" };
  }
}

export async function readMarketHistoryV277(
  key: string
): Promise<{ history: MarketHistoryPoint[]; backend: MarketCacheBackendV276 }> {
  if (!isMarketRedisConfiguredV277()) {
    return { history: memoryHistory.get(key) || [], backend: "memory" };
  }
  try {
    const raw = await executeMarketRedisCommandV277(["GET", historyKey(key)]);
    const remote = parseHistory(raw);
    if (remote) {
      memoryHistory.set(key, remote);
      return { history: remote, backend: "redis-rest" };
    }
  } catch {}
  return { history: memoryHistory.get(key) || [], backend: "memory" };
}

export function clearMemoryMarketHistoryV277(): void {
  memoryHistory.clear();
}
