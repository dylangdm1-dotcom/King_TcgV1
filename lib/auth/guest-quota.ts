import { createHmac, timingSafeEqual } from "crypto";
import type { NextRequest, NextResponse } from "next/server";

const COOKIE = "kt_guest_scan_v306";
type GuestQuota = { used: number; sessions: string[] };

function secret() { return process.env.KING_TCG_SESSION_SECRET || ""; }
function sign(data: string) { return createHmac("sha256", secret()).update(data).digest("base64url"); }
function decode(value?: string): GuestQuota {
  if (!value || !secret()) return { used: 0, sessions: [] };
  const [data, signature] = value.split(".");
  if (!data || !signature) return { used: 0, sessions: [] };
  const expected = sign(data);
  if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return { used: 0, sessions: [] };
  try {
    const parsed = JSON.parse(Buffer.from(data, "base64url").toString("utf8"));
    return { used: Math.max(0, Math.min(5, Number(parsed.used) || 0)), sessions: Array.isArray(parsed.sessions) ? parsed.sessions.slice(-8) : [] };
  } catch { return { used: 0, sessions: [] }; }
}

export function readGuestQuota(req: NextRequest) { return decode(req.cookies.get(COOKIE)?.value); }

export function reserveGuestScan(req: NextRequest, sessionKey: string) {
  if (!secret()) return { allowed: false, used: 0, reason: "configuration_required", quota: { used: 0, sessions: [] } as GuestQuota };
  const quota = readGuestQuota(req);
  const fingerprint = createHmac("sha256", secret()).update(sessionKey).digest("hex").slice(0, 20);
  if (quota.sessions.includes(fingerprint)) return { allowed: true, used: quota.used, quota };
  if (quota.used >= 5) return { allowed: false, used: quota.used, reason: "account_required", quota };
  const next = { used: quota.used + 1, sessions: [...quota.sessions, fingerprint].slice(-8) };
  return { allowed: true, used: next.used, quota: next };
}

export function attachGuestQuota(response: NextResponse, quota: GuestQuota) {
  const data = Buffer.from(JSON.stringify(quota)).toString("base64url");
  response.cookies.set(COOKIE, `${data}.${sign(data)}`, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 });
  return response;
}
