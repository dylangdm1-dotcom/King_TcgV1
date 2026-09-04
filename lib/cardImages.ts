import type { PokemonCard } from "./types";

/** Utilise les miniatures dans les grilles; la HD reste réservée à la fiche. */
export function toCardThumbnailUrl(value?: string | null): string {
  const url = String(value || "").trim();
  if (!url) return "";

  if (url.includes("assets.tcgdex.net")) {
    return url
      .replace(/\/high\.webp(?:\?.*)?$/i, "/low.webp")
      .replace(/\/high\.png(?:\?.*)?$/i, "/low.png");
  }

  if (url.startsWith("/api/catalog/image?")) {
    try {
      const parsed = new URL(url, "https://king-tcg.local");
      parsed.searchParams.set("size", "low");
      return `${parsed.pathname}?${parsed.searchParams.toString()}`;
    } catch {
      return url;
    }
  }

  return url.replace(/_in_1000x1000\.jpg(?:\?.*)?$/i, "_200w.jpg");
}

export function cardThumbnailCandidates(card: PokemonCard): string[] {
  const raw = [card.images?.small, ...(card.imageCandidates || []), card.images?.large]
    .filter((url): url is string => Boolean(url));
  const low = raw.map(toCardThumbnailUrl).filter(Boolean);
  return Array.from(new Set([...low, ...raw, "/placeholder.png"]));
}
