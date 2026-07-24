// lib/priceProviders/pokemonPriceTracker.ts


export type ExternalPricePoint = {
  date: number;
  price: number;
};



export async function getPokemonPriceHistory(
  cardId: string,
  days: number = 30
): Promise<ExternalPricePoint[]> {


  if (!cardId) {
    return [];
  }


  try {


    /*
      PokemonPriceTracker API

      Format attendu :

      [
        {
          date: timestamp,
          price: number
        }
      ]

      La connexion API sera ajoutée
      après ajout de la clé API.
    */


    return [];


  } catch {


    return [];

  }

}