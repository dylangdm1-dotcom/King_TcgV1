/**
 * Capture d'image depuis la caméra pour le Scanner King TCG
 */
export type CaptureFrameOptions = {
  /** Comportement historique Mono/Batch : largeur maximale de la capture. */
  maxWidth?: number;
  /** Quad : borne le plus grand côté afin de conserver assez de détails sur 4 cartes. */
  maxLongEdge?: number;
  jpegQuality?: number;
};

 export function captureFrame(
  video: HTMLVideoElement,
  options: CaptureFrameOptions = {}
): string | null {
  const videoWidth = video.videoWidth;
  const videoHeight = video.videoHeight;

  if (!videoWidth || !videoHeight) {
    console.warn("⚠️ Dimensions de la vidéo invalides au moment de la capture");
    return null;
  }

  const displayWidth = video.clientWidth || videoWidth;
  const displayHeight = video.clientHeight || videoHeight;

  const videoRatio = videoWidth / videoHeight;
  const displayRatio = displayWidth / displayHeight;

  let sx = 0;
  let sy = 0;
  let sw = videoWidth;
  let sh = videoHeight;

  if (videoRatio > displayRatio) {
    sw = videoHeight * displayRatio;
    sx = (videoWidth - sw) / 2;
  } else {
    sh = videoWidth / displayRatio;
    sy = (videoHeight - sh) / 2;
  }

  sx = Math.max(0, sx);
  sy = Math.max(0, sy);

  if (sx + sw > videoWidth) sw = videoWidth - sx;
  if (sy + sh > videoHeight) sh = videoHeight - sy;

  const maxSize = options.maxWidth ?? 1200; // Valeur historique Mono/Batch
  let width = sw;
  let height = sh;

  if (options.maxLongEdge) {
    const longEdge = Math.max(sw, sh);
    if (longEdge > options.maxLongEdge) {
      const scale = options.maxLongEdge / longEdge;
      width = Math.round(sw * scale);
      height = Math.round(sh * scale);
    }
  } else if (width > maxSize) {
    width = maxSize;
    height = Math.round((sh / sw) * maxSize);
  }

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width);
  canvas.height = Math.round(height);

  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) return null;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  try {
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  } catch (err) {
    console.warn("⚠️ Erreur lors du rognage, bascule en capture plein écran vidéo", err);
    canvas.width = videoWidth;
    canvas.height = videoHeight;
    ctx.drawImage(video, 0, 0, videoWidth, videoHeight);
  }

  return canvas.toDataURL(
    "image/jpeg",
    Math.max(0.72, Math.min(0.96, options.jpegQuality ?? 0.85))
  );
}
