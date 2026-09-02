import Link from "next/link";
import { PackageSearch, Plus } from "lucide-react";

export default function ItemEmptyState({ filtered = false, onCreate }: { filtered?: boolean; onCreate?: () => void }) {
  return (
    <div className="kt-empty-state-rich min-h-52">
      <PackageSearch className="h-8 w-8 text-cyan-300" />
      <p className="text-[12px] font-black text-white">{filtered ? "Aucun item ne correspond aux filtres." : "Le catalogue officiel Items n’est pas encore connecté."}</p>
      <p className="max-w-lg text-[10px] leading-5 text-zinc-400">
        {filtered ? "Réinitialisez la recherche ou ajoutez votre propre référence." : "V288 prépare le moteur sans inventer de produit, de visuel ou de prix. Vous pouvez déjà enregistrer vos produits personnels, les classer et les exporter."}
      </p>
      {onCreate ? <button type="button" onClick={onCreate} className="mt-2 inline-flex items-center gap-2 rounded-xl border border-cyan-300/25 bg-cyan-300/[0.07] px-4 py-2.5 text-[9px] font-black uppercase tracking-[0.08em] text-cyan-200"><Plus className="h-3.5 w-3.5" /> Ajouter une référence personnelle</button> : <Link href="/items" className="mt-2 text-[9px] font-black uppercase tracking-[0.08em] text-cyan-300">Ouvrir Items</Link>}
    </div>
  );
}
