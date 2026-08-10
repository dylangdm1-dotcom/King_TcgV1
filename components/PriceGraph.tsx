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

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.14em] text-white">
            <BarChart3 className="h-4 w-4 text-sky-200" />
            Historique du marché européen — Cardmarket
          </h2>
          <p className="max-w-xl text-[11px] font-medium leading-5 text-zinc-500">
            Évolution des repères Cardmarket européens sur 30, 7 et 1 jour, puis tendance actuelle. Ces données peuvent regrouper plusieurs langues et ne représentent pas exclusivement la cote française.
          </p>
        </div>

        <span className="rounded-full border border-sky-300/15 bg-sky-300/[0.06] px-3 py-1 text-[9px] font-black uppercase tracking-widest text-sky-200">
          Source : Cardmarket Europe
        </span>
      </div>

      <div className="rounded-[20px] border border-white/[0.09] bg-[linear-gradient(180deg,#1a222c,#131923)] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,.035),0_18px_45px_rgba(0,0,0,.22)]">
        <div className="flex h-[280px] w-full items-center justify-center">
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
                  stroke="#525252"
                  fontSize={10}
                  fontWeight={700}
                  tickLine={false}
                  axisLine={false}
                  dy={8}
                />
                <YAxis
                  domain={["auto", "auto"]}
                  stroke="#525252"
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
                  strokeWidth={4}
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

      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-3 text-[10px] leading-4 text-zinc-500">
        La courbe relie uniquement les moyennes et la tendance européennes réellement fournies. Elle ne représente ni un historique quotidien complet ni un historique exclusivement français.
      </div>
    </div>
  );
}