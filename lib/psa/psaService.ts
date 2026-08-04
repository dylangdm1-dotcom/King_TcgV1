// lib/psa/psaService.ts

import { PSACard, PSAPrices, PSAGrade } from "./types";

const LOCAL_STORAGE_KEY = "king_tcg_psa_collection_v1";

/**
 * Résultat public PriceCharting récupéré côté serveur.
 */
export interface PriceChartingCard {
  id: string;
  cardName: string;
  setName: string;
  cardNumber: string;
  imageUrl: string;
  prices: PSAPrices;
  sourceUrl: string;
  language?: string;
  rarity?: string;
  releaseYear?: number;
}

export const psaService = {
  getCollection(): PSACard[] {
    if (typeof window === "undefined") return [];

    try {
      const data = localStorage.getItem(LOCAL_STORAGE_KEY);

      if (!data) return [];

      const cards = JSON.parse(data);

      return Array.isArray(cards) ? cards : [];
    } catch (error) {
      console.error("Impossible de charger la collection PSA :", error);
      return [];
    }
  },

  saveCollection(cards: PSACard[]): void {
    if (typeof window === "undefined") return;

    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cards));
    } catch (error) {
      console.error("Impossible de sauvegarder la collection PSA :", error);
    }
  },

  certificateExists(certNumber: string): boolean {
    return this.getCollection().some(
      (card) => card.psaCertNumber === certNumber.trim()
    );
  },

  findByCertificate(certNumber: string): PSACard | undefined {
    return this.getCollection().find(
      (card) => card.psaCertNumber === certNumber.trim()
    );
  },

  addCard(card: Omit<PSACard, "id" | "createdAt">): PSACard {
    const collection = this.getCollection();

    const certNumber = card.psaCertNumber.trim();

    if (!certNumber) {
      throw new Error("Le numéro de certification PSA est obligatoire.");
    }

    if (this.certificateExists(certNumber)) {
      throw new Error("Cette certification PSA est déjà enregistrée.");
    }

    const id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `psa_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const now = new Date().toISOString();

    const newCard: PSACard = {
      ...card,
      psaCertNumber: certNumber,
      id,
      createdAt: now,
      updatedAt: now,
    };

    this.saveCollection([newCard, ...collection]);

    return newCard;
  },

  removeCard(id: string): void {
    const collection = this.getCollection();

    this.saveCollection(
      collection.filter((card) => card.id !== id)
    );
  },
    /**
   * Recherche dans les pages publiques PriceCharting via notre route serveur.
   * Aucun token/API PriceCharting n'est nécessaire pour cette première intégration.
   */
  async searchPriceCharting(query: string): Promise<PriceChartingCard[]> {
    const search = query.trim();
    if (!search) return [];

    const response = await fetch(
      `/api/psa/pricecharting?q=${encodeURIComponent(search)}`,
      { cache: "no-store" }
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || "Recherche PriceCharting impossible.");
    }

    return Array.isArray(data.results) ? data.results : [];
  },

  /**
   * Retourne les statistiques de la collection.
   */
  calculateStats(cards: PSACard[]) {
    const totalCount = cards.length;

    const totalValue = cards.reduce(
      (total, card) => total + (card.estimatedValue ?? 0),
      0
    );

    const totalSpent = cards.reduce(
      (total, card) => total + (card.purchasePrice ?? 0),
      0
    );

    const gemMintCount = cards.filter(
      (card) => card.grade === 10
    ).length;

    const averageValue =
      totalCount > 0
        ? totalValue / totalCount
        : 0;

    const averagePurchasePrice =
      totalCount > 0
        ? totalSpent / totalCount
        : 0;

    const mostValuableCard =
      cards.length > 0
        ? [...cards].sort(
            (a, b) => b.estimatedValue - a.estimatedValue
          )[0]
        : null;

    return {
      totalCount,

      totalValue,

      totalSpent,

      averageValue,

      averagePurchasePrice,

      netProfit: totalValue - totalSpent,

      gemMintCount,

      mostValuableCard,
    };
  },

  /**
   * Trie les cartes par valeur décroissante.
   */
  sortCollection(cards: PSACard[]): PSACard[] {
    return [...cards].sort(
      (a, b) => b.estimatedValue - a.estimatedValue
    );
  },

  /**
   * Filtre par grade.
   */
  filterByGrade(
    cards: PSACard[],
    grade: PSAGrade
  ): PSACard[] {
    return cards.filter(
      (card) => card.grade === grade
    );
  },

  /**
   * Recherche dans la collection personnelle.
   */
  searchCollection(
    cards: PSACard[],
    query: string
  ): PSACard[] {
    const search = query.trim().toLowerCase();

    if (!search) return cards;

    return cards.filter((card) => {
      const searchable = [
        card.cardName,
        card.setName,
        card.cardNumber,
        card.psaCertNumber,
      ]
        .join(" ")
        .toLowerCase();

      return searchable.includes(search);
    });
  },
};