/**
 * Capture image depuis la caméra
 * King TCG Scanner V2
 *
 * Rôle :
 * - récupère exactement ce que voit l'utilisateur
 * - respecte object-cover du composant caméra
 * - prépare une image propre pour nativeCrop
 */

 export function captureFrame(
  video: HTMLVideoElement
): string | null {

  const videoWidth = video.videoWidth;
  const videoHeight = video.videoHeight;


  if (
    !videoWidth ||
    !videoHeight
  ) {
    return null;
  }


  const displayWidth =
    video.clientWidth;

  const displayHeight =
    video.clientHeight;


  if (
    !displayWidth ||
    !displayHeight
  ) {
    return null;
  }



  /**
   * Reproduction du object-cover
   */
  const videoRatio =
    videoWidth / videoHeight;

  const displayRatio =
    displayWidth / displayHeight;



  let sx = 0;
  let sy = 0;
  let sw = videoWidth;
  let sh = videoHeight;



  if (
    videoRatio > displayRatio
  ) {

    // coupe les côtés
    sw =
      videoHeight * displayRatio;

    sx =
      (videoWidth - sw) / 2;


  } else {

    // coupe haut/bas
    sh =
      videoWidth / displayRatio;

    sy =
      (videoHeight - sh) / 2;

  }



  /**
   * Petite marge de sécurité
   * évite de couper les bords de carte
   */
  const margin = 0.03;

  sx -= sw * margin;
  sy -= sh * margin;

  sw += sw * margin * 2;
  sh += sh * margin * 2;



  sx = Math.max(0, sx);
  sy = Math.max(0, sy);


  if (
    sx + sw > videoWidth
  ) {
    sw = videoWidth - sx;
  }


  if (
    sy + sh > videoHeight
  ) {
    sh = videoHeight - sy;
  }



  /**
   * Limite poids image
   */
  const maxSize = 1600;


  let width = sw;
  let height = sh;


  if (
    width > maxSize
  ) {

    width = maxSize;

    height =
      Math.round(
        (sh / sw) * maxSize
      );

  }



  const canvas =
    document.createElement(
      "canvas"
    );


  canvas.width =
    Math.round(width);

  canvas.height =
    Math.round(height);



  const ctx =
    canvas.getContext(
      "2d",
      {
        alpha: false,
        desynchronized: true,
      }
    );


  if (!ctx) {
    return null;
  }



  ctx.imageSmoothingEnabled = true;

  ctx.imageSmoothingQuality =
    "high";



  ctx.drawImage(
    video,
    sx,
    sy,
    sw,
    sh,
    0,
    0,
    canvas.width,
    canvas.height
  );



  return canvas.toDataURL(
    "image/jpeg",
    1
  );

}