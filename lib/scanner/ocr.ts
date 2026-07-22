export async function readCardName(image: string): Promise<string | null> {
  try {
    console.log("OCR START");

    const Tesseract = await import("tesseract.js");

    const result = await Tesseract.recognize(
      image,
      "eng",
      {
        logger: (message) => {
          console.log(message);
        },
      }
    );

    const text = result.data.text;

    console.log("OCR TEXT:", text);

    const lines = text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    if (!lines.length) {
      return null;
    }

    const name = lines[0]
      .replace(/[^a-zA-ZÀ-ÿ0-9 ]/g, "")
      .trim();

    if (!name) {
      return null;
    }

    console.log("CARD NAME:", name);

    return name;

  } catch (error) {
    console.error("OCR ERROR:", error);
    return null;
  }
}