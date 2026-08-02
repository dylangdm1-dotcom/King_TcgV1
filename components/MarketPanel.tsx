// components/MarketPanel.tsx

"use client";

import {
  RefreshCw,
  ShoppingCart,
  Globe,
  Store,
  Scale,
} from "lucide-react";

type Props = {
  cardmarket?: number | null;
  ebay?: number | null;
  tcgplayer?: number | null;
  average?: number | null;
  spread?: number | null;
  onRefresh?: () => void;
  loading?: boolean;
};

export default function MarketPanel({
  cardmarket,
  ebay,
  tcgplayer,
  average,
  spread,
  onRefresh,
  loading = false,
}: Props) {
  /**
   * V5.0
   * --------------------------------------------------
   * Une absence de prix reste une absence de prix.
   * On n'affiche jamais 0 € comme prix réel.
   */

  const formatPrice = (value?: number | null) => {
    if (
      value === null ||
      value === undefined ||
      !Number.isFinite(value) ||
      value <= 0
    ) {
      return "—";
    }

    return `${value.toFixed(2)} €`;
  };

  const formatSpread = (value?: number | null) => {
    if (
      value === null ||
      value === undefined ||
      !Number.isFinite(value)
    ) {
      return "—";
    }

    if (value === 0) {
      return "0,00 €";
    }

    return `${value > 0 ? "+" : ""}${value.toFixed(2)} €`;
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-zinc-400">
            <ShoppingCart className="h-4 w-4 text-cyan-400" />
            Comparaison des places de marché
          </h2>

          <p className="mt-1 text-[10px] font-medium text-zinc-600">
            Prix disponibles par source — état Near Mint par défaut.
          </p>
        </div>

        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-neutral-900/50 px-3 py-1.5 text-xs font-bold text-zinc-300 transition-all duration-200 hover:bg-neutral-900 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 text-cyan-400 ${
                loading ? "animate-spin" : ""
              }`}
            />

            {loading ? "Actualisation..." : "Actualiser"}
          </button>
        )}
      </div>

      {/* Sources */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <MarketCard
          title="CardMarket"
          icon={<Store className="h-4 w-4 text-cyan-400" />}
          value={cardmarket}
        />

        <MarketCard
          title="TCGPlayer"
          icon={<Store className="h-4 w-4 text-cyan-400" />}
          value={tcgplayer}
        />

        <MarketCard
          title="eBay"
          icon={<Globe className="h-4 w-4 text-cyan-400" />}
          value={ebay}
        />

        <MarketCard
          title="Prix moyen réel"
          icon={<Scale className="h-4 w-4 text-cyan-400" />}
          value={average}
        />
      </div>

      {/* Spread */}
      <div className="glass-card flex items-center justify-between rounded-xl bg-neutral-950/40 p-4">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
            Spread global
          </span>

          <span className="text-[10px] font-medium text-zinc-600">
            Écart entre les prix disponibles.
          </span>
        </div>

        <span
          className={`text-sm font-black tabular-nums ${
            spread !== null &&
            spread !== undefined &&
            Number.isFinite(spread) &&
            spread > 0
              ? "text-cyan-400"
              : "text-white"
          }`}
        >
          {formatSpread(spread)}
        </span>
      </div>
    </div>
  );
}

type MarketCardProps = {
  title: string;
  icon: React.ReactNode;
  value?: number | null;
};

function MarketCard({
  title,
  icon,
  value,
}: MarketCardProps) {
  const hasPrice =
    value !== null &&
    value !== undefined &&
    Number.isFinite(value) &&
    value > 0;

  return (
    <div className="glass-card flex min-h-[95px] flex-col justify-between rounded-xl bg-neutral-950/40 p-4 transition-colors duration-200 hover:border-zinc-800">
      <div className="flex items-start justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
          {title}
        </span>

        {icon}
      </div>

      <p
        className={`mt-3 text-lg font-black tabular-nums ${
          hasPrice ? "text-white" : "text-zinc-600"
        }`}
      >
        {hasPrice ? `${value.toFixed(2)} €` : "—"}
      </p>
    </div>
  );
}
