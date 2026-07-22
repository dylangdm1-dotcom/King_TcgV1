export type ExternalPricePoint = {
  date: number;
  price: number;
};


export async function getExternalPriceHistory(
  cardId: string,
  days: number = 30
): Promise<ExternalPricePoint[]> {

  if (!cardId) {
    return [];
  }


  /*
    Source historique externe gratuite
    à connecter plus tard.

    Format attendu :

    [
      {
        date: timestamp,
        price: valeur
      }
    ]

  */


  return [];

}