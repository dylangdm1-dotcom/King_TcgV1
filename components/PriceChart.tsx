"use client";

import { useState, useEffect } from "react";
import { TrendingUp, Activity } from "lucide-react";
import * as Recharts from "recharts";

type PricePoint = {
  date: string;
  price: number;
  origin?: "observed" | "reconstructed";
};

type Props = {
  history: PricePoint[];
};

const periods = [
  { label: "24H", value: 1 },
  { label: "7J", value: 7 },
  { label: "30J", value: 30 },
  { label: "90J", value: 90 },
];

export default function PriceChart({ history }: Props) {
  const [period, setPeriod] = useState(7);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!history || history.length === 0) {
    return (
      <div className="kt-empty-state rounded-[16px] px-5 py-8 text-center text-[11px] font-semibold leading-5">
        Aucun historique King_TCG disponible pour le moment. Les points apparaîtront après les prochaines synchronisations de cette carte.
      </div>
    );
  }

  const filteredHistory = history.slice(-period);
  const isReconstructed = filteredHistory.some((point) => point.origin === "reconstructed");

  const currentPrice =
    filteredHistory[filteredHistory.length - 1]?.price ?? 0;

  const startPrice =
    filteredHistory[0]?.price ?? currentPrice;

  const variation =
    startPrice > 0
      ? ((currentPrice - startPrice) / startPrice) * 100
      : 0;

  const lowestPrice = Math.min(...filteredHistory.map((point) => point.price));
  const highestPrice = Math.max(...filteredHistory.map((point) => point.price));
  const amplitude = Math.max(0, highestPrice - lowestPrice);
  const averagePrice = filteredHistory.reduce((sum, point) => sum + point.price, 0) / filteredHistory.length;

  return (
    <div className="space-y-4">
      {/* En-tête */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.14em] text-white">
            <TrendingUp className="h-4 w-4 text-cyan-400" />
            Historique King_TCG
          </h2>
          <p className="max-w-lg text-[10px] font-medium leading-4 text-zinc-400">
            {isReconstructed
              ? "Courbe indicative reconstruite depuis les repères fournisseur : ce ne sont ni des ventes ni des relevés quotidiens."
              : "Évolution des relevés King_TCG enregistrés pour cette carte. Ces points ne représentent pas nécessairement des ventes."}
          </p>

          <div className="flex items-baseline gap-3 pt-1">
            <span className="tabular-nums text-2xl font-black text-white">
              {currentPrice.toFixed(2)} €
            </span>

            <span
              className={`text-xs font-black tabular-nums ${
                variation >= 0
                  ? "text-cyan-300"
                  : "text-rose-400"
              }`}
            >
              {variation >= 0 ? "+" : ""}
              {variation.toFixed(2)} %
            </span>
          </div>
        </div>

        {/* Choix période */}
        <div className="kt-segmented-control flex rounded-xl border p-1">
          {periods.map((item) => (
            <button
              key={item.value}
              onClick={() => setPeriod(item.value)}
              className={`cursor-pointer rounded-md px-3 py-1 text-[11px] font-black transition-all duration-150 ${
                period === item.value
                  ? "bg-cyan-400/[0.12] text-cyan-200 shadow-sm"
                  : "text-zinc-400 hover:bg-white/[0.03] hover:text-white"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="kt-chart-insights kt-history-insights">
        <div className="kt-chart-insight kt-history-info-outline">
          <p className="kt-label">Point bas</p>
          <p className="mt-1 text-[12px] font-black tabular-nums text-rose-300">{lowestPrice.toFixed(2)} €</p>
        </div>
        <div className="kt-chart-insight kt-history-info-outline">
          <p className="kt-label">Point haut</p>
          <p className="mt-1 text-[12px] font-black tabular-nums text-emerald-300">{highestPrice.toFixed(2)} €</p>
        </div>
        <div className="kt-chart-insight kt-history-info-outline">
          <p className="kt-label">Amplitude</p>
          <p className="mt-1 text-[12px] font-black tabular-nums text-cyan-300">{amplitude.toFixed(2)} €</p>
        </div>
      </div>

      {isReconstructed ? (
        <div className="rounded-xl border border-amber-300/18 bg-amber-300/[0.04] px-3 py-2 text-[10px] font-semibold leading-4 text-amber-100">
          Historique reconstruit · exclu du calcul de couverture et de confiance.
        </div>
      ) : null}

      {/* Graphique */}
      <div className="kt-chart-canvas kt-history-chart rounded-[18px] border p-3">
        <div className="flex h-[240px] w-full items-center justify-center sm:h-[280px]">
          {!mounted ? (
            <div className="flex items-center gap-2 text-[11px] font-bold text-zinc-200">
              <Activity className="h-3.5 w-3.5 animate-pulse text-cyan-500" />
              Indexation...
            </div>
          ) : (
            <Recharts.ResponsiveContainer width="100%" height="100%">
              <Recharts.ComposedChart
                data={filteredHistory}
                margin={{
                  top: 10,
                  right: 10,
                  left: -25,
                  bottom: 0,
                }}
              >
                <defs>
                  <linearGradient id="kingTcgHistoryArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.3} />
                    <stop offset="70%" stopColor="#0ea5e9" stopOpacity={0.06} />
                    <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Recharts.CartesianGrid
                  stroke="rgba(148,163,184,.10)"
                  strokeDasharray="4 8"
                  vertical={false}
                />

                <Recharts.XAxis
                  dataKey="date"
                  stroke="#7f8b9d"
                  fontSize={10}
                  fontWeight={700}
                  tickLine={false}
                  axisLine={false}
                  dy={8}
                />

                <Recharts.YAxis
                  domain={["auto", "auto"]}
                  stroke="#7f8b9d"
                  fontSize={10}
                  fontWeight={700}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${value}€`}
                />

                <Recharts.Tooltip
                  contentStyle={{
                    background: "rgba(7,10,14,.98)",
                    border: "1px solid rgba(34,211,238,.18)",
                    borderRadius: 14,
                    boxShadow:
                      "0 20px 48px rgba(0,0,0,.55)",
                  }}
                  itemStyle={{
                    fontSize: "11px",
                    fontWeight: 800,
                    color: "#67e8f9",
                  }}
                  labelStyle={{
                    fontSize: "10px",
                    fontWeight: 700,
                    color: "#a6b0bf",
                    marginBottom: "2px",
                  }}
                  formatter={(value: number | string) => [
                    `${Number(value).toFixed(2)} €`,
                    "Cotation",
                  ]}
                />

                <Recharts.ReferenceLine
                  y={averagePrice}
                  stroke="rgba(245,196,81,.48)"
                  strokeDasharray="5 6"
                  label={{ value: "Moy.", position: "insideTopRight", fill: "#f5c451", fontSize: 9, fontWeight: 800 }}
                />

                <Recharts.Area
                  type="monotone"
                  dataKey="price"
                  stroke="#22d3ee"
                  strokeWidth={1.5}
                  fill="url(#kingTcgHistoryArea)"
                  dot={false}
                  animationDuration={650}
                />
                <Recharts.Line
                  type="monotone"
                  dataKey="price"
                  stroke="#67e8f9"
                  strokeWidth={3}
                  dot={{ r: 2.5, fill: "#07131a", stroke: "#67e8f9", strokeWidth: 1.5 }}
                  activeDot={{
                    r: 6,
                    fill: "#67e8f9",
                    stroke: "#07131a",
                    strokeWidth: 3,
                  }}
                  animationDuration={650}
                />
              </Recharts.ComposedChart>
            </Recharts.ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
