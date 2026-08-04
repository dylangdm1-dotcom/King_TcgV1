/**
 * ==========================================================
 * KING TCG - PSA MODULE
 * Types partagés du module PSA
 * ==========================================================
 */

export type PSAGrade =
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | 8
  | 9
  | 10;

export type Currency = "EUR" | "USD";

/**
 * Vente récente récupérée depuis PriceCharting.
 *
 * Ce sont uniquement les dernières ventes affichées
 * lors de la recherche. Elles ne sont PAS enregistrées
 * comme historique de prix dans la collection.
 */
export interface PSASaleHistoryItem {
  date: string;
  soldPrice: number;
  source: string;
  grade?: PSAGrade;
  currency?: Currency;
  title?: string;
}

/**
 * Prix marché par grade.
 */
export interface PSAPrices {
  ungraded: number;
  psa7: number;
  psa8: number;
  psa9: number;
  psa9_5?: number;
  psa10: number;
}

/**
 * Carte PSA dans la collection King TCG.
 */
export interface PSACard {
  id: string;

  psaCertNumber: string;

  cardName: string;
  setName: string;
  cardNumber: string;

  language?: string;
  rarity?: string;
  releaseYear?: number;

  grade: PSAGrade;

  imageUrl: string;

  estimatedValue: number;

  purchasePrice?: number;
  purchaseDate?: string;

  currency?: Currency;

  marketPrices?: PSAPrices;

  /**
   * Historique de ventes personnel.
   *
   * Ce champ reste pour la collection PSA,
   * mais les ventes PriceCharting récupérées
   * pendant une recherche ne sont PAS ajoutées ici.
   */
  salesHistory: PSASaleHistoryItem[];

  certificationUrl?: string;

  certVerified?: boolean;

  createdAt: string;
  updatedAt?: string;
}

/**
 * Sous-note IA.
 */
export interface PSAEstimationSubGrade {
  score: number;
  comment: string;
}

/**
 * Résultat analyse IA.
 */
export interface PSAEstimationResult {
  predictedGrade: PSAGrade;

  confidence: number;

  subGrades: {
    centering: PSAEstimationSubGrade;
    corners: PSAEstimationSubGrade;
    edges: PSAEstimationSubGrade;
    surface: PSAEstimationSubGrade;
  };

  strengths: string[];

  weaknesses: string[];

  aiVersion?: string;

  analyzedImages?: {
    front?: string;
    back?: string;
  };

  analyzedAt: string;
}
