// lib/psa/psaService.ts

import { PSACard } from "./types";

const LOCAL_STORAGE_KEY = "king_tcg_psa_collection_v1";

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