// components/PriceGraph.tsx

"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, BarChart3, Info } from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  getMarketHistoryDays,
  formatHistoryForGraph,
  type PricePoint,
} from "../lib/priceHistory";

type HistoryRange = 7 | 30 | 90;

type Props = {
  cardId: string;
};

const RANGES: HistoryRange[] = [7, 30, 90];

function formatEuro(value: unknown): string {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value <= 0
  ) {
    return "--";
  }

  return `${value.toFixed(2)} €`;
}

export default function PriceGraph({ cardId }: Props) {
  const [range, setRange] = useState<HistoryRange>(30);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const history: PricePoint[] = useMemo(() => {
    if (!cardId) return [];

    return getMarketHistoryDays(cardId, range);
  }, [cardId, range]);

  const data = useMemo(
    () => formatHistoryForGraph(history),
    [history]
  );

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-zinc-400">
            <BarChart3 className="h-4 w-4 text-cyan-400" />
            Historique des prix
          </h2>

          <p className="text-[11px] font-medium text-zinc-500">
            Évolution du prix moyen réellement enregistré
          </p>
        </div>

        {/* Période */}
        <div
          className="flex rounded-lg border border-zinc-900 bg-neutral-950/60 p-0.5"
          role="group"
          aria-label="Période de l'historique"
        >
          {RANGES.map((days) => {
            const active = range === days;

            return (
              <button
                key={days}
                type="button"
                onClick={() => setRange(days)}
                aria-pressed={active}
                className={`cursor-pointer rounded-md px-3 py-1 text-[11px] font-black transition-all duration-150 ${
                  active
                    ? "bg-zinc-900 text-cyan-400"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {days}J
              </button>
            );
          })}
        </div>
      </div>

      {/* Graphique */}
      <div className="rounded-xl border border-zinc-900 bg-neutral-950/20 p-2">
        <div className="flex h-[280px] w-full items-center justify-center">
          {!mounted ? (
            <div className="flex items-center gap-2 text-[11px] font-bold text-zinc-600">
              <Activity className="h-3.5 w-3.5 animate-pulse text-cyan-500" />
              Chargement de l'historique...
            </div>
          ) : data.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 px-4 text-center text-zinc-500">
              <Info className="h-5 w-5 text-zinc-600" />

              <p className="text-xs font-medium">
                Aucun historique disponible sur {range} jours.
              </p>

              <p className="max-w-md text-[10px] text-zinc-600">
                Les données apparaîtront automatiquement lorsque de vrais
                relevés de prix seront enregistrés.
              </p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={data}
                margin={{
                  top: 10,
                  right: 10,
                  left: -20,
                  bottom: 0,
                }}
              >
                <defs>
                  <linearGradient
                    id="kingTcgPriceGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor="#22d3ee"
                      stopOpacity={0.15}
                    />
                    <stop
                      offset="95%"
                      stopColor="#22d3ee"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>

                <CartesianGrid
                  strokeDasharray="0 0"
                  stroke="#171717"
                  vertical={false}
                />

                <XAxis
                  dataKey="day"
                  stroke="#404040"
                  fontSize={10}
                  fontWeight={700}
                  tickLine={false}
                  axisLine={false}
                  dy={8}
                />

                <YAxis
                  stroke="#404040"
                  fontSize={10}
                  fontWeight={700}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value: number) =>
                    formatEuro(value)
                  }
                />

                <Tooltip
                  contentStyle={{
                    background: "#0a0a0a",
                    border: "1px solid #171717",
                    borderRadius: 8,
                    boxShadow:
                      "0 20px 25px -5px rgba(0, 0, 0, 0.7)",
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
                  formatter={(value: unknown) => [
                    formatEuro(value),
                    "Prix moyen",
                  ]}
                />

                <Area
                  type="monotone"
                  dataKey="average"
                  stroke="#22d3ee"
                  strokeWidth={2}
                  fill="url(#kingTcgPriceGradient)"
                  animationDuration={300}
                  connectNulls={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
