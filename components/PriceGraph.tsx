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
import type { PokemonCard } from "../lib/types";
import { getCardmarketEuropePrice } from "../lib/marketEngine";

type Props = { card: PokemonCard };

type CardmarketPoint = {
  label: string;
  price: number;
};

function positive(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Number(parsed.toFixed(2)) : 0;
}

export default function PriceGraph({ card }: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const data = useMemo<CardmarketPoint[]>(() => {
    const prices = card.cardmarket?.prices;
    if (!prices) return [];

    const current = getCardmarketEuropePrice(card);
    const points = [
      { label: "Moy. 30 j", price: positive(prices.avg30) },
      { label: "Moy. 7 j", price: positive(prices.avg7) },
      { label: "Moy. 1 j", price: positive(prices.avg1) },
      { label: "Actuel", price: current },
    ];

    return points.filter((point) => point.price > 0);
  }, [card]);

  const summary = useMemo(() => {
    if (!data.length) return null;
    const values = data.map((point) => point.price);
    const first = values[0];
    const last = values[values.length - 1];
    return {
      low: Math.min(...values),
      high: Math.max(...values),
      change: first > 0 ? ((last - first) / first) * 100 : 0,
    };
  }, [data]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.14em] text-white">
            <BarChart3 className="h-4 w-4 text-sky-200" />
            Historique du marché européen — Cardmarket
          </h2>
          <p className="max-w-xl text-[11px] font-medium leading-5 text-zinc-400">
            Repères Cardmarket Europe à 30, 7 et 1 jour, suivis de la valeur actuelle. Ils peuvent agréger plusieurs langues et ne constituent pas une cote exclusivement française.
          </p>
        </div>

        <span className="rounded-full bg-sky-300/[0.07] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.11em] text-sky-200">
          Source : Cardmarket Europe
        </span>
      </div>

      {summary ? (
        <div className="kt-chart-insights kt-history-insights">
          <div className="kt-chart-insight">
            <p className="kt-label">Repère bas</p>
            <p className="mt-1 text-[12px] font-black tabular-nums text-rose-300">{summary.low.toFixed(2)} €</p>
          </div>
          <div className="kt-chart-insight">
            <p className="kt-label">Repère haut</p>
            <p className="mt-1 text-[12px] font-black tabular-nums text-emerald-300">{summary.high.toFixed(2)} €</p>
          </div>
          <div className="kt-chart-insight">
            <p className="kt-label">Écart 30 j → actuel</p>
            <p className={`mt-1 text-[12px] font-black tabular-nums ${summary.change >= 0 ? "text-cyan-300" : "text-rose-300"}`}>{summary.change >= 0 ? "+" : ""}{summary.change.toFixed(1)} %</p>
          </div>
        </div>
      ) : null}

      <div className="kt-chart-canvas rounded-[18px] border p-3">
        <div className="flex h-[240px] w-full items-center justify-center sm:h-[280px]">
          {!mounted ? (
            <div className="flex items-center gap-2 text-[11px] font-bold text-zinc-500">
              <Activity className="h-3.5 w-3.5 animate-pulse text-cyan-500" />
              Préparation du graphique…
            </div>
          ) : data.length < 2 ? (
            <div className="flex max-w-sm flex-col items-center justify-center gap-2 px-4 text-center text-zinc-500">
              <Info className="h-5 w-5 text-zinc-500" />
              <p className="text-xs font-medium">
                Cardmarket ne fournit pas encore assez de repères pour tracer cette courbe.
              </p>
              <p className="text-[10px] leading-4 text-zinc-500">
                La cote actuelle peut toutefois rester disponible dans le panneau Marché.
              </p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 12, right: 14, left: -18, bottom: 2 }}>
                <defs>
                  <linearGradient id="cardmarketArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7dd3fc" stopOpacity={0.34} />
                    <stop offset="62%" stopColor="#7dd3fc" stopOpacity={0.10} />
                    <stop offset="100%" stopColor="#7dd3fc" stopOpacity={0} />
                  </linearGradient>
                </defs>

                <CartesianGrid stroke="rgba(148,163,184,.10)" strokeDasharray="4 8" vertical={false} />
                <XAxis
                  dataKey="label"
                  stroke="#7f8b9d"
                  fontSize={10}
                  fontWeight={700}
                  tickLine={false}
                  axisLine={false}
                  dy={8}
                />
                <YAxis
                  domain={["auto", "auto"]}
                  stroke="#7f8b9d"
                  fontSize={10}
                  fontWeight={700}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value: number) => `${value}€`}
                />
                <Tooltip
                  contentStyle={{
                    background: "rgba(7,10,14,.98)",
                    border: "1px solid rgba(34,211,238,.18)",
                    borderRadius: 14,
                    boxShadow: "0 18px 44px rgba(0,0,0,.45)",
                  }}
                  itemStyle={{ color: "#7dd3fc", fontSize: 11, fontWeight: 800 }}
                  labelStyle={{ color: "#a1a1aa", fontSize: 10, fontWeight: 700 }}
                  formatter={(value: number | string) => [
                    `${Number(value).toFixed(2)} €`,
                    "Marché européen",
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="price"
                  stroke="#7dd3fc"
                  strokeWidth={3}
                  fill="url(#cardmarketArea)"
                  dot={{ r: 4, fill: "#071015", stroke: "#bae6fd", strokeWidth: 2.5 }}
                  activeDot={{ r: 6, fill: "#7dd3fc", stroke: "#08202a", strokeWidth: 3 }}
                  animationDuration={650}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="kt-info-note px-3.5 py-3 text-[10px] leading-4">
        Cette courbe relie uniquement les repères réellement fournis par Cardmarket. Elle ne représente ni des ventes quotidiennes ni un historique exclusivement français.
      </div>
    </div>
  );
}
