"use client";

import { Crown, RefreshCw, ShoppingCart } from "lucide-react";
import MarketSourceBadge, {
  type MarketSource,
} from "@/components/market/MarketSourceBadge";

const euro = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0
    ? `${parsed.toFixed(2)} €`
    : "—";
};

type Props = {
  cardmarket?: number | null;
  tcgplayer?: number | null;
  justtcg?: number | null;
  ebay?: number | null;
  average?: number | null;
  spread?: number | null;
  validSourceCount?: number;
  excludedSources?: string[];
  onRefresh?: () => void;
};

export default function MarketPanel({
  cardmarket = 0,
  tcgplayer = 0,
  justtcg = 0,
  ebay = 0,
  average = 0,
  spread = 0,
  validSourceCount = 0,
  excludedSources = [],
  onRefresh,
}: Props) {
  const sources = [
    {
      title: "Cardmarket",
      subtitle: "Tendance / moyenne",
      source: "cardmarket" as MarketSource,
      value: cardmarket,
    },
    {
      title: "TCGPlayer",
      subtitle: "Prix Market",
      source: "tcgplayer" as MarketSource,
      value: tcgplayer,
    },
    {
      title: "JustTCG",
      subtitle: "Médiane Near Mint",
      source: "justtcg" as MarketSource,
      value: justtcg,
    },
    {
      title: "eBay",
      subtitle: "Source réelle non configurée",
      source: "ebay" as MarketSource,
      value: ebay,
    },
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
            Chaque prix conserve sa vraie provenance. Les sources absentes ne
            sont jamais remplacées.
          </p>
        </div>

        {onRefresh ? (
          <button
            onClick={onRefresh}
            className="kt-secondary-button shrink-0 px-3 text-[11px]"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Actualiser</span>
          </button>
        ) : null}
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {sources.map((item) => (
          <div
            key={item.title}
            className="rounded-[14px] border border-white/[0.09] bg-[#1b232e] px-3 py-2.5"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-zinc-300">
                  {item.title}
                </p>
                <p className="mt-0.5 text-[8px] font-medium leading-3 text-zinc-500">
                  {item.subtitle}
                </p>
              </div>
              <MarketSourceBadge source={item.source} compact />
            </div>
            <p className="mt-1.5 text-base font-black tabular-nums text-white">
              {euro(item.value)}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-[1.35fr_.65fr]">
        <div className="relative overflow-hidden rounded-[17px] border border-cyan-300/18 bg-[linear-gradient(135deg,rgba(34,211,238,.10),rgba(21,29,39,.96)_48%)] p-3">
          <div className="relative flex items-start justify-between gap-3">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.16em] text-cyan-200/80">
                Cote King_TCG
              </p>
              <p className="mt-1 text-[11px] font-medium text-zinc-400">
                Moyenne de {validSourceCount} source
                {validSourceCount > 1 ? "s" : ""} valide
                {validSourceCount > 1 ? "s" : ""}.
              </p>
              {excludedSources.length ? (
                <p className="mt-1 text-[9px] font-bold text-amber-300">
                  Anomalie exclue : {excludedSources.join(", ")}
                </p>
              ) : null}
            </div>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cyan-200/18 bg-cyan-200/[0.08] text-cyan-200">
              <Crown className="h-4 w-4" />
            </span>
          </div>
          <p className="relative mt-2 text-xl font-black tabular-nums text-white">
            {euro(average)}
          </p>
        </div>

        <div className="rounded-[20px] border border-white/[0.09] bg-[#181f29] p-3">
          <p className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">
            Écart marchés
          </p>
          <p className="mt-2 text-lg font-black tabular-nums text-white">
            {Number(spread) > 0 ? "+" : ""}
            {Number.isFinite(Number(spread))
              ? Number(spread).toFixed(2)
              : "0.00"}{" "}
            €
          </p>
        </div>
      </div>
    </div>
  );
}
