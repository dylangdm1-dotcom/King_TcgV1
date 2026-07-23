"use client";

export function createOCRCrop(image64: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();

    img.onload = () => {

      /**
       * Zone précise du nom Pokémon
       * Adaptée au cadrage actuel du scanner
       */
      const sourceX = Math.round(img.width * 0.08);
      const sourceY = Math.round(img.height * 0.04);

      const sourceWidth = Math.round(img.width * 0.84);
      const sourceHeight = Math.round(img.height * 0.12);


      const canvas = document.createElement("canvas");

      // Agrandissement important pour OCR
      canvas.width = sourceWidth * 4;
      canvas.height = sourceHeight * 4;


      const ctx = canvas.getContext("2d");

      if (!ctx) {
        resolve(image64);
        return;
      }


      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";


      // Fond blanc
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
      );


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


      const imageData = ctx.getImageData(
        0,
        0,
        canvas.width,
        canvas.height
      );

      const data = imageData.data;


      /**
       * Contraste + niveaux gris
       */
      const contrast = 1.35;


      for (let i = 0; i < data.length; i += 4) {

        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];


        r = ((r / 255 - 0.5) * contrast + 0.5) * 255;
        g = ((g / 255 - 0.5) * contrast + 0.5) * 255;
        b = ((b / 255 - 0.5) * contrast + 0.5) * 255;


        const gray =
          r * 0.299 +
          g * 0.587 +
          b * 0.114;


        data[i] = gray;
        data[i + 1] = gray;
        data[i + 2] = gray;
      }


      ctx.putImageData(
        imageData,
        0,
        0
      );


      console.log(
        "[OCR CROP]",
        {
          x: sourceX,
          y: sourceY,
          width: sourceWidth,
          height: sourceHeight
        }
      );


      resolve(
        canvas.toDataURL(
          "image/png"
        )
      );
    };


    img.src = image64;
  });
}