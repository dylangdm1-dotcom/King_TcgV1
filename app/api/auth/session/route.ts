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
  if (!user) {
    return NextResponse.json({
      error: "Session Supabase invalide. Vérifiez que SUPABASE_ANON_KEY appartient au même projet que SUPABASE_URL.",
      code: "supabase_user_invalid",
    }, { status: 401 });
  }

  try {
    await ensureProfile(user);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error("[King_TCG] Création du profil Supabase impossible :", detail);
    const missingSchema = /404|PGRST205|profiles.*not.*find|relation.*profiles.*does not exist/i.test(detail);
    const invalidServiceKey = /401|403|jwt|unauthorized|permission/i.test(detail);
    const message = missingSchema
      ? "Tables King_TCG absentes : exécutez la migration SQL V306 dans Supabase, puis réessayez."
      : invalidServiceKey
        ? "Clé service_role refusée : vérifiez SUPABASE_SERVICE_ROLE_KEY dans Vercel."
        : "Profil King_TCG impossible à créer. Vérifiez la migration V306 et la clé service_role dans Vercel.";
    return NextResponse.json({ error: message, code: "profile_setup_failed" }, { status: 503 });
  }

  return setSessionCookies(NextResponse.json({ success: true }), {
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_in: expiresIn,
  });
}
