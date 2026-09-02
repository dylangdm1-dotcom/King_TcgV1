export type KingTcgPlan = "normal" | "premium" | "pro";

export const ITEM_ACCESS_PLANS: KingTcgPlan[] = ["premium", "pro"];

export function canAccessItems(plan: KingTcgPlan): boolean {
  return ITEM_ACCESS_PLANS.includes(plan);
}

export const ITEM_BETA_ACCESS = {
  productionPlans: ITEM_ACCESS_PLANS,
  betaPreviewEnabled: true,
  note: "L’aperçu V288 reste ouvert aux testeurs jusqu’à l’activation des comptes et abonnements serveur.",
} as const;
