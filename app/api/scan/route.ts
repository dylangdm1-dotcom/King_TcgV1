// app/api/scan/route.ts

import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

// 🚀 V3.6 Integrations
import { logger } from "@/lib/cache/logger";
import { getCachedCardData, setCachedCardData } from "@/lib/pokemonCache";

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      logger.error("GEMINI", "Clé API GEMINI_API_KEY non configurée dans l'environnement");
      return NextResponse.json(
        { error: "Clé API non configurée" },
        { status: 500 }
      );
    }

    const { imageBase64 } = await req.json();

    if (!imageBase64) {
      logger.warn("GEMINI", "Requête reçue sans imageBase64");
      return NextResponse.json(
        { error: "Image manquante" },
        { status: 400 }
      );
    }

    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");

    /*
      1 - Vérification du Cache pour l'Image (Hash Rapide)
    */
    const imageHash = `scan_img_${base64Data.slice(0, 100)}_${base64Data.slice(-50)}`;
    const cachedResponse = getCachedCardData<any>(imageHash);

    if (cachedResponse) {
      logger.cache("Résultat du scan Gemini récupéré depuis le cache serveur !");
      return NextResponse.json({
        success: true,
        modelUsed: "cache",
        fromCache: true,
        data: cachedResponse,
      });
    }

    /*
      2 - Configuration Gemini & Modèles Candidates
    */
    const genAI = new GoogleGenerativeAI(apiKey);

    const modelCandidates = [
      "gemini-2.5-flash",
      "gemini-2.0-flash-lite",
      "gemini-flash-latest",
      "gemini-2.0-flash",
    ];

    const prompt = `
Tu es un expert professionnel Pokémon TCG international. Tu dois identifier avec une précision absolue la carte présentée sur l'image.

RÈGLES ABSOLUES :
- Respecte STRICTEMENT la langue d'origine visible sur la carte (Français, Anglais, Japonais, Chinois, etc.). Ne traduis JAMAIS le nom de la carte dans une autre langue. Conserve l'écriture originale exacte (ex: kanji japonais, caractères chinois, etc.).
- Ne jamais inventer une information. Si une donnée n'est pas lisible => null.
- Identifie parfaitement les variantes et suffixes importants visibles (ex: GX, V, VMAX, VSTAR, EX, Shining, Promo, Full Art, Alt Art, Secrète).
- Retourne uniquement un JSON valide, sans aucun texte autour.

Analyse :

1. cardName : Le nom exact complet visible sur la carte dans sa langue originale (incluant les suffixes comme V, GX, etc.).
2. pokemonName : Le nom du Pokémon principal dans sa langue originale.
3. cardType : "Pokemon", "Trainer", "Energy" ou "Unknown".
4. language : Code langue détecté ("fr", "en", "ja", "zh-cn", "zh-tw", "de", "es", "it" ou null).
5. cardNumber : Le numéro de collection visible (ex: 123/182 ou promo number).
6. setName : Le nom de l'extension visible.
7. rarity : La rareté visible (Common, Uncommon, Rare, Holo Rare, Double Rare, Illustration Rare, Ultra Rare, Secret Rare, etc.).
8. variant : "Full Art", "Alt Art", "Rainbow", "Gold", "Shiny", "Normal", ou "Unknown".
9. isFullArt : boolean (true/false).
10. isSecretRare : boolean (true/false).
11. confidence : Score de 0 à 100 indiquant ta certitude.

Format obligatoire strict :
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
  "confidence": 0
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

    logger.gemini(`Lancement de la reconnaissance IA multilingue parmi ${modelCandidates.length} candidats...`);

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

        result = await model.generateContent([prompt, imagePart]);

        if (result) {
          successfulModel = modelName;
          logger.gemini(`Scan réussi en ${Date.now() - startTime}ms avec le modèle: ${modelName}`);
          break;
        }
      } catch (err: any) {
        const message = err?.message || String(err);

        if (message.includes("429") || err?.status === 429) {
          isRateLimited = true;
          logger.warn("GEMINI", `Quota dépassé pour le modèle ${modelName}`);
        } else {
          logger.warn("GEMINI", `Modèle indisponible ou erreur pour ${modelName}: ${message}`);
        }
      }
    }

    if (!result) {
      logger.error("GEMINI", "Aucun modèle Gemini n'a pu traiter l'image.");
      return NextResponse.json(
        {
          error: isRateLimited
            ? "Quota Gemini dépassé temporairement"
            : "Carte non reconnue. Veuillez réessayer avec un meilleur éclairage ou utiliser la recherche manuelle.",
        },
        {
          status: isRateLimited ? 429 : 500,
        }
      );
    }

    /*
      3 - Parsing de la Réponse
    */
    let rawResponse = result.response.text();

    rawResponse = rawResponse
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    let parsedData;

    try {
      parsedData = JSON.parse(rawResponse);
    } catch {
      logger.error("GEMINI", "Réponse JSON brute invalide de Gemini", rawResponse);
      return NextResponse.json(
        {
          error: "Impossible d'analyser la structure de la carte. Veuillez effectuer une recherche manuelle.",
          rawResponse,
        },
        {
          status: 500,
        }
      );
    }

    const defaults = {
      cardName: null,
      pokemonName: null,
      cardType: null,
      language: "fr",
      cardNumber: null,
      setName: null,
      setSymbol: null,
      rarity: null,
      variant: null,
      isFullArt: false,
      isSecretRare: false,
      possibleNames: [],
      confidence: 0,
    };

    parsedData = {
      ...defaults,
      ...parsedData,
    };

    // Vérification de la confiance de reconnaissance
    if (parsedData.confidence < 60 || (!parsedData.cardName && !parsedData.pokemonName)) {
      return NextResponse.json(
        {
          success: false,
          error: "Carte non reconnue avec certitude. Essayez de recadrer ou utilisez la recherche par nom/extension.",
          data: parsedData,
        },
        { status: 404 }
      );
    }

    // Sauvegarde dans le cache
    setCachedCardData(imageHash, parsedData, 1000 * 60 * 30); // Cache de 30 minutes

    return NextResponse.json({
      success: true,
      modelUsed: successfulModel,
      fromCache: false,
      data: parsedData,
    });
  } catch (error: any) {
    logger.error("GEMINI", "Erreur serveur globale pendant le scan", error);

    return NextResponse.json(
      {
        error: "Erreur technique lors de l'analyse de l'image. Veuillez utiliser la recherche manuelle.",
        details: error?.message || null,
      },
      {
        status: 500,
      }
    );
  }
}
