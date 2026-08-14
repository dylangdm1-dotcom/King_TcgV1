"use client";

import { useEffect, useState } from "react";
import { getCollection } from "../../lib/storage";
import { getCardById } from "../../lib/pokemon";
import { getMarketData } from "../../lib/marketEngine";
import { TrendingUp } from "lucide-react";

type MoverCard = {
  name: string;
  price: string;
  gain: string;
  trendValue: number;
  period: "7 j" | "30 j";
};

export default function TopMovers() {
  const [topCards, setTopCards] = useState<MoverCard[]>([]);

  useEffect(() => {
    async function fetchData() {
      const collection = getCollection();
      const ids = Object.keys(collection);

      const data = await Promise.all(
        ids.map(async (id) => {
          const card = await getCardById(id);
          if (!card) return null;
          
          const market = getMarketData(card);
          const trendValue = market.priceTrend30d || market.priceTrend7d || 0;
          if (!(trendValue > 0)) return null;
          const period = market.priceTrend30d ? "30 j" : "7 j";

          return {
            name: card.name,
            price: `${market.average.toFixed(2)} €`,
            gain: `+${trendValue.toFixed(1)} %`,
            trendValue,
            period,
          };
        })
      );

      const sorted = data
        .filter((item): item is MoverCard => item !== null)
        .sort((a, b) => b.trendValue - a.trendValue)
        .slice(0, 3);

      setTopCards(sorted);
    }

    fetchData();
  }, []);

  return (
    <section className="rounded-xl border border-white/[0.08] bg-[#111821]/85 p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-4 h-4 text-cyan-400" />
        <h2 className="text-xs font-black uppercase tracking-widest text-zinc-400">
          Top Performances
        </h2>
      </div>

      <div className="space-y-2">
        {topCards.length > 0 ? (
          topCards.map((card) => (
            <div
              key={card.name}
              className="flex items-center justify-between rounded-lg border border-white/[0.08]/60 bg-neutral-950/50 p-3 transition-colors duration-200 hover:border-cyan-500/20 hover:bg-neutral-950/80"
            >
              <div className="min-w-0 flex-1 pr-3">
                <div className="font-bold text-white text-xs truncate">{card.name}</div>
                <div className="text-[10px] text-zinc-500 font-medium mt-0.5 tabular-nums">Cours : {card.price} · tendance {card.period}</div>
              </div>
              <div className="font-black text-emerald-400 text-[10px] uppercase tracking-wider bg-emerald-500/5 border border-emerald-500/10 px-2 py-0.5 rounded tabular-nums shrink-0">
                {card.gain}
              </div>
            </div>
          ))
        ) : (
          <p className="text-zinc-500 font-bold text-[11px] py-1 italic">Aucune fluctuation d&apos;actif à signaler.</p>
        )}
      </div>
    </section>
  );
}
