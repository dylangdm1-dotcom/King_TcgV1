"use client";

export type MarketSource = "cardmarket" | "tcgplayer" | "justtcg" | "pokewallet" | "ebay" | "pricecharting";

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
    className: "border-white/20 bg-white text-zinc-900",
  },
  tcgplayer: {
    label: "TCGPlayer",
    logo: "/marketplaces/tcgplayer.png",
    logoClassName: "h-4 w-auto max-w-[70px] object-contain",
    className: "border-white/20 bg-white text-zinc-900",
  },
  justtcg: {
    label: "JustTCG",
    logo: "/marketplaces/justtcg.png",
    logoClassName: "h-4 w-auto max-w-[70px] object-contain",
    className: "border-white/20 bg-white text-zinc-900",
  },
  pokewallet: { label: "PokéWallet", fallback: "PW", className: "border-fuchsia-300/25 bg-fuchsia-400/[0.10] text-fuchsia-100" },
  ebay: {
    label: "eBay",
    logo: "/marketplaces/ebay.png",
    logoClassName: "h-4 w-auto max-w-[48px] object-contain",
    className: "border-amber-300/20 bg-white/[0.94] text-zinc-900",
  },
  pricecharting: {
    label: "PriceCharting",
    logo: "/marketplaces/pricecharting.png",
    logoClassName: "h-4 w-auto max-w-[82px] object-contain",
    className: "border-white/20 bg-white text-zinc-900",
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
