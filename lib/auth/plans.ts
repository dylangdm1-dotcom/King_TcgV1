export type AccountRole = "guest" | "normal" | "premium" | "pro" | "admin" | "tester";
export type ScannerModeEntitlement = "mono" | "batch" | "quad" | "listing";

export const PLAN_LIMITS: Record<AccountRole, number | null> = {
  guest: 5,
  normal: 30,
  premium: 500,
  pro: 550,
  admin: null,
  tester: 550,
};

export function normalizeRole(value: unknown): AccountRole {
  return ["normal", "premium", "pro", "admin", "tester"].includes(String(value))
    ? (String(value) as AccountRole)
    : "normal";
}

export function roleFeatures(role: AccountRole) {
  const advanced = ["premium", "pro", "admin", "tester"].includes(role);
  const listing = ["pro", "admin", "tester"].includes(role);
  return {
    batch: advanced,
    quad: advanced,
    listing,
    cloud: role !== "guest",
    sales: role !== "guest",
  };
}

export function canUseScannerMode(role: AccountRole, mode: ScannerModeEntitlement) {
  if (mode === "mono") return true;
  const features = roleFeatures(role);
  if (mode === "listing") return features.listing;
  return mode === "batch" ? features.batch : features.quad;
}

export function roleLabel(role: AccountRole) {
  return ({ guest: "Invité", normal: "Normal", premium: "Premium", pro: "PRO", admin: "Administrateur", tester: "Testeur PRO" } as const)[role];
}
