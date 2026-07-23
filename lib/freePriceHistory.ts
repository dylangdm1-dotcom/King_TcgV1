export type FreePricePoint = {
  date: number;
  price: number;
};



export async function getFreePriceHistory(
  cardId: string,
  days:number = 30
): Promise<FreePricePoint[]> {


  if (!cardId) {
    return [];
  }


  try {


    /*
      Source historique gratuite
      à connecter ici.

      Retour attendu :

      [
        {
          date: timestamp,
          price: 120
        }
      ]

    */


    return [];


  } catch {

    return [];

  }

}