import { Database, ShieldCheck, WifiOff } from "lucide-react";
import type { ItemCatalogManifest } from "@/lib/items/types";

export default function ItemCatalogStatus({ manifest, offline = false }: { manifest: ItemCatalogManifest | null; offline?: boolean }) {
  return (
    <div className="grid gap-2 sm:grid-cols-3">
      <div className="kt-subpanel flex items-center gap-3 px-3 py-2.5"><Database className="h-4 w-4 text-cyan-300" /><div><p className="text-[8px] font-black uppercase tracking-[0.08em] text-zinc-500">Catalogue Items</p><p className="text-[10px] font-black text-white">{manifest?.itemCount ?? 0} produit vérifié</p></div></div>
      <div className="kt-subpanel flex items-center gap-3 px-3 py-2.5"><ShieldCheck className="h-4 w-4 text-amber-300" /><div><p className="text-[8px] font-black uppercase tracking-[0.08em] text-zinc-500">Accès prévu</p><p className="text-[10px] font-black text-white">Premium et PRO</p></div></div>
      <div className="kt-subpanel flex items-center gap-3 px-3 py-2.5"><WifiOff className="h-4 w-4 text-zinc-400" /><div><p className="text-[8px] font-black uppercase tracking-[0.08em] text-zinc-500">Cote scellée</p><p className="text-[10px] font-black text-white">{offline ? "Catalogue local indisponible" : "Source à connecter"}</p></div></div>
    </div>
  );
}
