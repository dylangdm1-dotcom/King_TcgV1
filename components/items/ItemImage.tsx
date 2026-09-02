"use client";

import { useMemo, useState } from "react";
import { ImageOff, PackageOpen } from "lucide-react";
import type { SealedItem } from "@/lib/items/types";

export default function ItemImage({ item, className = "" }: { item: SealedItem; className?: string }) {
  const candidates = useMemo(() => Array.from(new Set([
    item.images?.large,
    item.images?.small,
    ...(item.imageCandidates || []),
  ].filter(Boolean))) as string[], [item.imageCandidates, item.images?.large, item.images?.small]);
  const [index, setIndex] = useState(0);
  const src = candidates[index];

  if (!src) {
    return (
      <div className={`flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-cyan-300/[0.06] to-amber-300/[0.035] text-zinc-400 ${className}`}>
        <PackageOpen className="h-9 w-9 text-cyan-300/70" />
        <span className="flex items-center gap-1 text-[8px] font-bold uppercase tracking-[0.08em]"><ImageOff className="h-3 w-3" /> Visuel non disponible</span>
      </div>
    );
  }

  return (
    // Les URLs sont internes à King_TCG ; le serveur contrôle et met en cache la source autorisée.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={item.name}
      className={`object-contain ${className}`}
      onError={() => setIndex((current) => current + 1)}
    />
  );
}
