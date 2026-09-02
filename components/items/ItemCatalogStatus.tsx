import { Database, Image as ImageIcon, Languages, WifiOff } from "lucide-react";
import type { ItemCatalogManifest } from "@/lib/items/types";

export default function ItemCatalogStatus({ manifest, offline = false }: { manifest: ItemCatalogManifest | null; offline?: boolean }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
      <div className="kt-subpanel flex items-center gap-3 px-3 py-2.5"><Database className="h-4 w-4 text-cyan-300" /><div><p className="text-[8px] font-black uppercase tracking-[0.08em] text-zinc-500">Catalogue Items</p><p className="text-[10px] font-black text-white">{manifest?.itemCount ?? 0} produit{manifest?.itemCount === 1 ? "" : "s"} vérifié{manifest?.itemCount === 1 ? "" : "s"}</p></div></div>
      <div className="kt-subpanel flex items-center gap-3 px-3 py-2.5"><ImageIcon className="h-4 w-4 text-cyan-300" /><div><p className="text-[8px] font-black uppercase tracking-[0.08em] text-zinc-500">Visuels disponibles</p><p className="text-[10px] font-black text-white">{manifest?.imageCount ?? 0} visuel{manifest?.imageCount === 1 ? "" : "s"} EN</p></div></div>
      <div className="kt-subpanel flex items-center gap-3 px-3 py-2.5"><Languages className="h-4 w-4 text-amber-300" /><div><p className="text-[8px] font-black uppercase tracking-[0.08em] text-zinc-500">Catalogue français</p><p className="text-[10px] font-black text-white">FR propre · en préparation</p></div></div>
      <div className="kt-subpanel flex items-center gap-3 px-3 py-2.5"><WifiOff className={`h-4 w-4 ${manifest?.priceQuoteCount ? "text-emerald-300" : "text-zinc-400"}`} /><div><p className="text-[8px] font-black uppercase tracking-[0.08em] text-zinc-500">Cote scellée</p><p className="text-[10px] font-black text-white">{offline ? "Catalogue local indisponible" : manifest?.priceQuoteCount ? `${manifest.priceQuoteCount} cotes EN/US · USD` : "Source à connecter"}</p></div></div>
    </div>
  );
}
