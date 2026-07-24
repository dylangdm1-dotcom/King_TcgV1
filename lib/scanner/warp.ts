"use client";

import type { Point } from "./types";
import { matToBase64 } from "./canvas";

export async function warpCard(cv: any, src: any, corners: Point[]): Promise<string> {
  const width = 745;
  const height = 1040;

  const srcTri = cv.matFromArray(
    4,
    1,
    cv.CV_32FC2,
    [
      corners[0].x, corners[0].y,
      corners[1].x, corners[1].y,
      corners[2].x, corners[2].y,
      corners[3].x, corners[3].y,
    ]
  );

  const dstTri = cv.matFromArray(
    4,
    1,
    cv.CV_32FC2,
    [
      0, 0,
      width, 0,
      width, height,
      0, height,
    ]
  );

  const matrix = cv.getPerspectiveTransform(srcTri, dstTri);
  const dst = new cv.Mat();

  cv.warpPerspective(
    src,
    dst,
    matrix,
    new cv.Size(width, height)
  );

  const image = matToBase64(cv, dst);

  // Nettoyage de la mémoire OpenCV pour éviter les fuites de RAM
  srcTri.delete();
  dstTri.delete();
  matrix.delete();
  dst.delete();

  return image;
}