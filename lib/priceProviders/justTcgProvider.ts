import { JustTCG } from "justtcg-js";
import { CardPrice } from "../types";

// Le client initialise automatiquement avec le token présent dans process.env.JUSTTCG_API_KEY
// ou tu peux lui passer manuellement.
const apiKey = process.env.NEXT_PUBLIC_JUSTTCG_API_KEY;

const client = apiKey ? new JustTCG({ apiKey }) : null;

export interface JustTcgPriceResponse {
  marketPrice: number;
  lowPrice?: number;
  highPrice?: number;
  foilPrice?: number;
  reverseFoilPrice?: number;
}

/**
 * Récupère les données de prix en temps réel pour une carte spécifique depuis JustTCG
 * @param cardId ID de la carte (ex: "swsh3-136")
 */
export async function fetchPricesFromJustTCG(cardId: string): Promise<{
  tcgplayer?: { prices: { normal?: CardPrice; holofoil?: CardPrice } };
  cardmarket?: { prices: { trendPrice?: number; lowPrice?: number } };
} | null> {
  if (!client) {
    console.warn("[JustTCG] Client non initialisé. Clé API manquante ou invalide.");
    return null;
  }

  try {
    // Utilisation de l'API JustTCG officielle via son SDK
    // On recherche par l'identifiant unique de la carte
    const response = await client.v1.cards.get({
      cardId: cardId,
      limit: 1
    });

    if (response.error || !response.data || response.data.length === 0) {
      console.warn(`[JustTCG] Impossible de trouver les prix pour la carte ${cardId}: ${response.error ?? 'Donnée vide'}`);
      return null;
    }

    // Extraction de la première carte correspondante
    const cardData: any = response.data[0];

    // Mapping des données du SDK officiel vers tes interfaces TCGPlayer / Cardmarket
    return {
      tcgplayer: {
        prices: {
          normal: {
            market: cardData.prices?.marketPrice ?? cardData.prices?.cleanRawMarket,
            low: cardData.prices?.lowPrice,
            high: cardData.prices?.highPrice,
          },
          holofoil: {
            market: cardData.prices?.foilPrice ?? cardData.prices?.marketPrice,
          }
        }
      },
      cardmarket: {
        prices: {
          trendPrice: cardData.prices?.marketPrice, // Fallback propre sur le prix global moyen
          lowPrice: cardData.prices?.lowPrice,
        }
      }
    };
  } catch (error) {
    console.error(`[JustTCG SDK] Erreur réseau ou d'authentification pour ${cardId} :`, (error as Error).message);
    return null;
  }
}