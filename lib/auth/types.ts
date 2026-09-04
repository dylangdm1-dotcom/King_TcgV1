import type { AccountRole } from "./plans";

export interface AccountState {
  authenticated: boolean;
  configured: boolean;
  id: string | null;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  role: AccountRole;
  roleLabel: string;
  subscriptionStatus: string | null;
  scanLimit: number | null;
  scansUsed: number;
  quotaEndsAt: string;
  unlimited: boolean;
  features: { batch: boolean; quad: boolean; listing: boolean; cloud: boolean; sales: boolean };
}
