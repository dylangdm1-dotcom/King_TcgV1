import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";

import { logger } from "@/lib/cache/logger";
import { PSA_PHOTO_IDS } from "@/lib/psa/grading";

export const maxDuration = 60;

const PhotoIdSchema = z.enum(PSA_PHOTO_IDS);

const ManualReviewSchema = z.object({
  whiteSpots: z.enum(["0", "1-2", "3-5", "6+"]),
  scratches: z.enum(["none", "light", "visible", "deep"]),
  cornerDamage: z.enum(["none", "one", "multiple"]),
  edgeWhitening: z.enum(["none", "light", "marked"]),
  majorDefect: z.boolean(),
  hiddenDefect: z.boolean(),
  notes: z.string().max(300).default(""),
});

const CriterionSchema = z.object({
  score: z.coerce.number().min(0).max(10),
  label: z.string().max(80).default(""),
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
  summary: z.string().max(800).default(""),
  recommendations: z.array(z.string().max(260)).max(10).default([]),
  disclaimer: z.string().max(400).default(
    "Estimation visuelle non officielle, sans affiliation avec PSA et ne remplaçant pas une gradation professionnelle."
  ),
});

type IncomingPhoto = {
  id: (typeof PSA_PHOTO_IDS)[number];
  imageBase64: string;
};

type JsonRecord = Record<string, unknown>;

function parseDataUrl(value: string) {
  const match = value.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/s);
  if (!match) return null;

  return {
    mimeType: match[1],
    data: match[2],
  };
}

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function firstDefined(record: JsonRecord, keys: string[]): unknown {
  for (const key of keys) {
    if (record[key] !== undefined && record[key] !== null) return record[key];
  }
  return undefined;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(",", ".").replace(/[^0-9.-]/g, ""));
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function asBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "oui", "yes", "acceptable"].includes(normalized)) return true;
    if (["false", "non", "no", "insuffisante", "insuffisant"].includes(normalized)) return false;
  }
  return undefined;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asStringArray(value: unknown, max = 10): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => asString(item))
      .filter(Boolean)
      .slice(0, max);
  }
  const single = asString(value);
  return single ? [single] : [];
}

function scoreLabel(score: number): string {
  if (score >= 9) return "Excellent";
  if (score >= 8) return "Très bon";
  if (score >= 6.5) return "Bon";
  if (score >= 5) return "Moyen";
  return "À surveiller";
}

function normalizeCriterion(value: unknown): unknown {
  if (!isRecord(value)) return value;
  const score = asNumber(firstDefined(value, ["score", "note", "rating"]));
  if (score === undefined) return value;

  return {
    score,
    label: asString(firstDefined(value, ["label", "niveau", "assessment"])) || scoreLabel(score),
    observations: asStringArray(
      firstDefined(value, ["observations", "issues", "details", "commentaires"]),
      8
    ),
  };
}

function normalizeArea(value: unknown): string {
  const area = asString(value).toLowerCase();
  const aliases: Record<string, string> = {
    centering: "centrage",
    centrage: "centrage",
    corner: "coins",
    corners: "coins",
    coin: "coins",
    coins: "coins",
    edge: "bords",
    edges: "bords",
    bord: "bords",
    bords: "bords",
    surface: "surface",
    photo: "photo",
    image: "photo",
    other: "autre",
    autre: "autre",
  };
  return aliases[area] || "autre";
}

function normalizeSeverity(value: unknown): string {
  const severity = asString(value).toLowerCase();
  if (["low", "minor", "leger", "légère", "faible"].includes(severity)) return "faible";
  if (["high", "major", "severe", "forte", "importante"].includes(severity)) return "importante";
  return "moderee";
}

function normalizeAnalysis(value: unknown): unknown {
  if (!isRecord(value)) return value;

  const photoQualityRaw = firstDefined(value, ["photoQuality", "photo_quality", "quality", "qualitePhotos"]);
  const estimateRaw = firstDefined(value, ["estimate", "estimation", "gradeEstimate", "grade"]);
  const criteriaRaw = firstDefined(value, ["criteria", "criteres", "scores"]);

  const photoQuality = isRecord(photoQualityRaw) ? photoQualityRaw : {};
  const estimate = isRecord(estimateRaw) ? estimateRaw : {};
  const criteria = isRecord(criteriaRaw) ? criteriaRaw : {};

  const defectsRaw = firstDefined(value, ["defects", "defauts", "issues"]);
  const defects = Array.isArray(defectsRaw)
    ? defectsRaw
        .filter(isRecord)
        .map((defect) => {
          const description = asString(
            firstDefined(defect, ["description", "detail", "observation", "message"])
          );
          const photoId = asString(firstDefined(defect, ["photoId", "photo_id", "photo"]));
          return {
            area: normalizeArea(firstDefined(defect, ["area", "zone", "category"])),
            severity: normalizeSeverity(firstDefined(defect, ["severity", "gravite", "level"])),
            description,
            ...(PSA_PHOTO_IDS.includes(photoId as (typeof PSA_PHOTO_IDS)[number])
              ? { photoId }
              : {}),
          };
        })
        .filter((defect) => defect.description)
        .slice(0, 20)
    : [];

  return {
    photoQuality: {
      acceptable: asBoolean(firstDefined(photoQuality, ["acceptable", "isAcceptable", "valid"])),
      score: asNumber(firstDefined(photoQuality, ["score", "qualityScore", "note"])),
      issues: asStringArray(firstDefined(photoQuality, ["issues", "problemes", "observations"]), 12),
    },
    estimate: {
      minimum: asNumber(firstDefined(estimate, ["minimum", "min", "gradeMin"])),
      maximum: asNumber(firstDefined(estimate, ["maximum", "max", "gradeMax"])),
      recommended:
        firstDefined(estimate, ["recommended", "recommanded", "recommendedGrade", "gradeRecommande"]) === null
          ? null
          : asNumber(
              firstDefined(estimate, ["recommended", "recommanded", "recommendedGrade", "gradeRecommande"])
            ) ?? null,
    },
    confidence: asNumber(firstDefined(value, ["confidence", "confiance", "confidenceScore"])),
    criteria: {
      centering: normalizeCriterion(firstDefined(criteria, ["centering", "centrage"])),
      corners: normalizeCriterion(firstDefined(criteria, ["corners", "coins"])),
      edges: normalizeCriterion(firstDefined(criteria, ["edges", "bords"])),
      surface: normalizeCriterion(firstDefined(criteria, ["surface"])),
    },
    defects,
    summary: asString(firstDefined(value, ["summary", "resume", "résumé", "conclusion"])),
    recommendations: asStringArray(
      firstDefined(value, ["recommendations", "recommandations", "advice", "conseils"]),
      10
    ),
    disclaimer:
      asString(firstDefined(value, ["disclaimer", "avertissement"])) ||
      "Estimation visuelle non officielle, sans affiliation avec PSA et ne remplaçant pas une gradation professionnelle.",
  };
}

function extractJson(rawText: string): unknown {
  const cleaned = rawText
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  const candidate =
    firstBrace >= 0 && lastBrace > firstBrace
      ? cleaned.slice(firstBrace, lastBrace + 1)
      : cleaned;

  return JSON.parse(candidate);
}

const basePrompt = `
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
- Tous les champs du format ci-dessous sont obligatoires, même lorsqu'une liste est vide.
- Utilise les repères suivants pour stabiliser les analyses : PSA 10 = quasi parfait sans défaut visible; PSA 9 = défaut mineur isolé; PSA 8 = plusieurs défauts légers; PSA 7 ou moins = usure visible, blanchiment marqué, rayure nette, pli ou enfoncement.
- À photos équivalentes, évite les variations de plus d'un grade. Si le doute dépasse un grade, retourne une plage et réduis la confiance.
- La confiance ne doit jamais dépasser 90 %. Elle ne peut dépasser 85 % que si les quatre photos sont nettes ET qu'un contrôle manuel cohérent confirme l'absence de défaut caché.

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
  "defects": [],
  "summary": "",
  "recommendations": [],
  "disclaimer": "Estimation visuelle non officielle, sans affiliation avec PSA et ne remplaçant pas une gradation professionnelle."
}
`;

export async function POST(req: NextRequest) {
  const startedAt = Date.now();

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Clé Gemini non configurée." }, { status: 500 });
    }

    const body = await req.json();
    const photos = Array.isArray(body?.photos) ? (body.photos as IncomingPhoto[]) : [];
    const manualReviewResult = body?.manualReview
      ? ManualReviewSchema.safeParse(body.manualReview)
      : null;
    const manualReview = manualReviewResult?.success ? manualReviewResult.data : null;
    const previousAnalysis = isRecord(body?.previousAnalysis) ? body.previousAnalysis : null;

    if (photos.length !== PSA_PHOTO_IDS.length) {
      return NextResponse.json({ error: "Les quatre photos sont obligatoires." }, { status: 400 });
    }

    const uniqueIds = new Set(photos.map((photo) => photo.id));
    if (!PSA_PHOTO_IDS.every((id) => uniqueIds.has(id))) {
      return NextResponse.json({ error: "Une ou plusieurs vues PSA sont manquantes." }, { status: 400 });
    }

    const parsedPhotos = photos.map((photo) => ({ id: photo.id, parsed: parseDataUrl(photo.imageBase64) }));
    if (parsedPhotos.some((photo) => !photo.parsed)) {
      return NextResponse.json({ error: "Format d'image invalide." }, { status: 400 });
    }

    const totalBase64Length = parsedPhotos.reduce(
      (total, photo) => total + (photo.parsed?.data.length ?? 0),
      0
    );
    if (totalBase64Length > 6_000_000) {
      return NextResponse.json(
        { error: "Les photos sont trop lourdes. Reprenez-les depuis la caméra intégrée." },
        { status: 413 }
      );
    }

    const imageParts = parsedPhotos.map((photo) => ({
      inlineData: { data: photo.parsed!.data, mimeType: photo.parsed!.mimeType },
    }));

    const manualContext = manualReview
      ? `\n\nCONTRÔLE MANUEL CONFIRMÉ PAR L'UTILISATEUR :\n${JSON.stringify(manualReview, null, 2)}\n\nRÈGLES POUR L'AFFINAGE :\n- Ces déclarations complètent les photos et ne doivent jamais être ignorées.\n- Tout pli, enfoncement, rayure profonde ou défaut majeur doit fortement pénaliser le grade.\n- Des points blancs, coins abîmés ou bords blanchis doivent réduire les critères correspondants de façon proportionnée.\n- Si l'utilisateur confirme zéro défaut supplémentaire et que les photos sont excellentes, la confiance peut augmenter modérément, sans dépasser 90 %.\n- Ne monte jamais automatiquement le grade uniquement parce que l'utilisateur déclare zéro défaut.\n- Explique dans summary comment le contrôle manuel a modifié ou confirmé l'estimation.`
      : "";

    const previousContext = manualReview && previousAnalysis
      ? `\n\nANALYSE PHOTO PRÉCÉDENTE À STABILISER :\n${JSON.stringify(previousAnalysis).slice(0, 5000)}\nConserve une estimation proche sauf si le contrôle manuel justifie clairement une correction.`
      : "";

    const prompt = basePrompt + manualContext + previousContext;

    const genAI = new GoogleGenerativeAI(apiKey);
    const modelCandidates = [
      "gemini-2.5-flash",
      "gemini-2.0-flash",
      "gemini-flash-latest",
      "gemini-2.0-flash-lite",
    ];

    let successfulModel = "";
    let isRateLimited = false;
    let lastRawResponse = "";
    let lastValidationDetails: unknown = null;

    for (const modelName of modelCandidates) {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.05,
          topP: 0.75,
          topK: 16,
          maxOutputTokens: 4096,
        },
      });

      for (let attempt = 1; attempt <= 2; attempt += 1) {
        try {
          const retryInstruction =
            attempt === 1
              ? ""
              : `\nCORRECTION OBLIGATOIRE : ta réponse précédente était incomplète. Fournis absolument chaque champ du FORMAT STRICT, sans en renommer aucun. Les quatre critères centering, corners, edges et surface doivent tous contenir score, label et observations.`;

          const result = await model.generateContent([prompt + retryInstruction, ...imageParts]);
          lastRawResponse = result.response.text();

          let parsedJson: unknown;
          try {
            parsedJson = extractJson(lastRawResponse);
          } catch (parseError) {
            lastValidationDetails = parseError;
            logger.warn("GEMINI", `${modelName} tentative ${attempt}: JSON invalide`);
            continue;
          }

          const normalized = normalizeAnalysis(parsedJson);
          const validation = AnalysisSchema.safeParse(normalized);
          if (!validation.success) {
            lastValidationDetails = validation.error.flatten();
            logger.warn(
              "GEMINI",
              `${modelName} tentative ${attempt}: réponse incomplète`,
              validation.error.flatten()
            );
            continue;
          }

          const analysis = validation.data;
          if (analysis.estimate.minimum > analysis.estimate.maximum) {
            [analysis.estimate.minimum, analysis.estimate.maximum] = [
              analysis.estimate.maximum,
              analysis.estimate.minimum,
            ];
          }

          successfulModel = modelName;
          return NextResponse.json({
            success: true,
            data: { ...analysis, modelUsed: successfulModel },
            processingTimeMs: Date.now() - startedAt,
          });
        } catch (error: any) {
          const message = error?.message || String(error);
          if (message.includes("429") || error?.status === 429) isRateLimited = true;
          logger.warn("GEMINI", `${modelName} tentative ${attempt}: ${message}`);
          break;
        }
      }
    }

    if (lastRawResponse) {
      logger.error("GEMINI", "Réponse finale non conforme", {
        validation: lastValidationDetails,
        rawPreview: lastRawResponse.slice(0, 1500),
      });
      return NextResponse.json(
        {
          error:
            "Gemini a répondu, mais certains critères manquent encore. Vos photos sont conservées : relancez simplement l'analyse.",
          retryable: true,
        },
        { status: 422 }
      );
    }

    return NextResponse.json(
      {
        error: isRateLimited
          ? "Quota Gemini temporairement dépassé. Réessayez dans quelques minutes."
          : "Gemini n'a pas pu analyser les photos.",
        retryable: true,
      },
      { status: isRateLimited ? 429 : 502 }
    );
  } catch (error: any) {
    logger.error("GEMINI", "Erreur serveur", error);
    return NextResponse.json(
      { error: "Erreur pendant l'analyse PSA. Vos photos sont conservées, vous pouvez réessayer." },
      { status: 500 }
    );
  }
}
