// app/api/scanner/route.ts

import { NextRequest, NextResponse } from "next/server";

const API_URL = "https://api.pokemontcg.io/v2/cards";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const name = searchParams.get("name");

    if (!name) {
      return NextResponse.json({ card: null });
    }

    const query = encodeURIComponent(name);
    
    // Requête vers l'API externe avec limitation à 5 résultats pour optimiser la vitesse
    const response = await fetch(`${API_URL}?q=name:${query}*&pageSize=5`);
    const data = await response.json();

    return NextResponse.json({
      card: data.data?.[0] ?? null,
    });
  } catch (error) {
    console.error("Erreur Scanner API :", error);
    return NextResponse.json({ card: null });
  }
}