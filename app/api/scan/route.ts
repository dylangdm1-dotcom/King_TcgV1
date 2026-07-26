import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.error("❌ GEMINI_API_KEY manquante sur le serveur");
      return NextResponse.json(
        { error: "Clé API non configurée" },
        { status: 500 }
      );
    }

    const { imageBase64 } = await req.json();

    if (!imageBase64) {
      return NextResponse.json({ error: "Image manquante" }, { status: 400 });
    }

    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    const prompt = `
    Tu es un expert mondial en cartes Pokémon TCG.
    Examine cette image et identifie la carte Pokémon présente, même si l'image présente des reflets, un léger flou ou est sous pochette plastique.

    Fais tout ton possible pour lire les informations visibles sur la carte :
    1. Nom exact du Pokémon ou du dresseur (ex: "Dracaufeu", "Charizard", "Pikachu ex", "Recherches Professorales").
    2. Numéro de collection situé en bas de la carte (ex: "025/185", "150/162", "SWSH001", "001/025").
    3. Nom ou code de l'extension si repérable.
    4. Langue de la carte (FR, EN, JP, KR, etc.).

    RÈGLES IMPORTANTES :
    - Réponds STRICTEMENT au format JSON.
    - Si tu hésites sur le nom exact, donne la meilleure estimation basée sur l'illustration visuelle.
    - Seulement si l'image est à 100% illisible ou ne contient aucune carte, renvoie "cardName": null.

    Format JSON attendu :
    {
      "cardName": "Nom de la carte ou null",
      "set": "Code ou nom de l'extension ou null",
      "cardNumber": "Numéro de collection ou null",
      "language": "FR",
      "confidence": 85
    }
    `;

    const imagePart = {
      inlineData: {
        data: base64Data,
        mimeType: "image/jpeg",
      },
    };

    const result = await model.generateContent([prompt, imagePart]);
    const rawResponse = result.response.text();

    const cleanedJson = rawResponse
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    const parsedData = JSON.parse(cleanedJson);

    return NextResponse.json({ success: true, data: parsedData });
  } catch (error: any) {
    console.error("❌ Erreur Gemini Server:", error?.message || error);
    return NextResponse.json(
      { error: "Erreur serveur pendant le scan IA", details: error?.message },
      { status: 500 }
    );
  }
}
