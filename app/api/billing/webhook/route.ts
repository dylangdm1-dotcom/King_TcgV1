import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { findProfileByStripeCustomer, recordBillingEvent, updateProfile } from "@/lib/auth/supabase-rest";
import { planForPrice } from "@/lib/billing/stripe-rest";

export const runtime = "nodejs";

function verifyStripeSignature(payload: string, header: string, secret: string) {
  const parts = header.split(",").map((part) => part.split("="));
  const timestamp = parts.find(([key]) => key === "t")?.[1];
  const signatures = parts.filter(([key]) => key === "v1").map(([, value]) => value);
  if (!timestamp || !signatures.length || Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;
  const expected = createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex");
  return signatures.some((signature) => signature.length === expected.length && timingSafeEqual(Buffer.from(signature), Buffer.from(expected)));
}

function id(value: unknown) { return typeof value === "string" ? value : (value as any)?.id || null; }

export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = req.headers.get("stripe-signature") || "";
  const raw = await req.text();
  if (!secret || !verifyStripeSignature(raw, signature, secret)) return NextResponse.json({ error: "Signature Stripe invalide" }, { status: 400 });
  try {
    const event = JSON.parse(raw);
    const object = event.data?.object || {};
    let userId = object.metadata?.user_id || object.client_reference_id || null;
    const customerId = id(object.customer);
    const subscriptionId = event.type === "checkout.session.completed" ? id(object.subscription) : id(object.id);
    if (!userId && customerId) userId = (await findProfileByStripeCustomer(customerId))?.id || null;
    if (!userId) return NextResponse.json({ received: true, ignored: "profile_not_found" });

    if (event.type === "checkout.session.completed") {
      const plan = object.metadata?.plan === "pro" ? "pro" : "premium";
      await updateProfile(userId, { stripe_customer_id: customerId, stripe_subscription_id: subscriptionId, subscription_status: "active", role: plan });
    } else if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.created") {
      const status = String(object.status || "unknown");
      const active = status === "active" || status === "trialing";
      const priceId = object.items?.data?.[0]?.price?.id;
      const plan = object.metadata?.plan || planForPrice(priceId) || "normal";
      await updateProfile(userId, {
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        subscription_status: status,
        subscription_current_period_end: object.current_period_end ? new Date(object.current_period_end * 1000).toISOString() : null,
        role: active && (plan === "premium" || plan === "pro") ? plan : "normal",
      });
    } else if (event.type === "customer.subscription.deleted") {
      await updateProfile(userId, { subscription_status: "cancelled", stripe_subscription_id: null, role: "normal" });
    } else if (event.type === "invoice.payment_failed") {
      await updateProfile(userId, { subscription_status: "past_due" });
    }
    const firstProcessing = await recordBillingEvent(event.id, event.type);
    return NextResponse.json({ received: true, duplicate: !firstProcessing });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Webhook impossible" }, { status: 500 });
  }
}
