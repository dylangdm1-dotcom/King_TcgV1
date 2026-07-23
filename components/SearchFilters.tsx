"use client";

import type { SearchFilters } from "../lib/search";

type Props = {
  filters: SearchFilters;
  onChange: (filters: SearchFilters) => void;
  sets: string[];
};

export default function SearchFiltersComponent({
  filters,
  onChange,
  sets,
}: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-3 my-6 rounded-xl border border-zinc-900 bg-neutral-950/20">
      
      {/* Catégories */}
      <select
        className="h-10 px-3 rounded-xl border border-zinc-900 bg-neutral-950 text-zinc-300 text-xs font-bold cursor-pointer outline-none transition-all duration-150 focus:border-cyan-500/30 focus:text-white"
        value={filters.category ?? "all"}
        onChange={(e) =>
          onChange({
            ...filters,
            category: e.target.value,
          })
        }
      >
        <option value="all">Toutes les catégories</option>
        <option value="pokemon">Pokémon</option>
        <option value="trainer">Dresseurs</option>
        <option value="energy">Énergies</option>
      </select>

      {/* Raretés */}
      <select
        className="h-10 px-3 rounded-xl border border-zinc-900 bg-neutral-950 text-zinc-300 text-xs font-bold cursor-pointer outline-none transition-all duration-150 focus:border-cyan-500/30 focus:text-white"
        value={filters.rarity ?? "all"}
        onChange={(e) =>
          onChange({
            ...filters,
            rarity: e.target.value,
          })
        }
      >
        <option value="all">Toutes raretés</option>
        <option value="Common">Commune</option>
        <option value="Uncommon">Peu commune</option>
        <option value="Rare">Rare</option>
        <option value="Ultra">Ultra Rare</option>
        <option value="Secret">Secret Rare</option>
        <option value="Illustration">Illustration Rare</option>
      </select>

      {/* Tri */}
      <select
        className="h-10 px-3 rounded-xl border border-zinc-900 bg-neutral-950 text-zinc-300 text-xs font-bold cursor-pointer outline-none transition-all duration-150 focus:border-cyan-500/30 focus:text-white"
        value={filters.sort ?? "recent"}
        onChange={(e) =>
          onChange({
            ...filters,
            sort: e.target.value as SearchFilters["sort"],
          })
        }
      >
        <option value="recent">Plus récentes</option>
        <option value="name">Nom A → Z</option>
        <option value="price-desc">Prix décroissant</option>
        <option value="price-asc">Prix croissant</option>
      </select>

      {/* Extensions */}
      <select
        className="h-10 px-3 rounded-xl border border-zinc-900 bg-neutral-950 text-zinc-300 text-xs font-bold cursor-pointer outline-none transition-all duration-150 focus:border-cyan-500/30 focus:text-white"
        value={filters.set ?? "all"}
        onChange={(e) =>
          onChange({
            ...filters,
            set: e.target.value,
          })
        }
      >
        <option value="all">Toutes extensions</option>
        {sets.map((set) => (
          <option key={set} value={set}>
            {set}
          </option>
        ))}
      </select>

    </div>
  );
}