// lib/psa/psaService.ts

import { PSACard, PSAPrices } from "./types";

const LOCAL_STORAGE_KEY = "king_tcg_psa_collection_v1";

// Base de données de référence style PriceCharting / PriceMarket
export const MOCK_PRICEMARKET_DATABASE: Array<{
  id: string;
  cardName: string;
  setName: string;
  cardNumber: string;
  imageUrl: string;
  prices: PSAPrices;
}> = [
  {
    id: "charizard-base-4",
    cardName: "Dracaufeu Holo",
    setName: "Base Set",
    cardNumber: "4/102",
    imageUrl: "https://images.pokemontcg.io/base1/4_hires.png",
    prices: { ungraded: 250, psa7: 450, psa8: 750, psa9: 1800, psa10: 15000 },
  },
  {
    id: "pikachu-illustrator",
    cardName: "Pikachu Illustrator",
    setName: "Promo Trainer",
    cardNumber: "1st",
    imageUrl: "https://images.pokemontcg.io/basejp/basejp-1.png",
    prices: { ungraded: 5000, psa7: 50000, psa8: 120000, psa9: 350000, psa10: 5200000 },
  },
  {
    id: "umbreon-vmax-215",
    cardName: "Nymphali / Umbreon VMAX (Alt Art)",
    setName: "Evolving Skies",
    cardNumber: "215/203",
    imageUrl: "https://images.pokemontcg.io/swsh7/215_hires.png",
    prices: { ungraded: 750, psa7: 820, psa8: 950, psa9: 1300, psa10: 2400 },
  },
];

export const psaService = {
  getCollection(): PSACard[] {
    if (typeof window === "undefined") return [];
    try {
      const data = localStorage.getItem(LOCAL_STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error("Erreur lecture collection PSA", e);
      return [];
    }
  },

  saveCollection(cards: PSACard[]): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cards));
    } catch (e) {
      console.error("Erreur écriture collection PSA", e);
    }
  },

  addCard(card: Omit<PSACard, "id" | "createdAt">): PSACard {
    const current = this.getCollection();
    const newCard: PSACard = {
      ...card,
      id: `psa_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      createdAt: new Date().toISOString(),
    };
    this.saveCollection([newCard, ...current]);
    return newCard;
  },

  removeCard(id: string): void {
    const current = this.getCollection();
    this.saveCollection(current.filter((c) => c.id !== id));
  },

  // Recherche dans le catalogue PriceMarket / PriceCharting
  searchMarketPrices(query: string) {
    if (!query || query.trim() === "") return MOCK_PRICEMARKET_DATABASE;
    const q = query.toLowerCase();
    return MOCK_PRICEMARKET_DATABASE.filter(
      (item) =>
        item.cardName.toLowerCase().includes(q) ||
        item.setName.toLowerCase().includes(q) ||
        item.cardNumber.toLowerCase().includes(q)
    );
  },

  calculateStats(cards: PSACard[]) {
    const totalCount = cards.length;
    const totalValue = cards.reduce((acc, c) => acc + (c.estimatedValue || 0), 0);
    const totalSpent = cards.reduce((acc, c) => acc + (c.purchasePrice || 0), 0);
    const gemMintCount = cards.filter((c) => c.grade === 10).length;

    return {
      totalCount,
      totalValue,
      totalSpent,
      netProfit: totalValue - totalSpent,
      gemMintCount,
    };
  },
};
