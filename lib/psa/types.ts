// lib/psa/types.ts

/**
 * ==========================================================
 * KING TCG - PSA MODULE
 * Types partagés du module PSA
 * ==========================================================
 */

/**
 * Grade PSA officiel.
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

/**
 * Devises supportées.
 */
export type Currency = "EUR" | "USD";

/**
 * Historique des ventes d'une carte PSA.
 */
export interface PSASaleHistoryItem {
  date: string;
  soldPrice: number;
  source: string;
  grade: PSAGrade;
  currency?: Currency;
}

/**
 * Prix marché par grade.
 *
 * Toutes les valeurs sont exprimées dans la devise
 * définie par le contexte de la carte.
 */
export interface PSAPrices {
  ungraded: number;
  psa7: number;
  psa8: number;
  psa9: number;
  psa10: number;
}

/**
 * Carte PSA dans la collection King TCG.
 */
export interface PSACard {
  /**
   * ID interne King TCG.
   */
  id: string;

  /**
   * Numéro officiel PSA.
   */
  psaCertNumber: string;

  /**
   * Informations carte Pokémon.
   */
  cardName: string;
  setName: string;
  cardNumber: string;

  /**
   * Informations complémentaires.
   */
  language?: string;
  rarity?: string;
  releaseYear?: number;

  /**
   * Grade PSA officiel.
   */
  grade: PSAGrade;

  /**
   * Image principale.
   */
  imageUrl: string;

  /**
   * Valeur actuelle estimée.
   */
  estimatedValue: number;

  /**
   * Prix payé lors de l'achat.
   */
  purchasePrice?: number;

  /**
   * Date d'achat.
   */
  purchaseDate?: string;

  /**
   * Devise utilisée.
   */
  currency?: Currency;

  /**
   * Prix marché actuels par grade.
   *
   * Source actuelle/future : PriceCharting ou autre provider.
   */
  marketPrices?: PSAPrices;

  /**
   * Historique des ventes.
   */
  salesHistory: PSASaleHistoryItem[];

  /**
   * Lien vers la certification PSA.
   */
  certificationUrl?: string;

  /**
   * Certification vérifiée.
   *
   * Peut être alimenté ultérieurement par une connexion
   * officielle au service PSA.
   */
  certVerified?: boolean;

  /**
   * Date d'ajout dans King TCG.
   */
  createdAt: string;

  /**
   * Dernière modification.
   */
  updatedAt?: string;
}

/**
 * Sous-note IA d'un critère de gradation PSA.
 *
 * Score compris entre 0 et 10.
 */
export interface PSAEstimationSubGrade {
  /**
   * Note sur 10.
   */
  score: number;

  /**
   * Explication fournie par l'IA.
   */
  comment: string;
}

/**
 * Résultat de l'analyse IA de gradation.
 */
export interface PSAEstimationResult {
  /**
   * Grade PSA estimé.
   */
  predictedGrade: PSAGrade;

  /**
   * Confiance de l'IA en pourcentage.
   */
  confidence: number;

  /**
   * Analyse détaillée des quatre critères PSA.
   */
  subGrades: {
    centering: PSAEstimationSubGrade;
    corners: PSAEstimationSubGrade;
    edges: PSAEstimationSubGrade;
    surface: PSAEstimationSubGrade;
  };

  /**
   * Points forts détectés.
   */
  strengths: string[];

  /**
   * Défauts détectés.
   */
  weaknesses: string[];

  /**
   * Version du moteur IA utilisé.
   */
  aiVersion?: string;

  /**
   * Images utilisées pour l'analyse.
   */
  analyzedImages?: {
    front?: string;
    back?: string;
  };

  /**
   * Date de l'analyse.
   */
  analyzedAt: string;
}