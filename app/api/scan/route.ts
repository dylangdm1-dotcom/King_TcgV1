// app/api/scan/route.ts

import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";

import { logger } from "@/lib/cache/logger";
import {
  getCachedCardData,
  setCachedCardData,
} from "@/lib/pokemonCache";

// =====================================================
// KING TCG V5.0
// API SCANNER GEMINI VISION
// =====================================================

// -----------------------------------------------------
// Schéma de sortie scanner V5.0
// Compatible avec CardScanResult utilisé côté application
// -----------------------------------------------------

const CardScanResultSchema = z.object({
  cardName: z.string().nullable().default(null),
  pokemonName: z.string().nullable().default(null),

  cardType: z.string().nullable().default(null),

  language: z.string().nullable().default("fr"),

  cardNumber: z.string().nullable().default(null),

  setName: z.string().nullable().default(null),
  setSymbol: z.string().nullable().default(null),

  rarity: z.string().nullable().default(null),
  variant: z.string().nullable().default(null),

  isFullArt: z.boolean().default(false),
  isSecretRare: z.boolean().default(false),

  possibleNames: z.array(z.string()).default([]),

  confidence: z
    .number()
    .min(0)
    .max(100)
    .default(0),

  // V5.0 :
  // indique si une seconde analyse est nécessaire
  needsSecondPass: z.boolean().default(false),
});

export type CardScanResult = z.infer<
  typeof CardScanResultSchema
>;

// =====================================================
// POST /api/scan
// =====================================================

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    // -------------------------------------------------
    // 1. Vérification configuration Gemini
    // -------------------------------------------------

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      logger.error(
        "GEMINI",
        "GEMINI_API_KEY non configurée dans l'environnement"
      );

      return NextResponse.json(
        {
          error: "Clé API Gemini non configurée.",
        },
        { status: 500 }
      );
    }

    // -------------------------------------------------
    // 2. Lecture de la requête
    // -------------------------------------------------

    const body = await req.json();

    const imageBase64 =
      typeof body?.imageBase64 === "string"
        ? body.imageBase64
        : "";

    if (!imageBase64) {
      logger.warn(
        "GEMINI",
        "Requête scanner reçue sans imageBase64"
      );

      return NextResponse.json(
        {
          error: "Image manquante.",
        },
        { status: 400 }
      );
    }

    // -------------------------------------------------
    // 3. Nettoyage Base64
    // -------------------------------------------------

    const base64Data = imageBase64.replace(
      /^data:image\/[\w.+-]+;base64,/,
      ""
    );

    if (!base64Data) {
      logger.warn(
        "GEMINI",
        "Image Base64 vide après nettoyage"
      );

      return NextResponse.json(
        {
          error: "Image invalide.",
        },
        { status: 400 }
      );
    }

    // =================================================
    // 4. CACHE SCANNER V5.0
    // =================================================

    /*
     * Hash rapide basé sur le début et la fin de l'image.
     *
     * Le but est d'éviter de relancer Gemini lorsqu'une
     * même image est analysée plusieurs fois rapidement.
     */

    const imageHash =
      `scan_v5_img_${base64Data.slice(0, 100)}_${base64Data.slice(-50)}`;

    const cachedResponse =
      getCachedCardData<CardScanResult>(imageHash);

    if (cachedResponse) {
      logger.cache(
        "[King_TCG V5.0] Résultat scanner récupéré depuis le cache serveur."
      );

      return NextResponse.json({
        success: true,
        modelUsed: "cache",
        fromCache: true,
        data: cachedResponse,
      });
    }

    // =================================================
    // 5. INITIALISATION GEMINI V5.0
    // =================================================

    const genAI = new GoogleGenerativeAI(apiKey);

    /*
     * Ordre de priorité des modèles.
     *
     * Le premier modèle disponible est utilisé.
     * Les suivants servent de fallback en cas
     * d'indisponibilité ou de quota.
     */

    const modelCandidates = [
      "gemini-2.5-flash",
      "gemini-2.0-flash-lite",
      "gemini-flash-latest",
      "gemini-2.0-flash",
    ];

    // =================================================
    // 6. PROMPT GEMINI V5.0
    // =================================================

    const prompt = `
Tu es le moteur de reconnaissance visuelle Pokémon TCG de King_TCG V5.0.

Ta mission est d'identifier la carte Pokémon présentée sur l'image avec la plus grande précision possible.

RÈGLES ABSOLUES :

1. Respecte STRICTEMENT la langue originale visible sur la carte.
   - Français => français
   - Anglais => anglais
   - Japonais => japonais
   - Chinois => chinois
   - Allemand => allemand
   - Espagnol => espagnol
   - Italien => italien
   Ne traduis JAMAIS le nom de la carte.

2. Ne jamais inventer une information.

3. Si une information n'est pas suffisamment lisible ou identifiable,
   retourne null.

4. Le numéro de carte doit être relevé exactement lorsqu'il est visible.
   Exemple : 123/182, SV001/SV100, XY123, etc.

5. Identifie les variantes visibles :
   - Normal
   - Full Art
   - Alt Art
   - Rainbow
   - Gold
   - Shiny
   - Promo
   - etc.

6. Identifie correctement les suffixes du nom :
   - EX
   - GX
   - V
   - VMAX
   - VSTAR
   - ex
   - etc.

7. La rareté doit correspondre à ce qui est réellement identifiable
   sur la carte.

8. Ne déduis pas une extension uniquement à partir du Pokémon.
   Si le set n'est pas identifiable, retourne null.

9. confidence doit représenter la confiance réelle dans l'identification,
   entre 0 et 100.

10. needsSecondPass :
    - true si l'image est partiellement lisible,
      ambiguë ou si plusieurs cartes semblent possibles.
    - false uniquement lorsque l'identification est suffisamment fiable.

11. possibleNames :
    - liste uniquement des noms plausibles si plusieurs identifications
      sont possibles.
    - [] si aucune alternative crédible.

12. Retourne UNIQUEMENT le JSON.
    Aucun texte avant ou après.
    Aucun Markdown.
    Aucun commentaire.

ANALYSE DEMANDÉE :

- cardName :
  nom exact complet visible sur la carte,
  dans la langue originale.

- pokemonName :
  nom du Pokémon principal,
  dans la langue originale.

- cardType :
  "Pokemon", "Trainer", "Energy" ou "Unknown".

- language :
  "fr", "en", "ja", "zh-cn", "zh-tw",
  "de", "es", "it" ou null.

- cardNumber :
  numéro de collection exact si visible.

- setName :
  nom de l'extension si identifiable.

- setSymbol :
  symbole/code d'extension si identifiable.

- rarity :
  rareté identifiable.

- variant :
  "Full Art", "Alt Art", "Rainbow", "Gold",
  "Shiny", "Normal", "Unknown" ou null.

- isFullArt :
  true uniquement si la carte est clairement Full Art.

- isSecretRare :
  true uniquement si la carte est clairement une Secret Rare.

- possibleNames :
  alternatives crédibles uniquement.

- confidence :
  score de confiance entre 0 et 100.

- needsSecondPass :
  indique si une seconde analyse visuelle serait pertinente.

FORMAT JSON OBLIGATOIRE :

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

    // =================================================
    // 7. IMAGE GEMINI
    // =================================================

    const imagePart = {
      inlineData: {
        data: base64Data,
        mimeType: "image/jpeg",
      },
    };

    // =================================================
    // 8. EXÉCUTION DES MODÈLES
    // =================================================

    let result: any = null;
    let successfulModel = "";
    let isRateLimited = false;

    logger.gemini(
      `[King_TCG V5.0] Lancement reconnaissance Gemini avec ${modelCandidates.length} modèles candidats.`
    );

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

          logger.gemini(
            `[King_TCG V5.0] Scan réussi en ${
              Date.now() - startTime
            }ms avec ${modelName}.`
          );

          break;
        }
      } catch (error: any) {
        const message =
          error?.message || String(error);

        const status =
          error?.status ??
          error?.response?.status ??
          null;

        if (
          status === 429 ||
          message.includes("429") ||
          message.toLowerCase().includes("quota")
        ) {
          isRateLimited = true;

          logger.warn(
            "GEMINI",
            `[King_TCG V5.0] Quota dépassé pour ${modelName}.`
          );
        } else {
          logger.warn(
            "GEMINI",
            `[King_TCG V5.0] Modèle ${modelName} indisponible : ${message}`
          );
        }
      }
    }

    // =================================================
    // 9. AUCUN MODÈLE DISPONIBLE
    // =================================================

    if (!result) {
      logger.error(
        "GEMINI",
        "[King_TCG V5.0] Aucun modèle Gemini n'a pu traiter l'image."
      );

      return NextResponse.json(
        {
          error: isRateLimited
            ? "Quota Gemini dépassé temporairement."
            : "Carte non reconnue. Veuillez réessayer avec un meilleur éclairage ou utiliser la recherche manuelle.",
        },
        {
          status: isRateLimited ? 429 : 500,
        }
      );
    }

    // =================================================
    // 10. RÉCUPÉRATION DU TEXTE
    // =================================================

    let rawResponse = "";

    try {
      rawResponse = result.response.text();
    } catch (error) {
      logger.error(
        "GEMINI",
        "[King_TCG V5.0] Impossible de récupérer la réponse Gemini.",
        error
      );

      return NextResponse.json(
        {
          error:
            "Réponse Gemini inaccessible. Veuillez réessayer.",
        },
        { status: 500 }
      );
    }

    // -------------------------------------------------
    // Nettoyage éventuel Markdown
    // -------------------------------------------------

    rawResponse = rawResponse
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    // =================================================
    // 11. PARSING + VALIDATION ZOD
    // =================================================

    let parsedData: CardScanResult;

    try {
      const jsonParsed = JSON.parse(rawResponse);

      const validationResult =
        CardScanResultSchema.safeParse(jsonParsed);

      if (!validationResult.success) {
        logger.error(
          "GEMINI",
          "[King_TCG V5.0] Réponse Gemini invalide selon le schéma Zod.",
          validationResult.error.format()
        );

        return NextResponse.json(
          {
            error:
              "La structure renvoyée par Gemini ne correspond pas au format scanner V5.0 attendu.",
          },
          { status: 422 }
        );
      }

      parsedData = validationResult.data;
    } catch (error) {
      logger.error(
        "GEMINI",
        "[King_TCG V5.0] Réponse JSON Gemini invalide.",
        rawResponse
      );

      return NextResponse.json(
        {
          error:
            "Impossible d'analyser la réponse du moteur de reconnaissance. Veuillez effectuer une recherche manuelle.",
        },
        { status: 500 }
      );
    }

    // =================================================
    // 12. NORMALISATION V5.0
    // =================================================

    /*
     * Protection supplémentaire :
     * les chaînes vides sont considérées comme null.
     */

    const normalizeNullableString = (
      value: string | null
    ): string | null => {
      if (typeof value !== "string") {
        return null;
      }

      const normalized = value.trim();

      return normalized.length > 0
        ? normalized
        : null;
    };

    parsedData = {
      ...parsedData,

      cardName: normalizeNullableString(
        parsedData.cardName
      ),

      pokemonName: normalizeNullableString(
        parsedData.pokemonName
      ),

      cardType: normalizeNullableString(
        parsedData.cardType
      ),

      language: normalizeNullableString(
        parsedData.language
      ),

      cardNumber: normalizeNullableString(
        parsedData.cardNumber
      ),

      setName: normalizeNullableString(
        parsedData.setName
      ),

      setSymbol: normalizeNullableString(
        parsedData.setSymbol
      ),

      rarity: normalizeNullableString(
        parsedData.rarity
      ),

      variant: normalizeNullableString(
        parsedData.variant
      ),

      possibleNames: Array.isArray(
        parsedData.possibleNames
      )
        ? parsedData.possibleNames
            .filter(
              (name): name is string =>
                typeof name === "string"
            )
            .map((name) => name.trim())
            .filter(Boolean)
        : [],

      confidence: Math.max(
        0,
        Math.min(100, parsedData.confidence)
      ),
    };

    // =================================================
    // 13. CONTRÔLE DE CONFIANCE
    // =================================================

    const hasIdentification =
      Boolean(parsedData.cardName) ||
      Boolean(parsedData.pokemonName);

    if (
      parsedData.confidence < 60 ||
      !hasIdentification
    ) {
      logger.warn(
        "GEMINI",
        `[King_TCG V5.0] Identification insuffisante : confidence=${parsedData.confidence}`
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Carte non reconnue avec suffisamment de certitude. Essayez de recadrer la carte ou utilisez la recherche manuelle.",
          data: parsedData,
        },
        { status: 404 }
      );
    }

    // =================================================
    // 14. CACHE V5.0
    // =================================================

    setCachedCardData(
      imageHash,
      parsedData,
      1000 * 60 * 30
    );

    // =================================================
    // 15. RÉPONSE FINALE
    // =================================================

    logger.gemini(
      `[King_TCG V5.0] Scan terminé en ${
        Date.now() - startTime
      }ms. Modèle=${successfulModel}, confidence=${parsedData.confidence}, secondPass=${parsedData.needsSecondPass}`
    );

    return NextResponse.json({
      success: true,
      modelUsed: successfulModel,
      fromCache: false,
      data: parsedData,
    });
  } catch (error: any) {
    logger.error(
      "GEMINI",
      "[King_TCG V5.0] Erreur serveur globale pendant le scan.",
      error
    );

    return NextResponse.json(
      {
        error:
          "Erreur technique lors de l'analyse de l'image. Veuillez utiliser la recherche manuelle.",
        details:
          process.env.NODE_ENV === "development"
            ? error?.message || null
            : null,
      },
      {
        status: 500,
      }
    );
  }
}