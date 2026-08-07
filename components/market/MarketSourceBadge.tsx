"use client";

export type MarketSource = "cardmarket" | "tcgplayer" | "ebay" | "pricecharting";

type SourceItem = {
  label: string;
  logo?: string;
  logoClassName?: string;
  fallback?: string;
  className: string;
};

const sourceMap: Record<MarketSource, SourceItem> = {
  cardmarket: {
    label: "Cardmarket",
    logo: "/marketplaces/cardmarket.png",
    logoClassName: "h-4 w-auto max-w-[76px] object-contain",
    className: "border-sky-300/20 bg-sky-300/[0.07] text-sky-100",
  },
  tcgplayer: {
    label: "TCGPlayer",
    logo: "/marketplaces/tcgplayer.svg",
    logoClassName: "h-4 w-auto max-w-[70px] object-contain",
    className: "border-violet-300/20 bg-violet-300/[0.07] text-violet-100",
  },
  ebay: {
    label: "eBay",
    logo: "/marketplaces/ebay.svg",
    logoClassName: "h-4 w-auto max-w-[48px] object-contain",
    className: "border-amber-300/20 bg-white/[0.94] text-zinc-900",
  },
  pricecharting: {
    label: "PriceCharting",
    fallback: "PriceCharting",
    className: "border-emerald-300/20 bg-emerald-300/[0.07] text-emerald-100",
  },
};

export default function MarketSourceBadge({ source, compact = false }: { source: MarketSource; compact?: boolean }) {
  const item = sourceMap[source];

  return (
    <span
      className={`inline-flex min-h-9 items-center justify-center gap-2 rounded-xl border px-2.5 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,.05)] ${item.className}`}
      aria-label={item.label}
      title={`${item.label} — marque appartenant à son propriétaire`}
    >
      {item.logo ? (
        <img src={item.logo} alt="" aria-hidden="true" className={item.logoClassName} />
      ) : (
        <span className="text-[9px] font-black tracking-[-0.02em]">{item.fallback}</span>
      )}
      {!compact ? <span className="sr-only">{item.label}</span> : null}
    </span>
  );
}
