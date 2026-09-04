import "server-only";
import { normalizeItemText } from "../normalize";
import type { ItemCategory } from "../types";
import { cardTraderGet } from "./cardtrader";
import type {
  CardTraderBlueprint,
  CardTraderCategory,
  CardTraderExpansion,
  CardTraderFrenchItemCandidate,
  CardTraderGame,
  CardTraderMarketplaceProduct,
  CardTraderMarketplaceProducts,
  CardTraderSealedCategory,
} from "./cardtrader-types";

const CATEGORY_RULES: Array<{ pattern: RegExp; category: ItemCategory }> = [
  { pattern: /booster box|display/, category: "booster_box" },
  { pattern: /elite trainer|etb/, category: "etb" },
  { pattern: /bundle|fat pack/, category: "bundle" },
  { pattern: /blister|booster/, category: "booster" },
  { pattern: /tin/, category: "tin" },
  { pattern: /preconstructed|starter|theme deck|deck/, category: "deck" },
  { pattern: /box set|box|collection/, category: "collection_box" },
  { pattern: /complete set/, category: "special_collection" },
];

const EXCLUDED_CATEGORY = /single|oversized|token|sleeve|playmat|album|binder|dice|storage|empty/i;

function list<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const key of ["data", "results", "games", "items", "categories", "expansions", "blueprints"]) {
      if (Array.isArray(record[key])) return record[key] as T[];
    }
  }
  return [];
}

function positiveInteger(value: unknown): number | null {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

function categoryFor(name: string): ItemCategory | null {
  const normalized = normalizeItemText(name);
  if (!normalized || EXCLUDED_CATEGORY.test(normalized)) return null;
  return CATEGORY_RULES.find((rule) => rule.pattern.test(normalized))?.category || null;
}

export function safeCardTraderImage(url: unknown): { url?: string; host?: string } {
  try {
    const parsed = new URL(String(url || ""));
    if (parsed.protocol !== "https:") return {};
    const host = parsed.hostname.toLowerCase();
    if (host !== "cardtrader.com" && !host.endsWith(".cardtrader.com")) return {};
    return { url: parsed.toString(), host };
  } catch {
    return {};
  }
}

function offerLanguage(product: CardTraderMarketplaceProduct): string {
  const properties = product.properties_hash || {};
  const entry = Object.entries(properties).find(([key]) => /language/i.test(key));
  return normalizeItemText(entry?.[1]);
}

function frenchOffers(products: CardTraderMarketplaceProducts, blueprintId: number): CardTraderMarketplaceProduct[] {
  return list<CardTraderMarketplaceProduct>(products[String(blueprintId)])
    .filter((product) => !product.graded && !product.on_vacation)
    .filter((product) => {
      const language = offerLanguage(product);
      return !language || language === "fr" || language === "french" || language === "francais";
    });
}

function euroPrice(product: CardTraderMarketplaceProduct): number | null {
  const cents = Number(product.price?.cents);
  if (!Number.isFinite(cents) || cents < 0 || String(product.price?.currency || "").toUpperCase() !== "EUR") return null;
  return Math.round(cents) / 100;
}

export async function loadCardTraderPokemonReference() {
  const games = list<CardTraderGame>(await cardTraderGet<CardTraderGame[]>("/games"));
  // CardTrader documente Pokémon avec game_id=5. Le repli évite qu'un champ
  // de libellé absent ou une enveloppe de réponse modifiée bloque tout le
  // catalogue FR alors que les routes catégories/extensions restent valides.
  const pokemon = games.find((game) => normalizeItemText(`${game.name} ${game.display_name}`).includes("pokemon")) ||
    games.find((game) => Number(game.id) === 5) ||
    { id: 5, name: "Pokemon", display_name: "Pokémon" };
  if (!pokemon || !positiveInteger(pokemon.id)) throw new Error("cardtrader_pokemon_game_missing");

  const [rawCategories, rawExpansions] = await Promise.all([
    cardTraderGet<CardTraderCategory[]>("/categories", { game_id: pokemon.id }),
    cardTraderGet<CardTraderExpansion[]>("/expansions"),
  ]);
  const categories = list<CardTraderCategory>(rawCategories)
    .filter((category) => Number(category.game_id) === pokemon.id)
    .map((category): CardTraderSealedCategory | null => {
      const itemCategory = categoryFor(category.name);
      return itemCategory ? { id: category.id, name: category.name, itemCategory } : null;
    })
    .filter((category): category is CardTraderSealedCategory => Boolean(category));
  const expansions = list<CardTraderExpansion>(rawExpansions)
    .filter((expansion) => Number(expansion.game_id) === pokemon.id && positiveInteger(expansion.id));

  if (!categories.length) throw new Error("cardtrader_pokemon_sealed_categories_missing");
  if (!expansions.length) throw new Error("cardtrader_pokemon_expansions_missing");

  return { game: pokemon, categories, expansions };
}

type CardTraderPokemonReference = Awaited<ReturnType<typeof loadCardTraderPokemonReference>>;

async function previewFrenchExpansionFromReference(reference: CardTraderPokemonReference, expansionId: number) {
  const expansion = reference.expansions.find((candidate) => candidate.id === expansionId);
  if (!expansion) throw new Error("cardtrader_expansion_not_found");

  const [rawBlueprints, rawProducts] = await Promise.all([
    cardTraderGet<CardTraderBlueprint[]>("/blueprints/export", { expansion_id: expansionId }),
    cardTraderGet<CardTraderMarketplaceProducts>("/marketplace/products", { expansion_id: expansionId, language: "fr" }),
  ]);
  const categoryMap = new Map(reference.categories.map((category) => [category.id, category]));
  const products = rawProducts && typeof rawProducts === "object" && !Array.isArray(rawProducts) ? rawProducts : {};

  const candidates = list<CardTraderBlueprint>(rawBlueprints).flatMap((blueprint): CardTraderFrenchItemCandidate[] => {
    const category = categoryMap.get(Number(blueprint.category_id));
    if (!category || Number(blueprint.game_id) !== reference.game.id || Number(blueprint.expansion_id) !== expansionId) return [];
    const offers = frenchOffers(products, blueprint.id);
    if (!offers.length) return [];
    const prices = offers.map(euroPrice).filter((price): price is number => price !== null);
    const image = safeCardTraderImage(blueprint.image_url);
    return [{
      blueprintId: blueprint.id,
      name: String(blueprint.name || "").trim(),
      version: String(blueprint.version || "").trim() || undefined,
      categoryId: category.id,
      categoryName: category.name,
      itemCategory: category.itemCategory,
      expansionId: expansion.id,
      expansionCode: String(expansion.code || "").trim(),
      expansionName: String(expansion.name || "").trim(),
      imageUrl: image.url,
      imageHost: image.host,
      frenchOffers: offers.length,
      availableQuantity: offers.reduce((sum, offer) => sum + Math.max(0, Number(offer.quantity) || 0), 0),
      lowestEur: prices.length ? Math.min(...prices) : undefined,
      languageEvidence: "marketplace_filter_fr",
      reviewRequired: true,
    }];
  });

  return {
    game: { id: reference.game.id, name: reference.game.display_name || reference.game.name },
    expansion,
    categories: reference.categories,
    candidates: candidates.sort((a, b) => a.itemCategory.localeCompare(b.itemCategory) || a.name.localeCompare(b.name, "fr")),
    coverage: {
      candidates: candidates.length,
      withImage: candidates.filter((candidate) => candidate.imageUrl).length,
      withEurPrice: candidates.filter((candidate) => Number.isFinite(candidate.lowestEur)).length,
    },
  };
}

export async function previewCardTraderFrenchExpansion(expansionId: number) {
  return previewFrenchExpansionFromReference(await loadCardTraderPokemonReference(), expansionId);
}

export async function previewCardTraderFrenchCatalog(options?: {
  expansionIds?: number[];
  maximumExpansions?: number;
  minimumCandidates?: number;
}) {
  const reference = await loadCardTraderPokemonReference();
  const explicitIds = Array.from(new Set((options?.expansionIds || []).filter((id) => Number.isInteger(id) && id > 0)));
  const maximum = Math.max(1, Math.min(30, Number(options?.maximumExpansions) || 12));
  const minimumCandidates = Math.max(0, Math.min(500, Number(options?.minimumCandidates) || 0));
  const selected = explicitIds.length
    ? explicitIds.slice(0, maximum)
    : [...reference.expansions].sort((a, b) => b.id - a.id).slice(0, maximum).map((expansion) => expansion.id);
  const previews = [];
  const processedExpansionIds: number[] = [];
  const failures: Array<{ expansionId: number; error: string }> = [];

  for (const expansionId of selected) {
    processedExpansionIds.push(expansionId);
    try {
      previews.push(await previewFrenchExpansionFromReference(reference, expansionId));
    } catch (error) {
      failures.push({ expansionId, error: error instanceof Error ? error.message : "cardtrader_unknown_error" });
    }
    if (minimumCandidates && previews.reduce((sum, preview) => sum + preview.candidates.length, 0) >= minimumCandidates) break;
  }

  return { selectedExpansionIds: processedExpansionIds, previews, failures };
}
