// lib/psa/types.ts

/**
 * ==========================================================
 * KING TCG - PSA MODULE
 * Types partagés du module PSA
 * ==========================================================
 */

export type PSAGrade = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export type Currency = "EUR" | "USD";

export interface PSASaleHistoryItem {
  date: string;
  soldPrice: number;
  source: string;
  grade: PSAGrade;
  currency?: Currency;
}

export interface PSAPrices {
  ungraded: number;
  psa7: number;
  psa8: number;
  psa9: number;
  psa10: number;
}

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
   * Informations de la carte
   */
  cardName: string;
  setName: string;
  cardNumber: string;

  /**
   * Grade PSA
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
   * Prix payé (optionnel)
   */
  purchasePrice?: number;

  /**
   * Date d'achat
   */
  purchaseDate?: string;

  /**
   * Devise
   */
  currency?: Currency;

  /**
   * Cotations du marché
   */
  prices?: PSAPrices;

  /**
   * Historique des ventes
   */
  salesHistory: PSASaleHistoryItem[];

  /**
   * Lien futur vers la certification PSA
   */
  certificationUrl?: string;

  /**
   * Date d'ajout dans King TCG
   */
  createdAt: string;

  /**
   * Dernière mise à jour
   */
  updatedAt?: string;
}

export interface PSAEstimationSubGrade {
  score: number;
  comment: string;
}

export interface PSAEstimationResult {
  /**
   * Grade estimé par l'IA
   */
  predictedGrade: PSAGrade;

  /**
   * Niveau de confiance
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
   * Version du moteur IA
   */
  aiVersion?: string;

  /**
   * Date d'analyse
   */
  analyzedAt: string;
}
