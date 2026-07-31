// lib/psa/psaService.ts

import { PSACard, PSAPrices, PSAGrade } from "./types";

const LOCAL_STORAGE_KEY = "king_tcg_psa_collection_v1";

/**
 * Carte provenant de la base PriceCharting.
 * Cette interface est déjà prévue pour accueillir
 * une future API sans modifier le reste du projet.
 */
export interface PriceChartingCard {
  id: string;
  cardName: string;
  setName: string;
  cardNumber: string;
  imageUrl: string;
  prices: PSAPrices;

  language?: string;
  rarity?: string;
  releaseYear?: number;
}

/**
 * Base de démonstration.
 * À remplacer plus tard par une récupération
 * automatique des données PriceCharting.
 */
export const MOCK_PRICECHARTING_DATABASE: PriceChartingCard[] = [
  {
    id: "charizard-base-4",
    cardName: "Dracaufeu Holo",
    setName: "Base Set",
    cardNumber: "4/102",
    imageUrl: "https://images.pokemontcg.io/base1/4_hires.png",
    prices: {
      ungraded: 250,
      psa7: 450,
      psa8: 750,
      psa9: 1800,
      psa10: 15000,
    },
  },

  {
    id: "pikachu-illustrator",
    cardName: "Pikachu Illustrator",
    setName: "Promo Trainer",
    cardNumber: "1st",
    imageUrl: "https://images.pokemontcg.io/basejp/basejp-1.png",
    prices: {
      ungraded: 5000,
      psa7: 50000,
      psa8: 120000,
      psa9: 350000,
      psa10: 5200000,
    },
  },

  {
    id: "umbreon-vmax-215",
    cardName: "Umbreon VMAX (Alt Art)",
    setName: "Evolving Skies",
    cardNumber: "215/203",
    imageUrl: "https://images.pokemontcg.io/swsh7/215_hires.png",
    prices: {
      ungraded: 750,
      psa7: 820,
      psa8: 950,
      psa9: 1300,
      psa10: 2400,
    },
  },

  {
    id: "mewtwo-ex-evo",
    cardName: "Mewtwo EX",
    setName: "XY Evolutions",
    cardNumber: "12/108",
    imageUrl: "https://images.pokemontcg.io/xy12/12_hires.png",
    prices: {
      ungraded: 25,
      psa7: 45,
      psa8: 80,
      psa9: 160,
      psa10: 450,
    },
  },

  {
    id: "rayquaza-vmax-alt",
    cardName: "Rayquaza VMAX (Alt Art)",
    setName: "Evolving Skies",
    cardNumber: "218/203",
    imageUrl: "https://images.pokemontcg.io/swsh7/218_hires.png",
    prices: {
      ungraded: 320,
      psa7: 380,
      psa8: 450,
      psa9: 680,
      psa10: 1450,
    },
  },

  {
    id: "lugia-neo-genesis",
    cardName: "Lugia Holo",
    setName: "Neo Genesis",
    cardNumber: "9/111",
    imageUrl: "https://images.pokemontcg.io/neo1/9_hires.png",
    prices: {
      ungraded: 180,
      psa7: 320,
      psa8: 550,
      psa9: 1200,
      psa10: 8500,
    },
  },
];

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
   * Recherche dans le catalogue PriceCharting.
   * (Base locale actuellement - future API ensuite)
   */
  searchPriceCharting(query: string): PriceChartingCard[] {
    const search = query.trim().toLowerCase();

    if (!search) {
      return MOCK_PRICECHARTING_DATABASE;
    }

    return MOCK_PRICECHARTING_DATABASE.filter((card) => {
      const searchable = [
        card.cardName,
        card.setName,
        card.cardNumber,
        card.language,
        card.rarity,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchable.includes(search);
    });
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
