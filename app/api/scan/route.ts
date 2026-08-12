import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";

import { logger } from "@/lib/cache/logger";
import { getCachedCardData, setCachedCardData } from "@/lib/pokemonCache";

export const maxDuration = 45;

const CardScanResultSchema = z.object({
  cardName: z.string().nullable().default(null),
  pokemonName: z.string().nullable().default(null),
  cardType: z.enum(["Pokemon", "Trainer", "Energy", "Unknown"]).nullable().default("Unknown"),
  language: z.string().nullable().default("fr"),
  cardNumber: z.string().nullable().default(null),
  setName: z.string().nullable().default(null),
  setSymbol: z.string().nullable().default(null),
  rarity: z.string().nullable().default(null),
  variant: z.enum(["Normal", "Full Art", "Alt Art", "Rainbow", "Gold", "Shiny", "Unknown"]).nullable().default("Unknown"),
  isFullArt: z.boolean().default(false),
  isSecretRare: z.boolean().default(false),
  possibleNames: z.array(z.string()).default([]),
  confidence: z.coerce.number().min(0).max(100).default(0),
});

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function firstDefined(record: JsonRecord, keys: string[]) {
  for (const key of keys) {
    if (record[key] !== undefined && record[key] !== null) return record[key];
  }
  return undefined;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asBoolean(value: unknown) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return ["true", "oui", "yes", "1"].includes(value.toLowerCase());
  return Boolean(value);
}

function normalizeLanguage(value: unknown) {
  const raw = String(value ?? "fr").toLowerCase().replace("_", "-").trim();
  if (["ja", "jp", "jpn", "japanese", "japonais", "日本語"].includes(raw)) return "ja";
  if (["zh", "zh-cn", "cn", "chinese", "chinois", "简体中文"].includes(raw)) return "zh-cn";
  if (["zh-tw", "tw", "traditional chinese", "繁體中文"].includes(raw)) return "zh-tw";
  if (["en", "eng", "english", "anglais"].includes(raw)) return "en";
  if (["fr", "de", "es", "it"].includes(raw)) return raw;
  return "fr";
}

function normalizeCardType(value: unknown) {
  const raw = String(value ?? "Unknown").toLowerCase();
  if (raw.includes("trainer") || raw.includes("dresseur")) return "Trainer";
  if (raw.includes("energy") || raw.includes("energie") || raw.includes("énergie")) return "Energy";
  if (raw.includes("pokemon") || raw.includes("pokémon")) return "Pokemon";
  return "Unknown";
}

function normalizeVariant(value: unknown) {
  const raw = String(value ?? "Unknown").toLowerCase();
  if (raw.includes("alt")) return "Alt Art";
  if (raw.includes("full")) return "Full Art";
  if (raw.includes("rainbow")) return "Rainbow";
  if (raw.includes("gold") || raw.includes("dor")) return "Gold";
  if (raw.includes("shiny") || raw.includes("chromatique")) return "Shiny";
  if (raw.includes("normal")) return "Normal";
  return "Unknown";
}

function normalizePayload(value: unknown) {
  if (!isRecord(value)) return value;
  const possibleNamesRaw = firstDefined(value, ["possibleNames", "possible_names", "aliases", "alternatives"]);
  const possibleNames = Array.isArray(possibleNamesRaw)
    ? possibleNamesRaw.map(asString).filter((name): name is string => Boolean(name)).slice(0, 8)
    : [];

  return {
    cardName: asString(firstDefined(value, ["cardName", "card_name", "name", "nomCarte"])),
    pokemonName: asString(firstDefined(value, ["pokemonName", "pokemon_name", "pokemon", "nomPokemon"])),
    cardType: normalizeCardType(firstDefined(value, ["cardType", "card_type", "type", "categorie"])),
    language: normalizeLanguage(firstDefined(value, ["language", "lang", "langue"])),
    cardNumber: asString(firstDefined(value, ["cardNumber", "card_number", "number", "numero", "collectorNumber"])),
    setName: asString(firstDefined(value, ["setName", "set_name", "extension", "set"])),
    setSymbol: asString(firstDefined(value, ["setSymbol", "set_symbol", "setCode", "set_code", "codeExtension"])),
    rarity: asString(firstDefined(value, ["rarity", "rarete", "rareté"])),
    variant: normalizeVariant(firstDefined(value, ["variant", "variante", "finish"])),
    isFullArt: asBoolean(firstDefined(value, ["isFullArt", "is_full_art", "fullArt"])),
    isSecretRare: asBoolean(firstDefined(value, ["isSecretRare", "is_secret_rare", "secretRare"])),
    possibleNames,
    confidence: (() => {
      const rawConfidence = Number(
        firstDefined(value, ["confidence", "confiance", "score"]) ?? 0
      );
      if (!Number.isFinite(rawConfidence)) return 0;
      return rawConfidence > 0 && rawConfidence <= 1
        ? Math.round(rawConfidence * 100)
        : Math.max(0, Math.min(100, Math.round(rawConfidence)));
    })(),
  };
}

function parseJson(rawText: string) {
  const cleaned = rawText.replace(/```json/gi, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  return JSON.parse(start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned);
}

const PROMPT = `
Tu es un expert international Pokémon TCG. Identifie UNE carte photographiée.

RÈGLES PRIORITAIRES :
- Conserve le nom ORIGINAL visible. Ne traduis jamais le japonais ou le chinois.
- Lis d'abord le numéro de collection complet, puis le code/symbole d'extension.
- Pour les cartes japonaises/chinoises, extension/code + numéro sont prioritaires sur le nom.
- Ne complète jamais une donnée illisible : utilise null.
- possibleNames contient seulement des lectures alternatives plausibles du nom visible.
- Retourne uniquement un JSON valide, sans commentaire.

Codes langue : fr, en, ja, zh-cn, zh-tw, de, es, it.
Exemples de setSymbol : SV2a, sv4a, S-P, CSM1a.

FORMAT OBLIGATOIRE :
{
  "cardName": null,
  "pokemonName": null,
  "cardType": "Unknown",
  "language": "fr",
  "cardNumber": null,
  "setName": null,
  "setSymbol": null,
  "rarity": null,
  "variant": "Unknown",
  "isFullArt": false,
  "isSecretRare": false,
  "possibleNames": [],
  "confidence": 0
}`;

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "Clé API non configurée" }, { status: 500 });

    const { imageBase64, expectedLanguage } = await req.json();
    if (!imageBase64) return NextResponse.json({ error: "Image manquante" }, { status: 400 });

    const mimeMatch = String(imageBase64).match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,/);
    const mimeType = mimeMatch?.[1] || "image/jpeg";
    const base64Data = String(imageBase64).replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, "");
    const imageHash = `scan_img_${base64Data.slice(0, 100)}_${base64Data.slice(-50)}`;
    const cachedResponse = getCachedCardData<any>(imageHash);

    if (cachedResponse) {
      return NextResponse.json({ success: true, modelUsed: "cache", fromCache: true, data: cachedResponse });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const models = ["gemini-2.5-flash", "gemini-2.0-flash-lite", "gemini-flash-latest", "gemini-2.0-flash"];
    let rateLimited = false;
    let lastRaw = "";

    for (const modelName of models) {
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

        const languageInstruction = expectedLanguage
          ? `\nLANGUE ATTENDUE POUR CETTE SESSION : ${expectedLanguage}. Considère cette langue comme prioritaire et ne retourne une autre langue que si la carte est manifestement d'une autre langue.`
          : "";

        const result = await model.generateContent([
          `${PROMPT}${languageInstruction}`,
          { inlineData: { data: base64Data, mimeType } },
        ]);
        lastRaw = result.response.text();
        const parsed = CardScanResultSchema.safeParse(normalizePayload(parseJson(lastRaw)));
        if (!parsed.success) {
          logger.warn("GEMINI", `Réponse scanner incomplète avec ${modelName}, essai suivant.`);
          continue;
        }

        const data = parsed.data;
        const hasName = Boolean(
          data.cardName || data.pokemonName || data.possibleNames.length
        );
        const hasNumber = Boolean(data.cardNumber);
        const hasSet = Boolean(data.setName || data.setSymbol);
        const identitySignals = [hasName, hasNumber, hasSet].filter(Boolean).length;

        if (identitySignals === 0) {
          return NextResponse.json(
            {
              success: false,
              error:
                "Aucune information exploitable détectée. Cadrez la carte entière avec le numéro visible.",
              data,
            },
            { status: 422 }
          );
        }

        const responseData = {
          ...data,
          needsReview: data.confidence < 55 || identitySignals < 2,
        };

        setCachedCardData(imageHash, responseData, 1000 * 60 * 30);
        logger.gemini(`Scan réussi en ${Date.now() - startTime} ms avec ${modelName}`);
        return NextResponse.json({ success: true, modelUsed: modelName, fromCache: false, data: responseData });
      } catch (error: any) {
        const message = error?.message || String(error);
        if (message.includes("429") || error?.status === 429) rateLimited = true;
        logger.warn("GEMINI", `Scanner ${modelName}: ${message}`);
      }
    }

    return NextResponse.json(
      {
        error: rateLimited
          ? "Quota Gemini dépassé temporairement"
          : "Réponse Gemini incomplète. Reprenez la photo avec le numéro et l'extension bien visibles.",
        ...(process.env.NODE_ENV === "development" && lastRaw ? { rawResponse: lastRaw } : {}),
      },
      { status: rateLimited ? 429 : 422 }
    );
  } catch (error: any) {
    logger.error("GEMINI", "Erreur serveur globale pendant le scan", error);
    return NextResponse.json(
      { error: "Erreur technique lors de l'analyse de l'image.", details: error?.message || null },
      { status: 500 }
    );
  }
}
