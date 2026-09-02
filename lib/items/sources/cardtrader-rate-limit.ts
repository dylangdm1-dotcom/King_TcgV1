const WINDOW_MS = 10_000;
const PUBLIC_LIMIT = 200;
const INTERNAL_LIMIT = 180;

let windowStartedAt = 0;
let requestCount = 0;
let lastMarketplaceRequestAt = 0;

function pause(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function waitForCardTraderSlot(): Promise<void> {
  const now = Date.now();
  if (!windowStartedAt || now - windowStartedAt >= WINDOW_MS) {
    windowStartedAt = now;
    requestCount = 0;
  }

  if (requestCount >= INTERNAL_LIMIT) {
    await pause(Math.max(25, WINDOW_MS - (now - windowStartedAt) + 25));
    windowStartedAt = Date.now();
    requestCount = 0;
  }

  requestCount += 1;
}

export async function waitForCardTraderMarketplaceSlot(): Promise<void> {
  const elapsed = Date.now() - lastMarketplaceRequestAt;
  if (lastMarketplaceRequestAt && elapsed < 1_100) await pause(1_100 - elapsed);
  lastMarketplaceRequestAt = Date.now();
}

export const CARDTRADER_RATE_LIMIT = {
  publicLimit: PUBLIC_LIMIT,
  internalLimit: INTERNAL_LIMIT,
  windowMs: WINDOW_MS,
  marketplaceMinimumIntervalMs: 1_100,
} as const;
