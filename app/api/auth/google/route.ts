import { NextRequest, NextResponse } from "next/server";
import {
  createPkcePair,
  getCanonicalAppUrl,
  getSupabaseConfig,
  KING_AUTH_NEXT_COOKIE,
  KING_AUTH_VERIFIER_COOKIE,
  safeNextPath,
} from "@/lib/king-auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { url } = getSupabaseConfig();
    const next = safeNextPath(request.nextUrl.searchParams.get("next"));
    const { verifier, challenge } = createPkcePair();
    const redirectUri = `${getCanonicalAppUrl(request)}/auth/callback`;

    const authorizeUrl = new URL(`${url}/auth/v1/authorize`);
    authorizeUrl.searchParams.set("provider", "google");
    authorizeUrl.searchParams.set("redirect_to", redirectUri);
    authorizeUrl.searchParams.set("code_challenge", challenge);
    authorizeUrl.searchParams.set("code_challenge_method", "s256");

    const response = NextResponse.redirect(authorizeUrl.toString());
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
      maxAge: 10 * 60,
    };
    response.cookies.set(KING_AUTH_VERIFIER_COOKIE, verifier, cookieOptions);
    response.cookies.set(KING_AUTH_NEXT_COOKIE, next, cookieOptions);
    return response;
  } catch (error: any) {
    console.error("[King_TCG] OAuth start error:", error);
    return NextResponse.redirect(`${getCanonicalAppUrl(request)}/parametres/compte?auth=error`);
  }
}
