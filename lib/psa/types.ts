// lib/psa/types.ts

/**
 * ==========================================================
 * KING TCG - PSA MODULE
 * Types partagés du module PSA
 * ==========================================================
 */

export type PSAGrade = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export type Currency = "EUR" | "USD";

/**
 * Historique des ventes d'une carte
 */
export interface PSASaleHistoryItem {
  date: string;
  soldPrice: number;
  source: string;
  grade: PSAGrade;
  currency?: Currency;
}

/**
 * Prix marché par grade
 */
export interface PSAPrices {
  ungraded: number;
  psa7: number;
  psa8: number;
  psa9: number;
  psa10: number;
}

/**
 * Carte PSA dans la collection King TCG
 */
export interface PSACard {
  /**
   * ID interne King TCG
   */
  id: string;

  /**
   * Numéro officiel PSA
   */
  psaCertNumber: string;

  /**
   * Informations carte Pokémon
   */
  cardName: string;
  setName: string;
  cardNumber: string;

  /**
   * Informations complémentaires
   */
  language?: string;
  rarity?: string;
  releaseYear?: number;

  /**
   * Grade PSA officiel
   */
  grade: PSAGrade;

  /**
   * Image principale
   */
  imageUrl: string;

  /**
   * Valeur actuelle estimée
   */
  estimatedValue: number;

  /**
   * Prix payé lors de l'achat
   */
  purchasePrice?: number;

  /**
   * Date d'achat
   */
  purchaseDate?: string;

  /**
   * Devise utilisée
   */
  currency?: Currency;

  /**
   * Prix marché actuels
   * Source future : PriceCharting
   */
  marketPrices?: PSAPrices;

  /**
   * Historique ventes
   */
  salesHistory: PSASaleHistoryItem[];

  /**
   * Lien certification PSA
   */
  certificationUrl?: string;

  /**
   * Certification vérifiée
   * Future connexion PSA
   */
  certVerified?: boolean;

  /**
   * Date ajout King TCG
   */
  createdAt: string;

  /**
   * Dernière modification
   */
  updatedAt?: string;
}

/**
 * Sous-note IA d'un critère PSA
 */
export interface PSAEstimationSubGrade {
  /**
   * Note sur 10
   */
  score: number;

  /**
   * Explication IA
   */
  comment: string;
}

/**
 * Résultat analyse IA gradation
 */
export interface PSAEstimationResult {
  /**
   * Grade PSA estimé
   */
  predictedGrade: PSAGrade;

  /**
   * Confiance IA en %
   */
  confidence: number;

  /**
   * Analyse détaillée
   */
  subGrades: {
    centering: PSAEstimationSubGrade;
    corners: PSAEstimationSubGrade;
    edges: PSAEstimationSubGrade;
    surface: PSAEstimationSubGrade;
  };

  /**
   * Points forts détectés
   */
  strengths: string[];

  /**
   * Défauts détectés
   */
  weaknesses: string[];

  /**
   * Version moteur IA
   */
  aiVersion?: string;

  /**
   * Images utilisées pour analyse
   */
  analyzedImages?: {
    front?: string;
    back?: string;
  };

  /**
   * Date analyse
   */
  analyzedAt: string;
}
