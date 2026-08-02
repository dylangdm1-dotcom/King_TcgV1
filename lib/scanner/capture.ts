/**
 * 📸 King_TCG Scanner V5.0
 *
 * Capture et recadrage d'une image depuis la caméra.
 */

const MAX_CAPTURE_SIZE = 1200;
const JPEG_QUALITY = 0.85;

/**
 * Capture l'image actuellement affichée par la caméra.
 *
 * Le cadrage est calculé afin de correspondre au mieux
 * à la zone réellement visible dans l'interface.
 *
 * @param video Élément HTMLVideoElement de la caméra
 * @returns Image JPEG en Data URL ou null si la capture échoue
 */
export function captureFrame(
  video: HTMLVideoElement
): string | null {
  if (!video) {
    console.warn(
      "[King_TCG Scanner V5] Élément vidéo invalide."
    );
    return null;
  }

  const videoWidth = video.videoWidth;
  const videoHeight = video.videoHeight;

  if (videoWidth <= 0 || videoHeight <= 0) {
    console.warn(
      "[King_TCG Scanner V5] Dimensions vidéo invalides."
    );
    return null;
  }

  const displayWidth =
    video.clientWidth > 0
      ? video.clientWidth
      : videoWidth;

  const displayHeight =
    video.clientHeight > 0
      ? video.clientHeight
      : videoHeight;

  if (displayWidth <= 0 || displayHeight <= 0) {
    console.warn(
      "[King_TCG Scanner V5] Dimensions d'affichage invalides."
    );
    return null;
  }

  const videoRatio = videoWidth / videoHeight;
  const displayRatio = displayWidth / displayHeight;

  let sx = 0;
  let sy = 0;
  let sw = videoWidth;
  let sh = videoHeight;

  /**
   * Reproduit le comportement d'un object-fit: cover :
   * on coupe la partie non visible de la vidéo.
   */
  if (videoRatio > displayRatio) {
    // Vidéo trop large : découpe horizontale.
    sw = videoHeight * displayRatio;
    sx = (videoWidth - sw) / 2;
  } else if (videoRatio < displayRatio) {
    // Vidéo trop haute : découpe verticale.
    sh = videoWidth / displayRatio;
    sy = (videoHeight - sh) / 2;
  }

  /**
   * Sécurité contre les valeurs hors limites.
   */
  sx = Math.max(0, Math.min(sx, videoWidth));
  sy = Math.max(0, Math.min(sy, videoHeight));

  sw = Math.max(
    1,
    Math.min(sw, videoWidth - sx)
  );

  sh = Math.max(
    1,
    Math.min(sh, videoHeight - sy)
  );

  /**
   * Réduction de résolution.
   *
   * 1200 px maximum permet de conserver suffisamment
   * de détails pour Gemini Vision V5 tout en limitant
   * le poids de la requête réseau.
   */
  let outputWidth = sw;
  let outputHeight = sh;

  if (outputWidth > MAX_CAPTURE_SIZE) {
    outputWidth = MAX_CAPTURE_SIZE;
    outputHeight = Math.round(
      (sh / sw) * outputWidth
    );
  }

  outputWidth = Math.max(1, Math.round(outputWidth));
  outputHeight = Math.max(1, Math.round(outputHeight));

  const canvas = document.createElement("canvas");

  canvas.width = outputWidth;
  canvas.height = outputHeight;

  const context = canvas.getContext("2d", {
    alpha: false,
  });

  if (!context) {
    console.warn(
      "[King_TCG Scanner V5] Impossible de créer le contexte Canvas."
    );
    return null;
  }

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";

  try {
    context.drawImage(
      video,
      sx,
      sy,
      sw,
      sh,
      0,
      0,
      outputWidth,
      outputHeight
    );
  } catch (error) {
    /**
     * Fallback : capture de toute la vidéo.
     *
     * Cela permet au scanner de continuer à fonctionner
     * même si le recadrage calculé échoue.
     */
    console.warn(
      "[King_TCG Scanner V5] Échec du recadrage. Capture complète utilisée.",
      error
    );

    canvas.width = videoWidth;
    canvas.height = videoHeight;

    try {
      context.drawImage(
        video,
        0,
        0,
        videoWidth,
        videoHeight
      );
    } catch (fallbackError) {
      console.error(
        "[King_TCG Scanner V5] Échec de la capture vidéo.",
        fallbackError
      );

      return null;
    }
  }

  try {
    return canvas.toDataURL(
      "image/jpeg",
      JPEG_QUALITY
    );
  } catch (error) {
    console.error(
      "[King_TCG Scanner V5] Impossible de convertir la capture en JPEG.",
      error
    );

    return null;
  }
}