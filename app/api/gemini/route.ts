import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
});

export async function POST(req: Request) {
  try {
    const { image } = await req.json();

    if (!image) {
      return NextResponse.json(
        { error: "Image manquante." },
        { status: 400 }
      );
    }

    const base64 = image.replace(/^data:image\/\w+;base64,/, "");

    const prompt = `
Tu es un expert des cartes Pokémon.

Analyse cette photo.

Retourne UNIQUEMENT un JSON valide.

Format attendu :

{
  "name": "",
  "number": "",
  "confidence": 0
}

Règles :

- name = nom anglais officiel
- number = numéro de carte uniquement
- confidence = entier entre 0 et 100

Aucun commentaire.
Aucun markdown.
Uniquement le JSON.
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          inlineData: {
            mimeType: "image/jpeg",
            data: base64,
          },
        },
        prompt,
      ],
    });

    const text = response.text ?? "";

    return NextResponse.json({
      result: text,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Erreur Gemini." },
      { status: 500 }
    );
  }
}