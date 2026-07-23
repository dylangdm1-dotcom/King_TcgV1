"use client";

import { RefreshCw, ShoppingCart, Globe, Store, Scale } from "lucide-react";

type Props = {
  cardmarket: number;
  ebay: number;
  tcgplayer: number;
  average: number;
  spread: number;
  onRefresh: () => void;
};

export default function MarketPanel({
  cardmarket = 0,
  ebay = 0,
  tcgplayer = 0,
  average = 0,
  spread = 0,
  onRefresh,
}: Props) {
  return (
    <div className="space-y-6">
      {/* En-tête épuré */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-cyan-400" /> Comparaison des places de marché
          </h2>
        </div>

        <button
          onClick={onRefresh}
          className="rounded-xl border border-zinc-800 bg-neutral-900/50 hover:bg-neutral-900 px-3 py-1.5 text-xs font-bold text-zinc-300 transition-all duration-200 flex items-center gap-1.5 active:scale-95"
        >
          <RefreshCw className="w-3.5 h-3.5 text-cyan-400" /> Actualiser
        </button>
      </div>

      {/* Grille des plateformes */}
      <div className="grid gap-4 grid-cols-2">
        <MarketCard title="CardMarket" icon={<Store className="w-4 h-4 text-cyan-400" />} value={cardmarket} />
        <MarketCard title="TCGPlayer" icon={<Store className="w-4 h-4 text-cyan-400" />} value={tcgplayer} />
        <MarketCard title="eBay" icon={<Globe className="w-4 h-4 text-cyan-400" />} value={ebay} />
        <MarketCard title="Prix moyen" icon={<Scale className="w-4 h-4 text-cyan-400" />} value={average} />
      </div>

      {/* Spread Marché */}
      <div className="glass-card bg-neutral-950/40 rounded-xl p-4 flex items-center justify-between">
        <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Spread global</span>
        <span className="text-sm font-black text-white tabular-nums">
          {spread > 0 ? "+" : ""}
          {spread.toFixed(2)} €
        </span>
      </div>
    </div>
  );
}

type MarketCardProps = {
  title: string;
  icon: React.ReactNode;
  value: number;
};

function MarketCard({ title, icon, value }: MarketCardProps) {
  return (
    <div className="glass-card bg-neutral-950/40 rounded-xl p-4 flex flex-col justify-between min-h-[95px] transition-colors duration-200 hover:border-zinc-800">
      <div className="flex justify-between items-start">
        <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">{title}</span>
        {icon}
      </div>

      <p className="mt-3 text-lg font-black text-white tabular-nums">
        {value > 0 ? `${value.toFixed(2)} €` : "—"}
      </p>
    </div>
  );
}