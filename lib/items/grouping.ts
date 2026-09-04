import { slugifyItem } from "./identity";
import { normalizeItemText } from "./normalize";
import type { SealedItem, SealedItemImage, SealedItemPriceQuote } from "./types";

const ART_WORDS = "art|artwork|illustration|illustrations|visuel|visuels|design|cover|packaging|motif";
const ART_SUFFIX = new RegExp(`(?:[-–—:]\\s*)?(?:${ART_WORDS})\\b.*$`, "i");
const BRACKET_SUFFIX = /\s*[\[(][^\])]+[\])]\s*$/;

function isSingleBoosterName(normalized: string): boolean {
  if (!/\bbooster\b|\bbooster pack\b|\bpack booster\b/.test(normalized)) return false;
  return !/\bblister\b|\bbundle\b|\bcase\b|\bbox\b|\bdisplay\b|\bduo\b|\btripack\b|\btri pack\b|\bset of\b|\blot\b|\b[2-9]\s*pack\b|\bpack\s*(?:de|of)\s*[2-9]\b/.test(normalized);
}

function artFamilyName(item: SealedItem): string | null {
  const normalized = normalizeItemText(item.name);
  const miniTin = item.category === "tin" && /\bmini\s*tin\b/.test(normalized);
  const singleBooster = item.category === "booster" && isSingleBoosterName(normalized);
  const explicitArt = new RegExp(`\\b(?:${ART_WORDS})\\b`, "i").test(normalized) && (miniTin || singleBooster);
  if (!explicitArt && !miniTin && !singleBooster) return null;

  let base = item.name.trim().replace(ART_SUFFIX, "").trim();
  if (miniTin || singleBooster) base = base.replace(BRACKET_SUFFIX, "").trim();
  base = base.replace(/\s*[-–—:]\s*$/, "").trim();
  return base && normalizeItemText(base) !== normalized ? base : explicitArt ? base || item.name.trim() : null;
}

function imageKey(image: SealedItemImage): string {
  return `${image.source || ""}:${image.large || image.small || ""}`;
}

function mergeGalleryImages(items: readonly SealedItem[]): SealedItemImage[] {
  const images = items.flatMap((item) => item.galleryImages?.length ? item.galleryImages : item.images ? [item.images] : []);
  return Array.from(new Map(images
    .filter((image) => image.small || image.large)
    .map((image) => [imageKey(image), image])).values());
}

function unique<T>(values: readonly T[]): T[] {
  return Array.from(new Set(values));
}

function quoteKey(quote: SealedItemPriceQuote): string {
  return `${quote.source}:${quote.currency}:${quote.kind}`;
}

function mergeQuotes(items: readonly SealedItem[]): SealedItemPriceQuote[] | undefined {
  const quotes = new Map<string, SealedItemPriceQuote>();
  for (const quote of items.flatMap((item) => item.quotes || [])) {
    const key = quoteKey(quote);
    const previous = quotes.get(key);
    if (!previous || (quote.kind === "current_market" && quote.amount < previous.amount) || quote.updatedAt > previous.updatedAt) {
      quotes.set(key, quote);
    }
  }
  return quotes.size ? Array.from(quotes.values()) : undefined;
}

export function itemCatalogPathV301(item: Pick<SealedItem, "name" | "category" | "language" | "setIds">): string {
  const set = item.setIds?.find((value) => !value.includes(":")) || "hors-serie";
  return `${item.language}/items/${slugifyItem(`${set}-${item.category}-${item.name}`)}.json`;
}

export function frenchItemCatalogPathV300(item: Pick<SealedItem, "name" | "category" | "setIds">): string {
  return itemCatalogPathV301({ ...item, language: "fr" });
}

/**
 * Regroupe uniquement les variantes de façade clairement identifiées pour un
 * booster unitaire ou une Mini Tin. Un blister promo, un coffret ou un lot de
 * plusieurs boosters conserve toujours sa propre identité.
 */
export function groupItemsByPackagingV301(input: readonly SealedItem[]): SealedItem[] {
  const groups = new Map<string, SealedItem[]>();
  for (const item of input) {
    const eligibleLanguage = item.language === "fr" || item.language === "en";
    const family = eligibleLanguage ? artFamilyName(item) : null;
    const set = item.setIds?.find((value) => !value.includes(":")) || "hors-serie";
    const key = eligibleLanguage
      ? `product:${item.language}:${item.category}:${normalizeItemText(set)}:${normalizeItemText(family || item.name)}`
      : `item:${item.id}`;
    groups.set(key, [...(groups.get(key) || []), item]);
  }

  return Array.from(groups.entries()).map(([key, members]) => {
    const sorted = [...members].sort((left, right) => left.id.localeCompare(right.id, "en", { numeric: true }));
    const first = sorted[0];
    const family = key.startsWith("product:") ? artFamilyName(first) : null;
    const name = family || first.name;
    const slug = slugifyItem(`${first.language}-${first.category}-${first.setIds?.[0] || "hors-serie"}-${name}`);
    const galleryImages = mergeGalleryImages(sorted);
    const images = galleryImages[0];
    const imageCandidates = unique(sorted.flatMap((item) => [
      item.images?.small,
      item.images?.large,
      ...(item.imageCandidates || []),
    ].filter((value): value is string => Boolean(value))));
    const sources = Array.from(new Map(sorted.flatMap((item) => item.sources).map((source) => [
      `${source.provider}:${source.reference || source.url || ""}`,
      source,
    ])).values());
    const quotes = mergeQuotes(sorted);
    const groupedVariantNames = unique(sorted.map((item) => item.name));
    const grouped = sorted.length > 1;

    return {
      ...first,
      id: grouped ? `ktcg:item:packaging-group:${slug}` : first.id,
      slug: grouped ? slug : first.slug,
      catalogPath: itemCatalogPathV301({ ...first, name }),
      name,
      setIds: unique(sorted.flatMap((item) => item.setIds || [])),
      images,
      ...(galleryImages.length ? { galleryImages } : {}),
      ...(imageCandidates.length ? { imageCandidates } : {}),
      sources,
      ...(quotes ? { quotes, priceStatus: "available" as const } : {}),
      ...(grouped ? {
        groupedVariantCount: sorted.length,
        groupedVariantNames,
        description: `${first.description || "Produit scellé Pokémon."} ${sorted.length} fiches fournisseur équivalentes ou variantes d’illustration regroupées sous une seule référence ; le contenu et la cote concernent le même type de produit.`,
      } : {}),
    };
  });
}

/** Alias conservé pour les scripts d'audit des versions précédentes. */
export function groupFrenchItemsByPackagingV300(input: readonly SealedItem[]): SealedItem[] {
  return groupItemsByPackagingV301(input);
}
