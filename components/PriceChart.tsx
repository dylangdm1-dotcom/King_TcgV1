"use client";

import { useState, useEffect } from "react";
import { TrendingUp, Activity } from "lucide-react";
import * as Recharts from "recharts";

type PricePoint = {
  date: string;
  price: number;
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
  const [period, setPeriod] = useState(30);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!history || history.length === 0) {
    return (
      <div className="kt-premium-card rounded-[22px] p-8 text-center text-xs font-bold text-zinc-500">
        Aucun historique local disponible. Il se construira au fil des consultations et synchronisations de cette carte.
      </div>
    );
  }

  const filteredHistory = history.slice(-period);

  const currentPrice =
    filteredHistory[filteredHistory.length - 1]?.price ?? 0;

  const startPrice =
    filteredHistory[0]?.price ?? currentPrice;

  const variation =
    startPrice > 0
      ? ((currentPrice - startPrice) / startPrice) * 100
      : 0;

  return (
    <div className="kt-premium-card space-y-4 p-4 sm:p-5">
      {/* En-tête */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.14em] text-white">
            <TrendingUp className="h-4 w-4 text-cyan-400" />
            Historique King_TCG local
          </h2>
          <p className="max-w-lg text-[10px] font-medium leading-4 text-zinc-500">
            Suivi enregistré sur cet appareil lors des consultations. Ce graphique ne représente pas une liste de ventes Cardmarket.
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
        <div className="flex rounded-xl border border-white/[0.08] bg-black/25 p-1">
          {periods.map((item) => (
            <button
              key={item.value}
              onClick={() => setPeriod(item.value)}
              className={`cursor-pointer rounded-md px-3 py-1 text-[11px] font-black transition-all duration-150 ${
                period === item.value
                  ? "bg-white/[0.09] text-white shadow-sm"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Graphique */}
      <div className="rounded-[20px] border border-white/[0.09] bg-[linear-gradient(180deg,#1a222c,#131923)] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,.035),0_18px_45px_rgba(0,0,0,.22)]">
        <div className="flex h-[280px] w-full items-center justify-center">
          {!mounted ? (
            <div className="flex items-center gap-2 text-[11px] font-bold text-zinc-500">
              <Activity className="h-3.5 w-3.5 animate-pulse text-cyan-500" />
              Indexation...
            </div>
          ) : (
            <Recharts.ResponsiveContainer width="100%" height="100%">
              <Recharts.LineChart
                data={filteredHistory}
                margin={{
                  top: 10,
                  right: 10,
                  left: -25,
                  bottom: 0,
                }}
              >
                <Recharts.CartesianGrid
                  stroke="rgba(148,163,184,.10)"
                  strokeDasharray="4 8"
                  vertical={false}
                />

                <Recharts.XAxis
                  dataKey="date"
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
                    color: "#525252",
                    marginBottom: "2px",
                  }}
                  formatter={(value: number | string) => [
                    `${Number(value).toFixed(2)} €`,
                    "Cotation",
                  ]}
                />

                <Recharts.Line
                  type="monotone"
                  dataKey="price"
                  stroke="#22d3ee"
                  strokeWidth={4}
                  dot={false}
                  activeDot={{
                    r: 6,
                    fill: "#22d3ee",
                    stroke: "#07131a",
                    strokeWidth: 3,
                  }}
                  animationDuration={650}
                />
              </Recharts.LineChart>
            </Recharts.ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}