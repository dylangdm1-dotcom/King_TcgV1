"use client";

import { useState, useMemo, useEffect } from "react";
import { BarChart3, Activity } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";
import { getMarketHistoryDays, formatHistoryForGraph, type PricePoint } from "../lib/priceHistory";

type Props = { cardId: string };

export default function PriceGraph({ cardId }: Props) {
  const [range, setRange] = useState<7 | 30 | 90>(30);
  const [mounted, setMounted] = useState(false);

  // Évite les conflits d'hydratation/dimensions Recharts avec le SSR de Next.js
  useEffect(() => {
    setMounted(true);
  }, []);

  const history: PricePoint[] = useMemo(() => getMarketHistoryDays(cardId, range), [cardId, range]);
  const data = useMemo(() => formatHistoryForGraph(history), [history]);

  return (
    <div className="space-y-6">
      {/* En-tête avec les filtres temporels */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-cyan-400" /> Analyse de marché globale
          </h2>
          <p className="text-[11px] font-medium text-zinc-500">
            Évolution multi-plateformes et volume de référence
          </p>
        </div>

        {/* Sélecteur de range épuré */}
        <div className="flex rounded-lg border border-zinc-900 bg-neutral-950/60 p-0.5">
          {([7, 30, 90] as const).map((day) => (
            <button
              key={day}
              onClick={() => setRange(day)}
              className={`px-3 py-1 rounded-md text-[11px] font-black transition-all duration-150 cursor-pointer ${
                range === day 
                  ? "bg-zinc-900 text-cyan-400" 
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {day}J
            </button>
          ))}
        </div>
      </div>

      {/* Zone du graphique Area */}
      <div className="rounded-xl border border-zinc-900 bg-neutral-950/20 p-2">
        <div className="h-[280px] w-full flex items-center justify-center">
          {!mounted ? (
            <div className="text-[11px] font-bold text-zinc-600 flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 animate-pulse text-cyan-500" /> Indexation...
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAvg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.06} />
                    <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                  </linearGradient>
                </defs>
                
                <CartesianGrid strokeDasharray="0 0" stroke="#171717" vertical={false} />
                
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
                  tickFormatter={(v) => `${v}€`} 
                />
                
                <Tooltip
                  contentStyle={{ 
                    background: "#0a0a0a", 
                    border: "1px solid #171717", 
                    borderRadius: 8,
                    boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.7)"
                  }}
                  itemStyle={{ fontSize: "11px", fontWeight: 800, color: "#22d3ee" }}
                  labelStyle={{ fontSize: "10px", fontWeight: 700, color: "#525252", marginBottom: "2px" }}
                  formatter={(value: number) => [`${value.toFixed(2)} €`, "Prix Moyen"]}
                />
                
                <Area 
                  type="monotone" 
                  dataKey="average" 
                  stroke="#22d3ee" 
                  strokeWidth={2} 
                  fill="url(#colorAvg)" 
                  animationDuration={300}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}