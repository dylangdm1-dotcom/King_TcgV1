"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { ITEM_CATEGORIES, ITEM_CATEGORY_LABELS, ITEM_LANGUAGES, ITEM_LANGUAGE_LABELS } from "@/lib/items/categories";
import { createCustomItem } from "@/lib/items/storage";
import type { ItemCategory, ItemLanguage, SealedItem } from "@/lib/items/types";

export default function ItemCreateForm({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (item: SealedItem) => void }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<ItemCategory>("other");
  const [language, setLanguage] = useState<ItemLanguage>("fr");
  const [barcode, setBarcode] = useState("");
  const [sku, setSku] = useState("");
  const [error, setError] = useState("");
  if (!open) return null;
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const item = createCustomItem({ name, category, language, barcode, sku });
      setName(""); setBarcode(""); setSku(""); setError("");
      onCreated(item);
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Impossible d’ajouter cet item.");
    }
  };
  return (
    <section className="kt-section-surface rounded-[18px] border p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between"><div><p className="text-[10px] font-black uppercase tracking-[0.1em] text-cyan-300">Nouvelle référence personnelle</p><p className="mt-1 text-[10px] text-zinc-400">Cette donnée reste locale et n’est pas présentée comme une fiche officielle.</p></div><button type="button" onClick={onClose} aria-label="Fermer" className="rounded-xl border border-white/[0.08] p-2 text-zinc-400"><X className="h-4 w-4" /></button></div>
      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
        <label className="sm:col-span-2"><span className="mb-1.5 block text-[9px] font-bold text-zinc-300">Nom du produit *</span><input value={name} onChange={(event) => setName(event.target.value)} maxLength={140} required className="kt-control w-full border px-3 py-3 text-xs" placeholder="Ex. coffret ou display de votre stock" /></label>
        <label><span className="mb-1.5 block text-[9px] font-bold text-zinc-300">Catégorie</span><select value={category} onChange={(event) => setCategory(event.target.value as ItemCategory)} className="kt-control w-full border px-3 py-3 text-xs">{ITEM_CATEGORIES.map((value) => <option key={value} value={value}>{ITEM_CATEGORY_LABELS[value]}</option>)}</select></label>
        <label><span className="mb-1.5 block text-[9px] font-bold text-zinc-300">Langue</span><select value={language} onChange={(event) => setLanguage(event.target.value as ItemLanguage)} className="kt-control w-full border px-3 py-3 text-xs">{ITEM_LANGUAGES.map((value) => <option key={value} value={value}>{ITEM_LANGUAGE_LABELS[value]}</option>)}</select></label>
        <label><span className="mb-1.5 block text-[9px] font-bold text-zinc-300">Code-barres</span><input value={barcode} onChange={(event) => setBarcode(event.target.value)} maxLength={32} className="kt-control w-full border px-3 py-3 text-xs" /></label>
        <label><span className="mb-1.5 block text-[9px] font-bold text-zinc-300">SKU / référence</span><input value={sku} onChange={(event) => setSku(event.target.value)} maxLength={64} className="kt-control w-full border px-3 py-3 text-xs" /></label>
        {error ? <p className="text-[10px] font-bold text-rose-300 sm:col-span-2">{error}</p> : null}
        <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-300 px-4 py-3 text-[9px] font-black uppercase tracking-[0.08em] text-[#061016] sm:col-span-2"><Plus className="h-4 w-4" /> Enregistrer l’item</button>
      </form>
    </section>
  );
}
