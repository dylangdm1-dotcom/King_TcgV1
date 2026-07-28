import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

// 🚀 V3.6 Integrations
import { logger } from "@/lib/cache/logger";
import { getFrenchPokemonName, cleanCardNameForSearch } from "@/lib/pokemonTranslator";
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

    logger.gemini(`Lancement de la reconnaissance IA parmi ${modelCandidates.length} candidats...`);

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
            : "Impossible d'analyser la carte",
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
          error: "Réponse Gemini invalide",
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

    /*
      4 - Post-traitement V3.5 : Normalisation et Traduction du nom
    */
    const rawPokemonName = parsedData.pokemonName || parsedData.cardName;
    if (rawPokemonName) {
      const frName = getFrenchPokemonName(rawPokemonName);
      const cleanedSearchName = cleanCardNameForSearch(rawPokemonName);

      parsedData.frenchPokemonName = frName;
      parsedData.cleanedSearchName = cleanedSearchName;

      logger.translator(
        `Détection OCR: "${rawPokemonName}" -> Nom FR: "${frName}" | Nom de recherche: "${cleanedSearchName}"`
      );
    }

    // Sauvegarde dans le cache V3.6
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
        error: "Erreur serveur pendant le scan",
        details: error?.message || null,
      },
      {
        status: 500,
      }
    );
  }
}
