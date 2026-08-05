"use client";

import {
  RefreshCw,
  ShoppingCart,
  Globe2,
  Store,
  Scale,
  BadgeEuro,
} from "lucide-react";

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
  const safeCardmarket = cardmarket ?? 0;
  const safeEbay = ebay ?? 0;
  const safeTcgplayer = tcgplayer ?? 0;
  const safeAverage = average ?? 0;
  const safeSpread = spread ?? 0;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="kt-section-label">
            <ShoppingCart className="h-4 w-4 text-cyan-400" />
            Cotations disponibles
          </div>
          <p className="mt-2 max-w-xl text-[11px] font-medium leading-5 text-zinc-500">
            Les valeurs sont affichées en référence Near Mint lorsque la source est disponible.
          </p>
        </div>

        {onRefresh ? (
          <button onClick={onRefresh} className="kt-secondary-button shrink-0 px-3 text-[11px]">
            <RefreshCw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Actualiser</span>
          </button>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <MarketCard
          title="Cardmarket"
          subtitle="Marché européen"
          icon={<Store className="h-4 w-4" />}
          value={safeCardmarket}
        />
        <MarketCard
          title="TCGPlayer"
          subtitle="Marché nord-américain"
          icon={<Globe2 className="h-4 w-4" />}
          value={safeTcgplayer}
        />
        <MarketCard
          title="eBay"
          subtitle="Annonces et ventes observées"
          icon={<BadgeEuro className="h-4 w-4" />}
          value={safeEbay}
        />
        <MarketCard
          title="Moyenne King_TCG"
          subtitle="Calculée sur les sources trouvées"
          icon={<Scale className="h-4 w-4" />}
          value={safeAverage}
          featured
        />
      </div>

      <div className="flex items-center justify-between rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
        <div>
          <span className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-600">
            Écart entre les marchés
          </span>
          <p className="mt-1 text-[10px] text-zinc-600">
            Différence observée entre les sources disponibles.
          </p>
        </div>
        <span className="text-base font-black text-white tabular-nums">
          {safeSpread > 0 ? "+" : ""}
          {safeSpread.toFixed(2)} €
        </span>
      </div>
    </div>
  );
}

type MarketCardProps = {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  value: number;
  featured?: boolean;
};

function MarketCard({ title, subtitle, icon, value, featured = false }: MarketCardProps) {
  return (
    <div className={`kt-market-source-card ${featured ? "kt-market-source-card-featured" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-500">
            {title}
          </p>
          <p className="mt-1 text-[10px] font-medium leading-4 text-zinc-600">
            {subtitle}
          </p>
        </div>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cyan-400/12 bg-cyan-400/[0.05] text-cyan-400">
          {icon}
        </span>
      </div>
      <p className="mt-5 text-2xl font-black tracking-tight text-white tabular-nums">
        {value > 0 ? `${value.toFixed(2)} €` : "—"}
      </p>
    </div>
  );
}
