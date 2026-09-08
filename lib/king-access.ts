export type KingAccessPlan = "guest" | "normal" | "premium" | "pro" | "admin";

export type KingAccess = {
  authenticated: boolean;
  plan: KingAccessPlan;
  scannerLimit: number | null;
  scannerLabel: string;
  user: { id: string; email: string | null; name: string | null; avatarUrl: string | null } | null;
};

const GUEST_ACCESS: KingAccess = {
  authenticated: false,
  plan: "guest",
  scannerLimit: 5,
  scannerLabel: "5 sessions invité",
  user: null,
};

export async function fetchKingAccess(signal?: AbortSignal): Promise<KingAccess> {
  try {
    const response = await fetch("/api/auth/session", { cache: "no-store", signal, credentials: "include" });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload || typeof payload !== "object") return GUEST_ACCESS;
    const plan = ["guest", "normal", "premium", "pro", "admin"].includes(String((payload as any).plan))
      ? (String((payload as any).plan) as KingAccessPlan)
      : "guest";
    const scannerLimit = (payload as any).scannerLimit === null
      ? null
      : Number.isFinite(Number((payload as any).scannerLimit))
        ? Number((payload as any).scannerLimit)
        : 5;
    return {
      authenticated: Boolean((payload as any).authenticated),
      plan,
      scannerLimit,
      scannerLabel: String((payload as any).scannerLabel || (plan === "admin" ? "Illimité · administrateur" : "5 sessions invité")),
      user: (payload as any).user || null,
    };
  } catch {
    return GUEST_ACCESS;
  }
}

export function hasPremiumAccess(plan: KingAccessPlan): boolean {
  return plan === "premium" || plan === "pro" || plan === "admin";
}

export function hasProAccess(plan: KingAccessPlan): boolean {
  return plan === "pro" || plan === "admin";
}

export function hasAdminAccess(plan: KingAccessPlan): boolean {
  return plan === "admin";
}
