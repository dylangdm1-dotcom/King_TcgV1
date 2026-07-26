import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
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

    // Modèles confirmés comme valides pour votre clé API
    const modelCandidates = [
      "gemini-2.5-flash",
      "gemini-2.0-flash-lite",
      "gemini-flash-latest",
      "gemini-2.0-flash",
    ];

    const prompt = `
    Tu es un expert mondial en cartes Pokémon TCG.
    Examine cette image et identifie la carte Pokémon présente.

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

    let result = null;
    let successfulModel = "";
    let isRateLimited = false;

    for (const modelName of modelCandidates) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            responseMimeType: "application/json",
          },
        });
        result = await model.generateContent([prompt, imagePart]);
        if (result) {
          successfulModel = modelName;
          console.log(`✅ Succès avec le modèle : ${modelName}`);
          break;
        }
      } catch (err: any) {
        const status = err?.status || err?.message;
        if (String(status).includes("429")) {
          isRateLimited = true;
          console.warn(`⚠️ Modèle ${modelName} en limite de quota (429), tentative du suivant...`);
        } else {
          console.warn(`⚠️ Modèle ${modelName} indisponible (${status})`);
        }
      }
    }

    if (!result) {
      const errorMsg = isRateLimited
        ? "Quota API temporairement dépassé (Erreur 429). Réessayez dans 30 secondes."
        : "Aucun modèle n'a pu traiter l'image.";

      return NextResponse.json(
        { error: errorMsg },
        { status: isRateLimited ? 429 : 500 }
      );
    }

    const rawResponse = result.response.text();
    const cleanedJson = rawResponse
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    const parsedData = JSON.parse(cleanedJson);

    return NextResponse.json({
      success: true,
      modelUsed: successfulModel,
      data: parsedData,
    });
  } catch (error: any) {
    console.error("❌ Erreur serveur :", error?.message || error);
    return NextResponse.json(
      { error: "Erreur serveur pendant le scan", details: error?.message },
      { status: 500 }
    );
  }
}
