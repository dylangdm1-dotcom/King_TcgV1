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
  return Array.isArray(value) ? value as T[] : [];
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
  const pokemon = games.find((game) => /pokemon/i.test(`${game.name} ${game.display_name}`));
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

  return { game: pokemon, categories, expansions };
}

export async function previewCardTraderFrenchExpansion(expansionId: number) {
  const reference = await loadCardTraderPokemonReference();
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
