import { NextRequest, NextResponse } from "next/server";
import { PLAN_LIMITS, roleFeatures, roleLabel } from "@/lib/auth/plans";
import { ensureProfile, getSupabaseUser, profileToAccount, refreshSupabaseSession, supabaseConfigured } from "@/lib/auth/supabase-rest";
import { setSessionCookies } from "@/lib/auth/session";
import { readGuestQuota } from "@/lib/auth/guest-quota";

export const dynamic = "force-dynamic";

function guest(req: NextRequest) {
  const quota = readGuestQuota(req);
  return {
    authenticated: false, configured: supabaseConfigured(), id: null, email: null, displayName: null, avatarUrl: null,
    role: "guest", roleLabel: roleLabel("guest"), subscriptionStatus: null, scanLimit: PLAN_LIMITS.guest,
    scansUsed: quota.used, quotaEndsAt: "", unlimited: false, features: roleFeatures("guest"),
  };
}

export async function GET(req: NextRequest) {
  let access = req.cookies.get("kt_access")?.value || "";
  let refresh = req.cookies.get("kt_refresh")?.value || "";
  let user = access ? await getSupabaseUser(access) : null;
  let refreshed: Awaited<ReturnType<typeof refreshSupabaseSession>> = null;
  if (!user && refresh) {
    refreshed = await refreshSupabaseSession(refresh);
    if (refreshed) {
      access = refreshed.access_token;
      refresh = refreshed.refresh_token;
      user = refreshed.user;
    }
  }
  if (!user) return NextResponse.json({ account: guest(req) });
  const account = profileToAccount(await ensureProfile(user), user);
  const response = NextResponse.json({ account });
  return refreshed ? setSessionCookies(response, refreshed) : response;
}
