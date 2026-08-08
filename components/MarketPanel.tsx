"use client";

import { Crown, RefreshCw, ShoppingCart } from "lucide-react";
import MarketSourceBadge, { type MarketSource } from "@/components/market/MarketSourceBadge";

const euro = (value: number) => (value > 0 ? `${value.toFixed(2)} €` : "—");

type Props = {
  cardmarket?: number | null;
  ebay?: number | null;
  ebayKind?: "active_median" | "last_sold" | null;
  ebaySampleSize?: number | null;
  tcgplayer?: number | null;
  justtcg?: number | null;
  average?: number | null;
  spread?: number | null;
  onRefresh?: () => void;
};

export default function MarketPanel({
  cardmarket = 0,
  ebay = 0,
  ebayKind = null,
  ebaySampleSize = 0,
  tcgplayer = 0,
  justtcg = 0,
  average = 0,
  spread = 0,
  onRefresh,
}: Props) {
  const sources = [
    { title: "Cardmarket", subtitle: "Référence européenne", source: "cardmarket" as MarketSource, value: cardmarket ?? 0 },
    { title: "TCGPlayer", subtitle: "Prix Market", source: "tcgplayer" as MarketSource, value: tcgplayer ?? 0 },
    { title: "JustTCG", subtitle: "Médiane Near Mint", source: "justtcg" as MarketSource, value: justtcg ?? 0 },
    { title: ebayKind === "last_sold" ? "eBay · dernière vente réussie" : "eBay · annonces actives", subtitle: ebayKind === "last_sold" ? "Dernière transaction comparable" : `Médiane de ${ebaySampleSize || 0} annonce(s) comparable(s)`, source: "ebay" as MarketSource, value: ebay ?? 0 },
  ];

  return (
    <div className="space-y-2.5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="kt-section-label">
            <ShoppingCart className="h-4 w-4 text-emerald-300" />
            Marchés disponibles
          </div>
          <p className="mt-1 max-w-xl text-[10px] font-medium leading-4 text-zinc-400">
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

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {sources.map((item) => (
          <div key={item.title} className="rounded-[14px] border border-white/[0.09] bg-[#1b232e] px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,.035)] transition duration-200 hover:-translate-y-0.5 hover:border-white/[0.14]">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-zinc-300">{item.title}</p>
                <p className="mt-0.5 min-h-0 text-[8px] font-medium leading-3 text-zinc-500">{item.subtitle}</p>
              </div>
              <MarketSourceBadge source={item.source} compact />
            </div>
            <p className="mt-1.5 text-base font-black tracking-tight text-white tabular-nums">{euro(item.value)}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-[1.35fr_.65fr]">
        <div className="relative overflow-hidden rounded-[17px] border border-cyan-300/18 bg-[linear-gradient(135deg,rgba(34,211,238,.10),rgba(21,29,39,.96)_48%)] p-3">
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
          <p className="relative mt-2 text-xl font-black tracking-[-0.035em] text-white tabular-nums">{euro(average ?? 0)}</p>
        </div>

        <div className="rounded-[20px] border border-white/[0.09] bg-[#181f29] p-3">
          <p className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">Écart marchés</p>
          <p className="mt-1 text-[10px] leading-4 text-zinc-500">Amplitude entre les cotations disponibles.</p>
          <p className="mt-2 text-lg font-black text-white tabular-nums">{(spread ?? 0) > 0 ? "+" : ""}{(spread ?? 0).toFixed(2)} €</p>
        </div>
      </div>
    </div>
  );
}
