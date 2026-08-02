// lib/psa/psaService.ts

import type {
  PSACard,
  PSAPrices,
  PSAGrade,
} from "./types";

const LOCAL_STORAGE_KEY = "king_tcg_psa_collection_v1";

/**
 * ==========================================================
 * KING TCG - PSA SERVICE
 * Gestion collection PSA + catalogue marché
 * ==========================================================
 */

/**
 * Carte provenant de PriceCharting.
 *
 * Structure prévue pour pouvoir remplacer la base locale
 * par une API externe sans modifier le reste du projet.
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
 * Base locale de démonstration.
 *
 * À remplacer ultérieurement par une source marché réelle.
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

/**
 * Normalise un numéro de certification PSA.
 */
function normalizeCertificateNumber(
  certNumber: string
): string {
  return String(certNumber ?? "").trim();
}

/**
 * Vérifie qu'un nombre est exploitable.
 */
function safeNumber(value: unknown): number {
  return typeof value === "number" &&
    Number.isFinite(value) &&
    value > 0
    ? value
    : 0;
}

/**
 * ==========================================================
 * SERVICE PSA
 * ==========================================================
 */
export const psaService = {
  /**
   * Récupère la collection PSA locale.
   */
  getCollection(): PSACard[] {
    if (typeof window === "undefined") {
      return [];
    }

    try {
      const data = localStorage.getItem(
        LOCAL_STORAGE_KEY
      );

      if (!data) {
        return [];
      }

      const parsed: unknown = JSON.parse(data);

      return Array.isArray(parsed)
        ? (parsed as PSACard[])
        : [];
    } catch (error) {
      console.error(
        "[King_TCG][PSA] Impossible de charger la collection :",
        error
      );

      return [];
    }
  },

  /**
   * Sauvegarde la collection PSA.
   */
  saveCollection(cards: PSACard[]): void {
    if (typeof window === "undefined") {
      return;
    }

    try {
      localStorage.setItem(
        LOCAL_STORAGE_KEY,
        JSON.stringify(
          Array.isArray(cards) ? cards : []
        )
      );
    } catch (error) {
      console.error(
        "[King_TCG][PSA] Impossible de sauvegarder la collection :",
        error
      );
    }
  },

  /**
   * Vérifie si une certification existe déjà.
   */
  certificateExists(certNumber: string): boolean {
    const normalized =
      normalizeCertificateNumber(certNumber);

    if (!normalized) {
      return false;
    }

    return this.getCollection().some(
      (card) =>
        normalizeCertificateNumber(
          card.psaCertNumber
        ) === normalized
    );
  },

  /**
   * Recherche une carte par numéro de certification.
   */
  findByCertificate(
    certNumber: string
  ): PSACard | undefined {
    const normalized =
      normalizeCertificateNumber(certNumber);

    if (!normalized) {
      return undefined;
    }

    return this.getCollection().find(
      (card) =>
        normalizeCertificateNumber(
          card.psaCertNumber
        ) === normalized
    );
  },

  /**
   * Ajoute une carte PSA.
   */
  addCard(
    card: Omit<PSACard, "id" | "createdAt">
  ): PSACard {
    if (!card) {
      throw new Error(
        "Les données de la carte PSA sont obligatoires."
      );
    }

    const collection = this.getCollection();

    const certNumber =
      normalizeCertificateNumber(
        card.psaCertNumber
      );

    if (!certNumber) {
      throw new Error(
        "Le numéro de certification PSA est obligatoire."
      );
    }

    if (this.certificateExists(certNumber)) {
      throw new Error(
        "Cette certification PSA est déjà enregistrée."
      );
    }

    const id =
      typeof crypto !== "undefined" &&
      typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `psa_${Date.now()}_${Math.random()
            .toString(36)
            .slice(2, 8)}`;

    const now =
      new Date().toISOString();

    const newCard: PSACard = {
      ...card,

      id,

      psaCertNumber: certNumber,

      estimatedValue: Math.max(
        0,
        safeNumber(card.estimatedValue)
      ),

      purchasePrice:
        card.purchasePrice !== undefined
          ? Math.max(
              0,
              safeNumber(card.purchasePrice)
            )
          : undefined,

      createdAt: now,
      updatedAt: now,

      salesHistory:
        Array.isArray(card.salesHistory)
          ? card.salesHistory
          : [],
    };

    this.saveCollection([
      newCard,
      ...collection,
    ]);

    return newCard;
  },

  /**
   * Supprime une carte PSA.
   */
  removeCard(id: string): void {
    if (!id?.trim()) {
      return;
    }

    const collection =
      this.getCollection();

    const updated =
      collection.filter(
        (card) => card.id !== id
      );

    this.saveCollection(updated);
  },

  /**
   * ========================================================
   * PRICECHARTING
   * ========================================================
   */

  /**
   * Recherche dans le catalogue PriceCharting.
   *
   * Actuellement basé sur la base locale.
   * Pourra être remplacé par une API ultérieurement.
   */
  searchPriceCharting(
    query: string
  ): PriceChartingCard[] {
    const search =
      String(query ?? "")
        .trim()
        .toLowerCase();

    if (!search) {
      return MOCK_PRICECHARTING_DATABASE;
    }

    return MOCK_PRICECHARTING_DATABASE.filter(
      (card) => {
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
      }
    );
  },

  /**
   * ========================================================
   * STATISTIQUES
   * ========================================================
   */

  /**
   * Calcule les statistiques de la collection.
   */
  calculateStats(cards: PSACard[]) {
    const safeCards =
      Array.isArray(cards)
        ? cards
        : [];

    const totalCount =
      safeCards.length;

    const totalValue =
      safeCards.reduce(
        (total, card) =>
          total +
          safeNumber(
            card.estimatedValue
          ),
        0
      );

    const totalSpent =
      safeCards.reduce(
        (total, card) =>
          total +
          safeNumber(
            card.purchasePrice
          ),
        0
      );

    const gemMintCount =
      safeCards.filter(
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
      safeCards.length > 0
        ? [...safeCards].sort(
            (a, b) =>
              safeNumber(
                b.estimatedValue
              ) -
              safeNumber(
                a.estimatedValue
              )
          )[0]
        : null;

    return {
      totalCount,
      totalValue,
      totalSpent,
      averageValue,
      averagePurchasePrice,
      netProfit:
        totalValue - totalSpent,
      gemMintCount,
      mostValuableCard,
    };
  },

  /**
   * Trie les cartes par valeur décroissante.
   */
  sortCollection(
    cards: PSACard[]
  ): PSACard[] {
    if (!Array.isArray(cards)) {
      return [];
    }

    return [...cards].sort(
      (a, b) =>
        safeNumber(
          b.estimatedValue
        ) -
        safeNumber(
          a.estimatedValue
        )
    );
  },

  /**
   * Filtre les cartes par grade.
   */
  filterByGrade(
    cards: PSACard[],
    grade: PSAGrade
  ): PSACard[] {
    if (!Array.isArray(cards)) {
      return [];
    }

    return cards.filter(
      (card) =>
        card.grade === grade
    );
  },

  /**
   * Recherche dans la collection personnelle.
   */
  searchCollection(
    cards: PSACard[],
    query: string
  ): PSACard[] {
    if (!Array.isArray(cards)) {
      return [];
    }

    const search =
      String(query ?? "")
        .trim()
        .toLowerCase();

    if (!search) {
      return cards;
    }

    return cards.filter(
      (card) => {
        const searchable = [
          card.cardName,
          card.setName,
          card.cardNumber,
          card.psaCertNumber,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return searchable.includes(
          search
        );
      }
    );
  },
};