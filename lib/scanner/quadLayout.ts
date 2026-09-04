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
  { slot: 0, label: "Haut - Gauche", x: 0.035, y: 0.135, width: 0.45, height: 0.354 },
  { slot: 1, label: "Haut - Droite", x: 0.515, y: 0.135, width: 0.45, height: 0.354 },
  { slot: 2, label: "Bas - Gauche", x: 0.035, y: 0.505, width: 0.45, height: 0.354 },
  { slot: 3, label: "Bas - Droite", x: 0.515, y: 0.505, width: 0.45, height: 0.354 },
];

// Listing PRO 2 cartes : mêmes proportions et mêmes coordonnées pour le guide
// et le découpage, mais les cartes sont centrées pour gagner en lisibilité.
export const DUAL_FRAMES: QuadFrame[] = [
  { slot: 0, label: "Gauche", x: 0.035, y: 0.323, width: 0.45, height: 0.354 },
  { slot: 1, label: "Droite", x: 0.515, y: 0.323, width: 0.45, height: 0.354 },
];
