"use client";

import Image from "next/image";
import Link from "next/link";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, CheckCircle2, Download, Eye, ImageOff, KeyRound, Loader2, Search, ShieldCheck } from "lucide-react";
import {
  buildCardTraderReviewExportV295,
  cardTraderReviewFilenameV295,
  type CardTraderPreviewResponseV295,
  type CardTraderReferenceResponseV295,
} from "@/lib/items/cardtrader-review";
import type { CardTraderExpansion, CardTraderFrenchItemCandidate } from "@/lib/items/sources/cardtrader-types";

type Busy = "search" | "preview" | `image:${number}` | null;

async function message(response: Response): Promise<string> {
  try {
    const payload = await response.json();
    return String(payload?.error || `Erreur HTTP ${response.status}`);
  } catch {
    return `Erreur HTTP ${response.status}`;
  }
}

export default function CardTraderReviewConsole() {
  const [token, setToken] = useState("");
  const [query, setQuery] = useState("");
  const [expansions, setExpansions] = useState<CardTraderExpansion[]>([]);
  const [selectedExpansion, setSelectedExpansion] = useState<CardTraderExpansion | null>(null);
  const [preview, setPreview] = useState<CardTraderPreviewResponseV295 | null>(null);
  const [approved, setApproved] = useState<Set<number>>(new Set());
  const [names, setNames] = useState<Record<number, string>>({});
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [visuals, setVisuals] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState("");
  const visualUrls = useRef<string[]>([]);

  useEffect(() => () => { visualUrls.current.forEach((url) => URL.revokeObjectURL(url)); }, []);

  const candidates = useMemo(() => preview?.candidates || [], [preview]);
  const approvedCount = useMemo(() => candidates.filter((candidate) => approved.has(candidate.blueprintId)).length, [approved, candidates]);

  const headers = () => ({ "x-king-tcg-cache-token": token.trim() });

  async function searchExpansions(event: FormEvent) {
    event.preventDefault();
    if (!token.trim()) { setError("Entre d’abord le token propriétaire KING_TCG_CACHE_STATUS_TOKEN."); return; }
    setBusy("search"); setError(""); setPreview(null); setSelectedExpansion(null);
    try {
      const response = await fetch(`/api/items/cardtrader/preview?q=${encodeURIComponent(query.trim())}`, { headers: headers(), cache: "no-store" });
      if (!response.ok) throw new Error(await message(response));
      const payload = await response.json() as CardTraderReferenceResponseV295;
      setExpansions(payload.expansions || []);
    } catch (reason) {
      setExpansions([]);
      setError(reason instanceof Error ? reason.message : "Recherche CardTrader impossible.");
    } finally {
      setBusy(null);
    }
  }

  async function loadPreview(expansion: CardTraderExpansion) {
    setBusy("preview"); setError(""); setSelectedExpansion(expansion); setPreview(null); setApproved(new Set()); setNames({}); setNotes({});
    visualUrls.current.forEach((url) => URL.revokeObjectURL(url));
    visualUrls.current = [];
    setVisuals({});
    try {
      const response = await fetch("/api/items/cardtrader/preview", {
        method: "POST",
        headers: { ...headers(), "Content-Type": "application/json" },
        body: JSON.stringify({ expansionId: expansion.id }),
        cache: "no-store",
      });
      if (!response.ok) throw new Error(await message(response));
      const payload = await response.json() as CardTraderPreviewResponseV295;
      setPreview(payload);
      const defaults: Record<number, string> = {};
      (payload.candidates || []).forEach((candidate) => { defaults[candidate.blueprintId] = candidate.name; });
      setNames(defaults);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Prévisualisation impossible.");
    } finally {
      setBusy(null);
    }
  }

  async function loadVisual(candidate: CardTraderFrenchItemCandidate) {
    if (!candidate.imageUrl || visuals[candidate.blueprintId]) return;
    setBusy(`image:${candidate.blueprintId}`); setError("");
    try {
      const response = await fetch("/api/items/cardtrader/image", {
        method: "POST",
        headers: { ...headers(), "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: candidate.imageUrl }),
        cache: "no-store",
      });
      if (!response.ok) throw new Error(await message(response));
      const objectUrl = URL.createObjectURL(await response.blob());
      visualUrls.current.push(objectUrl);
      setVisuals((current) => ({ ...current, [candidate.blueprintId]: objectUrl }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Visuel indisponible.");
    } finally {
      setBusy(null);
    }
  }

  function toggle(candidate: CardTraderFrenchItemCandidate) {
    setApproved((current) => {
      const next = new Set(current);
      if (next.has(candidate.blueprintId)) next.delete(candidate.blueprintId);
      else next.add(candidate.blueprintId);
      return next;
    });
  }

  function selectVisualCandidates() {
    setApproved(new Set(candidates.filter((candidate) => candidate.imageUrl).map((candidate) => candidate.blueprintId)));
  }

  function exportApproved() {
    if (!selectedExpansion || !approvedCount) return;
    const payload = buildCardTraderReviewExportV295({ expansion: selectedExpansion, candidates, approvedIds: approved, names, notes });
    const blob = new Blob([`${JSON.stringify(payload, null, 2)}\n`], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = cardTraderReviewFilenameV295(selectedExpansion);
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="kt-page-wrap space-y-5">
      <Link href="/items" className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.08em] text-cyan-300"><ArrowLeft className="h-4 w-4" /> Retour aux Items</Link>
      <header className="kt-page-header kt-hero-surface border">
        <div className="flex items-start gap-3"><span className="kt-page-icon flex shrink-0 items-center justify-center text-amber-300"><ShieldCheck className="h-5 w-5" /></span><div><p className="text-[8px] font-black uppercase tracking-[0.12em] text-amber-300">V295 · Outil propriétaire</p><h1 className="kt-page-title mt-1">Validation des <span className="text-cyan-300">Items FR</span></h1><p className="kt-page-subtitle mt-1 max-w-2xl">Prévisualise les données CardTrader, contrôle réellement le produit et son emballage, puis exporte uniquement les références approuvées. Rien n’est publié directement.</p></div></div>
      </header>

      <section className="kt-section-surface rounded-[18px] border p-4">
        <div className="mb-3 flex items-start gap-3"><KeyRound className="mt-0.5 h-4 w-4 text-amber-300" /><div><p className="text-[10px] font-black text-white">Accès propriétaire temporaire</p><p className="mt-1 text-[9px] leading-4 text-zinc-400">Le token reste uniquement en mémoire dans cet onglet. Il n’est ni enregistré dans le stockage navigateur ni inclus dans l’export.</p></div></div>
        <input type="password" value={token} onChange={(event) => setToken(event.target.value)} autoComplete="off" placeholder="KING_TCG_CACHE_STATUS_TOKEN" className="w-full rounded-[12px] border border-white/[0.08] bg-black/20 px-3 py-3 text-[10px] text-white outline-none focus:border-cyan-300/35" />
      </section>

      <form onSubmit={searchExpansions} className="kt-section-surface rounded-[18px] border p-4">
        <label className="text-[9px] font-black uppercase tracking-[0.09em] text-cyan-300">Rechercher une extension CardTrader</label>
        <div className="mt-3 flex gap-2"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ex. Mega Evolution, Phantasmal Flames…" className="min-w-0 flex-1 rounded-[12px] border border-white/[0.08] bg-black/20 px-3 py-3 text-[10px] text-white outline-none focus:border-cyan-300/35" /><button disabled={busy !== null} className="inline-flex items-center justify-center gap-2 rounded-[12px] border border-cyan-300/25 bg-cyan-300/[0.08] px-4 text-[9px] font-black uppercase tracking-[0.08em] text-cyan-200 disabled:opacity-50">{busy === "search" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Rechercher</button></div>
      </form>

      {error ? <div className="rounded-[14px] border border-rose-300/20 bg-rose-300/[0.05] px-4 py-3 text-[10px] text-rose-200">{error}</div> : null}

      {expansions.length ? <section className="kt-section-surface rounded-[18px] border p-4"><p className="text-[9px] font-black uppercase tracking-[0.09em] text-white">Extensions trouvées · {expansions.length}</p><div className="mt-3 flex max-h-52 flex-wrap gap-2 overflow-y-auto">{expansions.map((expansion) => <button key={expansion.id} type="button" disabled={busy !== null} onClick={() => loadPreview(expansion)} className={`rounded-[11px] border px-3 py-2 text-left text-[9px] transition ${selectedExpansion?.id === expansion.id ? "border-cyan-300/45 bg-cyan-300/[0.1] text-cyan-200" : "border-white/[0.07] bg-white/[0.025] text-zinc-300 hover:border-cyan-300/20"}`}><span className="font-black">{expansion.code || `#${expansion.id}`}</span> · {expansion.name}</button>)}</div></section> : null}

      {busy === "preview" ? <div className="flex items-center justify-center gap-2 py-10 text-[10px] text-cyan-300"><Loader2 className="h-4 w-4 animate-spin" /> Chargement des candidats FR…</div> : null}

      {preview && selectedExpansion ? <section className="space-y-4">
        <div className="kt-section-surface flex flex-col gap-3 rounded-[18px] border p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-[10px] font-black text-white">{selectedExpansion.code} · {selectedExpansion.name}</p><p className="mt-1 text-[9px] text-zinc-400">{candidates.length} candidat(s) · {preview.coverage?.withImage || 0} avec visuel · {preview.coverage?.withEurPrice || 0} avec cote EUR</p></div><div className="flex flex-wrap gap-2"><button type="button" onClick={selectVisualCandidates} className="rounded-[10px] border border-white/[0.08] px-3 py-2 text-[8px] font-black uppercase tracking-[0.07em] text-zinc-300">Sélectionner avec visuel</button><button type="button" disabled={!approvedCount} onClick={exportApproved} className="inline-flex items-center gap-2 rounded-[10px] border border-cyan-300/25 bg-cyan-300/[0.08] px-3 py-2 text-[8px] font-black uppercase tracking-[0.07em] text-cyan-200 disabled:opacity-40"><Download className="h-3.5 w-3.5" /> Exporter {approvedCount}</button></div></div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{candidates.map((candidate) => {
          const selected = approved.has(candidate.blueprintId);
          const visual = visuals[candidate.blueprintId];
          return <article key={candidate.blueprintId} className={`overflow-hidden rounded-[17px] border ${selected ? "border-cyan-300/35 bg-cyan-300/[0.035]" : "border-white/[0.07] bg-white/[0.02]"}`}>
            <div className="relative flex aspect-[1.35] items-center justify-center bg-black/20 p-3">{visual ? <Image src={visual} alt={candidate.name} fill unoptimized className="object-contain p-3" /> : candidate.imageUrl ? <button type="button" disabled={busy !== null} onClick={() => loadVisual(candidate)} className="inline-flex items-center gap-2 rounded-[11px] border border-cyan-300/20 px-3 py-2 text-[8px] font-black uppercase tracking-[0.07em] text-cyan-200">{busy === `image:${candidate.blueprintId}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />} Charger le visuel</button> : <span className="flex items-center gap-2 text-[9px] text-zinc-500"><ImageOff className="h-4 w-4" /> Aucun visuel fournisseur</span>}</div>
            <div className="space-y-3 p-3"><div><p className="text-[8px] font-black uppercase tracking-[0.08em] text-cyan-300">{candidate.categoryName} · #{candidate.blueprintId}</p><p className="mt-1 text-[11px] font-black leading-4 text-white">{candidate.name}</p><p className="mt-1 text-[9px] text-zinc-400">{candidate.frenchOffers} offre(s) FR · quantité {candidate.availableQuantity} · {candidate.lowestEur === undefined ? "cote EUR absente" : `${candidate.lowestEur.toFixed(2)} € minimum`}</p></div>
              <input value={names[candidate.blueprintId] || ""} onChange={(event) => setNames((current) => ({ ...current, [candidate.blueprintId]: event.target.value }))} placeholder="Nom français validé" className="w-full rounded-[10px] border border-white/[0.07] bg-black/20 px-3 py-2 text-[9px] text-white outline-none focus:border-cyan-300/30" />
              <input value={notes[candidate.blueprintId] || ""} onChange={(event) => setNotes((current) => ({ ...current, [candidate.blueprintId]: event.target.value }))} placeholder="Note de contrôle facultative" className="w-full rounded-[10px] border border-white/[0.07] bg-black/20 px-3 py-2 text-[9px] text-white outline-none focus:border-cyan-300/30" />
              <button type="button" onClick={() => toggle(candidate)} className={`flex w-full items-center justify-center gap-2 rounded-[11px] border px-3 py-2.5 text-[8px] font-black uppercase tracking-[0.08em] ${selected ? "border-cyan-300/35 bg-cyan-300/[0.1] text-cyan-200" : "border-white/[0.08] text-zinc-400"}`}><CheckCircle2 className="h-4 w-4" /> {selected ? "Item approuvé" : "Approuver cet Item"}</button>
            </div>
          </article>;
        })}</div>
      </section> : null}
    </div>
  );
}
