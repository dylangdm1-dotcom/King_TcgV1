"use client";

import { loadOpenCV } from "../opencv/loadOpenCV";

export type DetectionResult = {
  image: string;
  width: number;
  height: number;
  corners: Array<{ x: number; y: number }>;
  hash: string;
  confidence: number;
};

function orderPoints(points: any[]) {
  const sorted = [...points];

  const sum = (p: any) => p.x + p.y;
  const diff = (p: any) => p.y - p.x;

  const tl = sorted.reduce((a, b) => (sum(a) < sum(b) ? a : b));
  const br = sorted.reduce((a, b) => (sum(a) > sum(b) ? a : b));
  const tr = sorted.reduce((a, b) => (diff(a) < diff(b) ? a : b));
  const bl = sorted.reduce((a, b) => (diff(a) > diff(b) ? a : b));

  return [tl, tr, br, bl];
}

export async function detectCard(image: HTMLImageElement): Promise<DetectionResult | null> {
  const cv = await loadOpenCV();

  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = image.width;
  tempCanvas.height = image.height;

  const tempCtx = tempCanvas.getContext("2d");
  if (!tempCtx) return null;

  tempCtx.drawImage(image, 0, 0);

  const src = cv.imread(tempCanvas);
  const gray = new cv.Mat();
  const blur = new cv.Mat();
  const edges = new cv.Mat();

  cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
  cv.GaussianBlur(gray, blur, new cv.Size(5, 5), 0);
  cv.Canny(blur, edges, 50, 150);

  const contours = new cv.MatVector();
  const hierarchy = new cv.Mat();

  cv.findContours(edges, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
  console.log("Contours trouvés :", contours.size());

  let best: any = null;
  let bestArea = 0;

  for (let i = 0; i < contours.size(); i++) {
    const contour = contours.get(i);
    const area = cv.contourArea(contour);

    if (area < image.width * image.height * 0.05) {
      contour.delete();
      continue;
    }

    const peri = cv.arcLength(contour, true);
    const approx = new cv.Mat();

    cv.approxPolyDP(contour, approx, 0.02 * peri, true);

    // doit avoir 4 coins
    if (approx.rows !== 4) {
      approx.delete();
      contour.delete();
      continue;
    }

    // doit être un rectangle fermé
    if (!cv.isContourConvex(approx)) {
      approx.delete();
      contour.delete();
      continue;
    }

    const pts: any[] = [];

    for (let j = 0; j < 4; j++) {
      pts.push({
        x: approx.intPtr(j, 0)[0],
        y: approx.intPtr(j, 0)[1],
      });
    }

    const ordered = orderPoints(pts);
    const distance = (a: any, b: any) => Math.sqrt(Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2));

    const w = Math.max(distance(ordered[0], ordered[1]), distance(ordered[2], ordered[3]));
    const h = Math.max(distance(ordered[0], ordered[3]), distance(ordered[1], ordered[2]));
    const ratio = w / h;

    // ratio carte Pokémon
    if (ratio < 0.65 || ratio > 0.78) {
      approx.delete();
      contour.delete();
      continue;
    }

    if (area > bestArea) {
      bestArea = area;
      best = pts;
    }

    approx.delete();
    contour.delete();
  }

  if (!best) {
    src.delete();
    gray.delete();
    blur.delete();
    edges.delete();
    contours.delete();
    hierarchy.delete();
    return null;
  }

  const ordered = orderPoints(best);
  const width = 745;
  const height = 1040;

  const srcTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
    ordered[0].x,
    ordered[0].y,
    ordered[1].x,
    ordered[1].y,
    ordered[2].x,
    ordered[2].y,
    ordered[3].x,
    ordered[3].y,
  ]);

  const dstTri = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, width, 0, width, height, 0, height]);
  const matrix = cv.getPerspectiveTransform(srcTri, dstTri);
  const dst = new cv.Mat();

  cv.warpPerspective(src, dst, matrix, new cv.Size(width, height));

  const outputCanvas = document.createElement("canvas");
  outputCanvas.width = width;
  outputCanvas.height = height;

  cv.imshow(outputCanvas, dst);

  const output = outputCanvas.toDataURL("image/jpeg", 0.95);
  const corners = ordered.map((p) => ({ x: p.x, y: p.y }));
  const confidence = Math.min(100, Math.round((bestArea / (image.width * image.height)) * 150));

  console.log(
    "Carte trouvée",
    bestArea,
    image.width * image.height,
    confidence
  );

  src.delete();
  gray.delete();
  blur.delete();
  edges.delete();
  contours.delete();
  hierarchy.delete();
  srcTri.delete();
  dstTri.delete();
  matrix.delete();
  dst.delete();

  return {
    image: output,
    width,
    height,
    corners,
    confidence,
    hash: btoa(output.substring(100, 300)),
  };
}