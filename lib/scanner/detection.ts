import { loadOpenCV } from "../opencv/loadOpenCV";

export interface DetectionResult {
  image: string; // Image redressée au format DataURL
}

/**
 * Trie 4 points dans l'ordre : [Top-Left, Top-Right, Bottom-Right, Bottom-Left]
 */
function sortCorners(pts: { x: number; y: number }[]) {
  const sums = pts.map((p) => p.x + p.y);
  const diffs = pts.map((p) => p.y - p.x);

  const tl = pts[sums.indexOf(Math.min(...sums))];
  const br = pts[sums.indexOf(Math.max(...sums))];
  const tr = pts[diffs.indexOf(Math.min(...diffs))];
  const bl = pts[diffs.indexOf(Math.max(...diffs))];

  return { tl, tr, br, bl };
}

export async function detectCard(
  imgElement: HTMLImageElement
): Promise<DetectionResult | null> {
  const cv = await loadOpenCV();

  // Système de nettoyage strict pour éviter les fuites de mémoire WebAssembly
  const matsToCleanup: any[] = [];
  const track = (item: any) => {
    if (item) matsToCleanup.push(item);
    return item;
  };

  try {
    // 1. Chargement et Redimensionnement pour stabiliser les performances
    const src = track(cv.imread(imgElement));
    
    const maxDimension = 800;
    let scale = 1;
    if (src.cols > maxDimension || src.rows > maxDimension) {
      scale = maxDimension / Math.max(src.cols, src.rows);
    }

    const newWidth = Math.round(src.cols * scale);
    const newHeight = Math.round(src.rows * scale);
    const resized = track(new cv.Mat());
    cv.resize(src, resized, new cv.Size(newWidth, newHeight));

    // 2. Pré-traitement de l'image (Niveaux de gris + Égalisation + Flou)
    const gray = track(new cv.Mat());
    cv.cvtColor(resized, gray, cv.COLOR_RGBA2GRAY);

    const equalized = track(new cv.Mat());
    cv.equalizeHist(gray, equalized); // Rééquilibre les contrastes et atténue les reflets

    const blurred = track(new cv.Mat());
    const kernelSize = track(new cv.Size(5, 5));
    cv.GaussianBlur(equalized, blurred, kernelSize, 0);

    // 3. Détection des contours (Canny + Fermeture morphologique)
    const edges = track(new cv.Mat());
    cv.Canny(blurred, edges, 50, 150);

    const closed = track(new cv.Mat());
    const morphKernel = track(cv.Mat.ones(3, 3, cv.CV_8U));
    cv.morphologyEx(edges, closed, cv.MORPH_CLOSE, morphKernel); // Reconnecte les lignes cassées

    // 4. Recherche des contours
    const contours = track(new cv.MatVector());
    const hierarchy = track(new cv.Mat());
    cv.findContours(closed, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

    let bestCorners: { x: number; y: number }[] | null = null;
    let maxScore = -1;

    const minArea = (newWidth * newHeight) * 0.10; // La carte doit occuper au moins 10% de l'image

    for (let i = 0; i < contours.size(); i++) {
      const cnt = contours.get(i);
      const area = cv.contourArea(cnt);

      if (area < minArea) {
        cnt.delete();
        continue;
      }

      // Approximation polygonale
      const peri = cv.arcLength(cnt, true);
      const approx = track(new cv.Mat());
      cv.approxPolyDP(cnt, approx, 0.02 * peri, true);

      // On cherche un quadrilatère (4 sommets) convexe
      if (approx.rows === 4 && cv.isContourConvex(approx)) {
        const pts: { x: number; y: number }[] = [];
        for (let j = 0; j < 4; j++) {
          pts.push({
            x: approx.data32S[j * 2],
            y: approx.data32S[j * 2 + 1],
          });
        }

        const { tl, tr, br, bl } = sortCorners(pts);

        // Calcul du ratio de forme du quadrilatère
        const w = Math.hypot(tr.x - tl.x, tr.y - tl.y);
        const h = Math.hypot(bl.x - tl.x, bl.y - tl.y);
        const ratio = w / h;

        // Ratio officiel carte Pokémon : ~0.715 (portait) ou ~1.39 (paysage)
        const targetRatioPortrait = 63 / 88; // 0.715
        const targetRatioLandscape = 88 / 63; // 1.396

        const scorePortrait = Math.abs(ratio - targetRatioPortrait);
        const scoreLandscape = Math.abs(ratio - targetRatioLandscape);
        const ratioDiff = Math.min(scorePortrait, scoreLandscape);

        // Si le ratio est proche d'une carte (tolérance de 0.25)
        if (ratioDiff < 0.25) {
          const score = area / (1 + ratioDiff * 10);
          if (score > maxScore) {
            maxScore = score;
            bestCorners = [tl, tr, br, bl];
          }
        }
      }

      cnt.delete();
    }

    if (!bestCorners) {
      console.warn("Aucun contour correspondant à une carte Pokémon n'a été trouvé.");
      return null;
    }

    // 5. Redressement de perspective (Warp Perspective)
    // Reprojection des coordonnées de l'image réduite vers l'image originale
    const realCorners = bestCorners.map((p) => ({
      x: p.x / scale,
      y: p.y / scale,
    }));

    const { tl, tr, br, bl } = sortCorners(realCorners);

    const cardWidth = Math.max(
      Math.hypot(br.x - bl.x, br.y - bl.y),
      Math.hypot(tr.x - tl.x, tr.y - tl.y)
    );
    const cardHeight = Math.max(
      Math.hypot(tr.x - br.x, tr.y - br.y),
      Math.hypot(tl.x - bl.x, tl.y - bl.y)
    );

    const srcTri = track(
      cv.matFromArray(4, 1, cv.CV_32FC2, [
        tl.x, tl.y,
        tr.x, tr.y,
        br.x, br.y,
        bl.x, bl.y,
      ])
    );

    const dstTri = track(
      cv.matFromArray(4, 1, cv.CV_32FC2, [
        0, 0,
        cardWidth - 1, 0,
        cardWidth - 1, cardHeight - 1,
        0, cardHeight - 1,
      ])
    );

    const transformMatrix = track(cv.getPerspectiveTransform(srcTri, dstTri));
    const warped = track(new cv.Mat());
    const dsize = track(new cv.Size(cardWidth, cardHeight));

    cv.warpPerspective(src, warped, transformMatrix, dsize);

    // 6. Conversion du résultat en image DataURL
    const canvas = document.createElement("canvas");
    canvas.width = cardWidth;
    canvas.height = cardHeight;
    cv.imshow(canvas, warped);

    const imageDataUrl = canvas.toDataURL("image/jpeg", 0.92);

    return { image: imageDataUrl };
  } catch (error) {
    console.error("Erreur lors de la détection OpenCV :", error);
    return null;
  } finally {
    // Nettoyage impératif de toutes les matrices créées
    matsToCleanup.forEach((item) => {
      try {
        if (item && typeof item.delete === "function") {
          item.delete();
        }
      } catch (_) {}
    });
  }
}
