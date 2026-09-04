import type { SealedItem } from "./types";
import bundledManifest from "@/public/data/items-v1/images/en/manifest.json";

const bundled = new Set(bundledManifest.entries.map((entry) => `${entry.sku}:${entry.size}`));

/**
 * Les visuels EN vérifiés sont livrés avec King_TCG : aucune requête TCGplayer
 * n'est nécessaire pour afficher la grille ou la fiche d'un produit connu.
 */
export function withBundledItemImagesV304(item: SealedItem): SealedItem {
  if (item.language !== "en" || !/^\d{1,12}$/.test(String(item.sku || ""))) return item;
  const root = `/data/items-v1/images/en/${item.sku}`;
  if (!bundled.has(`${item.sku}:small`) || !bundled.has(`${item.sku}:large`)) return item;
  const previous = [
    item.images?.small,
    item.images?.large,
    ...(item.imageCandidates || []),
  ].filter((value): value is string => Boolean(value));
  return {
    ...item,
    images: { small: `${root}-small.jpg`, large: `${root}-large.jpg`, source: "king-tcg-bundled" },
    imageCandidates: Array.from(new Set(previous)),
  };
}
