"use client";

export type MarketSource = "cardmarket" | "tcgplayer" | "ebay" | "pricecharting";

const sourceMap: Record<MarketSource, { label: string; short: string; className: string }> = {
  cardmarket: {
    label: "Cardmarket",
    short: "CM",
    className: "border-blue-400/20 bg-blue-400/[0.08] text-blue-200",
  },
  tcgplayer: {
    label: "TCGPlayer",
    short: "TCG",
    className: "border-violet-400/20 bg-violet-400/[0.08] text-violet-200",
  },
  ebay: {
    label: "eBay",
    short: "e",
    className: "border-amber-400/20 bg-amber-400/[0.08] text-amber-200",
  },
  pricecharting: {
    label: "PriceCharting",
    short: "PC",
    className: "border-emerald-400/20 bg-emerald-400/[0.08] text-emerald-200",
  },
};

export default function MarketSourceBadge({ source, compact = false }: { source: MarketSource; compact?: boolean }) {
  const item = sourceMap[source];

  return (
    <span className={`inline-flex items-center gap-2 rounded-xl border px-2.5 py-1.5 ${item.className}`} aria-label={item.label}>
      <span className="flex h-5 min-w-5 items-center justify-center rounded-md bg-black/25 px-1 text-[8px] font-black tracking-tight">
        {item.short}
      </span>
      {!compact ? <span className="text-[9px] font-black uppercase tracking-wider">{item.label}</span> : null}
    </span>
  );
}
