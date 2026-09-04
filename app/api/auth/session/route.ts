import { NextRequest, NextResponse } from "next/server";
import { getSupabaseUser, ensureProfile } from "@/lib/auth/supabase-rest";
import { setSessionCookies } from "@/lib/auth/session";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const accessToken = typeof body?.accessToken === "string" ? body.accessToken : "";
  const refreshToken = typeof body?.refreshToken === "string" ? body.refreshToken : "";
  const expiresIn = Math.max(60, Math.min(7200, Number(body?.expiresIn) || 3600));
  if (!accessToken || !refreshToken) return NextResponse.json({ error: "Session incomplète" }, { status: 400 });
  const user = await getSupabaseUser(accessToken);
  if (!user) return NextResponse.json({ error: "Session Supabase invalide" }, { status: 401 });
  await ensureProfile(user);
  return setSessionCookies(NextResponse.json({ success: true }), { access_token: accessToken, refresh_token: refreshToken, expires_in: expiresIn });
}
