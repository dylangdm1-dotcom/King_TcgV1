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
      return NextResponse.json(
        { error: "Image manquante" },
        { status: 400 }
      );
    }

    const base64Data = imageBase64.replace(
      /^data:image\/\w+;base64,/,
      ""
    );

    const genAI = new GoogleGenerativeAI(apiKey);

    const modelCandidates = [
      "gemini-2.5-flash",
      "gemini-2.0-flash-lite",
      "gemini-flash-latest",
      "gemini-2.0-flash",
    ];

    const prompt = `
Tu es un expert professionnel Pokémon TCG spécialisé dans l'identification de cartes.

Analyse UNIQUEMENT ce qui est visible sur l'image.

RÈGLES ABSOLUES :
- Ne jamais inventer une information.
- Ne jamais utiliser ta mémoire pour compléter.
- Si une donnée n'est pas lisible => null.
- Le numéro doit être uniquement celui visible sur la carte.
- Le set doit uniquement être retourné s'il est lisible.
- Retourne uniquement un JSON valide.
- Aucun texte autour du JSON.

Analyse :

1. Nom complet visible de la carte.
2. Nom du Pokémon si applicable.
3. Type de carte :
   - Pokemon
   - Trainer
   - Energy
   - Unknown

4. Langue :
   FR, EN, JP, DE, ES, IT ou null.

5. Numéro de collection visible :
   Exemple : 123/182

6. Extension :
   - nom visible
   - symbole visible

7. Rareté visible :
   Exemple :
   Common
   Uncommon
   Rare
   Holo Rare
   Double Rare
   Illustration Rare
   Ultra Rare
   Secret Rare

8. Variantes :
   - Full Art
   - Alt Art
   - Rainbow
   - Gold
   - Shiny
   - Normal
   - Unknown

9. Score confiance :
   - 0 à 100

Si la confiance est inférieure à 80 :
needsSecondPass = true

Format obligatoire :

{
  "cardName": null,
  "pokemonName": null,
  "cardType": null,
  "language": null,
  "cardNumber": null,
  "setName": null,
  "setSymbol": null,
  "rarity": null,
  "variant": null,
  "isFullArt": false,
  "isSecretRare": false,
  "possibleNames": [],
  "confidence": 0,
  "needsSecondPass": false
}
`;

    const imagePart = {
      inlineData: {
        data: base64Data,
        mimeType: "image/jpeg",
      },
    };

    let result: any = null;
    let successfulModel = "";
    let isRateLimited = false;

    for (const modelName of modelCandidates) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.05,
            topP: 0.8,
            topK: 20,
          },
        });

        result = await model.generateContent([
          prompt,
          imagePart,
        ]);

        if (result) {
          successfulModel = modelName;
          console.log(
            `✅ Scan réussi avec ${modelName}`
          );
          break;
        }

      } catch (err: any) {

        const message =
          err?.message ||
          String(err);

        if (
          message.includes("429") ||
          err?.status === 429
        ) {
          isRateLimited = true;

          console.warn(
            `⚠️ Quota dépassé ${modelName}`
          );

        } else {

          console.warn(
            `⚠️ Modèle indisponible ${modelName}`,
            message
          );
        }
      }
    }


    if (!result) {

      return NextResponse.json(
        {
          error: isRateLimited
            ? "Quota Gemini dépassé temporairement"
            : "Impossible d'analyser la carte"
        },
        {
          status: isRateLimited ? 429 : 500
        }
      );
    }


    let rawResponse =
      result.response.text();


    rawResponse = rawResponse
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();


    let parsedData;

    try {

      parsedData = JSON.parse(rawResponse);

    } catch {

      console.error(
        "JSON Gemini invalide :",
        rawResponse
      );

      return NextResponse.json(
        {
          error:
            "Réponse Gemini invalide",
          rawResponse
        },
        {
          status: 500
        }
      );
    }


    const defaults = {
      cardName: null,
      pokemonName: null,
      cardType: null,
      language: null,
      cardNumber: null,
      setName: null,
      setSymbol: null,
      rarity: null,
      variant: null,
      isFullArt: false,
      isSecretRare: false,
      possibleNames: [],
      confidence: 0,
      needsSecondPass: false,
    };


    parsedData = {
      ...defaults,
      ...parsedData,
    };


    return NextResponse.json({
      success: true,
      modelUsed: successfulModel,
      data: parsedData,
    });


  } catch (error: any) {

    console.error(
      "❌ Erreur scan :",
      error?.message || error
    );

    return NextResponse.json(
      {
        error:
          "Erreur serveur pendant le scan",
        details:
          error?.message || null
      },
      {
        status: 500
      }
    );
  }
}