import { cookies } from "next/headers";
import { createHash, randomBytes } from "node:crypto";

export const KING_AUTH_ACCESS_COOKIE = "king_tcg_auth_access";
export const KING_AUTH_REFRESH_COOKIE = "king_tcg_auth_refresh";
export const KING_AUTH_EXPIRES_COOKIE = "king_tcg_auth_expires";
export const KING_AUTH_VERIFIER_COOKIE = "king_tcg_auth_verifier";
export const KING_AUTH_NEXT_COOKIE = "king_tcg_auth_next";

export type KingPlan = "guest" | "normal" | "premium" | "pro" | "admin";

export type KingAuthUser = {
  id: string;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
};

export type KingSession = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  user: KingAuthUser;
};

export type KingEntitlement = {
  plan: KingPlan;
  scannerLimit: number | null;
  scannerLabel: string;
};

function envFirst(...names: string[]): string {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return "";
}

export function getSupabaseConfig() {
  const url = envFirst("SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL").replace(/\/$/, "");
  const key = envFirst(
    "SUPABASE_ANON_KEY",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "SUPABASE_PUBLISHABLE_KEY",
  );

  if (!url || !key) {
    throw new Error("Configuration Supabase manquante: SUPABASE_URL et SUPABASE_ANON_KEY sont requis.");
  }

  return { url, key };
}

export function getCanonicalAppUrl(request?: Request): string {
  const configured = envFirst("NEXT_PUBLIC_APP_URL");
  if (configured) return configured.replace(/\/$/, "");
  if (request) return new URL(request.url).origin;
  return "http://localhost:3000";
}

function base64Url(value: Uint8Array): string {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export function createPkcePair() {
  const verifier = base64Url(randomBytes(32));
  const challenge = base64Url(createHash("sha256").update(verifier).digest());
  return { verifier, challenge };
}

export function safeNextPath(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/parametres/compte";
  return value;
}

function authHeaders(accessToken?: string) {
  const { key } = getSupabaseConfig();
  return {
    apikey: key,
    Authorization: `Bearer ${accessToken || key}`,
  };
}

async function parseAuthResponse(response: Response): Promise<any> {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      payload?.msg || payload?.message || payload?.error_description || payload?.error ||
      `Supabase Auth HTTP ${response.status}`;
    throw new Error(String(message));
  }
  return payload;
}

export async function exchangePkceCode(authCode: string, codeVerifier: string): Promise<KingSession> {
  const { url } = getSupabaseConfig();
  const response = await fetch(`${url}/auth/v1/token?grant_type=pkce`, {
    method: "POST",
    headers: {
      ...authHeaders(),
      "Content-Type": "application/json",
    },
    cache: "no-store",
    body: JSON.stringify({
      auth_code: authCode,
      code_verifier: codeVerifier,
    }),
  });

  const payload = await parseAuthResponse(response);
  const user = payload.user || await getUserFromAccessToken(payload.access_token);
  return normalizeSession(payload, user);
}

export async function refreshKingSession(refreshToken: string): Promise<KingSession> {
  const { url } = getSupabaseConfig();
  const response = await fetch(`${url}/auth/v1/token?grant_type=refresh_token`, {
    method: "POST",
    headers: {
      ...authHeaders(),
      "Content-Type": "application/json",
    },
    cache: "no-store",
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  const payload = await parseAuthResponse(response);
  const user = payload.user || await getUserFromAccessToken(payload.access_token);
  return normalizeSession(payload, user);
}

function normalizeSession(payload: any, user: any): KingSession {
  const accessToken = String(payload?.access_token || "");
  const refreshToken = String(payload?.refresh_token || "");
  if (!accessToken || !refreshToken) throw new Error("Session Supabase incomplète.");

  const expiresIn = Number(payload?.expires_in) || 3600;
  const expiresAt = Number(payload?.expires_at) || Math.floor(Date.now() / 1000) + expiresIn;

  return {
    accessToken,
    refreshToken,
    expiresAt,
    user: normalizeUser(user),
  };
}

export function normalizeUser(user: any): KingAuthUser {
  return {
    id: String(user?.id || ""),
    email: typeof user?.email === "string" ? user.email : null,
    name:
      typeof user?.user_metadata?.full_name === "string"
        ? user.user_metadata.full_name
        : typeof user?.user_metadata?.name === "string"
          ? user.user_metadata.name
          : typeof user?.raw_user_meta_data?.full_name === "string"
            ? user.raw_user_meta_data.full_name
            : null,
    avatarUrl:
      typeof user?.user_metadata?.avatar_url === "string"
        ? user.user_metadata.avatar_url
        : typeof user?.user_metadata?.picture === "string"
          ? user.user_metadata.picture
          : null,
  };
}

export async function getUserFromAccessToken(accessToken: string): Promise<KingAuthUser> {
  if (!accessToken) throw new Error("Access token manquant.");
  const { url } = getSupabaseConfig();
  const response = await fetch(`${url}/auth/v1/user`, {
    method: "GET",
    headers: authHeaders(accessToken),
    cache: "no-store",
  });
  const payload = await parseAuthResponse(response);
  return normalizeUser(payload);
}

export function readAuthCookies() {
  const store = cookies();
  return {
    accessToken: store.get(KING_AUTH_ACCESS_COOKIE)?.value || "",
    refreshToken: store.get(KING_AUTH_REFRESH_COOKIE)?.value || "",
    expiresAt: Number(store.get(KING_AUTH_EXPIRES_COOKIE)?.value || 0),
  };
}

export function sessionCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

export function setSessionCookies(response: Response & { cookies: any }, session: KingSession) {
  const options = sessionCookieOptions(60 * 60 * 24 * 90);
  response.cookies.set(KING_AUTH_ACCESS_COOKIE, session.accessToken, options);
  response.cookies.set(KING_AUTH_REFRESH_COOKIE, session.refreshToken, options);
  response.cookies.set(KING_AUTH_EXPIRES_COOKIE, String(session.expiresAt), options);
}

export function clearSessionCookies(response: Response & { cookies: any }) {
  const options = { ...sessionCookieOptions(0), maxAge: 0 };
  response.cookies.set(KING_AUTH_ACCESS_COOKIE, "", options);
  response.cookies.set(KING_AUTH_REFRESH_COOKIE, "", options);
  response.cookies.set(KING_AUTH_EXPIRES_COOKIE, "", options);
}

export async function getCurrentKingSession(): Promise<KingSession | null> {
  const stored = readAuthCookies();
  if (!stored.accessToken || !stored.refreshToken) return null;

  const now = Math.floor(Date.now() / 1000);
  if (stored.expiresAt > now + 60) {
    try {
      const user = await getUserFromAccessToken(stored.accessToken);
      return {
        accessToken: stored.accessToken,
        refreshToken: stored.refreshToken,
        expiresAt: stored.expiresAt,
        user,
      };
    } catch {
      // Continue with refresh below.
    }
  }

  try {
    return await refreshKingSession(stored.refreshToken);
  } catch {
    return null;
  }
}

export function getKingEntitlement(email: string | null): KingEntitlement {
  const normalized = String(email || "").trim().toLowerCase();
  const admin = envFirst("KING_TCG_ADMIN_EMAIL").toLowerCase();
  const testers = envFirst("KING_TCG_TESTER_EMAILS")
    .split(/[\n,;]+/)
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  if (normalized && admin && normalized === admin) {
    return { plan: "admin", scannerLimit: null, scannerLabel: "Illimité · administrateur" };
  }
  if (normalized && testers.includes(normalized)) {
    return { plan: "pro", scannerLimit: 550, scannerLabel: "550 sessions / mois · testeur PRO" };
  }
  return { plan: "normal", scannerLimit: 30, scannerLabel: "30 sessions / mois" };
}

export async function ensureProfile(user: KingAuthUser) {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!serviceRoleKey || !user.id) return;

  const { url } = getSupabaseConfig();
  const entitlement = getKingEntitlement(user.email);
  const response = await fetch(`${url}/rest/v1/profiles?on_conflict=id`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    cache: "no-store",
    body: JSON.stringify({
      id: user.id,
      email: user.email,
      display_name: user.name,
      updated_at: new Date().toISOString(),
    }),
  });

  if (!response.ok) {
    // L'authentification ne doit pas être bloquée par un profil SQL manquant.
    // La migration fournie dans ce patch crée la table attendue.
    console.warn("[King_TCG] Profil Supabase non synchronisé:", await response.text());
  }
}

export async function revokeKingSession(accessToken: string) {
  if (!accessToken) return;
  const { url } = getSupabaseConfig();
  await fetch(`${url}/auth/v1/logout`, {
    method: "POST",
    headers: {
      ...authHeaders(accessToken),
      "Content-Type": "application/json",
    },
    cache: "no-store",
  }).catch(() => undefined);
}
