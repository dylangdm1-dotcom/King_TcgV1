import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: NextRequest) {
  try {
    const { imageBase64 } = await req.json();

    if (!imageBase64) {
      return NextResponse.json({ error: 'Image manquante' }, { status: 400 });
    }

    // Extraction des données brutes de la chaîne base64 (retrait du header data:image/...)
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    // Utilisation du modèle rapide et vision Gemini 1.5 Flash
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
      },
    });

    const prompt = `
    Tu es un expert TCG Pokémon mondialement reconnu.
    Analyse l'image fournie et identifie la carte Pokémon exacte.
    
    Retourne UNIPUEMENT un objet JSON strictement formaté selon ce schéma :
    {
      "cardName": "string (Nom exact imprimé sur la carte)",
      "set": "string (Nom ou code de l'extension si visible, ex: 'EV01', 'Evolutions')",
      "cardNumber": "string (Numéro de collection exact, ex: '025/185' ou 'SWSH001')",
      "language": "string (FR, EN, JP, KR, DE, etc.)",
      "hp": number (Points de vie si détectés, sinon null),
      "confidence": number (Indice de certitude entre 0 et 1)
    }

    Si l'image ne contient pas une carte Pokémon ou n'est pas lisible, renvoie "cardName": null.
    `;

    const imagePart = {
      inlineData: {
        data: base64Data,
        mimeType: 'image/jpeg',
      },
    };

    const result = await model.generateContent([prompt, imagePart]);
    const responseText = result.response.text();
    const parsedData = JSON.parse(responseText);

    return NextResponse.json({ success: true, data: parsedData });
  } catch (error) {
    console.error('Erreur Gemini Scanner:', error);
    return NextResponse.json(
      { error: "Échec lors de l'analyse visuelle par l'IA" },
      { status: 500 }
    );
  }
}