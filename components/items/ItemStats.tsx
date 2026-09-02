import { Bookmark, Boxes, PackageCheck, WalletCards } from "lucide-react";

export default function ItemStats({ catalog, personal, collection, favorites }: { catalog: number; personal: number; collection: number; favorites: number }) {
  const rows = [
    { label: "Catalogue", value: catalog, icon: PackageCheck },
    { label: "Mes références", value: personal, icon: Boxes },
    { label: "En collection", value: collection, icon: WalletCards },
    { label: "Favoris", value: favorites, icon: Bookmark },
  ];
  return <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">{rows.map(({ label, value, icon: Icon }) => <div key={label} className="kt-metric-tile flex min-h-[70px] items-center justify-between rounded-[15px] border px-3 py-2.5"><div><p className="text-[8px] font-black uppercase tracking-[0.08em] text-zinc-500">{label}</p><p className="mt-2 text-lg font-black text-white tabular-nums">{value}</p></div><Icon className="h-4 w-4 text-cyan-300" /></div>)}</section>;
}
