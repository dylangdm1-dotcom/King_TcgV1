import { NextResponse } from "next/server";

type RateLimitOptions = {
  limit: number;
  windowMs: number;
};

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

const rateLimitBuckets = new Map<string, RateLimitBucket>();
const MAX_BUCKETS = 5_000;
let requestsSinceCleanup = 0;

function cleanupExpiredBuckets(now: number) {
  requestsSinceCleanup += 1;
  if (requestsSinceCleanup < 100 && rateLimitBuckets.size < MAX_BUCKETS) return;

  requestsSinceCleanup = 0;
  rateLimitBuckets.forEach((bucket, key) => {
    if (bucket.resetAt <= now) rateLimitBuckets.delete(key);
  });

  if (rateLimitBuckets.size <= MAX_BUCKETS) return;
  const overflow = rateLimitBuckets.size - MAX_BUCKETS;
  let removed = 0;
  rateLimitBuckets.forEach((_bucket, key) => {
    if (removed >= overflow) return;
    rateLimitBuckets.delete(key);
    removed += 1;
  });
}

function clientIdentifier(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  const candidate = forwarded || realIp || "unknown";
  return candidate.replace(/[^a-zA-Z0-9:._-]/g, "").slice(0, 128) || "unknown";
}

export function apiError(
  error: string,
  status: number,
  code: string,
  headers?: HeadersInit
) {
  return NextResponse.json(
    { success: false, error, code },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
        ...headers,
      },
    }
  );
}

export function enforceRateLimit(
  request: Request,
  scope: string,
  options: RateLimitOptions
): NextResponse | null {
  const now = Date.now();
  cleanupExpiredBuckets(now);

  const key = `${scope}:${clientIdentifier(request)}`;
  const existing = rateLimitBuckets.get(key);
  const bucket = !existing || existing.resetAt <= now
    ? { count: 0, resetAt: now + options.windowMs }
    : existing;

  bucket.count += 1;
  rateLimitBuckets.set(key, bucket);

  if (bucket.count <= options.limit) return null;

  const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
  return apiError(
    "Trop de requêtes. Réessayez dans quelques instants.",
    429,
    "rate_limited",
    { "Retry-After": String(retryAfter) }
  );
}

export function rejectOversizedContentLength(
  request: Request,
  maxBytes: number
): NextResponse | null {
  const raw = request.headers.get("content-length");
  if (!raw) return null;

  const contentLength = Number(raw);
  if (!Number.isFinite(contentLength) || contentLength < 0) {
    return apiError("Taille de requête invalide.", 400, "invalid_content_length");
  }
  if (contentLength <= maxBytes) return null;

  return apiError("Requête trop volumineuse.", 413, "payload_too_large");
}

export async function readJsonBodyWithLimit<T = unknown>(
  request: Request,
  maxCharacters: number
): Promise<{ data: T } | { error: NextResponse }> {
  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return { error: apiError("Corps de requête illisible.", 400, "invalid_body") };
  }

  if (rawBody.length > maxCharacters) {
    return { error: apiError("Requête trop volumineuse.", 413, "payload_too_large") };
  }
  if (!rawBody.trim()) {
    return { error: apiError("Corps JSON manquant.", 400, "missing_body") };
  }

  try {
    return { data: JSON.parse(rawBody) as T };
  } catch {
    return { error: apiError("Corps JSON invalide.", 400, "invalid_json") };
  }
}

export function boundedQuery(
  value: string | null | undefined,
  maxLength: number
): { value: string } | { error: NextResponse } {
  const normalized = String(value || "").trim();
  if (normalized.length > maxLength) {
    return {
      error: apiError(
        `Paramètre trop long (${maxLength} caractères maximum).`,
        400,
        "invalid_parameter"
      ),
    };
  }
  if (/[\u0000-\u001F\u007F]/.test(normalized)) {
    return { error: apiError("Paramètre invalide.", 400, "invalid_parameter") };
  }
  return { value: normalized };
}

export function safeIdentifier(
  value: string | null | undefined,
  maxLength: number,
  pattern: RegExp = /^[a-zA-Z0-9._:+-]+$/
): { value: string } | { error: NextResponse } {
  const bounded = boundedQuery(value, maxLength);
  if ("error" in bounded) return bounded;
  if (!bounded.value || !pattern.test(bounded.value)) {
    return { error: apiError("Identifiant invalide.", 400, "invalid_identifier") };
  }
  return bounded;
}
