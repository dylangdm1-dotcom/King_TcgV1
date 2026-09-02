"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Bookmark, Download, Library, PackageSearch, Search } from "lucide-react";
import { downloadItemCollectionCsv, fetchItemCatalog, getCustomItems, getItemCollection, getItemFavorites, itemCollectionStats } from "@/lib/items";
import type { ItemCollectionMap, SealedItem } from "@/lib/items/types";
import ItemCard from "./ItemCard";
import ItemEmptyState from "./ItemEmptyState";

export default function ItemLibraryPage({ mode }: { mode: "collection" | "favorites" }) {
  const [items, setItems] = useState<SealedItem[]>([]);
  const [collection, setCollection] = useState<ItemCollectionMap>({});
  const [favorites, setFavorites] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    const load = async () => {
      const remote = await fetchItemCatalog();
      if (!active) return;
      const custom = getCustomItems();
      const seen = new Set<string>();
      setItems([...custom, ...remote.items].filter((item) => !seen.has(item.id) && Boolean(seen.add(item.id))));
      setCollection(getItemCollection()); setFavorites(getItemFavorites()); setLoading(false);
    };
    void load();
    const sync = () => { setCollection(getItemCollection()); setFavorites(getItemFavorites()); setItems((current) => { const remote = current.filter((item) => item.catalogStatus !== "user_created"); return [...getCustomItems(), ...remote]; }); };
    window.addEventListener("king_tcg_items_update", sync);
    return () => { active = false; window.removeEventListener("king_tcg_items_update", sync); };
  }, []);
  const selected = useMemo(() => items.filter((item) => mode === "collection" ? Boolean(collection[item.id]) : favorites.includes(item.id)).filter((item) => !query.trim() || item.name.toLowerCase().includes(query.toLowerCase().trim())), [collection, favorites, items, mode, query]);
  const stats = itemCollectionStats(collection);
  const collectionMode = mode === "collection";
  return (
    <div className="kt-page-wrap space-y-5">
      <header className="kt-page-header kt-hero-surface border"><div className="flex items-start gap-3"><span className="kt-page-icon flex shrink-0 items-center justify-center text-cyan-300">{collectionMode ? <Library className="h-5 w-5" /> : <Bookmark className="h-5 w-5 text-rose-300" />}</span><div><p className="text-[9px] font-black uppercase tracking-[0.1em] text-amber-300">Items · Premium / PRO</p><h1 className="kt-page-title mt-1">{collectionMode ? "Collection Items" : "Favoris Items"}</h1><p className="kt-page-subtitle mt-1">Espace séparé de vos cartes Pokémon.</p></div></div></header>
      <nav className="grid grid-cols-3 gap-2"><Link href="/items" className="rounded-xl border border-cyan-300/15 bg-cyan-300/[0.04] px-3 py-2.5 text-center text-[9px] font-black text-cyan-200">Tous les Items</Link><Link href="/collection/items" className={`rounded-xl border px-3 py-2.5 text-center text-[9px] font-black ${collectionMode ? "border-cyan-300/35 bg-cyan-300/[0.1] text-cyan-200" : "border-white/[0.08] text-zinc-400"}`}>Collection</Link><Link href="/favoris/items" className={`rounded-xl border px-3 py-2.5 text-center text-[9px] font-black ${!collectionMode ? "border-rose-300/30 bg-rose-300/[0.08] text-rose-200" : "border-white/[0.08] text-zinc-400"}`}>Favoris</Link></nav>
      {collectionMode ? <section className="grid grid-cols-3 gap-2"><div className="kt-metric-tile rounded-[14px] border p-3"><p className="text-[8px] font-black text-zinc-500">RÉFÉRENCES</p><p className="mt-2 text-lg font-black text-white">{stats.references}</p></div><div className="kt-metric-tile rounded-[14px] border p-3"><p className="text-[8px] font-black text-zinc-500">UNITÉS</p><p className="mt-2 text-lg font-black text-white">{stats.units}</p></div><div className="kt-metric-tile rounded-[14px] border p-3"><p className="text-[8px] font-black text-zinc-500">INVESTI</p><p className="mt-2 text-lg font-black text-amber-300">{stats.invested.toFixed(2)} €</p></div></section> : null}
      <section className="kt-toolbar flex flex-col gap-3 sm:flex-row"><div className="relative flex-1"><Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-cyan-300" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filtrer mes Items..." className="kt-control w-full border py-3 pl-11 pr-3 text-xs" /></div>{collectionMode && selected.length ? <button type="button" onClick={() => downloadItemCollectionCsv(items, collection)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-300/25 bg-amber-300/[0.07] px-4 py-3 text-[9px] font-black uppercase tracking-[0.08em] text-amber-200"><Download className="h-4 w-4" /> Export CSV</button> : null}</section>
      {loading ? <div className="h-52 animate-pulse rounded-[18px] bg-white/[0.03]" /> : selected.length ? <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">{selected.map((item) => <ItemCard key={item.id} item={item} />)}</div> : query ? <div className="kt-empty-state-rich"><PackageSearch className="h-7 w-7 text-cyan-300" /><p className="text-[11px] font-black text-white">Aucun résultat dans vos Items.</p></div> : <ItemEmptyState />}
    </div>
  );
}
