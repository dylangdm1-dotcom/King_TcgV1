import type { NextRequest } from "next/server";
import { normalizeRole, PLAN_LIMITS, roleFeatures, roleLabel, type AccountRole } from "./plans";
import type { AccountState } from "./types";

export interface SupabaseUser {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
}

export interface ProfileRow {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  role: AccountRole;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_status: string | null;
  scan_count: number;
  scan_period_start: string;
}

export function supabaseConfigured() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function config() {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const anon = process.env.SUPABASE_ANON_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anon || !service) throw new Error("Supabase non configuré");
  return { url, anon, service };
}

async function serviceFetch(path: string, init: RequestInit = {}) {
  const { url, service } = config();
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      apikey: service,
      Authorization: `Bearer ${service}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  if (!response.ok) throw new Error(`Supabase REST ${response.status}: ${(await response.text()).slice(0, 300)}`);
  if (response.status === 204) return null;
  return response.json();
}

export async function getSupabaseUser(accessToken: string): Promise<SupabaseUser | null> {
  if (!accessToken || !supabaseConfigured()) return null;
  const { url, anon } = config();
  const response = await fetch(`${url}/auth/v1/user`, {
    cache: "no-store",
    headers: { apikey: anon, Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) return null;
  return response.json();
}

export async function refreshSupabaseSession(refreshToken: string) {
  if (!refreshToken || !supabaseConfigured()) return null;
  const { url, anon } = config();
  const response = await fetch(`${url}/auth/v1/token?grant_type=refresh_token`, {
    method: "POST",
    cache: "no-store",
    headers: { apikey: anon, "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  if (!response.ok) return null;
  return response.json() as Promise<{ access_token: string; refresh_token: string; expires_in: number; user: SupabaseUser }>;
}

function configuredRole(user: SupabaseUser): AccountRole | null {
  const email = (user.email || "").trim().toLowerCase();
  const adminEmail = (process.env.KING_TCG_ADMIN_EMAIL || "dylangdm1@gmail.com").trim().toLowerCase();
  if (email && email === adminEmail) return "admin";
  const testers = (process.env.KING_TCG_TESTER_EMAILS || "").split(",").map((entry) => entry.trim().toLowerCase()).filter(Boolean);
  if (testers.includes(email)) return "tester";
  return null;
}

export async function ensureProfile(user: SupabaseUser): Promise<ProfileRow> {
  const rows = await serviceFetch(`profiles?id=eq.${encodeURIComponent(user.id)}&select=*`) as ProfileRow[];
  const forcedRole = configuredRole(user);
  const metadata = user.user_metadata || {};
  const payload = {
    id: user.id,
    email: user.email || null,
    display_name: String(metadata.full_name || metadata.name || user.email?.split("@")[0] || "Dresseur"),
    avatar_url: typeof metadata.avatar_url === "string" ? metadata.avatar_url : null,
    ...(forcedRole ? { role: forcedRole } : {}),
    updated_at: new Date().toISOString(),
  };
  if (!rows[0]) {
    const created = await serviceFetch("profiles", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ ...payload, role: forcedRole || "normal" }) }) as ProfileRow[];
    return created[0];
  }
  const needsUpdate = forcedRole && normalizeRole(rows[0].role) !== forcedRole;
  if (needsUpdate || rows[0].email !== payload.email || !rows[0].display_name) {
    const updated = await serviceFetch(`profiles?id=eq.${encodeURIComponent(user.id)}`, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify(payload) }) as ProfileRow[];
    return updated[0] || { ...rows[0], ...payload, role: forcedRole || rows[0].role };
  }
  return rows[0];
}

export async function resolveRequestUser(req: NextRequest) {
  const access = req.cookies.get("kt_access")?.value;
  const user = access ? await getSupabaseUser(access) : null;
  if (!user) return null;
  return { user, profile: await ensureProfile(user) };
}

function periodEnd() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString();
}

export function profileToAccount(profile: ProfileRow, user: SupabaseUser): AccountState {
  const role = normalizeRole(profile.role);
  const limit = PLAN_LIMITS[role];
  return {
    authenticated: true,
    configured: true,
    id: user.id,
    email: user.email || profile.email,
    displayName: profile.display_name,
    avatarUrl: profile.avatar_url,
    role,
    roleLabel: roleLabel(role),
    subscriptionStatus: profile.subscription_status,
    scanLimit: limit,
    scansUsed: role === "admin" ? 0 : Math.max(0, Number(profile.scan_count) || 0),
    quotaEndsAt: periodEnd(),
    unlimited: limit === null,
    features: roleFeatures(role),
  };
}

export async function consumeAuthenticatedScan(userId: string, sessionKey: string, mode: string) {
  const result = await serviceFetch("rpc/consume_scan_session", { method: "POST", body: JSON.stringify({ p_user_id: userId, p_session_key: sessionKey, p_mode: mode }) });
  return Array.isArray(result) ? result[0] : result;
}

export async function updateProfile(userId: string, payload: Record<string, unknown>) {
  const rows = await serviceFetch(`profiles?id=eq.${encodeURIComponent(userId)}`, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify({ ...payload, updated_at: new Date().toISOString() }) });
  return (rows as ProfileRow[])[0] || null;
}

export async function findProfileByStripeCustomer(customerId: string) {
  const rows = await serviceFetch(`profiles?stripe_customer_id=eq.${encodeURIComponent(customerId)}&select=*`) as ProfileRow[];
  return rows[0] || null;
}

export async function recordBillingEvent(eventId: string, eventType: string) {
  try {
    await serviceFetch("billing_events", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ id: eventId, event_type: eventType }) });
    return true;
  } catch (error) {
    if (String(error).includes("409")) return false;
    throw error;
  }
}

export async function readCloudState(userId: string) {
  return serviceFetch(`cloud_state?user_id=eq.${encodeURIComponent(userId)}&select=kind,payload,version,updated_at`);
}

export async function writeCloudState(userId: string, kind: string, payload: unknown, version: number) {
  return serviceFetch("cloud_state?on_conflict=user_id,kind", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=representation" }, body: JSON.stringify({ user_id: userId, kind, payload, version, updated_at: new Date().toISOString() }) });
}
