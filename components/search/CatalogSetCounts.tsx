type Props = {
  identityCount?: number;
  providerPrintCount?: number;
  availability?: "available" | "announced" | "unknown" | "metadata_only";
  compact?: boolean;
};

export default function CatalogSetCounts({
  identityCount = 0,
  providerPrintCount = 0,
  availability,
  compact = false,
}: Props) {
  if (availability === "announced") return <span>à venir</span>;
  if (availability === "metadata_only" || identityCount <= 0) return <span>référencée</span>;

  const groupedPrints = providerPrintCount > identityCount;
  return (
    <span className={compact ? "leading-tight" : undefined}>
      <span className="block font-black tabular-nums">{identityCount}</span>
      <span className="block text-[9px] font-bold uppercase tracking-wide text-zinc-500">
        carte{identityCount > 1 ? "s" : ""}
      </span>
      {groupedPrints ? (
        <span className="mt-0.5 block text-[9px] font-semibold text-cyan-300/80 tabular-nums">
          {providerPrintCount} impressions
        </span>
      ) : null}
    </span>
  );
}
