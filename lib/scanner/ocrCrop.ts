"use client";

export function createOCRCrop(image64: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();

    img.onload = () => {
      // Zone du nom (≈18% de la hauteur)
      const sourceX = Math.round(img.width * 0.08);
      const sourceY = Math.round(img.height * 0.025);

      const sourceWidth = Math.round(img.width * 0.84);
      const sourceHeight = Math.round(img.height * 0.18);

      const canvas = document.createElement("canvas");

      // Agrandit la zone pour aider l'OCR
      canvas.width = sourceWidth * 2;
      canvas.height = sourceHeight * 2;

      const ctx = canvas.getContext("2d");

      if (!ctx) {
        resolve(image64);
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      // Fond blanc
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Agrandissement x2
      ctx.drawImage(
        img,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        0,
        0,
        canvas.width,
        canvas.height
      );

      // Contraste
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      const contrast = 1.45;

      for (let i = 0; i < data.length; i += 4) {
        const r = (((data[i] / 255 - 0.5) * contrast) + 0.5) * 255;
        const g = (((data[i + 1] / 255 - 0.5) * contrast) + 0.5) * 255;
        const b = (((data[i + 2] / 255 - 0.5) * contrast) + 0.5) * 255;

        const gray = (r + g + b) / 3;

        const value = gray > 170 ? 255 : gray < 80 ? 0 : gray;

        data[i] = value;
        data[i + 1] = value;
        data[i + 2] = value;
      }

      ctx.putImageData(imageData, 0, 0);

      resolve(canvas.toDataURL("image/png"));
    };

    img.src = image64;
  });
}