export function captureFrame(video: HTMLVideoElement): string |null {

  const width = video.videoWidth;
  const height = video.videoHeight;

  if (!width || !height) {
    return null;
  }

  // Taille maximale conservée (plus rapide tout en restant très nette)
  const maxSize = 1600;

  let targetWidth = width;
  let targetHeight = height;

  if (width > height) {
    if (width > maxSize) {
      targetWidth = maxSize;
      targetHeight = Math.round((height / width) * maxSize);
    }
  } else {
    if (height > maxSize) {
      targetHeight = maxSize;
      targetWidth = Math.round((width / height) * maxSize);
    }
  }

  const canvas = document.createElement("canvas");

  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext("2d", {
    alpha: false,
    desynchronized: true,
  });

  if (!ctx) {
    return null;
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  ctx.drawImage(
    video,
    0,
    0,
    width,
    height,
    0,
    0,
    targetWidth,
    targetHeight
  );

  return canvas.toDataURL("image/jpeg", 1);
}