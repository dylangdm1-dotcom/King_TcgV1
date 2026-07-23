export interface Point {
  x: number;
  y: number;
}

export interface DetectionResult {
  corners: Point[];
  image: string;
  width: number;
  height: number;
  hash?: string;
  cardId?: string;
  confidence?: number;
  cardName?: string;
}