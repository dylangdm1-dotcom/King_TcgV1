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
      <div className="rounded-xl border border-zinc-900 bg-neutral-950/40 p-8 text-center text-xs font-bold text-zinc-500">
        Aucun historique d'actifs disponible pour cette référence.
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
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-zinc-400">
            <TrendingUp className="h-4 w-4 text-cyan-400" />
            Historique des transactions
          </h2>

          <div className="flex items-baseline gap-3 pt-1">
            <span className="tabular-nums text-2xl font-black text-white">
              {currentPrice.toFixed(2)} €
            </span>

            <span
              className={`text-xs font-black tabular-nums ${
                variation >= 0
                  ? "text-emerald-400"
                  : "text-rose-400"
              }`}
            >
              {variation >= 0 ? "+" : ""}
              {variation.toFixed(2)} %
            </span>
          </div>
        </div>

        {/* Choix période */}
        <div className="flex rounded-lg border border-zinc-900 bg-neutral-950/60 p-0.5">
          {periods.map((item) => (
            <button
              key={item.value}
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
                  stroke="#171717"
                  strokeDasharray="0 0"
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
                  formatter={(value: number | string) => [
                    `${Number(value).toFixed(2)} €`,
                    "Cotation",
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
                />
              </Recharts.LineChart>
            </Recharts.ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}