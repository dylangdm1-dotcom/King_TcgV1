import { NextRequest, NextResponse } from "next/server";
import {
  clearSessionCookies,
  exchangePkceCode,
  getCanonicalAppUrl,
  KING_AUTH_NEXT_COOKIE,
  KING_AUTH_VERIFIER_COOKIE,
  setSessionCookies,
  ensureProfile,
  safeNextPath,
} from "@/lib/king-auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const search = request.nextUrl.searchParams;
  const code = search.get("code");
  const error = search.get("error");
  const errorDescription = search.get("error_description");
  const verifier = request.cookies.get(KING_AUTH_VERIFIER_COOKIE)?.value || "";
  const next = safeNextPath(request.cookies.get(KING_AUTH_NEXT_COOKIE)?.value);

  const clearPkce = (response: NextResponse) => {
    const options = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
      maxAge: 0,
    };
    response.cookies.set(KING_AUTH_VERIFIER_COOKIE, "", options);
    response.cookies.set(KING_AUTH_NEXT_COOKIE, "", options);
  };

  if (error || errorDescription) {
    const response = NextResponse.json(
      { ok: false, error: errorDescription || error || "oauth_error", next },
      { status: 400 },
    );
    clearPkce(response);
    clearSessionCookies(response);
    return response;
  }

  if (!code || !verifier) {
    const response = NextResponse.json(
      { ok: false, error: "Code OAuth ou vérificateur PKCE manquant.", next },
      { status: 400 },
    );
    clearPkce(response);
    clearSessionCookies(response);
    return response;
  }

  try {
    const session = await exchangePkceCode(code, verifier);
    await ensureProfile(session.user);

    const response = NextResponse.json({ ok: true, next });
    setSessionCookies(response, session);
    clearPkce(response);
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  } catch (error: any) {
    console.error("[King_TCG] OAuth callback error:", error?.message || error);
    const response = NextResponse.json(
      { ok: false, error: error?.message || "Impossible de créer la session.", next },
      { status: 400 },
    );
    clearPkce(response);
    clearSessionCookies(response);
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  }
}
