let worker: any = null;

async function getWorker() {
  if (worker) return worker;

  const Tesseract = await import("tesseract.js");

  worker = await Tesseract.createWorker("eng");

  await worker.setParameters({
    tessedit_pageseg_mode: "6",
    preserve_interword_spaces: "1",
    tessedit_char_whitelist:
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789- '",
  });

  return worker;
}

function clean(text: string): string {
  return text
    .replace(/\r/g, "")
    .replace(/[|]/g, "I")
    .replace(/[®©™]/g, "")
    .replace(/[^a-zA-Z0-9À-ÿ' -]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export async function readCardName(
  image: string
): Promise<string | null> {
  try {
    const ocr = await getWorker();

    const {
      data: { text },
    } = await ocr.recognize(image);

    console.log("[OCR]");
    console.log(text);

    const lines: string[] = text
      .split("\n")
      .map(clean)
      .filter((line: string) => line.length >= 3);

    if (!lines.length) return null;

    const blacklist: string[] = [
      "pokemon",
      "trainer",
      "energy",
      "hp",
      "basic",
      "stage",
      "vstar",
      "vmax",
      "gx",
      "ex",
      "item",
      "supporter",
      "stadium",
      "ability",
      "attack",
      "weakness",
      "resistance",
      "retreat",
      "rule",
    ];

    const scoreLine = (line: string): number => {
      const lower = line.toLowerCase();

      let score = 0;

      // Taille idéale d'un nom Pokémon
      if (line.length >= 4 && line.length <= 18) {
        score += 5;
      }

      // Pénalité mots techniques
      if (blacklist.some((word: string) => lower.includes(word))) {
        score -= 20;
      }

      // Trop de chiffres = probablement pas un nom
      if ((line.match(/[0-9]/g) || []).length > 2) {
        score -= 5;
      }

      // Lettres uniquement = bon signe
      if (/^[a-zA-ZÀ-ÿ' -]+$/.test(line)) {
        score += 5;
      }

      return score;
    };

    const ranked = lines
      .map((line: string) => ({
        line,
        score: scoreLine(line),
      }))
      .sort(
        (
          a: { line: string; score: number },
          b: { line: string; score: number }
        ) => b.score - a.score
      );

    const candidate = ranked[0]?.line;

    if (!candidate) {
      return lines[0];
    }

    console.log("[OCR NAME]", candidate);

    return candidate;

  } catch (err) {
    console.error("[OCR]", err);
    return null;
  }
}