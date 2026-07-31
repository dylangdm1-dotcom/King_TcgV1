// lib/psa/types.ts

export type PSAGrade = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export interface PSASaleHistoryItem {
  date: string;
  price: number;
  source: string; // ex: eBay, PriceCharting, PWCC
  grade: number;
}

export interface PSAPrices {
  ungraded: number;
  psa7: number;
  psa8: number;
  psa9: number;
  psa10: number;
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
  prices?: PSAPrices; // Cotations de marché style PriceCharting
  salesHistory: PSASaleHistoryItem[];
  createdAt: string;
}

export interface PSAEstimationSubGrade {
  score: number;
  comment: string;
}

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
  analyzedAt: string;
}
