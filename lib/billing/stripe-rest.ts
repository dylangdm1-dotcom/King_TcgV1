export type PaidPlan = "premium" | "pro";

function stripeSecret() {
  const value = process.env.STRIPE_SECRET_KEY;
  if (!value) throw new Error("STRIPE_SECRET_KEY non configurée");
  return value;
}

function append(params: URLSearchParams, key: string, value: unknown) {
  if (value !== undefined && value !== null && value !== "") params.append(key, String(value));
}

export async function stripePost(path: string, values: Record<string, unknown>) {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => append(params, key, value));
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: "POST",
    cache: "no-store",
    headers: { Authorization: `Bearer ${stripeSecret()}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body?.error?.message || `Stripe ${response.status}`);
  return body;
}

export function priceForPlan(plan: PaidPlan) {
  const price = plan === "premium" ? process.env.STRIPE_PRICE_PREMIUM : process.env.STRIPE_PRICE_PRO;
  if (!price) throw new Error(`Prix Stripe ${plan} non configuré`);
  return price;
}

export function planForPrice(priceId?: string | null): PaidPlan | null {
  if (priceId && priceId === process.env.STRIPE_PRICE_PREMIUM) return "premium";
  if (priceId && priceId === process.env.STRIPE_PRICE_PRO) return "pro";
  return null;
}

export function publicAppUrl(requestUrl?: string) {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  if (requestUrl) return new URL(requestUrl).origin;
  return "http://localhost:3000";
}
