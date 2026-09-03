"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Barcode, CalendarDays, ExternalLink, PackageOpen, Trash2 } from "lucide-react";
import { fetchItemById } from "@/lib/items/client";
import { itemCategoryLabel, itemLanguageLabel } from "@/lib/items/categories";
import { formatItemMoney, summarizeItemPrices } from "@/lib/items/pricing";
import { findCustomItem, removeCustomItem } from "@/lib/items/storage";
import type { SealedItem } from "@/lib/items/types";
import ItemActions from "./ItemActions";
import ItemCollectionEditor from "./ItemCollectionEditor";
import ItemEmptyState from "./ItemEmptyState";
import ItemImage from "./ItemImage";
import { ItemCatalogBadge, ItemPriceBadge } from "./ItemStatusBadge";

export default function ItemDetailContent({ identifier }: { identifier: string }) {
  const [item, setItem] = useState<SealedItem | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    const local = findCustomItem(identifier);
    if (local) { setItem(local); setLoading(false); return () => controller.abort(); }
    fetchItemById(identifier, controller.signal).then((result) => { setItem(result); setLoading(false); });
    return () => controller.abort();
  }, [identifier]);
  if (loading) return <div className="kt-page-wrap"><div className="h-72 animate-pulse rounded-[20px] border border-white/[0.05] bg-white/[0.03]" /></div>;
  if (!item) return <div className="kt-page-wrap"><ItemEmptyState /></div>;
  const pricing = summarizeItemPrices(item);
  return (
    <div className="kt-page-wrap space-y-5">
      <Link href="/items" className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.08em] text-cyan-300"><ArrowLeft className="h-4 w-4" /> Retour aux Items</Link>
      <section className="kt-item-detail-grid grid gap-5 lg:grid-cols-[minmax(0,420px)_1fr]">
        <div className="kt-section-surface overflow-hidden rounded-[20px] border"><ItemImage item={item} className="aspect-square h-full w-full p-8" /></div>
        <div className="space-y-4">
          <header className="kt-page-header kt-hero-surface border"><div className="flex flex-wrap items-center gap-2"><ItemCatalogBadge status={item.catalogStatus} /><ItemPriceBadge status={item.priceStatus} /></div><p className="mt-3 text-[9px] font-black uppercase tracking-[0.1em] text-cyan-300">{itemCategoryLabel(item.category)} · {itemLanguageLabel(item.language)}</p><h1 className="mt-1 text-xl font-black text-white sm:text-2xl">{item.name}</h1>{item.description ? <p className="mt-2 text-[11px] leading-5 text-zinc-300">{item.description}</p> : null}<div className="mt-4"><ItemActions itemId={item.id} /></div></header>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="kt-subpanel p-3"><p className="text-[8px] font-black uppercase tracking-[0.08em] text-zinc-500">Cote actuelle</p><p className={`mt-2 text-lg font-black ${pricing.currentMarket ? "text-emerald-300" : "text-zinc-500"}`}>{formatItemMoney(pricing.currentMarket)}</p><p className="mt-1 text-[9px] text-zinc-500">{pricing.currentMarket?.source === "cardtrader" ? "Marché CardTrader FR · cote minimale observée, en vérification bêta." : pricing.currentMarket ? "Marché TCGplayer EN/US · jamais converti en cote FR." : "Jamais remplacée par un prix magasin."}</p></div>
            <div className="kt-subpanel p-3"><p className="text-[8px] font-black uppercase tracking-[0.08em] text-zinc-500">Prix de sortie officiel FR</p><p className={`mt-2 text-lg font-black ${pricing.officialRetail ? "text-amber-300" : "text-zinc-500"}`}>{formatItemMoney(pricing.officialRetail)}</p><p className="mt-1 text-[9px] text-zinc-500">Uniquement une valeur publiée par une source officielle française ; aucune conversion du prix US.</p></div>
          </div>
          <div className="kt-section-surface rounded-[18px] border p-4"><h2 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.09em] text-white"><PackageOpen className="h-4 w-4 text-cyan-300" /> Identité produit</h2><div className="mt-3 space-y-2 text-[10px] text-zinc-300">{item.releaseDate ? <p className="flex items-center gap-2"><CalendarDays className="h-3.5 w-3.5 text-cyan-300" /> Sortie : {new Date(item.releaseDate).toLocaleDateString("fr-FR")}</p> : null}{item.barcode ? <p className="flex items-center gap-2"><Barcode className="h-3.5 w-3.5 text-cyan-300" /> {item.barcode}</p> : null}{item.sku ? <p>SKU : {item.sku}</p> : null}{item.catalogPath ? <p>Chemin catalogue : {item.catalogPath}</p> : null}{item.groupedVariantCount && item.groupedVariantCount > 1 ? <p>{item.groupedVariantCount} illustrations de façade regroupées sous cette référence.</p> : null}{item.images?.source ? <p>Visuel : source fournisseur {itemLanguageLabel(item.language)}</p> : null}{item.sources.filter((source) => source.url).map((source) => <a key={`${source.provider}-${source.url}`} href={source.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-cyan-300"><ExternalLink className="h-3.5 w-3.5" /> Source : {source.provider}</a>)}</div></div>
          <ItemCollectionEditor itemId={item.id} />
          {item.catalogStatus === "user_created" ? <button type="button" onClick={() => { if (removeCustomItem(item.id)) window.location.href = "/items"; }} className="inline-flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.08em] text-rose-300"><Trash2 className="h-4 w-4" /> Supprimer ma référence</button> : null}
        </div>
      </section>
    </div>
  );
}
