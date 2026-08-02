// components/PriceChart.tsx

"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, TrendingUp } from "lucide-react";
import * as Recharts from "recharts";

type PricePoint = {
  date: string;
  price: number;
};

type Props = {
  history: PricePoint[];
};

const PERIODS = [
  { label: "7J", value: 7 },
  { label: "30J", value: 30 },
  { label: "90J", value: 90 },
] as const;

export default function PriceChart({ history }: Props) {
  const [period, setPeriod] = useState<7 | 30 | 90>(30);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  /**
   * Nettoyage + tri chronologique.
   *
   * V5.0 :
   * - ignore les prix invalides
   * - évite les NaN
   * - garantit un ordre chronologique
   */
  const normalizedHistory = useMemo(() => {
    if (!Array.isArray(history)) {
      return [];
    }

    return history
      .filter(
        (point) =>
          point &&
          typeof point.date === "string" &&
          Number.isFinite(point.price) &&
          point.price >= 0
      )
      .map((point) => ({
        date: point.date,
        price: Number(point.price),
      }))
      .sort(
        (a, b) =>
          new Date(a.date).getTime() -
          new Date(b.date).getTime()
      );
  }, [history]);

  /**
   * Historique correspondant à la période sélectionnée.
   */
  const filteredHistory = useMemo(() => {
    if (normalizedHistory.length === 0) {
      return [];
    }

    return normalizedHistory.slice(-period);
  }, [normalizedHistory, period]);

  /**
   * Prix actuel = dernier prix réel disponible.
   */
  const currentPrice = useMemo(() => {
    if (filteredHistory.length === 0) {
      return 0;
    }

    return filteredHistory[filteredHistory.length - 1]?.price ?? 0;
  }, [filteredHistory]);

  /**
   * Variation sur la période sélectionnée.
   */
  const variation = useMemo(() => {
    if (filteredHistory.length < 2) {
      return 0;
    }

    const startPrice = filteredHistory[0]?.price ?? 0;

    if (startPrice <= 0) {
      return 0;
    }

    return ((currentPrice - startPrice) / startPrice) * 100;
  }, [filteredHistory, currentPrice]);

  const formatDate = (date: string) => {
    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) {
      return date;
    }

    return parsed.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
    });
  };

  const chartData = useMemo(
    () =>
      filteredHistory.map((point) => ({
        ...point,
        displayDate: formatDate(point.date),
      })),
    [filteredHistory]
  );

  const formatPrice = (value: number) => {
    if (!Number.isFinite(value) || value <= 0) {
      return "--";
    }

    return `${value.toFixed(2)} €`;
  };

  /**
   * Aucun historique disponible.
   */
  if (normalizedHistory.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-900 bg-neutral-950/40 p-8 text-center">
        <div className="flex flex-col items-center gap-2">
          <Activity className="h-5 w-5 text-zinc-600" />

          <p className="text-xs font-bold text-zinc-500">
            Aucun historique de prix disponible.
          </p>

          <p className="text-[10px] font-medium text-zinc-600">
            L'historique sera construit automatiquement à partir
            des prochains relevés de marché.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-zinc-400">
            <TrendingUp className="h-4 w-4 text-cyan-400" />
            Historique des prix
          </h2>

          <div className="flex items-baseline gap-3 pt-1">
            <span className="tabular-nums text-2xl font-black text-white">
              {formatPrice(currentPrice)}
            </span>

            <span
              className={`text-xs font-black tabular-nums ${
                variation > 0
                  ? "text-emerald-400"
                  : variation < 0
                    ? "text-rose-400"
                    : "text-zinc-400"
              }`}
            >
              {variation > 0 ? "+" : ""}
              {variation.toFixed(2)} %
            </span>
          </div>
        </div>

        {/* Sélection période */}
        <div className="flex rounded-lg border border-zinc-900 bg-neutral-950/60 p-0.5">
          {PERIODS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setPeriod(item.value)}
              className={`cursor-pointer rounded-md px-3 py-1 text-[11px] font-black transition-all duration-150 ${
                period === item.value
                  ? "bg-zinc-900 text-cyan-400"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Graphique */}
      <div className="rounded-xl border border-zinc-900 bg-neutral-950/20 p-2">
        <div className="flex h-[280px] w-full items-center justify-center">
          {!mounted ? (
            <div className="flex items-center gap-2 text-[11px] font-bold text-zinc-600">
              <Activity className="h-3.5 w-3.5 animate-pulse text-cyan-500" />
              Indexation...
            </div>
          ) : filteredHistory.length < 2 ? (
            <div className="flex flex-col items-center justify-center gap-2 text-center">
              <Activity className="h-5 w-5 text-zinc-600" />

              <p className="text-xs font-bold text-zinc-500">
                Pas encore assez de données.
              </p>

              <p className="text-[10px] font-medium text-zinc-600">
                Au moins deux relevés sont nécessaires pour calculer
                une évolution.
              </p>
            </div>
          ) : (
            <Recharts.ResponsiveContainer
              width="100%"
              height="100%"
            >
              <Recharts.LineChart
                data={chartData}
                margin={{
                  top: 10,
                  right: 10,
                  left: -25,
                  bottom: 0,
                }}
              >
                <Recharts.CartesianGrid
                  stroke="#171717"
                  strokeDasharray="0 0"
                  vertical={false}
                />

                <Recharts.XAxis
                  dataKey="displayDate"
                  stroke="#404040"
                  fontSize={10}
                  fontWeight={700}
                  tickLine={false}
                  axisLine={false}
                  dy={8}
                />

                <Recharts.YAxis
                  domain={["auto", "auto"]}
                  stroke="#404040"
                  fontSize={10}
                  fontWeight={700}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) =>
                    `${Number(value).toFixed(0)}€`
                  }
                />

                <Recharts.Tooltip
                  contentStyle={{
                    background: "#0a0a0a",
                    border: "1px solid #171717",
                    borderRadius: 8,
                    boxShadow:
                      "0 20px 25px -5px rgba(0,0,0,.7)",
                  }}
                  itemStyle={{
                    fontSize: "11px",
                    fontWeight: 800,
                    color: "#22d3ee",
                  }}
                  labelStyle={{
                    fontSize: "10px",
                    fontWeight: 700,
                    color: "#525252",
                    marginBottom: "2px",
                  }}
                  labelFormatter={(_, payload) => {
                    const originalDate =
                      payload?.[0]?.payload?.date;

                    return originalDate
                      ? new Date(
                          originalDate
                        ).toLocaleDateString("fr-FR", {
                          day: "2-digit",
                          month: "long",
                          year: "numeric",
                        })
                      : "";
                  }}
                  formatter={(value) => [
                    formatPrice(Number(value)),
                    "Prix",
                  ]}
                />

                <Recharts.Line
                  type="monotone"
                  dataKey="price"
                  stroke="#22d3ee"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{
                    r: 4,
                    stroke: "#0a0a0a",
                    strokeWidth: 2,
                  }}
                  isAnimationActive
                  animationDuration={300}
                />
              </Recharts.LineChart>
            </Recharts.ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
