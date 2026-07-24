let worker: any = null;

async function getWorker() {
  if (worker) return worker;

  const Tesseract = await import("tesseract.js");
  worker = await Tesseract.createWorker("eng");

  await worker.setParameters({
    // Mode 7 : Traiter l'image comme une seule ligne de texte (idéal pour le titre recadré)
    tessedit_pageseg_mode: "7", 
    preserve_interword_spaces: "1",
    tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzÀ-ÿ' -",
  });

  return worker;
}

function clean(text: string): string {
  return text
    .replace(/\r/g, "")
    .replace(/[|]/g, "I")
    .replace(/[®©™]/g, "")
    .replace(/[^a-zA-ZÀ-ÿ' -]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Fonction de pré-traitement : Recadrage + Contraste
async function preprocessImage(imageSrc: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = imageSrc;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve(imageSrc);

      // 1. Recadrer les 15% supérieurs de l'image (zone du nom)
      const cropHeight = img.height * 0.15;
      canvas.width = img.width;
      canvas.height = cropHeight;

      ctx.drawImage(
        img,
        0, 0, img.width, cropHeight, // Source
        0, 0, canvas.width, canvas.height // Destination
      );

      // 2. Améliorer l'image pour l'OCR (Niveaux de gris + Contraste extrême)
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;
      for (let i = 0; i < data.length; i += 4) {
        const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
        const threshold = avg > 120 ? 255 : 0; // Binarisation (Ajuster à 100 ou 130 si besoin)
        data[i] = threshold;     // R
        data[i + 1] = threshold; // G
        data[i + 2] = threshold; // B
      }
      ctx.putImageData(imgData, 0, 0);

      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => resolve(imageSrc); 
  });
}

export async function readCardName(image: string): Promise<string | null> {
  try {
    // Étape 1 : Préparation de l'image
    const processedImage = await preprocessImage(image);

    // Étape 2 : OCR
    const ocr = await getWorker();
    const {
      data: { text },
    } = await ocr.recognize(processedImage);

    console.log("[OCR BRUT]", text);

    const lines: string[] = text
      .split("\n")
      .map(clean)
      .filter((line: string) => line.length >= 3);

    console.log("[OCR LIGNES]", lines);

    if (!lines.length) return null;

    const blacklist: string[] = [
      "pokemon", "trainer", "energy", "hp", "basic", "stage",
      "item", "supporter", "stadium", "ability", "attack",
      "weakness", "resistance", "retreat", "rule",
    ];

    const scoreLine = (line: string): number => {
      const lower = line.toLowerCase();
      let score = 0;

      if (/^[^a-zA-ZÀ-ÿ]/.test(line)) score -= 3;
      if (/[^a-zA-ZÀ-ÿ]$/.test(line)) score -= 3;
      if (line.split(" ").length > 3) score -= 5;
      if (line.split(" ").length > 2) score -= 4;
      if (line.length >= 4 && line.length <= 18) score += 5;
      if (blacklist.some((word: string) => lower.includes(word))) score -= 20;
      if ((line.match(/[0-9]/g) || []).length > 2) score -= 5;
      if (/^[a-zA-ZÀ-ÿ' -]+$/.test(line)) score += 5;

      return score;
    };

    const ranked = lines
      .map((line: string) => ({
        line,
        score: scoreLine(line),
      }))
      .sort((a, b) => b.score - a.score);

    const candidate = ranked[0]?.line;
    console.log("[OCR SELECTION]", candidate);

    return candidate || lines[0];
  } catch (err) {
    console.error("[OCR ERREUR]", err);
    return null;
  }
}