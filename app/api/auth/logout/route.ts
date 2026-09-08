import { NextResponse } from "next/server";
import {
  clearSessionCookies,
  getCurrentKingSession,
  revokeKingSession,
} from "@/lib/king-auth";

export const dynamic = "force-dynamic";

export async function POST() {
  const session = await getCurrentKingSession();
  if (session) await revokeKingSession(session.accessToken);

  const response = NextResponse.json({ ok: true });
  clearSessionCookies(response);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
