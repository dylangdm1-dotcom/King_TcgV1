export function captureFrame(video: HTMLVideoElement): string | null {

  const videoWidth = video.videoWidth;
  const videoHeight = video.videoHeight;

  if (!videoWidth || !videoHeight) {
    return null;
  }


  // Dimensions affichées du composant vidéo
  const displayWidth = video.clientWidth;
  const displayHeight = video.clientHeight;

  if (!displayWidth || !displayHeight) {
    return null;
  }


  // Calcul du crop correspondant à object-fit: cover
  const videoRatio = videoWidth / videoHeight;
  const displayRatio = displayWidth / displayHeight;


  let sx = 0;
  let sy = 0;
  let sw = videoWidth;
  let sh = videoHeight;


  if (videoRatio > displayRatio) {
    // image trop large → coupe les côtés
    sw = videoHeight * displayRatio;
    sx = (videoWidth - sw) / 2;
  } else 
  {
    // image trop haute → coupe haut/bas
    sh = videoWidth / displayRatio;
    sy = (videoHeight - sh) / 2;
  }
  const zoomOut = 0.03;

sx -= sw * zoomOut;
sy -= sh * zoomOut;
sw += sw * zoomOut * 2;
sh += sh * zoomOut * 2;

// sécurité pour ne pas dépasser l'image
sx = Math.max(0, sx);
sy = Math.max(0, sy);

if (sx + sw > videoWidth) {
  sw = videoWidth - sx;
}

if (sy + sh > videoHeight) {
  sh = videoHeight - sy;
}

  const maxSize = 1600;

  let targetWidth = sw;
  let targetHeight = sh;


  if (targetWidth > maxSize) {
    targetWidth = maxSize;
    targetHeight = Math.round(
      (sh / sw) * maxSize
    );
  }


  const canvas = document.createElement("canvas");

  canvas.width = Math.round(targetWidth);
  canvas.height = Math.round(targetHeight);


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
    sx,
    sy,
    sw,
    sh,
    0,
    0,
    canvas.width,
    canvas.height
  );


  return canvas.toDataURL("image/jpeg", 1);
}