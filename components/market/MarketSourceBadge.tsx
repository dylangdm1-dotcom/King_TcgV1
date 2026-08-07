"use client";

export type MarketSource = "cardmarket" | "tcgplayer" | "ebay" | "pricecharting";

const sourceMap: Record<MarketSource, { label: string; monogram: string; className: string; markClassName: string }> = {
  cardmarket: {
    label: "Cardmarket",
    monogram: "CM",
    className: "border-sky-300/20 bg-sky-300/[0.07] text-sky-100",
    markClassName: "bg-sky-200 text-sky-950",
  },
  tcgplayer: {
    label: "TCGPlayer",
    monogram: "TCG",
    className: "border-violet-300/20 bg-violet-300/[0.07] text-violet-100",
    markClassName: "bg-violet-200 text-violet-950",
  },
  ebay: {
    label: "eBay",
    monogram: "e",
    className: "border-amber-300/20 bg-amber-300/[0.07] text-amber-100",
    markClassName: "bg-amber-200 text-amber-950",
  },
  pricecharting: {
    label: "PriceCharting",
    monogram: "PC",
    className: "border-emerald-300/20 bg-emerald-300/[0.07] text-emerald-100",
    markClassName: "bg-emerald-200 text-emerald-950",
  },
};

export default function MarketSourceBadge({ source, compact = false }: { source: MarketSource; compact?: boolean }) {
  const item = sourceMap[source];

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-xl border px-2 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,.05)] ${item.className}`}
      aria-label={item.label}
      title={item.label}
    >
      <span className={`flex h-6 min-w-6 items-center justify-center rounded-lg px-1.5 text-[8px] font-black tracking-[-0.04em] ${item.markClassName}`}>
        {item.monogram}
      </span>
      {!compact ? <span className="text-[9px] font-black uppercase tracking-[0.12em]">{item.label}</span> : null}
    </span>
  );
}
