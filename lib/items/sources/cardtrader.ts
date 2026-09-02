import "server-only";
import { CARDTRADER_RATE_LIMIT, waitForCardTraderSlot } from "./cardtrader-rate-limit";
import type { CardTraderApiStatus } from "./cardtrader-types";

const BASE_URL = "https://api.cardtrader.com/api/v2";
const REQUEST_TIMEOUT_MS = 15_000;

function token(): string {
  return String(process.env.CARDTRADER_API_TOKEN || "").trim();
}

export function cardTraderStatus(): CardTraderApiStatus {
  const configured = Boolean(token());
  return {
    configured,
    state: configured ? "ready" : "configuration_required",
    ...CARDTRADER_RATE_LIMIT,
  };
}

export async function cardTraderGet<T>(pathname: string, searchParams?: Record<string, string | number>): Promise<T> {
  const apiToken = token();
  if (!apiToken) throw new Error("cardtrader_not_configured");
  if (!/^\/[a-z0-9/_-]+$/i.test(pathname)) throw new Error("cardtrader_invalid_path");

  await waitForCardTraderSlot();
  const url = new URL(`${BASE_URL}${pathname}`);
  Object.entries(searchParams || {}).forEach(([key, value]) => url.searchParams.set(key, String(value)));

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiToken}`,
        Accept: "application/json",
        "User-Agent": "King_TCG/1.0",
      },
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok) {
      if (response.status === 401) throw new Error("cardtrader_unauthorized");
      if (response.status === 429) throw new Error("cardtrader_rate_limited");
      throw new Error(`cardtrader_http_${response.status}`);
    }
    return await response.json() as T;
  } finally {
    clearTimeout(timeout);
  }
}
