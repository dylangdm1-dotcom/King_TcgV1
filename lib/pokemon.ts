import type { PokemonCard } from "./types";
import { translatePokemonName } from "./pokemonTranslator";

const API_URL = "https://api.pokemontcg.io/v2/cards";
const CACHE_KEY = "king_tcg_cards_cache";

const cache = new Map<string, PokemonCard>();
const searchCache = new Map<string, PokemonCard[]>();

// Variable persistante pour enregistrer le timer du debounce entre les frappes
let searchTimeout: NodeJS.Timeout | null = null;

/**
 * Normalise la carte en s'assurant que toutes les propriétés requises sont là,
 * tout en conservant STRICTEMENT l'intégralité des objets de prix de l'API.
 */
function normalize(card: any): PokemonCard {
  return {
    ...card, // Conserve absolument tout (y compris cardmarket, tcgplayer, et les autres clés brutes)
    quantity: card.quantity ?? 0,
    favorite: card.favorite ?? false,
    images: {
      small: card.images?.small ?? "",
      large: card.images?.large ?? card.images?.small ?? "",
    },
    // Forçage explicite pour éviter toute perte de référence lors de la déstructuration
    cardmarket: card.cardmarket ?? undefined,
    tcgplayer: card.tcgplayer ?? undefined,
  };
}

function saveBrowserCache(cards: PokemonCard[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cards));
  } catch (error) {
    console.error("[Cache] Impossible d'écrire dans le localStorage", error);
  }
}

function loadBrowserCache(): PokemonCard[] {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(CACHE_KEY);
    if (!data) return [];
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed.map(normalize) : [];
  } catch {
    return [];
  }
}

/**
 * Récupère une page de cartes
 */
async function fetchPage(query: string, page: number) {
  const params = new URLSearchParams();

  if (query) {
    params.set("q", query);
  }

  params.set("page", String(page));
  params.set("pageSize", "100");

  const url = `${API_URL}?${params.toString()}`;

  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (process.env.NEXT_PUBLIC_POKEMON_TCG_API_KEY) {
    headers["X-Api-Key"] = process.env.NEXT_PUBLIC_POKEMON_TCG_API_KEY;
  }

  try {
    // Utilisation de force-cache pour une réactivité instantanée sur les requêtes identiques déjà faites
    const res = await fetch(url, {
      cache: "force-cache",
      headers,
    });

    if (!res.ok) {
      console.warn(`[API Pokémon] Erreur lors de la récupération (status: ${res.status})`);
      return [];
    }

    const json = await res.json();
    return json.data ?? [];
  } catch (error) {
    console.error("[API Pokémon] Erreur réseau :", error);
    return [];
  }
}

function removeDuplicates(cards: PokemonCard[]) {
  const map = new Map<string, PokemonCard>();

  cards.forEach((card) => {
    map.set(card.id, card);
  });

  return [...map.values()];
}

export async function searchCards(search = ""): Promise<PokemonCard[]> {
  const key = search.trim().toLowerCase();

  if (!key) return [];

  if (searchCache.has(key)) {
    return searchCache.get(key)!;
  }

  const translated = translatePokemonName(key);

  const queries = [
    // Recherche exacte par nom de carte
    `name:"${translated}"`,
  
    // Recherche large par nom de carte
    `name:${translated}*`,
    `name:*${translated}*`,
  
    // Recherche par extension
    `set.name:"${translated}"`,
    `set.name:${translated}*`,
    `set.name:*${translated}*`,
  
    // Recherche par série
    `set.series:"${translated}"`,
    `set.series:${translated}*`,
    `set.series:*${translated}*`,
  ];

  let cards: PokemonCard[] = [];

  for (const query of queries) {
    const pages = await Promise.all([
      fetchPage(query, 1),
      fetchPage(query, 2),
    ]);

    cards = removeDuplicates(
      pages
        .flat()
        .map(normalize)
    );

    if (cards.length) break;
  }

  // Tri par similarité
  cards.sort((a, b) => {
    const an = a.name.toLowerCase();
    const bn = b.name.toLowerCase();

    if (an === key) return -1;
    if (bn === key) return 1;

    if (an.startsWith(key)) return -1;
    if (bn.startsWith(key)) return 1;

    return an.localeCompare(bn);
  });

  cards.forEach((card) => cache.set(card.id, card));

  searchCache.set(key, cards);

  return cards.slice(0, 20);
}

export async function getCardById(id: string): Promise<PokemonCard | null> {
  // 1. On cherche d'abord dans notre cache mémoire à chaud
  if (cache.has(id)) {
    return cache.get(id)!;
  }

  // 2. Si absent, on regarde dans le cache du localStorage global
  const stored = loadBrowserCache();
  const matchedInStored = stored.find((c) => c.id === id);
  if (matchedInStored) {
    cache.set(id, matchedInStored);
    return matchedInStored;
  }

  // 3. En dernier recours, on appelle l'API d'origine pour récupérer la carte complète
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (process.env.NEXT_PUBLIC_POKEMON_TCG_API_KEY) {
    headers["X-Api-Key"] = process.env.NEXT_PUBLIC_POKEMON_TCG_API_KEY;
  }

  try {
    const res = await fetch(`${API_URL}/${id}`, {
      cache: "force-cache", // Optimisation : évite de retélécharger une fiche unitaire déjà vue
      headers,
    });

    if (!res.ok) {
      console.warn(`[API Pokémon] Impossible de trouver la carte ${id} (status: ${res.status})`);
      return null;
    }

    const json = await res.json();
    if (!json.data) return null;

    const card = normalize(json.data);

    // On stocke dans le cache pour les prochains clics
    cache.set(id, card);
    return card;
  } catch (error) {
    console.error(`[API Pokémon] Erreur de récupération pour la carte ${id} :`, error);
    return null;
  }
}

export function clearPokemonCache() {
  cache.clear();
  searchCache.clear();

  if (typeof window !== "undefined") {
    localStorage.removeItem(CACHE_KEY);
  }
}