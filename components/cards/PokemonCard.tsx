"use client";

import { Heart } from "lucide-react";

type Props = {
  id?: string;
  name: string;
  image: string;
  set: string;
  price?: number;
  rarity: string;
};

export default function PokemonCard({
  name,
  image,
  set,
  price,
  rarity,
}: Props) {
  // Détermination technique du style du badge selon la rareté
  const rarityBadgeStyles = (() => {
    const r = rarity.toLowerCase();
    if (r.includes("secret") || r.includes("hyper") || r.includes("illustration")) {
      return "border-cyan-500/20 bg-cyan-500/10 text-cyan-400";
    }
    if (r.includes("ultra") || r.includes("rare")) {
      return "border-zinc-700 bg-zinc-800 text-zinc-300";
    }
    return "border-zinc-800 bg-neutral-900 text-zinc-500";
  })();

  return (
    <div className="group relative overflow-hidden rounded-xl border border-zinc-900 bg-neutral-950/40 p-3 transition-all duration-200 hover:border-cyan-500/30 hover:bg-neutral-950/60">
      
      {/* Zone Image Technique */}
      <div className="relative aspect-[0.72] w-full overflow-hidden rounded-lg bg-neutral-950 border border-zinc-900/50 flex items-center justify-center p-2">
        <img
          src={image}
          alt={name}
          loading="lazy"
          className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-[1.02]"
        />

        {/* Badge Rareté Supérieur */}
        <div className={`absolute top-2 right-2 rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider border backdrop-blur-md ${rarityBadgeStyles}`}>
          {rarity}
        </div>
      </div>

      {/* Métriques & Contenu */}
      <div className="mt-3 space-y-2.5">
        <div>
          <h3 className="truncate text-xs font-bold text-white transition-colors group-hover:text-cyan-400">
            {name}
          </h3>
          
          <p className="mt-0.5 truncate text-[11px] font-medium text-zinc-500">
            {set}
          </p>
        </div>

        {/* Section Cotation de marché et Action Favori */}
        <div className="flex items-center justify-between border-t border-zinc-900 pt-2.5">
          <div>
            <p className="text-[9px] font-black uppercase tracking-wider text-zinc-600">
              Index prix
            </p>
            <span className="mt-0.5 block text-sm font-black tracking-tight text-white tabular-nums">
              {price && price > 0 ? `${price.toFixed(2)} €` : "—"}
            </span>
          </div>

          {/* Bouton Suivi / Favori Technique */}
          <button 
            type="button"
            className="flex h-6 w-6 items-center justify-center rounded-md border border-zinc-900 bg-neutral-950 text-zinc-500 transition-all duration-200 hover:border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-400 active:scale-95 cursor-pointer"
          >
            <Heart className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

    </div>
  );
}