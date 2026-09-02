import { BadgeCheck, UserRound } from "lucide-react";
import type { ItemCatalogStatus, ItemPriceStatus } from "@/lib/items/types";

export function ItemCatalogBadge({ status }: { status: ItemCatalogStatus }) {
  const personal = status === "user_created";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[8px] font-black uppercase tracking-[0.08em] ${personal ? "border-zinc-400/20 bg-zinc-400/[0.06] text-zinc-300" : "border-cyan-300/20 bg-cyan-300/[0.06] text-cyan-200"}`}>
      {personal ? <UserRound className="h-3 w-3" /> : <BadgeCheck className="h-3 w-3" />}
      {personal ? "Référence personnelle" : status === "verified" ? "Vérifié" : "En vérification"}
    </span>
  );
}

export function ItemPriceBadge({ status }: { status: ItemPriceStatus }) {
  return (
    <span className={`rounded-full border px-2 py-1 text-[8px] font-black uppercase tracking-[0.08em] ${status === "available" ? "border-emerald-300/20 bg-emerald-300/[0.06] text-emerald-200" : "border-zinc-400/15 bg-zinc-400/[0.04] text-zinc-400"}`}>
      {status === "available" ? "Cote disponible" : status === "not_listed" ? "Non coté" : "Prix non connecté"}
    </span>
  );
}
