export type SignalSnapshotAlert = {
  cardId: string;
  cardName: string;
  type: string;
  message: string;
  changePercent?: number;
};

export type SignalSnapshotOpportunity = {
  id: string;
  name: string;
  recommendation: "BUY" | "HOLD" | "SELL";
  trend: number;
  currentPrice: number;
};

type SignalSnapshot = {
  updatedAt: number;
  alerts: SignalSnapshotAlert[];
  opportunities: SignalSnapshotOpportunity[];
};

const KEY = "king_tcg_signal_snapshot_v1";

export function getSignalSnapshot(): SignalSnapshot {
  if (typeof window === "undefined") {
    return { updatedAt: 0, alerts: [], opportunities: [] };
  }

  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return {
      updatedAt: Number(parsed?.updatedAt || 0),
      alerts: Array.isArray(parsed?.alerts) ? parsed.alerts : [],
      opportunities: Array.isArray(parsed?.opportunities) ? parsed.opportunities : [],
    };
  } catch {
    return { updatedAt: 0, alerts: [], opportunities: [] };
  }
}

export function updateSignalSnapshot(
  partial: Partial<Pick<SignalSnapshot, "alerts" | "opportunities">>
) {
  if (typeof window === "undefined") return;

  const current = getSignalSnapshot();
  const next: SignalSnapshot = {
    updatedAt: Date.now(),
    alerts: partial.alerts ?? current.alerts,
    opportunities: partial.opportunities ?? current.opportunities,
  };

  try {
    localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new Event("king_tcg_signals_update"));
  } catch {
    // Le cache de signaux est un confort UI : il ne doit jamais casser l'app.
  }
}

export async function refreshSignalSnapshotIfNeeded(maxAgeMs = 2 * 60 * 60 * 1000) {
  if (typeof window === "undefined") return getSignalSnapshot();

  const current = getSignalSnapshot();
  if (current.updatedAt > 0 && Date.now() - current.updatedAt < maxAgeMs) {
    return current;
  }

  try {
    const [{ getCollection, getFavorites }, { getCardById }, { generateAlerts }, { rankPortfolio }, { getMarketHistoryDays }] = await Promise.all([
      import("./storage"),
      import("./pokemon"),
      import("./priceAlerts"),
      import("./opportunity"),
      import("./priceHistory"),
    ]);

    const ids = Array.from(
      new Set([...Object.keys(getCollection()), ...getFavorites()])
    );

    if (ids.length === 0) {
      updateSignalSnapshot({ alerts: [], opportunities: [] });
      return getSignalSnapshot();
    }

    const loaded = await Promise.all(
      ids.map(async (id) => {
        try {
          return await getCardById(id);
        } catch {
          return null;
        }
      })
    );

    const cards = loaded.filter(
      (card): card is Exclude<(typeof loaded)[number], null> => card !== null
    );
    const alerts = generateAlerts(cards);
    const ranking = rankPortfolio(
      cards.map((card) => ({ card, history: getMarketHistoryDays(card, 30) }))
    ).filter((item) => item.isActionable);

    updateSignalSnapshot({
      alerts,
      opportunities: ranking.map((item) => ({
        id: item.id,
        name: item.name,
        recommendation: item.recommendation,
        trend: item.trend,
        currentPrice: item.currentPrice,
      })),
    });

    return getSignalSnapshot();
  } catch {
    return current;
  }
}
