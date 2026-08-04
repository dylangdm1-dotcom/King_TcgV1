"use client";

import { useEffect, useState } from "react";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { getCollection } from "../../lib/storage";
import { getCardById } from "../../lib/pokemon";
import { getMarketData } from "../../lib/marketEngine";

export default function PortfolioChart() {
  const [totalValue, setTotalValue] = useState(0);
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    async function calculatePortfolio() {
      try {
        const collection = getCollection() || {};
        const ids = Object.keys(collection);
        
        let sum = 0;
        for (const id of ids) {
          const card = await getCardById(id);
          if (card) {
            const market = getMarketData(card);
            sum += market.average || 0;
          }
        }

        setTotalValue(sum);
        setData([
          { day: "Lun", value: sum * 0.95 },
          { day: "Mar", value: sum * 0.96 },
          { day: "Mer", value: sum * 0.97 },
          { day: "Jeu", value: sum * 0.98 },
          { day: "Ven", value: sum * 0.99 },
          { day: "Sam", value: sum * 0.995 },
          { day: "Auj", value: sum },
        ]);
      } catch (error) {
        console.error("Erreur calcul graphique portefeuille :", error);
      }
    }
    calculatePortfolio();
  }, []);

  const variation = data.length > 0 ? ((totalValue - data[0].value) / data[0].value) * 100 : 0;
  const isPositive = variation >= 0;

  return (
    <section className="rounded-xl border border-zinc-900 bg-neutral-950/40 p-5 sm:p-6">
      {/* En-tête Métriques */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-zinc-500">Courbe Prediction Investissement</p>
          <h2 className="mt-1 text-2xl sm:text-3xl font-black tracking-tight text-white tabular-nums">
            {totalValue.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
          </h2>
          <p className="mt-0.5 text-xs font-bold flex items-center gap-1">
            <span className={`tabular-nums ${isPositive ? "text-emerald-400" : "text-rose-400"}`}>
              {isPositive ? "+" : ""}{variation.toFixed(2)} %
            </span> 
            <span className="text-[10px] font-medium text-zinc-600 uppercase tracking-wide">(Glissement 7j)</span>
          </p>
        </div>
        <div className="self-start sm:self-center rounded border border-zinc-800 bg-neutral-950 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-zinc-400">
          Bénéfice Potentiel
        </div>
      </div>

      {/* Zone Graphique Technique */}
      <div className="w-full overflow-hidden rounded-lg bg-neutral-950/60 p-2 border border-zinc-900/50">
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={data} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
            <CartesianGrid stroke="#171717" strokeDasharray="3 3" vertical={false} />
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
              domain={['auto', 'auto']} 
              tickFormatter={(value) => `${value.toFixed(2)} €`}
            />
            <Tooltip 
              contentStyle={{ 
                background: "#0a0a0a", 
                border: "1px solid #171717", 
                borderRadius: 8 
              }} 
              itemStyle={{ fontSize: "11px", fontWeight: 700, color: "#fff" }}
              labelStyle={{ fontSize: "10px", fontWeight: 800, color: "#a1a1aa", textTransform: "uppercase" }}
            />
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke="#22d3ee" 
              strokeWidth={2} 
              dot={false} 
              activeDot={{ r: 4, strokeWidth: 0, fill: "#22d3ee" }} 
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}