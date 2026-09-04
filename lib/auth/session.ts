import { NextResponse } from "next/server";

const secure = process.env.NODE_ENV === "production";

export function setSessionCookies(response: NextResponse, session: { access_token: string; refresh_token: string; expires_in?: number }) {
  response.cookies.set("kt_access", session.access_token, { httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: session.expires_in || 3600 });
  response.cookies.set("kt_refresh", session.refresh_token, { httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
  return response;
}

export function clearSessionCookies(response: NextResponse) {
  response.cookies.set("kt_access", "", { httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: 0 });
  response.cookies.set("kt_refresh", "", { httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: 0 });
  return response;
}
