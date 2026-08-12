import type { PokemonCard } from "@/lib/types";

export const SCANNER_MONTHLY_SESSION_LIMIT = 50;
export const SCANNER_MAX_BATCH_CARDS = 4;

const BATCH_KEY = "king_tcg_scanner_batch_session_v1";
const QUOTA_KEY = "king_tcg_scanner_quota_v1";

export type ScannerMode = "single" | "batch" | "quad";
export type ScannerLanguage = "fr" | "en" | "ja" | "zh-tw";

export interface StoredBatchItem {
  id: string;
  card: PokemonCard;
  scannedAt: string;
  confidence: number;
}

export interface StoredBatchSession {
  sessionId: string;
  createdAt: string;
  updatedAt: string;
  language?: ScannerLanguage;
  items: StoredBatchItem[];
  quotaConsumed: boolean;
}

interface ScannerQuotaStore {
  periodStart: string;
  periodEnd: string;
  sessionsUsed: number;
}

function browserAvailable() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function scannerPeriod(now = new Date()) {
  const year = now.getFullYear();
  const month = now.getMonth();
  const resetThisMonth = new Date(year, month, 5, 0, 0, 0, 0);
  const start = now >= resetThisMonth ? resetThisMonth : new Date(year, month - 1, 5, 0, 0, 0, 0);
  const end = new Date(start.getFullYear(), start.getMonth() + 1, 5, 0, 0, 0, 0);
  return { start, end };
}

export function getScannerQuota(now = new Date()) {
  const { start, end } = scannerPeriod(now);
  const fresh: ScannerQuotaStore = {
    periodStart: start.toISOString(),
    periodEnd: end.toISOString(),
    sessionsUsed: 0,
  };

  if (!browserAvailable()) {
    return { ...fresh, remaining: SCANNER_MONTHLY_SESSION_LIMIT, limit: SCANNER_MONTHLY_SESSION_LIMIT };
  }

  try {
    const parsed = JSON.parse(localStorage.getItem(QUOTA_KEY) || "null") as ScannerQuotaStore | null;
    const samePeriod = parsed?.periodStart === fresh.periodStart && parsed?.periodEnd === fresh.periodEnd;
    const store = samePeriod && parsed ? parsed : fresh;
    if (!samePeriod) localStorage.setItem(QUOTA_KEY, JSON.stringify(store));
    const used = Math.max(0, Math.min(SCANNER_MONTHLY_SESSION_LIMIT, Number(store.sessionsUsed) || 0));
    return {
      ...store,
      sessionsUsed: used,
      remaining: Math.max(0, SCANNER_MONTHLY_SESSION_LIMIT - used),
      limit: SCANNER_MONTHLY_SESSION_LIMIT,
    };
  } catch {
    return { ...fresh, remaining: SCANNER_MONTHLY_SESSION_LIMIT, limit: SCANNER_MONTHLY_SESSION_LIMIT };
  }
}

export function consumeScannerSessionQuota() {
  const quota = getScannerQuota();
  if (quota.sessionsUsed >= quota.limit) return quota;
  const next = { ...quota, sessionsUsed: quota.sessionsUsed + 1 };
  if (browserAvailable()) {
    localStorage.setItem(
      QUOTA_KEY,
      JSON.stringify({ periodStart: next.periodStart, periodEnd: next.periodEnd, sessionsUsed: next.sessionsUsed })
    );
  }
  return { ...next, remaining: Math.max(0, next.limit - next.sessionsUsed) };
}

export function loadBatchSession(): StoredBatchSession | null {
  if (!browserAvailable()) return null;
  try {
    const parsed = JSON.parse(localStorage.getItem(BATCH_KEY) || "null") as StoredBatchSession | null;
    if (!parsed || !Array.isArray(parsed.items)) return null;
    return { ...parsed, items: parsed.items.slice(0, SCANNER_MAX_BATCH_CARDS) };
  } catch {
    return null;
  }
}

export function saveBatchSession(session: StoredBatchSession) {
  if (!browserAvailable()) return;
  const safe: StoredBatchSession = {
    ...session,
    updatedAt: new Date().toISOString(),
    items: session.items.slice(0, SCANNER_MAX_BATCH_CARDS),
  };
  localStorage.setItem(BATCH_KEY, JSON.stringify(safe));
}

export function createBatchSession(language?: ScannerLanguage): StoredBatchSession {
  const now = new Date().toISOString();
  return {
    sessionId: `scan_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: now,
    updatedAt: now,
    language,
    items: [],
    quotaConsumed: false,
  };
}

export function clearStoredBatchSession() {
  if (!browserAvailable()) return;
  localStorage.removeItem(BATCH_KEY);
}
