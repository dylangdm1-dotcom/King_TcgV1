"use client";

import { useEffect, useState } from "react";
import { TrendingUp } from "lucide-react";
import { getCollection } from "@/lib/storage";
import { getCardById } from "@/lib/pokemon";
import {
  getMarketData,
} from "@/lib/marketEngine";
import {
  getMarketHistoryDays,
  getVariation,
} from "@/lib/priceHistory";

type MoverCard = {
  id: string;
  name: string;
  price: string;
  gain: string;
  growthValue: number;
};

export default function TopMovers() {
  const [topCards, setTopCards] = useState<MoverCard[]>([]);

  useEffect(() => {
    let mounted = true;

    async function fetchData() {
      try {
        const collection = getCollection();
        const ids = Object.keys(collection);

        const data = await Promise.all(
          ids.map(async (id) => {
            const card = await getCardById(id);

            if (!card) {
              return null;
            }

            const history = getMarketHistoryDays(id, 30);

            if (history.length < 2) {
              return null;
            }

            const variation = getVariation(history);
            const market = getMarketData(card);

            if (market.lowestPrice <= 0) {
              return null;
            }

            return {
              id,
              name: card.name,
              price: `${market.lowestPrice.toFixed(2)} €`,
              gain: `${variation >= 0 ? "+" : ""}${variation.toFixed(1)} %`,
              growthValue: variation,
            };
          })
        );

        const sorted = data
          .filter(
            (item): item is MoverCard =>
              item !== null
          )
          .sort(
            (a, b) =>
              b.growthValue -
              a.growthValue
          )
          .slice(0, 3);

        if (mounted) {
          setTopCards(sorted);
        }
      } catch (error) {
        console.error(
          "[King_TCG] Erreur TopMovers :",
          error
        );
      }
    }

    fetchData();

    return () => {
      mounted = false;
    };
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
          topCards.map((card) => {
            const positive = card.growthValue >= 0;

            return (
              <div
                key={card.id}
                className="flex items-center justify-between rounded-lg border border-zinc-900/60 bg-neutral-950/50 p-3 transition-colors duration-200 hover:border-cyan-500/20 hover:bg-neutral-950/80"
              >
                <div className="min-w-0 flex-1 pr-3">
                  <div className="font-bold text-white text-xs truncate">
                    {card.name}
                  </div>

                  <div className="text-[10px] text-zinc-500 font-medium mt-0.5 tabular-nums">
                    Cours : {card.price}
                  </div>
                </div>

                <div
                  className={`font-black text-[10px] uppercase tracking-wider px-2 py-0.5 rounded tabular-nums shrink-0 ${
                    positive
                      ? "text-emerald-400 bg-emerald-500/5 border border-emerald-500/10"
                      : "text-rose-400 bg-rose-500/5 border border-rose-500/10"
                  }`}
                >
                  {card.gain}
                </div>
              </div>
            );
          })
        ) : (
          <p className="text-zinc-600 font-bold text-[11px] py-1 italic">
            Historique réel insuffisant pour calculer les performances.
          </p>
        )}
      </div>
    </section>
  );
}