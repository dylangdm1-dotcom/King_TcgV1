import { NextRequest, NextResponse } from "next/server";
import { resolveRequestUser } from "@/lib/auth/supabase-rest";
import { priceForPlan, publicAppUrl, stripePost, type PaidPlan } from "@/lib/billing/stripe-rest";

export async function POST(req: NextRequest) {
  try {
    const auth = await resolveRequestUser(req);
    if (!auth) return NextResponse.json({ error: "Connectez-vous avant de choisir un abonnement." }, { status: 401 });
    const body = await req.json().catch(() => null);
    const plan = body?.plan === "premium" || body?.plan === "pro" ? body.plan as PaidPlan : null;
    if (!plan) return NextResponse.json({ error: "Formule invalide" }, { status: 400 });
    if (auth.profile.role === "admin" || auth.profile.role === "tester") return NextResponse.json({ error: "Ce compte dispose déjà de tous les accès." }, { status: 409 });
    const appUrl = publicAppUrl(req.url);
    const values: Record<string, unknown> = {
      mode: "subscription",
      "line_items[0][price]": priceForPlan(plan),
      "line_items[0][quantity]": 1,
      client_reference_id: auth.user.id,
      "metadata[user_id]": auth.user.id,
      "metadata[plan]": plan,
      "subscription_data[metadata][user_id]": auth.user.id,
      "subscription_data[metadata][plan]": plan,
      allow_promotion_codes: "true",
      success_url: `${appUrl}/parametres/compte?checkout=success`,
      cancel_url: `${appUrl}/parametres/compte?checkout=cancelled`,
    };
    if (auth.profile.stripe_customer_id) values.customer = auth.profile.stripe_customer_id;
    else values.customer_email = auth.user.email;
    const session = await stripePost("checkout/sessions", values);
    return NextResponse.json({ url: session.url });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Paiement indisponible" }, { status: 500 });
  }
}
