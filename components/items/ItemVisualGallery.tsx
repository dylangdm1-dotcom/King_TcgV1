"use client";

import { useEffect, useMemo, useState } from "react";
import type { SealedItem, SealedItemImage } from "@/lib/items/types";
import ItemImage from "./ItemImage";

function keyForImage(image: SealedItemImage) {
  return `${image.source || ""}:${image.large || image.small || ""}`;
}

export default function ItemVisualGallery({ item }: { item: SealedItem }) {
  const visuals = useMemo(() => {
    const candidates = item.galleryImages?.length ? item.galleryImages : item.images ? [item.images] : [];
    return Array.from(new Map(candidates
      .filter((image) => image.small || image.large)
      .map((image) => [keyForImage(image), image])).values());
  }, [item.galleryImages, item.images]);
  const [selected, setSelected] = useState(0);

  useEffect(() => setSelected(0), [item.id]);

  const selectedImage = visuals[selected] || item.images;
  const selectedItem = { ...item, images: selectedImage, imageCandidates: [] };

  return (
    <div className="space-y-3">
      <div className="kt-section-surface relative overflow-hidden rounded-[20px] border">
        <ItemImage item={selectedItem} className="aspect-square h-full w-full p-8" />
        {visuals.length > 1 ? (
          <span className="absolute bottom-3 right-3 rounded-full border border-cyan-300/20 bg-[#071019]/90 px-2.5 py-1 text-[9px] font-black text-cyan-200">
            Illustration {selected + 1}/{visuals.length}
          </span>
        ) : null}
      </div>

      {visuals.length > 1 ? (
        <div className="grid grid-cols-5 gap-2" aria-label="Illustrations regroupées du produit">
          {visuals.map((visual, index) => (
            <button
              key={keyForImage(visual)}
              type="button"
              onClick={() => setSelected(index)}
              aria-label={`Afficher l'illustration ${index + 1}`}
              aria-pressed={selected === index}
              className={`overflow-hidden rounded-xl border bg-[#0d151e] p-1 transition ${selected === index ? "border-cyan-300/65 ring-1 ring-cyan-300/25" : "border-white/[0.08] hover:border-cyan-300/30"}`}
            >
              <ItemImage
                item={{ ...item, id: `${item.id}:visual:${index}`, images: visual, galleryImages: undefined, imageCandidates: [] }}
                preferSmall
                className="aspect-square h-full w-full p-1"
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
