import { NextResponse } from "next/server";
import {
  clearSessionCookies,
  getCurrentKingSession,
  getKingEntitlement,
  setSessionCookies,
} from "@/lib/king-auth";

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

  const entitlement = getKingEntitlement(session.user.email);
  const response = NextResponse.json({
    authenticated: true,
    user: session.user,
    plan: entitlement.plan,
    scannerLimit: entitlement.scannerLimit,
    scannerLabel: entitlement.scannerLabel,
  });
  setSessionCookies(response, session);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
