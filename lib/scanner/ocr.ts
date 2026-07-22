let worker: any = null;

async function getWorker() {
  if (worker) return worker;

  const Tesseract = await import("tesseract.js");

  worker = await Tesseract.createWorker("eng");

  await worker.setParameters({
    tessedit_pageseg_mode: "6",
    preserve_interword_spaces: "1",
  });

  return worker;
}

function clean(text: string) {
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

    const lines = text
      .split("\n")
      .map(clean)
      .filter((l) => l.length >= 3);

    if (!lines.length) return null;

    const blacklist = [
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

    const candidate = lines.find((line) => {
      const lower = line.toLowerCase();

      return !blacklist.some((word) => lower.includes(word));
    });

    if (!candidate) return lines[0];

    console.log("[OCR NAME]", candidate);

    return candidate;
  } catch (err) {
    console.error("[OCR]", err);
    return null;
  }
}