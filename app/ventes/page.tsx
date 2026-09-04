"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CircleDollarSign, Crown, RotateCcw, ShoppingBag, Trash2, TrendingUp, WalletCards } from "lucide-react";
import Navbar from "@/components/Navbar";
import { getCardById } from "@/lib/pokemon";
import { addSale, getSales, removeSale, saleProfit, type CardSale } from "@/lib/sales";
import { addToCollection, getBuyPrice, getCardQuantity, getCollection, getCondition, getPrintingVariant, removeFromCollection, setBuyPrice, setCondition, setPrintingVariant } from "@/lib/storage";
import type { PokemonCard } from "@/lib/types";

type SaleCardOption = PokemonCard & { ownedQuantity: number; unitBuyPrice: number };

function euro(value: number) {
  return value.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function today() {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
}

export default function SalesPage() {
  const searchParams = useSearchParams();
  const requestedCard = searchParams.get("card") || "";
  const [cards, setCards] = useState<SaleCardOption[]>([]);
  const [sales, setSales] = useState<CardSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(requestedCard);
  const [quantity, setQuantity] = useState(1);
  const [salePrice, setSalePrice] = useState("");
  const [fees, setFees] = useState("");
  const [soldAt, setSoldAt] = useState(today());
  const [message, setMessage] = useState("");

  async function loadCollection(preferredId = selectedId) {
    setLoading(true);
    const collection = getCollection();
    const loaded = await Promise.all(Object.keys(collection).map(async (id) => {
      try {
        const card = await getCardById(id);
        const ownedQuantity = getCardQuantity(id);
        if (!card || ownedQuantity <= 0) return null;
        return { ...card, ownedQuantity, unitBuyPrice: getBuyPrice(id) } satisfies SaleCardOption;
      } catch {
        return null;
      }
    }));
    const available = loaded.filter((card): card is SaleCardOption => Boolean(card));
    setCards(available);
    setSales(getSales());
    setSelectedId((current) => {
      const wanted = preferredId || current;
      return available.some((card) => card.id === wanted) ? wanted : available[0]?.id || "";
    });
    setLoading(false);
  }

  useEffect(() => {
    void loadCollection(requestedCard);
    // Le paramètre initial suffit ; chaque action locale recharge ensuite le stock.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestedCard]);

  const selected = cards.find((card) => card.id === selectedId) || null;
  useEffect(() => {
    setQuantity(1);
    setSalePrice("");
    setFees("");
  }, [selectedId]);

  const totals = useMemo(() => sales.reduce((summary, sale) => {
    summary.turnover += sale.unitSalePrice * sale.quantity;
    summary.profit += saleProfit(sale);
    summary.units += sale.quantity;
    return summary;
  }, { turnover: 0, profit: 0, units: 0 }), [sales]);

  const estimatedProfit = selected
    ? Number(salePrice || 0) * quantity - selected.unitBuyPrice * quantity - Number(fees || 0)
    : 0;

  function submitSale(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const requestedQuantity = Number.isFinite(quantity) ? Math.floor(quantity) : 1;
    const safeQuantity = Math.max(1, Math.min(selected.ownedQuantity, requestedQuantity));
    const unitSalePrice = Number(salePrice);
    if (!Number.isFinite(unitSalePrice) || unitSalePrice < 0) {
      setMessage("Saisis un prix de vente valide.");
      return;
    }
    try {
      addSale({
        cardId: selected.id,
        cardName: selected.name,
        cardNumber: selected.number,
        setName: selected.set?.name,
        image: selected.images?.small || selected.images?.large,
        quantity: safeQuantity,
        unitBuyPrice: selected.unitBuyPrice,
        unitSalePrice,
        fees: Math.max(0, Number(fees || 0)),
        condition: getCondition(selected.id),
        printingVariant: getPrintingVariant(selected.id),
        soldAt,
      });
      for (let index = 0; index < safeQuantity; index += 1) removeFromCollection(selected.id);
      setMessage(`Vente enregistrée : ${safeQuantity} × ${selected.name}.`);
      void loadCollection(selected.id);
    } catch {
      setMessage("La vente n’a pas pu être enregistrée dans ce navigateur.");
    }
  }

  function cancelRecordedSale(sale: CardSale) {
    if (!window.confirm(`Annuler la vente de ${sale.quantity} × ${sale.cardName} et remettre le stock en collection ?`)) return;
    if (!removeSale(sale.id)) return;
    for (let index = 0; index < sale.quantity; index += 1) addToCollection(sale.cardId);
    setBuyPrice(sale.cardId, sale.unitBuyPrice);
    if (sale.condition) setCondition(sale.cardId, sale.condition);
    if (sale.printingVariant) setPrintingVariant(sale.cardId, sale.printingVariant);
    setMessage("Vente annulée et quantité remise en collection.");
    void loadCollection(sale.cardId);
  }

  return (
    <>
      <Navbar />
      <main className="kt-app-shell min-h-screen pb-28 text-white">
        <div className="mx-auto max-w-[1040px] space-y-5 px-4 py-6 sm:px-5 sm:py-8">
          <section className="relative overflow-hidden rounded-[20px] border border-amber-300/20 bg-gradient-to-br from-amber-300/[0.075] via-[#111820] to-[#0a1017] px-4 py-5 shadow-[0_20px_55px_rgba(0,0,0,.28)] sm:px-6 sm:py-7">
            <div className="pointer-events-none absolute -right-14 -top-14 h-36 w-36 rounded-full bg-amber-300/[0.07] blur-3xl" />
            <div className="relative flex items-start justify-between gap-4">
              <div><span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/20 bg-emerald-300/[0.07] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.13em] text-emerald-200"><Crown className="h-3 w-3" /> Premium · Actif</span><h1 className="mt-4 text-xl font-black tracking-tight sm:text-2xl">Ventes de cartes</h1><p className="mt-2 max-w-2xl text-[11px] leading-5 text-zinc-300">Enregistrez une vente depuis votre collection. La quantité vendue sort immédiatement du portefeuille et le bénéfice réel tient compte du prix d’achat et des frais.</p></div>
              <CircleDollarSign className="h-7 w-7 shrink-0 text-amber-300" />
            </div>
          </section>

          <section className="grid grid-cols-3 gap-2">
            <div className="kt-metric-tile rounded-[14px] border p-3"><p className="text-[8px] font-black uppercase text-zinc-500">Vendu</p><p className="mt-2 text-lg font-black">{totals.units}</p></div>
            <div className="kt-metric-tile rounded-[14px] border p-3"><p className="text-[8px] font-black uppercase text-zinc-500">Chiffre</p><p className="mt-2 text-lg font-black text-amber-200">{euro(totals.turnover)} €</p></div>
            <div className="kt-metric-tile rounded-[14px] border p-3"><p className="text-[8px] font-black uppercase text-zinc-500">Bénéfice</p><p className={`mt-2 text-lg font-black ${totals.profit >= 0 ? "text-emerald-200" : "text-rose-300"}`}>{totals.profit >= 0 ? "+" : ""}{euro(totals.profit)} €</p></div>
          </section>

          <section className="kt-panel overflow-hidden">
            <div className="border-b border-white/[0.06] px-4 py-4 sm:px-5"><h2 className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.12em] text-amber-200"><ShoppingBag className="h-4 w-4" /> Enregistrer une vente</h2><p className="mt-1 text-[10px] text-zinc-400">Les prix sont unitaires. Les frais correspondent au total de la transaction.</p></div>
            {loading ? <div className="h-36 animate-pulse bg-white/[0.02]" /> : cards.length ? (
              <form onSubmit={submitSale} className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5">
                <label className="sm:col-span-2"><span className="mb-1.5 block text-[9px] font-black text-zinc-300">Carte en collection</span><select value={selectedId} onChange={(event) => setSelectedId(event.target.value)} className="kt-control w-full border px-3 py-3 text-xs">{cards.map((card) => <option key={card.id} value={card.id}>{card.name} · {card.set?.name} · #{card.number} · x{card.ownedQuantity}</option>)}</select></label>
                <label><span className="mb-1.5 block text-[9px] font-black text-zinc-300">Quantité (max. {selected?.ownedQuantity || 1})</span><input type="number" min="1" max={selected?.ownedQuantity || 1} value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} className="kt-control w-full border px-3 py-3 text-xs" /></label>
                <label><span className="mb-1.5 block text-[9px] font-black text-zinc-300">Prix de vente unitaire (€)</span><input type="number" min="0" step="0.01" required value={salePrice} onChange={(event) => setSalePrice(event.target.value)} className="kt-control w-full border px-3 py-3 text-xs" /></label>
                <label><span className="mb-1.5 block text-[9px] font-black text-zinc-300">Frais totaux (€)</span><input type="number" min="0" step="0.01" value={fees} onChange={(event) => setFees(event.target.value)} className="kt-control w-full border px-3 py-3 text-xs" /></label>
                <label><span className="mb-1.5 block text-[9px] font-black text-zinc-300">Date de vente</span><input type="date" required value={soldAt} onChange={(event) => setSoldAt(event.target.value)} className="kt-control w-full border px-3 py-3 text-xs" /></label>
                <div className="kt-subpanel flex items-center justify-between p-3 sm:col-span-2"><span className="text-[10px] text-zinc-300">Achat : {euro((selected?.unitBuyPrice || 0) * quantity)} € · bénéfice estimé</span><strong className={estimatedProfit >= 0 ? "text-emerald-200" : "text-rose-300"}>{estimatedProfit >= 0 ? "+" : ""}{euro(estimatedProfit)} €</strong></div>
                <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-300 px-4 py-3 text-[9px] font-black uppercase tracking-[0.08em] text-[#171006] sm:col-span-2"><CircleDollarSign className="h-4 w-4" /> Confirmer la vente et retirer du stock</button>
              </form>
            ) : <div className="px-4 py-8 text-center"><WalletCards className="mx-auto h-6 w-6 text-amber-300" /><p className="mt-2 text-[11px] font-black">Aucune carte dans le portefeuille</p><p className="mt-1 text-[10px] text-zinc-400">Ajoutez d’abord une carte à votre collection.</p><Link href="/recherche" className="mt-3 inline-flex rounded-xl border border-cyan-300/20 px-3 py-2 text-[9px] font-black text-cyan-200">Rechercher une carte</Link></div>}
            {message ? <p className="border-t border-white/[0.06] px-4 py-3 text-[10px] font-bold text-cyan-200 sm:px-5">{message}</p> : null}
          </section>

          <section className="kt-panel overflow-hidden">
            <div className="border-b border-white/[0.06] px-4 py-4 sm:px-5"><h2 className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.12em] text-amber-200"><TrendingUp className="h-4 w-4" /> Historique des ventes</h2><p className="mt-1 text-[10px] text-zinc-400">Chaque annulation restaure automatiquement la quantité dans la collection.</p></div>
            {sales.length ? <div className="divide-y divide-white/[0.05]">{sales.map((sale) => {
              const profit = saleProfit(sale);
              return <article key={sale.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                <div className="flex h-14 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/[0.08] bg-[#111820]">{sale.image ? <>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={sale.image} alt="" className="h-full w-full object-contain" /></> : <WalletCards className="h-4 w-4 text-zinc-500" />}</div>
                <div className="min-w-0 flex-1"><p className="truncate text-[11px] font-black">{sale.cardName} <span className="text-amber-200">×{sale.quantity}</span></p><p className="mt-1 truncate text-[9px] text-zinc-400">{sale.setName} {sale.cardNumber ? `· #${sale.cardNumber}` : ""} · {new Date(`${sale.soldAt}T12:00:00`).toLocaleDateString("fr-FR")}</p><p className="mt-1 text-[9px] text-zinc-300">Vente {euro(sale.unitSalePrice * sale.quantity)} € · achat {euro(sale.unitBuyPrice * sale.quantity)} € · frais {euro(sale.fees)} €</p></div>
                <div className="shrink-0 text-right"><p className={`text-[11px] font-black ${profit >= 0 ? "text-emerald-200" : "text-rose-300"}`}>{profit >= 0 ? "+" : ""}{euro(profit)} €</p><button type="button" onClick={() => cancelRecordedSale(sale)} className="mt-2 inline-flex items-center gap-1 text-[8px] font-black uppercase text-zinc-400 hover:text-rose-200"><RotateCcw className="h-3 w-3" /> Annuler</button></div>
              </article>;
            })}</div> : <div className="px-4 py-9 text-center"><Trash2 className="mx-auto h-5 w-5 text-zinc-600" /><p className="mt-2 text-[10px] text-zinc-400">Aucune vente enregistrée.</p></div>}
          </section>
        </div>
      </main>
    </>
  );
}
