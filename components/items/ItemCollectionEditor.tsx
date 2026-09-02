"use client";

import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { getItemCollection, setItemCollectionEntry } from "@/lib/items/storage";

export default function ItemCollectionEditor({ itemId }: { itemId: string }) {
  const [quantity, setQuantity] = useState(1);
  const [buyPrice, setBuyPrice] = useState(0);
  const [purchaseDate, setPurchaseDate] = useState("");
  const [notes, setNotes] = useState("");
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    const entry = getItemCollection()[itemId];
    if (!entry) return;
    setQuantity(entry.quantity); setBuyPrice(entry.buyPrice); setPurchaseDate(entry.purchaseDate || ""); setNotes(entry.notes || "");
  }, [itemId]);
  return (
    <section className="kt-section-surface rounded-[18px] border p-4">
      <h2 className="text-[10px] font-black uppercase tracking-[0.1em] text-cyan-300">Informations de collection</h2>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <label><span className="mb-1 block text-[9px] text-zinc-400">Quantité</span><input type="number" min="0" max="9999" value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} className="kt-control w-full border px-3 py-2.5 text-xs" /></label>
        <label><span className="mb-1 block text-[9px] text-zinc-400">Prix d’achat unitaire (€)</span><input type="number" min="0" step="0.01" value={buyPrice} onChange={(event) => setBuyPrice(Number(event.target.value))} className="kt-control w-full border px-3 py-2.5 text-xs" /></label>
        <label className="col-span-2"><span className="mb-1 block text-[9px] text-zinc-400">Date d’achat</span><input type="date" value={purchaseDate} onChange={(event) => setPurchaseDate(event.target.value)} className="kt-control w-full border px-3 py-2.5 text-xs" /></label>
        <label className="col-span-2"><span className="mb-1 block text-[9px] text-zinc-400">Notes</span><textarea value={notes} maxLength={300} onChange={(event) => setNotes(event.target.value)} className="kt-control min-h-20 w-full border px-3 py-2.5 text-xs" /></label>
      </div>
      <button type="button" onClick={() => { setItemCollectionEntry(itemId, { quantity, buyPrice, purchaseDate, notes }); setSaved(true); window.setTimeout(() => setSaved(false), 1500); }} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-300 px-4 py-3 text-[9px] font-black uppercase tracking-[0.08em] text-[#061016]"><Save className="h-4 w-4" /> {saved ? "Enregistré" : "Enregistrer"}</button>
    </section>
  );
}
