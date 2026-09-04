import { NextRequest, NextResponse } from "next/server";
import { publicAppUrl } from "@/lib/billing/stripe-rest";

export function GET(req: NextRequest) {
  const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
  if (!supabaseUrl || !process.env.SUPABASE_ANON_KEY) {
    return NextResponse.redirect(`${publicAppUrl(req.url)}/parametres/compte?error=supabase_config`);
  }
  const callback = `${publicAppUrl(req.url)}/auth/callback`;
  const authorize = new URL(`${supabaseUrl}/auth/v1/authorize`);
  authorize.searchParams.set("provider", "google");
  authorize.searchParams.set("redirect_to", callback);
  return NextResponse.redirect(authorize);
}
