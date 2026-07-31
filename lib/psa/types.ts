// lib/psa/types.ts

export type PSAGrade = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export interface PSASaleHistoryItem {
  date: string;
  price: number;
  source: string; // ex: eBay, PWCC, etc.
}

export interface PSACard {
  id: string;
  psaCertNumber: string; // Numéro PSA unique (ex: "84729102")
  cardName: string;
  setName: string;
  cardNumber: string;
  grade: PSAGrade;
  imageUrl: string;
  estimatedValue: number;
  purchasePrice?: number;
  purchaseDate?: string;
  salesHistory: PSASaleHistoryItem[];
  createdAt: string;
}

export interface PSAEstimationSubGrade {
  score: number; // sur 10
  comment: string;
}

export interface PSAEstimationResult {
  predictedGrade: PSAGrade;
  confidence: number; // 0 à 100
  subGrades: {
    centering: PSAEstimationSubGrade;
    corners: PSAEstimationSubGrade;
    edges: PSAEstimationSubGrade;
    surface: PSAEstimationSubGrade;
  };
  strengths: string[];
  weaknesses: string[];
  analyzedAt: string;
}