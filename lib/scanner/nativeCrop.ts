/**
 * Découpe les zones importantes d'une carte Pokémon
 * King TCG Scanner V2
 *
 * Pipeline :
 * captureFrame()
 * ↓
 * nativeCrop()
 * ↓
 * OCR
 */

 import { prepareImageForOCR } from "./preprocess";


 export interface CardCrops {
   nameCrop: string;
   numberCrop: string;
 }
 
 
 /**
  * Sécurité coordonnées
  */
 function clamp(
   value: number,
   min: number,
   max: number
 ) {
   return Math.max(
     min,
     Math.min(value, max)
   );
 }
 
 
 
 /**
  * Charge une image base64
  */
 function loadImage(
   src: string
 ): Promise<HTMLImageElement> {
 
   return new Promise((resolve, reject) => {
 
     const img = new Image();
 
     img.onload = () => {
       resolve(img);
     };
 
     img.onerror = reject;
 
     img.src = src;
 
   });
 
 }
 
 
 
 /**
  * Découpe carte Pokémon
  */
 export async function cropCardZones(
   image64: string
 ): Promise<CardCrops | null> {
 
 
   try {
 
 
     const img =
       await loadImage(image64);
 
 
 
     const width =
       img.width;
 
     const height =
       img.height;
 
 
 
     if (
       !width ||
       !height
     ) {
       return null;
     }
 
 
 
     /**
      * Ratio carte Pokémon
      */
     const cardRatio =
       63 / 88;
 
 
 
     let cardWidth =
       width * 0.72;
 
 
     let cardHeight =
       cardWidth / cardRatio;
 
 
 
     /**
      * Ajustement hauteur
      */
     if (
       cardHeight > height * 0.88
     ) {
 
       cardHeight =
         height * 0.88;
 
 
       cardWidth =
         cardHeight * cardRatio;
 
     }
 
 
 
     const cardX =
       (width - cardWidth) / 2;
 
 
     const cardY =
       (height - cardHeight) / 2;
 
 
 
     /**
      * ==========================
      * ZONE NOM POKEMON
      * ==========================
      */
 
 
     const nameX =
       clamp(
         cardX + cardWidth * 0.04,
         0,
         width
       );
 
 
     const nameY =
       clamp(
         cardY + cardHeight * 0.035,
         0,
         height
       );
 
 
     const nameWidth =
       cardWidth * 0.92;
 
 
     const nameHeight =
       cardHeight * 0.13;
 
 
 
     const nameCanvas =
       document.createElement(
         "canvas"
       );
 
 
     nameCanvas.width =
       Math.round(nameWidth * 4);
 
 
     nameCanvas.height =
       Math.round(nameHeight * 4);
 
 
 
     const nameCtx =
       nameCanvas.getContext(
         "2d"
       );
 
 
     if (!nameCtx) {
       return null;
     }
 
 
 
     nameCtx.imageSmoothingEnabled =
       true;
 
 
     nameCtx.imageSmoothingQuality =
       "high";
 
 
 
     nameCtx.drawImage(
       img,
       nameX,
       nameY,
       nameWidth,
       nameHeight,
       0,
       0,
       nameCanvas.width,
       nameCanvas.height
     );
 
 
 
     prepareImageForOCR(
       nameCtx,
       nameCanvas.width,
       nameCanvas.height
     );
 
 
 
 
 
     /**
      * ==========================
      * ZONE NUMERO CARTE
      * ==========================
      */
 
 
     const numberX =
       clamp(
         cardX + cardWidth * 0.05,
         0,
         width
       );
 
 
     const numberY =
       clamp(
         cardY + cardHeight * 0.905,
         0,
         height
       );
 
 
     const numberWidth =
       cardWidth * 0.42;
 
 
     const numberHeight =
       cardHeight * 0.09;
 
 
 
     const numberCanvas =
       document.createElement(
         "canvas"
       );
 
 
     numberCanvas.width =
       Math.round(numberWidth * 4);
 
 
     numberCanvas.height =
       Math.round(numberHeight * 4);
 
 
 
     const numberCtx =
       numberCanvas.getContext(
         "2d"
       );
 
 
 
     if (!numberCtx) {
       return null;
     }
 
 
 
     numberCtx.imageSmoothingEnabled =
       true;
 
 
     numberCtx.imageSmoothingQuality =
       "high";
 
 
 
     numberCtx.drawImage(
       img,
       numberX,
       numberY,
       numberWidth,
       numberHeight,
       0,
       0,
       numberCanvas.width,
       numberCanvas.height
     );
 
 
 
     prepareImageForOCR(
       numberCtx,
       numberCanvas.width,
       numberCanvas.height
     );
 
 
 
 
 
     return {
 
       nameCrop:
         nameCanvas.toDataURL(
           "image/png"
         ),
 
 
       numberCrop:
         numberCanvas.toDataURL(
           "image/png"
         ),
 
     };
 
 
 
   } catch(error) {
 
 
     console.error(
       "Native crop error:",
       error
     );
 
 
     return null;
 
 
   }
 
 
 }