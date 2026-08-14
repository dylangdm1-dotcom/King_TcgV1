"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDownWideNarrow, ArrowRight, Search, SlidersHorizontal, TrendingDown, TrendingUp, WalletCards } from "lucide-react";
import Navbar from "@/components/Navbar";
import { getBuyPrice, getCardQuantity, getCollection, getCondition } from "@/lib/storage";
import { getCardById } from "@/lib/pokemon";
import { getMarketData } from "@/lib/marketEngine";
import type { CardCondition, PokemonCard } from "@/lib/types";

type PortfolioCard = PokemonCard & {
  quantity: number;
  buyPrice: number;
  currentPrice: number;
  condition: CardCondition;
};

type SortKey = "value" | "profit" | "recent" | "name";

function euro(value: number) {
  return value.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function DashboardCardsPage() {
  const [cards, setCards] = useState<PortfolioCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("value");

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      const collection = getCollection();
      const ids = Object.keys(collection);
      const loaded = await Promise.all(ids.map(async (id) => {
        try {
          const card = await getCardById(id);
          if (!card) return null;
          const market = getMarketData(card);
          return {
            ...card,
            quantity: getCardQuantity(id),
            buyPrice: getBuyPrice(id),
            currentPrice: market.average || 0,
            condition: (getCondition(id) || "Near Mint") as CardCondition,
          } satisfies PortfolioCard;
        } catch {
          return null;
        }
      }));
      if (active) {
        setCards(loaded.filter((card): card is PortfolioCard => Boolean(card)));
        setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, []);

  const visibleCards = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return cards
      .filter((card) => !normalized || `${card.name} ${card.set?.name || ""} ${card.number}`.toLowerCase().includes(normalized))
      .sort((a, b) => {
        const valueA = a.currentPrice * a.quantity;
        const valueB = b.currentPrice * b.quantity;
        const profitA = valueA - a.buyPrice * a.quantity;
        const profitB = valueB - b.buyPrice * b.quantity;
        if (sort === "profit") return profitB - profitA;
        if (sort === "name") return a.name.localeCompare(b.name);
        if (sort === "recent") return 0;
        return valueB - valueA;
      });
  }, [cards, query, sort]);

  const totals = useMemo(() => visibleCards.reduce((acc, card) => {
    acc.value += card.currentPrice * card.quantity;
    acc.buy += card.buyPrice * card.quantity;
    acc.quantity += card.quantity;
    return acc;
  }, { value: 0, buy: 0, quantity: 0 }), [visibleCards]);

  return (
    <>
      <Navbar />
      <main className="kt-app-shell kt-premium-shell min-h-screen">
        <div className="kt-page-wrap space-y-5">
          <section className="kt-page-header kt-hero-surface overflow-hidden border">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-sky-300/20 bg-sky-400/[0.10] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-sky-200"><WalletCards className="h-3.5 w-3.5" /> Portefeuille King_TCG</div>
                <h1 className="kt-page-title">Détail du portefeuille</h1>
                <p className="kt-page-subtitle mt-1">Retrouvez toutes les cartes prises en compte dans votre portefeuille : prix d’achat, valeurs actuelles, états et plus-values.</p>
              </div>
              <Link href="/dashboard" className="inline-flex items-center rounded-xl border border-sky-300/30 bg-sky-400 px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.11em] text-[#06111a] shadow-[0_10px_28px_rgba(14,165,233,.18)] transition hover:bg-sky-300">Dashboard</Link>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2.5 border-t border-white/[0.06] pt-4">
              <div className="kt-subpanel p-3"><p className="text-[10px] font-bold uppercase tracking-[0.11em] text-sky-300/70">Valeur</p><p className="mt-1 text-sm font-black text-sky-100">{euro(totals.value)} €</p></div>
              <div className="kt-subpanel p-3"><p className="text-[10px] font-bold uppercase tracking-[0.11em] text-zinc-200">Investi</p><p className="mt-1 text-sm font-black text-zinc-200">{euro(totals.buy)} €</p></div>
              <div className="kt-subpanel p-3"><p className="text-[10px] font-bold uppercase tracking-[0.11em] text-zinc-200">Plus-value</p><p className={`mt-1 text-sm font-black ${totals.value - totals.buy >= 0 ? "text-emerald-200" : "text-rose-300"}`}>{totals.value - totals.buy >= 0 ? "+" : ""}{euro(totals.value - totals.buy)} €</p></div>
            </div>
          </section>

          <section className="kt-toolbar grid gap-3 sm:grid-cols-[1fr_220px]">
            <label className="relative">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-200" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher une carte, une extension…" className="kt-control w-full border py-3 pl-11 pr-4 text-xs font-bold outline-none" />
            </label>
            <label className="relative">
              <ArrowDownWideNarrow className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-200" />
              <select value={sort} onChange={(event) => setSort(event.target.value as SortKey)} className="kt-control w-full appearance-none border py-3 pl-11 pr-4 text-xs font-bold outline-none">
                <option value="value">Valeur décroissante</option>
                <option value="profit">Plus-value décroissante</option>
                <option value="name">Nom alphabétique</option>
                <option value="recent">Ordre de collection</option>
              </select>
            </label>
          </section>

          {loading ? (
            <div className="grid gap-3 sm:grid-cols-2">{Array.from({ length: 6 }).map((_, index) => <div key={index} className="kt-skeleton h-48 rounded-[18px]" />)}</div>
          ) : (
            <section className="grid gap-3 sm:grid-cols-2">
              {visibleCards.map((card) => {
                const totalBuy = card.buyPrice * card.quantity;
                const totalValue = card.currentPrice * card.quantity;
                const profit = totalValue - totalBuy;
                const performance = totalBuy > 0 ? (profit / totalBuy) * 100 : 0;
                return (
                  <article key={card.id} className="kt-panel kt-portfolio-detail-card p-3 transition">
                    <div className="flex gap-3">
                      <div className="flex h-[74px] w-[54px] shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/[0.09] bg-[#111820] p-1.5">
                        <img src={card.images?.small || card.images?.large} alt={card.name} className="h-full w-full object-contain" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <h2 className="truncate text-xs font-black text-white">{card.name}</h2>
                            <p className="mt-1 truncate text-[10px] font-semibold text-zinc-200">{card.set?.name} · #{card.number}</p>
                          </div>
                          <div className="flex max-w-[58%] flex-wrap items-center justify-end gap-1">
                            <span className="rounded-lg border border-white/[0.09] bg-white/[0.04] px-1.5 py-1 text-[10px] font-black text-zinc-300">{card.condition}</span>
                            {card.rarity ? <span className="max-w-[86px] truncate rounded-lg border border-violet-200/15 bg-violet-300/[0.07] px-1.5 py-1 text-[10px] font-black text-violet-200">{card.rarity}</span> : null}
                            <span className="rounded-lg border border-amber-200/15 bg-amber-300/[0.07] px-1.5 py-1 text-[10px] font-black text-amber-200">x{card.quantity}</span>
                          </div>
                        </div>
                        <div className="mt-2 grid grid-cols-3 gap-2">
                          <div><p className="text-[10px] font-bold uppercase tracking-[0.11em] text-zinc-400">Achat</p><p className="text-[10px] font-black text-zinc-300">{euro(totalBuy)} €</p></div>
                          <div><p className="text-[10px] font-bold uppercase tracking-[0.11em] text-zinc-400">Actuelle</p><p className="text-[10px] font-black text-sky-100">{euro(totalValue)} €</p></div>
                          <div className="text-right"><p className="text-[10px] font-bold uppercase tracking-[0.11em] text-zinc-400">Plus-value</p><p className={`text-[10px] font-black ${profit >= 0 ? "text-emerald-200" : "text-rose-300"}`}>{profit >= 0 ? "+" : ""}{euro(profit)} €</p></div>
                        </div>
                      </div>
                    </div>
                    <div className="kt-subpanel mt-2 flex items-center justify-between px-3 py-2">
                      <span className="flex items-center gap-1.5 text-[10px] font-black text-zinc-100">{performance >= 0 ? <TrendingUp className="h-3.5 w-3.5 text-emerald-200" /> : <TrendingDown className="h-3.5 w-3.5 text-rose-300" />} Rendement {performance >= 0 ? "+" : ""}{performance.toFixed(1)}%</span>
                      <Link href={`/card/${card.id}`} className="flex items-center gap-1 rounded-lg border border-sky-300/15 bg-sky-400/[0.07] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.11em] text-sky-200">Fiche <ArrowRight className="h-3 w-3" /></Link>
                    </div>
                  </article>
                );
              })}
            </section>
          )}

          {!loading && visibleCards.length === 0 ? <div className="kt-empty-state-rich text-[11px]"><SlidersHorizontal className="h-6 w-6 text-cyan-300" /><p className="font-black text-white">Aucune carte affichée</p><p>Aucune carte ne correspond aux filtres actuels.</p></div> : null}
        </div>
      </main>
    </>
  );
}
