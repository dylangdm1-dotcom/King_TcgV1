import { NextResponse } from "next/server";
import { clearSessionCookies, getCurrentKingSession, setSessionCookies } from "@/lib/king-auth";
import { ensureProfile, profileToAccount } from "@/lib/auth/supabase-rest";
import { normalizeRole } from "@/lib/auth/plans";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getCurrentKingSession();

  if (!session) {
    const response = NextResponse.json({
      authenticated: false,
      user: null,
      plan: "guest",
      scannerLimit: 5,
      scannerLabel: "5 sessions invité",
    });
    clearSessionCookies(response);
    return response;
  }

  // Source de vérité unique : le profil Supabase. Cela couvre les comptes
  // PRO/Premium Stripe ainsi que les testeurs PRO, au lieu de dépendre uniquement
  // de KING_TCG_TESTER_EMAILS.
  const profile = await ensureProfile({
    id: session.user.id,
    email: session.user.email || undefined,
    user_metadata: {
      ...(session.user.name ? { name: session.user.name, full_name: session.user.name } : {}),
      ...(session.user.avatarUrl ? { avatar_url: session.user.avatarUrl } : {}),
    },
  });
  const account = profileToAccount(profile, {
    id: session.user.id,
    email: session.user.email || undefined,
    user_metadata: {
      ...(session.user.name ? { name: session.user.name, full_name: session.user.name } : {}),
      ...(session.user.avatarUrl ? { avatar_url: session.user.avatarUrl } : {}),
    },
  });
  const role = normalizeRole(profile.role);
  const plan = role === "tester" ? "pro" : role;
  const scannerLabel = role === "tester"
    ? "550 sessions / mois · testeur PRO"
    : plan === "admin"
      ? "Illimité · administrateur"
      : `${account.scanLimit ?? 0} sessions / mois`;
  const response = NextResponse.json({
    authenticated: true,
    user: session.user,
    plan,
    scannerLimit: account.scanLimit,
    scannerLabel,
  });
  setSessionCookies(response, session);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
