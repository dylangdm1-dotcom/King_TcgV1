import { NextResponse } from "next/server";
import { clearSessionCookies } from "@/lib/auth/session";

export async function POST() {
  return clearSessionCookies(NextResponse.json({ success: true }));
}
