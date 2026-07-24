/**
 * Prétraitement image optimisé pour OCR Tesseract
 * King TCG Scanner V2
 *
 * Pipeline :
 * - niveaux de gris
 * - contraste
 * - netteté
 * - binarisation
 */

 export function preprocessCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  contrastStrength = 1.6
) {
  const imageData = ctx.getImageData(
    0,
    0,
    width,
    height
  );

  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {

    const gray =
      0.299 * data[i] +
      0.587 * data[i + 1] +
      0.114 * data[i + 2];


    const contrasted =
      (gray - 128) * contrastStrength + 128;


    const value = Math.max(
      0,
      Math.min(
        255,
        contrasted
      )
    );


    data[i] = value;
    data[i + 1] = value;
    data[i + 2] = value;
  }


  ctx.putImageData(
    imageData,
    0,
    0
  );
}



/**
 * Noir / blanc pour Tesseract
 */
export function binarizeCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  thresholdLimit = 135
) {

  const imageData = ctx.getImageData(
    0,
    0,
    width,
    height
  );

  const data = imageData.data;


  for (let i = 0; i < data.length; i += 4) {

    const gray =
      0.299 * data[i] +
      0.587 * data[i + 1] +
      0.114 * data[i + 2];


    const value =
      gray > thresholdLimit
        ? 255
        : 0;


    data[i] = value;
    data[i + 1] = value;
    data[i + 2] = value;

  }


  ctx.putImageData(
    imageData,
    0,
    0
  );

}



/**
 * Accentuation légère des caractères
 */
export function sharpenCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
) {

  const imageData =
    ctx.getImageData(
      0,
      0,
      width,
      height
    );


  const data =
    imageData.data;


  for (let i = 0; i < data.length; i += 4) {

    const gray =
      (
        data[i] +
        data[i + 1] +
        data[i + 2]
      ) / 3;


    const value =
      gray > 128
        ? Math.min(
            gray + 15,
            255
          )
        : Math.max(
            gray - 15,
            0
          );


    data[i] = value;
    data[i + 1] = value;
    data[i + 2] = value;

  }


  ctx.putImageData(
    imageData,
    0,
    0
  );

}



/**
 * Pipeline OCR complet
 */
export function prepareImageForOCR(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
) {

  preprocessCanvas(
    ctx,
    width,
    height,
    1.3
  );


  sharpenCanvas(
    ctx,
    width,
    height
  );

}
