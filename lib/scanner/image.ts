"use client";

export function matToDataURL(cv: any, mat: any): string {
  const canvas = document.createElement("canvas");
  cv.imshow(canvas, mat);
  const image = canvas.toDataURL("image/png");
  canvas.remove();
  return image;
}

export function downloadImage(image: string, filename: string) {
  const a = document.createElement("a");
  a.href = image;
  a.download = filename;
  a.click();
}