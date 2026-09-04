import { NextRequest, NextResponse } from "next/server";
import { resolveRequestUser } from "@/lib/auth/supabase-rest";
import { publicAppUrl, stripePost } from "@/lib/billing/stripe-rest";

export async function POST(req: NextRequest) {
  try {
    const auth = await resolveRequestUser(req);
    if (!auth) return NextResponse.json({ error: "Connexion requise" }, { status: 401 });
    if (!auth.profile.stripe_customer_id) return NextResponse.json({ error: "Aucun abonnement Stripe associé." }, { status: 404 });
    const session = await stripePost("billing_portal/sessions", { customer: auth.profile.stripe_customer_id, return_url: `${publicAppUrl(req.url)}/parametres/compte` });
    return NextResponse.json({ url: session.url });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Portail indisponible" }, { status: 500 });
  }
}
