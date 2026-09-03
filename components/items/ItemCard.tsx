import Link from "next/link";
import { CalendarDays, ChevronRight } from "lucide-react";
import { itemCategoryLabel, itemLanguageLabel } from "@/lib/items/categories";
import { encodeItemRouteId } from "@/lib/items/identity";
import { formatItemMoney, summarizeItemPrices } from "@/lib/items/pricing";
import type { SealedItem } from "@/lib/items/types";
import ItemActions from "./ItemActions";
import ItemImage from "./ItemImage";
import { ItemCatalogBadge } from "./ItemStatusBadge";

export default function ItemCard({ item, compact = false }: { item: SealedItem; compact?: boolean }) {
  const pricing = summarizeItemPrices(item);
  const routeId = item.catalogStatus === "user_created" ? item.id : item.slug;
  return (
    <article className="kt-item-card group flex h-full min-w-0 flex-col overflow-hidden rounded-[18px] border border-cyan-300/[0.12] bg-[#0a1118]">
      <Link href={`/items/${encodeItemRouteId(routeId)}`} className={`relative block overflow-hidden bg-black/20 ${compact ? "aspect-square" : "aspect-[4/3]"}`}>
        <ItemImage item={item} preferSmall className="h-full w-full p-4 transition duration-300 group-hover:scale-[1.025]" />
        <span className="absolute left-2 top-2"><ItemCatalogBadge status={item.catalogStatus} /></span>
      </Link>
      <div className="flex flex-1 flex-col p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[8px] font-black uppercase tracking-[0.1em] text-cyan-300">{itemCategoryLabel(item.category)} · {itemLanguageLabel(item.language)}</p>
            <Link href={`/items/${encodeItemRouteId(routeId)}`} className="mt-1 line-clamp-2 block text-[11px] font-black leading-4 text-white hover:text-cyan-200">{item.name}</Link>
          </div>
          <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-zinc-600 transition group-hover:text-cyan-300" />
        </div>
        {item.releaseDate ? <p className="mt-2 flex items-center gap-1.5 text-[9px] text-zinc-400"><CalendarDays className="h-3 w-3" /> {new Date(item.releaseDate).toLocaleDateString("fr-FR")}</p> : null}
        <div className="mt-auto pt-3">
          <div className="mb-2 space-y-1.5 border-t border-white/[0.06] pt-2">
            <div className="flex items-center justify-between gap-2"><span className="text-[8px] font-bold uppercase tracking-[0.08em] text-zinc-500">Cote actuelle</span><span className={`text-[11px] font-black ${pricing.currentMarket ? "text-emerald-300" : "text-zinc-500"}`}>{formatItemMoney(pricing.currentMarket)}</span></div>
            <div className="flex items-center justify-between gap-2"><span className="text-[8px] font-bold uppercase tracking-[0.08em] text-zinc-500">Sortie officielle FR</span><span className={`text-[10px] font-black ${pricing.officialRetail ? "text-amber-300" : "text-zinc-600"}`}>{formatItemMoney(pricing.officialRetail)}</span></div>
          </div>
          <ItemActions itemId={item.id} compact />
        </div>
      </div>
    </article>
  );
}
