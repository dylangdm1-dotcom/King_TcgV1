"use client";

export type DetectionResult = {
  image: string;
  width: number;
  height: number;
  corners: Array<{ x: number; y: number }>;
  hash: string;
  confidence: number;
};


export async function detectCard(
  image: HTMLImageElement
): Promise<DetectionResult | null> {


  const ratio = 63 / 88;


  /**
   * La carte correspond au cadre utilisateur.
   * On prend une zone fixe centrée.
   */
  const cropWidth = image.width * 0.75;
  const cropHeight = cropWidth / ratio;


  const x = (image.width - cropWidth) / 2;
  const y = (image.height - cropHeight) / 2;



  const canvas = document.createElement("canvas");

  canvas.width = 745;
  canvas.height = 1040;


  const ctx = canvas.getContext("2d");

  if (!ctx) return null;


  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";


  ctx.filter =
    "brightness(1.15) contrast(1.20) saturate(1.10)";


  ctx.drawImage(
    image,
    x,
    y,
    cropWidth,
    cropHeight,
    0,
    0,
    canvas.width,
    canvas.height
  );


  ctx.filter = "none";


  const out = canvas.toDataURL(
    "image/jpeg",
    0.95
  );


  return {
    image: out,

    width: canvas.width,

    height: canvas.height,

    corners: [
      { x: 0, y: 0 },
      { x: canvas.width, y: 0 },
      { x: canvas.width, y: canvas.height },
      { x: 0, y: canvas.height },
    ],

    confidence: 100,

    hash: btoa(
      out.substring(100, 300)
    ),
  };
}
