// lib/priceProviders/pokemonPriceTracker.ts

export type ExternalPricePoint = {
  date: number;
  price: number;
};

/**
 * Récupère l'historique des prix pour une carte depuis l'API PokemonPriceTracker
 * @param cardId Identifiant unique de la carte (ex: "sv05-1")
 * @param days Nombre de jours d'historique souhaités (par défaut 30 jours)
 */
export async function getPokemonPriceHistory(
  cardId: string,
  days: number = 30
): Promise<ExternalPricePoint[]> {
  if (!cardId) {
    return [];
  }

  try {
    const apiKey =
      process.env.POKEMON_PRICE_TRACKER_API_KEY ||
      process.env.NEXT_PUBLIC_POKEMON_PRICE_TRACKER_API_KEY;

    // Si aucune clé API n'est configurée, on retourne un tableau vide pour éviter les erreurs d'appel
    if (!apiKey) {
      console.warn(
        `[PokemonPriceTracker] Clé API manquante pour ${cardId}. Retour d'un historique vide.`
      );
      return [];
    }

    /* 
      Exemple de requête API REST :
      const response = await fetch(
        `https://api.pokemonpricetracker.com/v1/cards/${cardId}/history?days=${days}`,
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) return [];
      const data = await response.json();
      return data.history || [];
    */

    return [];
  } catch (error) {
    console.error(
      `[PokemonPriceTracker] Erreur lors de la récupération de l'historique pour ${cardId}:`,
      error
    );
    return [];
  }
}