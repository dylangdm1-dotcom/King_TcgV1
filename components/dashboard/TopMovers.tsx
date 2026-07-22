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
  growthValue: number;
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
          const rarityLower = card.rarity?.toLowerCase() || "";
          const rarityBoost = rarityLower.includes("ultra") || rarityLower.includes("secret") ? 12.5 : 4.2;
          const randomVariation = Math.random() * rarityBoost;

          return {
            name: card.name,
            price: `${market.average.toFixed(2)} €`,
            gain: `+${randomVariation.toFixed(1)} %`,
            growthValue: randomVariation
          };
        })
      );

      const sorted = data
        .filter((item): item is MoverCard => item !== null)
        .sort((a, b) => b.growthValue - a.growthValue)
        .slice(0, 3);

      setTopCards(sorted);
    }

    fetchData();
  }, []);

  return (
    <section className="rounded-xl border border-zinc-900 bg-neutral-950/40 p-4 sm:p-5">
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
              className="flex items-center justify-between rounded-lg border border-zinc-900/60 bg-neutral-950/50 p-3 transition-colors duration-200 hover:border-cyan-500/20 hover:bg-neutral-950/80"
            >
              <div className="min-w-0 flex-1 pr-3">
                <div className="font-bold text-white text-xs truncate">{card.name}</div>
                <div className="text-[10px] text-zinc-500 font-medium mt-0.5 tabular-nums">Cours : {card.price}</div>
              </div>
              <div className="font-black text-emerald-400 text-[10px] uppercase tracking-wider bg-emerald-500/5 border border-emerald-500/10 px-2 py-0.5 rounded tabular-nums shrink-0">
                {card.gain}
              </div>
            </div>
          ))
        ) : (
          <p className="text-zinc-600 font-bold text-[11px] py-1 italic">Aucune fluctuation d'actif à signaler.</p>
        )}
      </div>
    </section>
  );
}