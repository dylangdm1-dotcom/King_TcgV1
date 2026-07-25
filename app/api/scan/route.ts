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
    Tu es un expert TCG Pokémon mondialement reconnu.
    Analyse l'image fournie et identifie la carte Pokémon exacte.
    
    Retourne UNIQUEMENT un objet JSON strictement formaté selon ce schéma :
    {
      "cardName": "string (Nom exact imprimé sur la carte)",
      "set": "string (Nom ou code de l'extension si visible, ex: 'EV01', 'Evolutions')",
      "cardNumber": "string (Numéro de collection exact, ex: '025/185' ou 'SWSH001')",
      "language": "string (FR, EN, JP, KR, DE, etc.)",
      "hp": number,
      "confidence": number
    }

    Si l'image ne contient pas une carte Pokémon ou n'est pas lisible, renvoie "cardName": null.
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
      { error: "Erreur serveur pendant le scan IA" },
      { status: 500 }
    );
  }
}
