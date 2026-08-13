/**
 * Capture d'image depuis la caméra pour le Scanner King TCG
 */
 export function captureFrame(video: HTMLVideoElement): string | null {
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

  const maxSize = 1200; // Taille idéale pour la détection IA tout en restant léger
  let width = sw;
  let height = sh;

  if (width > maxSize) {
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

  return canvas.toDataURL("image/jpeg", 0.85);
}