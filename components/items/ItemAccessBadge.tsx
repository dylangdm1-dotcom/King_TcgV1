import { Crown, Store } from "lucide-react";

export default function ItemAccessBadge({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/25 bg-amber-300/[0.07] px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.1em] text-amber-200">
      {compact ? <Crown className="h-3 w-3" /> : <Store className="h-3 w-3" />}
      Premium · PRO
    </span>
  );
}
