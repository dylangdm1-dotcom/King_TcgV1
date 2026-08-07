"use client";

import { Crown, RefreshCw, ShoppingCart } from "lucide-react";
import MarketSourceBadge, { type MarketSource } from "@/components/market/MarketSourceBadge";

const euro = (value: number) => (value > 0 ? `${value.toFixed(2)} €` : "—");

type Props = {
  cardmarket?: number | null;
  ebay?: number | null;
  tcgplayer?: number | null;
  average?: number | null;
  spread?: number | null;
  onRefresh?: () => void;
};

export default function MarketPanel({
  cardmarket = 0,
  ebay = 0,
  tcgplayer = 0,
  average = 0,
  spread = 0,
  onRefresh,
}: Props) {
  const sources = [
    { title: "Cardmarket", subtitle: "Référence européenne", source: "cardmarket" as MarketSource, value: cardmarket ?? 0 },
    { title: "TCGPlayer", subtitle: "Référence nord-américaine", source: "tcgplayer" as MarketSource, value: tcgplayer ?? 0 },
    { title: "eBay", subtitle: "Ventes et annonces observées", source: "ebay" as MarketSource, value: ebay ?? 0 },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="kt-section-label">
            <ShoppingCart className="h-4 w-4 text-emerald-300" />
            Marchés disponibles
          </div>
          <p className="mt-2 max-w-xl text-[11px] font-medium leading-5 text-zinc-400">
            Comparaison des cotations Near Mint réellement disponibles pour cette édition.
          </p>
        </div>
        {onRefresh ? (
          <button onClick={onRefresh} className="kt-secondary-button shrink-0 px-3 text-[11px]">
            <RefreshCw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Actualiser</span>
          </button>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {sources.map((item) => (
          <div key={item.title} className="rounded-[18px] border border-white/[0.09] bg-[#1b232e] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,.035)] transition duration-200 hover:-translate-y-0.5 hover:border-white/[0.14]">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-zinc-300">{item.title}</p>
                <p className="mt-1 min-h-8 text-[10px] font-medium leading-4 text-zinc-500">{item.subtitle}</p>
              </div>
              <MarketSourceBadge source={item.source} compact />
            </div>
            <p className="mt-4 text-xl font-black tracking-tight text-white tabular-nums">{euro(item.value)}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-[1.35fr_.65fr]">
        <div className="relative overflow-hidden rounded-[20px] border border-cyan-300/18 bg-[linear-gradient(135deg,rgba(34,211,238,.10),rgba(21,29,39,.96)_48%)] p-5">
          <div className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-cyan-300/10 blur-3xl" />
          <div className="relative flex items-start justify-between gap-3">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.16em] text-cyan-200/80">Moyenne King_TCG</p>
              <p className="mt-1 text-[11px] font-medium text-zinc-400">Prix moyen calculé à partir des cotations disponibles pour cette carte.</p>
            </div>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cyan-200/18 bg-cyan-200/[0.08] text-cyan-200">
              <Crown className="h-4 w-4" />
            </span>
          </div>
          <p className="relative mt-5 text-3xl font-black tracking-[-0.035em] text-white tabular-nums">{euro(average ?? 0)}</p>
        </div>

        <div className="rounded-[20px] border border-white/[0.09] bg-[#181f29] p-5">
          <p className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">Écart marchés</p>
          <p className="mt-1 text-[10px] leading-4 text-zinc-500">Amplitude entre les cotations disponibles.</p>
          <p className="mt-5 text-2xl font-black text-white tabular-nums">{(spread ?? 0) > 0 ? "+" : ""}{(spread ?? 0).toFixed(2)} €</p>
        </div>
      </div>
    </div>
  );
}
