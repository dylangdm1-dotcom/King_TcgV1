/**
 * OCR Carte Pokémon
 * King TCG Scanner V2
 */

 import { createWorker, Worker } from "tesseract.js";


 export interface ScanOCRResult {
   rawName: string;
   cardNumber: string | null;
   confidence: number;
 }
 
 
 let workerInstance: Worker | null = null;
 
 
 
 async function getWorker() {
 
   if (workerInstance) {
     return workerInstance;
   }
 
 
   const worker =
     await createWorker("eng");
 
 
   await worker.setParameters({
 
     tessedit_pageseg_mode: "7",
 
     tessedit_char_whitelist:
       "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789/-À-ÿ",
 
   });
 
 
   workerInstance = worker;
 
 
   return worker;
 
 }
 
 
 
 
 
 function cleanPokemonName(
   text: string
 ): string {
 
   return text
 
     .replace(
       /\n/g,
       " "
     )
 
     .replace(
       /[^a-zA-ZÀ-ÿ0-9 '-]/g,
       ""
     )
 
     .replace(
       /\s+/g,
       " "
     )
 
     .trim();
 
 }
 
 
 
 
 
 function extractCardNumber(
   text: string
 ): string | null {
 
 
   const cleaned =
     text
 
       .replace(/O/g, "0")
       .replace(/o/g, "0")
       .replace(/I/g, "1")
       .replace(/l/g, "1")
       .replace(/\s/g, "");
 
 
 
   const match =
     cleaned.match(
       /\d{1,3}\/\d{1,3}/
     );
 
 
 
   if (!match) {
 
     // fallback si OCR lit seulement 089
     const onlyNumber =
       cleaned.match(
         /\d{1,3}/
       );
 
 
     return onlyNumber
       ? onlyNumber[0]
       : null;
 
   }
 
 
 
   return match[0];
 
 }
 
 
 
 
 
 export async function processCardOCR(
   nameImg: string,
   numberImg: string
 ): Promise<ScanOCRResult> {
 
 
   try {
 
 
     const worker =
       await getWorker();
 
 
 
 
     /**
      * OCR NOM
      */
     const nameResult =
       await worker.recognize(
         nameImg
       );
 
 
 
     const rawName =
       cleanPokemonName(
         nameResult.data.text
       );
 
 
 
 
 
     /**
      * OCR NUMERO
      */
     await worker.setParameters({
 
       tessedit_pageseg_mode: "7",
 
       tessedit_char_whitelist:
         "0123456789/",
 
     });
 
 
 
     const numberResult =
       await worker.recognize(
         numberImg
       );
 
 
 
     const cardNumber =
       extractCardNumber(
         numberResult.data.text
       );
 
 
 
 
 
     /**
      * Retour confiance
      */
     const scores = [
 
       nameResult.data.confidence,
 
       numberResult.data.confidence,
 
     ].filter(
       (v) => v > 0
     );
 
 
 
     const confidence =
       scores.length
         ? Math.round(
             scores.reduce(
               (a, b) => a + b,
               0
             ) / scores.length
           )
         : 0;
 
 
 
 
     return {
 
       rawName,
 
       cardNumber,
 
       confidence,
 
     };
 
 
 
   } catch(error) {
 
 
     console.error(
       "OCR error:",
       error
     );
 
 
 
     return {
 
       rawName: "",
 
       cardNumber: null,
 
       confidence: 0,
 
     };
 
 
   }
 
 }
 
 
 
 
 
 export async function terminateOCR() {
 
   if (workerInstance) {
 
     await workerInstance.terminate();
 
     workerInstance = null;
 
   }
 
 }