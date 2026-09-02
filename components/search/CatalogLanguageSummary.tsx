import { Database, Layers3, RefreshCw } from "lucide-react";

export default function CatalogLanguageSummary({ total, available, pending }: { total: number; available: number; pending: number }) {
  const rows = [
    { value: total, label: "extensions", Icon: Layers3, color: "text-cyan-300" },
    { value: available, label: "avec cartes", Icon: Database, color: "text-emerald-300" },
    { value: pending, label: "à compléter", Icon: RefreshCw, color: "text-amber-300" },
  ];
  return <div className="grid grid-cols-3 gap-1.5" aria-label="Couverture du catalogue sélectionné">{rows.map(({ value, label, Icon, color }) => <span key={label} className="rounded-xl border border-white/[0.07] bg-white/[0.025] px-2 py-2 text-center"><Icon className={`mx-auto h-3 w-3 ${color}`} /><strong className="mt-1 block text-[11px] text-white">{value}</strong><span className="block text-[8px] font-bold uppercase text-zinc-500">{label}</span></span>)}</div>;
}
