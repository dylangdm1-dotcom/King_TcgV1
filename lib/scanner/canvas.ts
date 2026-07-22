"use client";

export function matToBase64(cv: any, mat: any): string {
  const canvas = document.createElement("canvas");
  canvas.width = mat.cols;
  canvas.height = mat.rows;

  cv.imshow(canvas, mat);
  return canvas.toDataURL("image/jpeg", 0.95);
}

export function resizeImage(image: HTMLImageElement, maxSize = 900): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  let width = image.width;
  let height = image.height;

  if (width > height && width > maxSize) {
    height = Math.round(height * (maxSize / width));
    width = maxSize;
  } else if (height > maxSize) {
    width = Math.round(width * (maxSize / height));
    height = maxSize;
  }

  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Impossible de créer le canvas.");
  }

  ctx.drawImage(image, 0, 0, width, height);
  return canvas;
}