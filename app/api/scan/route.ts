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
Tu es un spécialiste des cartes Pokémon TCG.

Ta mission est uniquement de LIRE les informations visibles sur la carte.
Tu ne dois JAMAIS inventer une information.

Règles :

- Si une donnée est illisible, retourne null.
- Ne complète jamais avec tes connaissances.
- Ne déduis jamais le set.
- Ne devine jamais le numéro.
- Retourne uniquement du JSON valide.
- Aucun texte avant ou après le JSON.

Lis dans cet ordre :

1. Nom exact de la carte.
2. Langue (FR, EN, JP, DE, ES, IT...)
3. Numéro de collection (ex : 123/182).
4. Symbole ou nom de l'extension si visible.
5. Rareté si visible.
6. Estimation de confiance de 0 à 100.

Format :

{
  "cardName": null,
  "pokemonName": null,
  "language": null,
  "cardNumber": null,
  "setName": null,
  "setSymbol": null,
  "rarity": null,
  "confidence": 0,
  "needsSecondPass": false
}

Si confidence < 80 :
- mets needsSecondPass à true.

Retourne uniquement le JSON.
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
            temperature: 0.1,
            topP: 0.8,
            topK: 20,
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

    parsedData.cardName ??= null;
    parsedData.cardNumber ??= null;
    parsedData.setName ??= null;
    parsedData.setSymbol ??= null;
    parsedData.language ??= null;
    parsedData.pokemonName ??= null;
    parsedData.hp ??= null;
    parsedData.rarity ??= null;
    parsedData.confidence ??= 0;
    parsedData.needsSecondPass ??= false;

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
