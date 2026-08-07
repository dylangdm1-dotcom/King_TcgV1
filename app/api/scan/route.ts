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

export type CardScanResult = z.infer<typeof CardScanResultSchema>;

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

function asBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return ["true", "oui", "yes", "1"].includes(value.toLowerCase());
  return Boolean(value);
}

function normalizeLanguage(value: unknown): string {
  const raw = String(value ?? "fr").trim().toLowerCase().replace("_", "-");
  if (["jp", "jpn", "japanese", "japonais", "日本語"].includes(raw)) return "ja";
  if (["zh", "cn", "zh-cn", "chinese", "chinois", "简体中文"].includes(raw)) return "zh-cn";
  if (["tw", "zh-tw", "traditional chinese", "繁體中文"].includes(raw)) return "zh-tw";
  if (["en", "eng", "english", "anglais"].includes(raw)) return "en";
  if (["de", "es", "it", "fr"].includes(raw)) return raw;
  return "fr";
}

function normalizeCardType(value: unknown): CardScanResult["cardType"] {
  const raw = String(value ?? "Unknown").toLowerCase();
  if (raw.includes("trainer") || raw.includes("dresseur")) return "Trainer";
  if (raw.includes("energy") || raw.includes("energie") || raw.includes("énergie")) return "Energy";
  if (raw.includes("pokemon") || raw.includes("pokémon")) return "Pokemon";
  return "Unknown";
}

function normalizeVariant(value: unknown): CardScanResult["variant"] {
  const raw = String(value ?? "Unknown").toLowerCase();
  if (raw.includes("alt")) return "Alt Art";
  if (raw.includes("full")) return "Full Art";
  if (raw.includes("rainbow")) return "Rainbow";
  if (raw.includes("gold") || raw.includes("dor")) return "Gold";
  if (raw.includes("shiny") || raw.includes("chromatique")) return "Shiny";
  if (raw.includes("normal")) return "Normal";
  return "Unknown";
}

function normalizeScanPayload(value: unknown): unknown {
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
    confidence: Number(firstDefined(value, ["confidence", "confiance", "score"]) ?? 0),
  };
}

function extractJson(rawText: string): unknown {
  const cleaned = rawText.replace(/```json/gi, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  return JSON.parse(start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned);
}

const prompt = `
Tu es un expert international Pokémon TCG chargé d'identifier précisément UNE carte photographiée.

PRIORITÉ D'IDENTIFICATION :
1. Lis le numéro de collection exact, y compris les préfixes (SV, S-P, PROMO, etc.).
2. Lis le code/symbole d'extension visible près du numéro.
3. Détecte la langue réelle de la carte.
4. Conserve le nom ORIGINAL visible. Ne traduis jamais le japonais ou le chinois.
5. Pour une carte japonaise/chinoise, le couple extension/code + numéro est plus fiable que la traduction du nom.
6. Si plusieurs lectures sont possibles, place les variantes dans possibleNames.
7. N'invente aucune information illisible : utilise null.

LANGUES : fr, en, ja, zh-cn, zh-tw, de, es, it.
cardNumber doit conserver la forme visible complète (ex. 006/165, 151/165, SVP 050, 092/071).
setSymbol doit contenir le code court visible de l'extension lorsqu'il existe (ex. SV2a, S-P, sv4a, CSM1a).
confidence est un entier 0-100.

Retourne UNIQUEMENT ce JSON, avec tous les champs :
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

    const { imageBase64 } = await req.json();
    if (!imageBase64) return NextResponse.json({ error: "Image manquante" }, { status: 400 });

    const mimeMatch = String(imageBase64).match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,/);
    const mimeType = mimeMatch?.[1] || "image/jpeg";
    const base64Data = String(imageBase64).replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, "");
    const imageHash = `scan_img_${base64Data.slice(0, 100)}_${base64Data.slice(-50)}`;
    const cachedResponse = getCachedCardData<CardScanResult>(imageHash);
    if (cachedResponse) {
      return NextResponse.json({ success: true, modelUsed: "cache", fromCache: true, data: cachedResponse });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const modelCandidates = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-flash-latest", "gemini-2.0-flash-lite"];
    const imagePart = { inlineData: { data: base64Data, mimeType } };
    let isRateLimited = false;
    let lastRawResponse = "";

    for (const modelName of modelCandidates) {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.03,
          topP: 0.7,
          topK: 16,
          maxOutputTokens: 2048,
        },
      });

      for (let attempt = 1; attempt <= 2; attempt += 1) {
        try {
          const retry = attempt === 2
            ? "\nTa réponse précédente était incomplète. Relis surtout langue, numéro et code d'extension, puis retourne tous les champs sans markdown."
            : "";
          const result = await model.generateContent([prompt + retry, imagePart]);
          lastRawResponse = result.response.text();
          const parsed = normalizeScanPayload(extractJson(lastRawResponse));
          const validation = CardScanResultSchema.safeParse(parsed);
          if (!validation.success) {
            logger.warn("GEMINI", `${modelName} scan tentative ${attempt}: réponse invalide`, validation.error.flatten());
            continue;
          }

          const data = validation.data;
          if (data.confidence < 55 || (!data.cardName && !data.pokemonName && !data.cardNumber)) {
            return NextResponse.json({
              success: false,
              error: "Carte non reconnue avec assez de certitude. Recadrez le numéro et le bas de la carte.",
              data,
            }, { status: 404 });
          }

          setCachedCardData(imageHash, data, 1000 * 60 * 30);
          logger.gemini(`Scan multilingue réussi en ${Date.now() - startTime}ms avec ${modelName}`);
          return NextResponse.json({ success: true, modelUsed: modelName, fromCache: false, data });
        } catch (error: any) {
          const message = error?.message || String(error);
          if (message.includes("429") || error?.status === 429) isRateLimited = true;
          logger.warn("GEMINI", `${modelName} scan tentative ${attempt}: ${message}`);
        }
      }
    }

    logger.error("GEMINI", "Échec de tous les modèles Scanner", lastRawResponse.slice(0, 500));
    return NextResponse.json({
      error: isRateLimited
        ? "Quota Gemini dépassé temporairement"
        : "Identification incomplète. Reprenez la photo en cadrant la carte entière et son numéro.",
    }, { status: isRateLimited ? 429 : 422 });
  } catch (error: any) {
    logger.error("GEMINI", "Erreur serveur globale pendant le scan", error);
    return NextResponse.json({ error: "Erreur technique lors de l'analyse de l'image.", details: error?.message || null }, { status: 500 });
  }
}
