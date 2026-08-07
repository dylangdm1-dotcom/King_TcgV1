import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";

import { logger } from "@/lib/cache/logger";
import { PSA_PHOTO_IDS } from "@/lib/psa/grading";

const PhotoIdSchema = z.enum(PSA_PHOTO_IDS);

const CriterionSchema = z.object({
  score: z.coerce.number().min(0).max(10),
  label: z.string().min(1).max(80),
  observations: z.array(z.string().max(240)).max(8).default([]),
});

const AnalysisSchema = z.object({
  photoQuality: z.object({
    acceptable: z.boolean(),
    score: z.coerce.number().min(0).max(100),
    issues: z.array(z.string().max(240)).max(12).default([]),
  }),
  estimate: z.object({
    minimum: z.coerce.number().min(1).max(10),
    maximum: z.coerce.number().min(1).max(10),
    recommended: z.coerce.number().min(1).max(10).nullable(),
  }),
  confidence: z.coerce.number().min(0).max(100),
  criteria: z.object({
    centering: CriterionSchema,
    corners: CriterionSchema,
    edges: CriterionSchema,
    surface: CriterionSchema,
  }),
  defects: z
    .array(
      z.object({
        area: z.enum(["centrage", "coins", "bords", "surface", "photo", "autre"]),
        severity: z.enum(["faible", "moderee", "importante"]),
        description: z.string().min(1).max(300),
        photoId: PhotoIdSchema.optional(),
      })
    )
    .max(20)
    .default([]),
  summary: z.string().min(1).max(800),
  recommendations: z.array(z.string().max(260)).max(10).default([]),
  disclaimer: z.string().min(1).max(400),
});

type IncomingPhoto = {
  id: (typeof PSA_PHOTO_IDS)[number];
  imageBase64: string;
};

function parseDataUrl(value: string) {
  const match = value.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/s);
  if (!match) return null;

  return {
    mimeType: match[1],
    data: match[2],
  };
}

export async function POST(req: NextRequest) {
  const startedAt = Date.now();

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Clé Gemini non configurée." },
        { status: 500 }
      );
    }

    const body = await req.json();
    const photos = Array.isArray(body?.photos) ? (body.photos as IncomingPhoto[]) : [];

    if (photos.length !== PSA_PHOTO_IDS.length) {
      return NextResponse.json(
        { error: "Les quatre photos sont obligatoires." },
        { status: 400 }
      );
    }

    const uniqueIds = new Set(photos.map((photo) => photo.id));
    const hasEveryPhoto = PSA_PHOTO_IDS.every((id) => uniqueIds.has(id));

    if (!hasEveryPhoto) {
      return NextResponse.json(
        { error: "Une ou plusieurs vues PSA sont manquantes." },
        { status: 400 }
      );
    }

    const parsedPhotos = photos.map((photo) => ({
      id: photo.id,
      parsed: parseDataUrl(photo.imageBase64),
    }));

    if (parsedPhotos.some((photo) => !photo.parsed)) {
      return NextResponse.json(
        { error: "Format d'image invalide." },
        { status: 400 }
      );
    }

    const totalBase64Length = parsedPhotos.reduce(
      (total, photo) => total + (photo.parsed?.data.length ?? 0),
      0
    );

    // Environ 4,5 Mo de données encodées : protection Vercel et Gemini.
    if (totalBase64Length > 6_000_000) {
      return NextResponse.json(
        { error: "Les photos sont trop lourdes. Reprenez-les depuis la caméra intégrée." },
        { status: 413 }
      );
    }

    const prompt = `
Tu es un assistant d'inspection visuelle de cartes Pokémon TCG. Tu dois ESTIMER une plage de grade PSA uniquement à partir de quatre photographies. Cette estimation n'est ni une authentification, ni une note PSA officielle.

PHOTOS FOURNIES DANS CET ORDRE :
1. front : face avant droite
2. back : face arrière droite
3. frontAngle : face avant légèrement inclinée sous lumière diffuse
4. backAngle : face arrière inclinée, coins et bords visibles

RÈGLES ABSOLUES :
- Commence par juger la qualité des photos (netteté, lumière, reflets, carte entière, angles utiles).
- Si les images ne permettent pas une inspection sérieuse, photoQuality.acceptable doit être false, confidence faible, recommended null et recommendations doit demander précisément les photos à reprendre.
- N'invente jamais un défaut invisible. Utilise des formulations prudentes : "semble", "potentiel", "visible sur la photo".
- Évalue séparément : centrage, coins, bords, surface. Chaque score est sur 10.
- estimate.minimum et estimate.maximum sont des entiers de 1 à 10, minimum <= maximum.
- recommended est un entier de 1 à 10 uniquement si la confiance est suffisante ; sinon null.
- La confiance est de 0 à 100.
- Un grade élevé exige des photos suffisamment nettes pour vérifier les micro-défauts.
- Ne juge pas l'authenticité de la carte.
- Retourne UNIQUEMENT un JSON valide, sans markdown ni texte autour.
- Tous les textes doivent être en français.

FORMAT STRICT :
{
  "photoQuality": {
    "acceptable": true,
    "score": 0,
    "issues": []
  },
  "estimate": {
    "minimum": 1,
    "maximum": 10,
    "recommended": null
  },
  "confidence": 0,
  "criteria": {
    "centering": { "score": 0, "label": "", "observations": [] },
    "corners": { "score": 0, "label": "", "observations": [] },
    "edges": { "score": 0, "label": "", "observations": [] },
    "surface": { "score": 0, "label": "", "observations": [] }
  },
  "defects": [
    {
      "area": "surface",
      "severity": "faible",
      "description": "",
      "photoId": "frontAngle"
    }
  ],
  "summary": "",
  "recommendations": [],
  "disclaimer": "Estimation visuelle non officielle, sans affiliation avec PSA et ne remplaçant pas une gradation professionnelle."
}
`;

    const imageParts = parsedPhotos.map((photo) => ({
      inlineData: {
        data: photo.parsed!.data,
        mimeType: photo.parsed!.mimeType,
      },
    }));

    const genAI = new GoogleGenerativeAI(apiKey);
    const modelCandidates = [
      "gemini-2.5-flash",
      "gemini-2.0-flash",
      "gemini-flash-latest",
      "gemini-2.0-flash-lite",
    ];

    let result: any = null;
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

        result = await model.generateContent([prompt, ...imageParts]);
        successfulModel = modelName;
        break;
      } catch (error: any) {
        const message = error?.message || String(error);
        if (message.includes("429") || error?.status === 429) {
          isRateLimited = true;
        }
        logger.warn("GEMINI", `${modelName}: ${message}`);
      }
    }

    if (!result) {
      return NextResponse.json(
        {
          error: isRateLimited
            ? "Quota Gemini temporairement dépassé. Réessayez dans quelques minutes."
            : "Gemini n'a pas pu analyser les photos.",
        },
        { status: isRateLimited ? 429 : 502 }
      );
    }

    const raw = result.response
      .text()
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch {
      logger.error("GEMINI", "Réponse JSON invalide", raw);
      return NextResponse.json(
        { error: "Réponse Gemini inexploitable. Reprenez les photos et réessayez." },
        { status: 502 }
      );
    }

    const validation = AnalysisSchema.safeParse(json);
    if (!validation.success) {
      logger.error("GEMINI", "Réponse non conforme", validation.error.format());
      return NextResponse.json(
        { error: "Analyse incomplète reçue de Gemini. Réessayez." },
        { status: 422 }
      );
    }

    const analysis = validation.data;
    if (analysis.estimate.minimum > analysis.estimate.maximum) {
      [analysis.estimate.minimum, analysis.estimate.maximum] = [
        analysis.estimate.maximum,
        analysis.estimate.minimum,
      ];
    }

    return NextResponse.json({
      success: true,
      data: {
        ...analysis,
        modelUsed: successfulModel,
      },
      processingTimeMs: Date.now() - startedAt,
    });
  } catch (error: any) {
    logger.error("GEMINI", "Erreur serveur", error);
    return NextResponse.json(
      { error: "Erreur pendant l'analyse PSA." },
      { status: 500 }
    );
  }
}
