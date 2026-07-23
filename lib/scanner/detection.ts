"use client";

export type DetectionResult = {
  image: string;
  width: number;
  height: number;
  corners: Array<{ x: number; y: number }>;
  hash: string;
  confidence: number;
};

function computeContrast(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number
) {
  const img = ctx.getImageData(x, y, w, h).data;

  let sum = 0;
  let sum2 = 0;

  for (let i = 0; i < img.length; i += 4) {
    const gray =
      img[i] * 0.299 +
      img[i + 1] * 0.587 +
      img[i + 2] * 0.114;

    sum += gray;
    sum2 += gray * gray;
  }

  const n = img.length / 4;

  const mean = sum / n;

  return Math.sqrt(sum2 / n - mean * mean);
}

export async function detectCard(
  image: HTMLImageElement
): Promise<DetectionResult | null> {

  const preview = document.createElement("canvas");

  preview.width = image.width;
  preview.height = image.height;

  const pctx = preview.getContext("2d");

  if (!pctx) return null;

  pctx.drawImage(image, 0, 0);

  const ratio = 63 / 88;

  const cropWidth = image.width * 0.75;
  const cropHeight = cropWidth / ratio;

  const searchRadius = 0;
  const step = Math.max(8, Math.round(image.width * 0.01));

  let bestX = (image.width - cropWidth) / 2;
  let bestY = (image.height - cropHeight) / 2;

  let bestScore = -Infinity;

  for (
    let dy = -searchRadius;
    dy <= searchRadius;
    dy += step
  ) {
    for (
      let dx = -searchRadius;
      dx <= searchRadius;
      dx += step
    ) {

      const x = Math.max(
        0,
        Math.min(
          image.width - cropWidth,
          (image.width - cropWidth) / 2 + dx
        )
      );

      const y = Math.max(
        0,
        Math.min(
          image.height - cropHeight,
          (image.height - cropHeight) / 2 + dy
        )
      );

      const score = computeContrast(
        pctx,
        Math.round(x),
        Math.round(y),
        Math.round(cropWidth),
        Math.round(cropHeight)
      );

      if (score > bestScore) {
        bestScore = score;
        bestX = x;
        bestY = y;
      }
    }
  }

  const canvas = document.createElement("canvas");

  canvas.width = 745;
  canvas.height = 1040;

  const ctx = canvas.getContext("2d");

  if (!ctx) return null;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  ctx.filter =
    "brightness(1.18) contrast(1.28) saturate(1.12)";

  ctx.drawImage(
    image,
    bestX,
    bestY,
    cropWidth,
    cropHeight,
    0,
    0,
    canvas.width,
    canvas.height
  );

  ctx.filter = "none";

  const out = canvas.toDataURL("image/jpeg", 0.95);

  return {
    image: out,
    width: canvas.width,
    height: canvas.height,
    corners: [
      { x: 0, y: 0 },
      { x: canvas.width, y: 0 },
      { x: canvas.width, y: canvas.height },
      { x: 0, y: canvas.height }
    ],
    confidence: Math.min(
      100,
      Math.round(bestScore / 2)
    ),
    hash: btoa(out.substring(100, 300))
  };
}