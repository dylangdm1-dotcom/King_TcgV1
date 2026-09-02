import { Filter, Search, X } from "lucide-react";
import { ITEM_CATEGORIES, ITEM_CATEGORY_LABELS, ITEM_LANGUAGES, ITEM_LANGUAGE_LABELS } from "@/lib/items/categories";
import type { ItemSearchFilters } from "@/lib/items/types";

export default function ItemToolbar({ filters, onChange, onReset }: { filters: ItemSearchFilters; onChange: (patch: Partial<ItemSearchFilters>) => void; onReset: () => void }) {
  const active = Boolean(filters.query || filters.language !== "all" || filters.category !== "all" || filters.availability !== "all" || filters.sort !== "newest");
  return (
    <section className="kt-toolbar space-y-3">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-cyan-300" />
        <input value={filters.query} onChange={(event) => onChange({ query: event.target.value })} placeholder="Rechercher un ETB, coffret, display, booster, UPC..." className="kt-control w-full border py-3 pl-11 pr-11 text-xs outline-none placeholder:text-zinc-500" />
        {filters.query ? <button type="button" onClick={() => onChange({ query: "" })} aria-label="Effacer la recherche" className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"><X className="h-4 w-4" /></button> : null}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <select value={filters.language} onChange={(event) => onChange({ language: event.target.value as ItemSearchFilters["language"] })} className="kt-control border px-3 py-2.5 text-[10px] font-bold text-white">
          <option value="all">Toutes langues</option>
          {ITEM_LANGUAGES.map((language) => <option key={language} value={language}>{ITEM_LANGUAGE_LABELS[language]}</option>)}
        </select>
        <select value={filters.category} onChange={(event) => onChange({ category: event.target.value as ItemSearchFilters["category"] })} className="kt-control border px-3 py-2.5 text-[10px] font-bold text-white">
          <option value="all">Toutes catégories</option>
          {ITEM_CATEGORIES.map((category) => <option key={category} value={category}>{ITEM_CATEGORY_LABELS[category]}</option>)}
        </select>
        <select value={filters.availability} onChange={(event) => onChange({ availability: event.target.value as ItemSearchFilters["availability"] })} className="kt-control border px-3 py-2.5 text-[10px] font-bold text-white">
          <option value="all">Toutes références</option>
          <option value="verified">Catalogue vérifié</option>
          <option value="personal">Mes références</option>
        </select>
        <select value={filters.sort} onChange={(event) => onChange({ sort: event.target.value as ItemSearchFilters["sort"] })} className="kt-control border px-3 py-2.5 text-[10px] font-bold text-white">
          <option value="newest">Plus récents</option>
          <option value="name">Nom A–Z</option>
          <option value="category">Catégorie</option>
        </select>
      </div>
      {active ? <button type="button" onClick={onReset} className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.08em] text-cyan-300"><Filter className="h-3 w-3" /> Réinitialiser les filtres</button> : null}
    </section>
  );
}
