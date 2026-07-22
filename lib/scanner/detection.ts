"use client";

// Définition locale du type au cas où ./types n'est pas encore créé, pour éviter les plantages
export type DetectionResult = {
  image: string;
  width: number;
  height: number;
  corners: Array<{ x: number; y: number }>;
  hash: string;
  confidence: number;
};

export async function detectCard(image: HTMLImageElement): Promise<DetectionResult | null> {
  console.log("CROP START");

  const canvas = document.createElement("canvas");
  const cardRatio = 63 / 88;
  const sourceWidth = image.width;
  const sourceHeight = image.height;

  const cropWidth = sourceWidth * 0.58;
  const cropHeight = cropWidth / cardRatio;

  let finalWidth = cropWidth;
  let finalHeight = cropHeight;

  if (finalHeight > sourceHeight) {
    finalHeight = sourceHeight * 0.80;
    finalWidth = finalHeight * cardRatio;
  }

  const x = (sourceWidth - finalWidth) / 2;
  const y = (sourceHeight - finalHeight) / 2 + sourceHeight * 0.03;

  canvas.width = 745;
  canvas.height = 1040;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return null;
  }

  /* Amélioration de l'image (Luminosité, Contraste, Saturation pour l'OCR) */
  ctx.filter = "brightness(1.25) contrast(1.35) saturate(1.15)";
  ctx.drawImage(image, x, y, finalWidth, finalHeight, 0, 0, canvas.width, canvas.height);
  ctx.filter = "none";

  /* Traitement numérique de la netteté légère */
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.min(255, data[i] * 1.08);     // Canal Rouge
    data[i + 1] = Math.min(255, data[i + 1] * 1.08); // Canal Vert
    data[i + 2] = Math.min(255, data[i + 2] * 1.08); // Canal Bleu
  }

  ctx.putImageData(imageData, 0, 0);

  const image64 = canvas.toDataURL("image/jpeg", 0.95);
  const hash = btoa(canvas.width + "-" + canvas.height + "-" + image64.substring(120, 420));

  console.log("HASH", hash);
  console.log("CROP DONE");

  return {
    image: image64,
    width: canvas.width,
    height: canvas.height,
    corners: [
      { x: 0, y: 0 },
      { x: canvas.width, y: 0 },
      { x: canvas.width, y: canvas.height },
      { x: 0, y: canvas.height }
    ],
    hash,
    confidence: 100,
  };
}