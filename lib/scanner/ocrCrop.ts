"use client";

export function createOCRCrop(image64: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();

    img.onload = () => {
      /**
       * Zone nom Pokémon
       * On garde une marge large pour absorber
       * les variations de cadrage caméra
       */
      const sourceX = Math.round(img.width * 0.06);
      const sourceY = Math.round(img.height * 0.015);

      const sourceWidth = Math.round(img.width * 0.88);
      const sourceHeight = Math.round(img.height * 0.20);

      const canvas = document.createElement("canvas");

      // x3 plutôt que x2 pour les petits textes
      canvas.width = sourceWidth * 3;
      canvas.height = sourceHeight * 3;

      const ctx = canvas.getContext("2d");

      if (!ctx) {
        resolve(image64);
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      // fond blanc
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
       * Contraste doux
       * On évite de massacrer les lettres
       */
      const contrast = 1.25;


      for (let i = 0; i < data.length; i += 4) {

        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];


        r = ((r / 255 - 0.5) * contrast + 0.5) * 255;
        g = ((g / 255 - 0.5) * contrast + 0.5) * 255;
        b = ((b / 255 - 0.5) * contrast + 0.5) * 255;


        // légère réduction couleur
        const gray =
          r * 0.299 +
          g * 0.587 +
          b * 0.114;


        data[i] = gray;
        data[i + 1] = gray;
        data[i + 2] = gray;
      }


      ctx.putImageData(imageData, 0, 0);


      resolve(
        canvas.toDataURL(
          "image/png",
          1
        )
      );
    };


    img.src = image64;
  });
}