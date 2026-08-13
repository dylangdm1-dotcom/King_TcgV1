export type QuadFrame = {
  slot: 0 | 1 | 2 | 3;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

// Coordonnées normalisées par rapport à l'image réellement visible dans le scanner.
// Le ratio de chaque zone suit celui d'une carte Pokémon (~63/88).
// ScannerOverlay et quadScanner utilisent exactement cette même géométrie.
export const QUAD_FRAMES: QuadFrame[] = [
  { slot: 0, label: "Haut - Gauche", x: 0.055, y: 0.155, width: 0.41, height: 0.322 },
  { slot: 1, label: "Haut - Droite", x: 0.535, y: 0.155, width: 0.41, height: 0.322 },
  { slot: 2, label: "Bas - Gauche", x: 0.055, y: 0.525, width: 0.41, height: 0.322 },
  { slot: 3, label: "Bas - Droite", x: 0.535, y: 0.525, width: 0.41, height: 0.322 },
];
