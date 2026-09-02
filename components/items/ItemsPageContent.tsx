"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Bookmark, Crown, FileSpreadsheet, Library, PackageOpen, Plus, ShieldCheck, Store } from "lucide-react";
import { ITEM_BETA_ACCESS, fetchItemCatalog, filterSealedItems, DEFAULT_ITEM_FILTERS, getCustomItems, getItemCollection, getItemFavorites, itemCatalogStats } from "@/lib/items";
import type { ItemCatalogManifest, ItemSearchFilters, SealedItem } from "@/lib/items/types";
import ItemAccessBadge from "./ItemAccessBadge";
import ItemCard from "./ItemCard";
import ItemCatalogStatus from "./ItemCatalogStatus";
import ItemCreateForm from "./ItemCreateForm";
import ItemEmptyState from "./ItemEmptyState";
import ItemStats from "./ItemStats";
import ItemToolbar from "./ItemToolbar";

export default function ItemsPageContent() {
  const [catalog, setCatalog] = useState<SealedItem[]>([]);
  const [custom, setCustom] = useState<SealedItem[]>([]);
  const [manifest, setManifest] = useState<ItemCatalogManifest | null>(null);
  const [filters, setFilters] = useState<ItemSearchFilters>(DEFAULT_ITEM_FILTERS);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [collectionCount, setCollectionCount] = useState(0);
  const [favoriteCount, setFavoriteCount] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const syncLocal = () => {
      setCustom(getCustomItems());
      setCollectionCount(Object.keys(getItemCollection()).length);
      setFavoriteCount(getItemFavorites().length);
    };
    syncLocal();
    fetchItemCatalog(controller.signal).then((result) => {
      setCatalog(result.items);
      setManifest(result.manifest);
      setOffline(!result.manifest);
      setLoading(false);
    });
    window.addEventListener("king_tcg_items_update", syncLocal);
    return () => { controller.abort(); window.removeEventListener("king_tcg_items_update", syncLocal); };
  }, []);

  const allItems = useMemo(() => {
    const seen = new Set<string>();
    return [...custom, ...catalog].filter((item) => !seen.has(item.id) && Boolean(seen.add(item.id)));
  }, [catalog, custom]);
  const results = useMemo(() => filterSealedItems(allItems, filters), [allItems, filters]);
  const stats = useMemo(() => itemCatalogStats(allItems), [allItems]);
  const filtered = Boolean(filters.query || filters.language !== "all" || filters.category !== "all" || filters.availability !== "all");

  return (
    <div className="kt-page-wrap space-y-5">
      <header className="kt-page-header kt-hero-surface relative overflow-hidden border">
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-amber-300/[0.055] blur-3xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="kt-page-icon flex shrink-0 items-center justify-center text-amber-300"><PackageOpen className="h-5 w-5" /></span>
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-2"><ItemAccessBadge /><span className="rounded-full border border-cyan-300/15 bg-cyan-300/[0.05] px-2 py-1 text-[8px] font-black uppercase tracking-[0.08em] text-cyan-300">V288 · Bêta</span></div>
              <h1 className="kt-page-title">Items <span className="text-cyan-300">Pokémon scellés</span></h1>
              <p className="kt-page-subtitle mt-1 max-w-2xl">Espace indépendant pour ETB, displays, boosters, coffrets, bundles, UPC et autres produits scellés. Aucun résultat carte ou extension n’est mélangé ici.</p>
            </div>
          </div>
          <button type="button" onClick={() => setCreateOpen((value) => !value)} className="inline-flex items-center justify-center gap-2 rounded-[13px] border border-cyan-300/30 bg-cyan-300/[0.08] px-4 py-3 text-[9px] font-black uppercase tracking-[0.08em] text-cyan-200"><Plus className="h-4 w-4" /> Ajouter mon item</button>
        </div>
      </header>

      <div className="grid gap-2 sm:grid-cols-2">
        <Link href="/collection/items" className="kt-section-surface flex items-center justify-between rounded-[16px] border p-3.5 transition hover:border-cyan-300/25"><span className="flex items-center gap-3"><Library className="h-4 w-4 text-cyan-300" /><span><span className="block text-[10px] font-black text-white">Collection Items</span><span className="mt-0.5 block text-[9px] text-zinc-400">Quantités, achats et export CSV</span></span></span><span className="text-sm font-black text-cyan-300">{collectionCount}</span></Link>
        <Link href="/favoris/items" className="kt-section-surface flex items-center justify-between rounded-[16px] border p-3.5 transition hover:border-rose-300/20"><span className="flex items-center gap-3"><Bookmark className="h-4 w-4 text-rose-300" /><span><span className="block text-[10px] font-black text-white">Favoris Items</span><span className="mt-0.5 block text-[9px] text-zinc-400">Produits scellés à suivre</span></span></span><span className="text-sm font-black text-rose-300">{favoriteCount}</span></Link>
      </div>

      <ItemCreateForm open={createOpen} onClose={() => setCreateOpen(false)} onCreated={() => setFilters((current) => ({ ...current, availability: "personal" }))} />
      <ItemCatalogStatus manifest={manifest} offline={offline} />
      <ItemStats catalog={stats.verified} personal={stats.personal} collection={collectionCount} favorites={favoriteCount} />

      <section className="rounded-[16px] border border-amber-300/[0.14] bg-amber-300/[0.035] px-4 py-3">
        <div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" /><div><p className="text-[9px] font-black uppercase tracking-[0.09em] text-amber-200">Données fiables uniquement</p><p className="mt-1 text-[10px] leading-5 text-zinc-300">Aucun produit, visuel ou prix n’est simulé. Le prix de sortie officiel et la cote marché actuelle resteront séparés. {ITEM_BETA_ACCESS.note}</p></div></div>
      </section>

      <ItemToolbar filters={filters} onChange={(patch) => setFilters((current) => ({ ...current, ...patch }))} onReset={() => setFilters(DEFAULT_ITEM_FILTERS)} />

      <div className="flex items-end justify-between gap-3 border-b border-white/[0.06] pb-3">
        <div><p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.11em] text-white"><Store className="h-4 w-4 text-cyan-300" /> Résultats Items</p><p className="mt-1 text-[9px] text-zinc-500">{loading ? "Chargement…" : `${results.length} référence${results.length > 1 ? "s" : ""}`}</p></div>
        <div className="flex items-center gap-2 text-[8px] font-bold uppercase tracking-[0.08em] text-zinc-500"><Crown className="h-3.5 w-3.5 text-amber-300" /> Premium / PRO <FileSpreadsheet className="ml-1 h-3.5 w-3.5 text-cyan-300" /></div>
      </div>

      {loading ? <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="aspect-[.82] animate-pulse rounded-[18px] border border-white/[0.05] bg-white/[0.03]" />)}</div> : results.length ? <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">{results.map((item) => <ItemCard key={item.id} item={item} />)}</div> : <ItemEmptyState filtered={filtered} onCreate={() => setCreateOpen(true)} />}
    </div>
  );
}
