"use client";

export function createOCRCrop(image64: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 745;
      canvas.height = 180;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(image64);
        return;
      }

      /* Zone ciblée : Le haut de la carte où réside le nom du Pokémon */
      ctx.drawImage(
        img,
        0, 0,           // Coordonnées X, Y de départ de la source
        img.width, 220, // Largeur totale et hauteur du bandeau à capturer
        0, 0,           // Placement de destination
        canvas.width, canvas.height
      );

      resolve(canvas.toDataURL("image/jpeg", 0.95));
    };

    img.src = image64;
  });
}