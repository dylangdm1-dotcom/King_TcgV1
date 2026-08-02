// components/SearchFilters.tsx
"use client";

import type { SearchFilters } from "../lib/search";
import type { CardCondition } from "../lib/types";

type Props = {
  filters: SearchFilters;
  onChange: (filters: SearchFilters) => void;
  sets: string[];
};

const CONDITIONS = [
  { value: "Mint", label: "Mint" },
  { value: "Near Mint", label: "Near Mint" },
  { value: "Excellent", label: "Excellent" },
  { value: "Good", label: "Good" },
  { value: "Light Played", label: "Light Played" },
  { value: "Played", label: "Played" },
  { value: "Poor", label: "Poor" },
] as const;

export default function SearchFiltersComponent({
  filters,
  onChange,
  sets,
}: Props) {
  return (
    <div className="grid grid-cols-1 gap-3 rounded-xl border border-zinc-900 bg-neutral-950/20 p-3 my-6 sm:grid-cols-2 lg:grid-cols-5">
      {/* Catégorie */}
      <select
        aria-label="Catégorie"
        className="h-10 rounded-xl border border-zinc-900 bg-neutral-950 px-3 text-xs font-bold text-zinc-300 outline-none transition-all duration-150 cursor-pointer focus:border-cyan-500/30 focus:text-white"
        value={filters.category ?? "all"}
        onChange={(event) =>
          onChange({
            ...filters,
            category: event.target.value,
          })
        }
      >
        <option value="all">Toutes les catégories</option>
        <option value="pokemon">Pokémon</option>
        <option value="trainer">Dresseurs</option>
        <option value="energy">Énergies</option>
      </select>

      {/* Rareté */}
      <select
        aria-label="Rareté"
        className="h-10 rounded-xl border border-zinc-900 bg-neutral-950 px-3 text-xs font-bold text-zinc-300 outline-none transition-all duration-150 cursor-pointer focus:border-cyan-500/30 focus:text-white"
        value={filters.rarity ?? "all"}
        onChange={(event) =>
          onChange({
            ...filters,
            rarity: event.target.value,
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

      {/* État de la carte */}
      <select
        aria-label="État de la carte"
        className="h-10 rounded-xl border border-zinc-900 bg-neutral-950 px-3 text-xs font-bold text-cyan-400 outline-none transition-all duration-150 cursor-pointer focus:border-cyan-500/30 focus:text-white"
        value={filters.condition ?? "Near Mint"}
        onChange={(event) =>
          onChange({
            ...filters,
            condition: event.target.value as CardCondition,
          })
        }
      >
        {CONDITIONS.map((condition) => (
          <option key={condition.value} value={condition.value}>
            {condition.label}
          </option>
        ))}
      </select>

      {/* Tri */}
      <select
        aria-label="Trier les cartes"
        className="h-10 rounded-xl border border-zinc-900 bg-neutral-950 px-3 text-xs font-bold text-zinc-300 outline-none transition-all duration-150 cursor-pointer focus:border-cyan-500/30 focus:text-white"
        value={filters.sort ?? "recent"}
        onChange={(event) =>
          onChange({
            ...filters,
            sort: event.target.value as SearchFilters["sort"],
          })
        }
      >
        <option value="recent">Plus récentes</option>
        <option value="name">Nom A → Z</option>
        <option value="price-desc">Prix décroissant</option>
        <option value="price-asc">Prix croissant</option>
      </select>

      {/* Extension */}
      <select
        aria-label="Extension"
        className="h-10 rounded-xl border border-zinc-900 bg-neutral-950 px-3 text-xs font-bold text-zinc-300 outline-none transition-all duration-150 cursor-pointer focus:border-cyan-500/30 focus:text-white"
        value={filters.set ?? "all"}
        onChange={(event) =>
          onChange({
            ...filters,
            set: event.target.value,
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