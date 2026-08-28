import {
  buildPSACardIdentityV280,
  extractPSACardNumberV280,
  type PSALanguageV280,
} from "./identity";

export type PSAEbayListingV280 = {
  id: string;
  title: string;
  grade: number;
  price: number;
  imageUrl?: string;
  url: string;
  listedAt?: string;
  language?: PSALanguageV280;
  languageSignal: string;
  identityKey?: string;
  cardName?: string;
  cardNumber?: string;
  setName?: string;
  editionKey?: string;
  variantKey?: string;
};

export type PSAEbayGradeGroupV280<T extends PSAEbayListingV280 = PSAEbayListingV280> = {
  grade: number;
  count: number;
  min: number;
  median: number;
  max: number;
  listings: T[];
};

export type PSAEbayCardGroupV280<T extends PSAEbayListingV280 = PSAEbayListingV280> = {
  key: string;
  language: PSALanguageV280;
  title: string;
  setName: string;
  cardNumber: string;
  editionKey: string;
  variantKey: string;
  imageUrl?: string;
  listingCount: number;
  verifiedLanguageCount: number;
  referencePrice: number;
  latestListedAt?: string;
  grades: PSAEbayGradeGroupV280<T>[];
};

export function medianPSAPriceV280(values: number[]): number {
  const sorted = values.filter((value) => Number.isFinite(value) && value > 0).sort((a, b) => a - b);
  if (!sorted.length) return 0;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : Number(((sorted[middle - 1] + sorted[middle]) / 2).toFixed(2));
}

export function groupEbayPSAListingsV280<T extends PSAEbayListingV280>(
  listings: T[],
  query: string,
  requestedLanguage: PSALanguageV280
): PSAEbayCardGroupV280<T>[] {
  const uniqueListings = new Map<string, T>();
  for (const listing of listings) {
    if (listing.language && listing.language !== requestedLanguage) continue;
    const duplicateKey = listing.id || `${listing.url}|${listing.title}|${listing.price}`;
    if (!uniqueListings.has(duplicateKey)) uniqueListings.set(duplicateKey, listing);
  }

  const groups = new Map<string, T[]>();
  for (const listing of Array.from(uniqueListings.values())) {
    const identity = buildPSACardIdentityV280({
      language: listing.language || requestedLanguage,
      cardName: listing.cardName || query,
      setName: listing.setName,
      cardNumber: listing.cardNumber || extractPSACardNumberV280(listing.title),
      title: listing.title,
      query,
    });
    const key = listing.identityKey || identity.key;
    const current = groups.get(key) || [];
    current.push(listing);
    groups.set(key, current);
  }

  return Array.from(groups.entries()).map(([key, items]) => {
    const representative = items.find((item) => item.languageSignal !== "unknown") || items[0];
    const identity = buildPSACardIdentityV280({
      language: representative.language || requestedLanguage,
      cardName: representative.cardName || query,
      setName: representative.setName,
      cardNumber: representative.cardNumber || extractPSACardNumberV280(representative.title),
      title: representative.title,
      query,
    });
    const byGrade = new Map<number, T[]>();
    for (const item of items) {
      const gradeItems = byGrade.get(item.grade) || [];
      gradeItems.push(item);
      byGrade.set(item.grade, gradeItems);
    }

    const grades = Array.from(byGrade.entries())
      .map(([grade, gradeItems]) => {
        const prices = gradeItems.map((item) => item.price).filter((price) => price > 0);
        return {
          grade,
          count: gradeItems.length,
          min: prices.length ? Math.min(...prices) : 0,
          median: medianPSAPriceV280(prices),
          max: prices.length ? Math.max(...prices) : 0,
          listings: [...gradeItems].sort((left, right) => left.price - right.price),
        };
      })
      .sort((left, right) => right.grade - left.grade);

    return {
      key,
      language: identity.language,
      title: representative.cardName || identity.cardName,
      setName: representative.setName || identity.setName,
      cardNumber: representative.cardNumber || identity.cardNumber,
      editionKey: representative.editionKey || identity.edition,
      variantKey: representative.variantKey || identity.variant,
      imageUrl: items.find((item) => item.imageUrl)?.imageUrl,
      listingCount: items.length,
      verifiedLanguageCount: items.filter((item) => item.languageSignal !== "unknown").length,
      referencePrice: medianPSAPriceV280(items.map((item) => item.price)),
      latestListedAt: items.map((item) => item.listedAt || "").filter(Boolean).sort((a, b) => b.localeCompare(a))[0],
      grades,
    };
  });
}
