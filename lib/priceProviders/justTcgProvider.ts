import { JustTCG } from "justtcg-js";
import type { CardPrice } from "../types";

/**

* =====================================================
* 💰 JUSTTCG PROVIDER V5
* =====================================================
*
* Source de prix secondaire/prioritaire pour les cartes
* récentes lorsque Pokémon TCG API / Cardmarket ne
* fournissent pas encore de prix.
*
* IMPORTANT :
* JUSTTCG_API_KEY reste uniquement côté serveur.
*
* JustTCG V1 retourne maintenant les prix dans :
*
* card.variants[]
*
* et non plus :
*
* card.prices
*
* =====================================================
  */

const apiKey = process.env.JUSTTCG_API_KEY;

const client = apiKey
? new JustTCG({
apiKey,
})
: null;

const USD_TO_EUR = 0.92;

function safeNumber(value: unknown): number {
const number = Number(value);

if (!Number.isFinite(number) || number <= 0) {
return 0;
}

return Number(number.toFixed(2));
}

function usdToEur(value: unknown): number {
const usd = safeNumber(value);

if (usd <= 0) {
return 0;
}

return Number((usd * USD_TO_EUR).toFixed(2));
}

/**

* =====================================================
* 🧾 RÉSULTAT JUSTTCG
* =====================================================
  */

export interface JustTcgPriceResult {
found: boolean;

cardId?: string;
cardName?: string;
setName?: string;
number?: string;
rarity?: string;

marketPriceUSD: number;
marketPriceEUR: number;

lowPriceUSD: number;
lowPriceEUR: number;

highPriceUSD: number;
highPriceEUR: number;

variant?: string;
condition?: string;

tcgplayer?: {
prices: {
normal?: CardPrice;
holofoil?: CardPrice;
reverseHolofoil?: CardPrice;
};
};

cardmarket?: {
prices: {
trendPrice?: number;
lowPrice?: number;
};
};
}

/**

* =====================================================
* 🔎 EXTRACTION DU MEILLEUR VARIANT
* =====================================================
*
* On privilégie :
*
* 1. Near Mint
* 2. prix positif
* 3. prix le plus bas
*
* L'objectif est d'obtenir un prix d'entrée de marché
* cohérent avec le fonctionnement actuel de King_TCG.
  */

function selectBestVariant(variants: any[]): any | null {
if (!Array.isArray(variants) || variants.length === 0) {
return null;
}

const validVariants = variants.filter((variant) => {
return safeNumber(variant?.price) > 0;
});

if (validVariants.length === 0) {
return null;
}

const nearMint = validVariants.filter((variant) => {
const condition = String(
variant?.condition || ""
).toLowerCase();

return (
  condition === "near mint" ||
  condition === "nm" ||
  condition.includes("near mint")
);

});

const pool = nearMint.length > 0
? nearMint
: validVariants;

return [...pool].sort((a, b) => {
return safeNumber(a.price) - safeNumber(b.price);
})[0];
}

/**

* =====================================================
* 💰 RECHERCHE JUSTTCG
* =====================================================
*
* Recherche par nom + numéro.
*
* Exemple :
*
* Mega Darkrai ex
* 101/084
*
* devient :
*
* query = "Mega Darkrai ex"
* number = "101"
  */

export async function searchPricesFromJustTCG(params: {
name?: string;
number?: string;
setName?: string;
rarity?: string;
}): Promise<JustTcgPriceResult | null> {
if (!client) {
console.warn(
"[JustTCG] JUSTTCG_API_KEY absente."
);
return null;

}

const name = String(params.name || "").trim();

if (!name) {
return null;
}

const cleanNumber = String(
params.number || ""
)
.split("/")
[0]
.trim();

try {
const response = await client.v1.cards.get({
game: "Pokemon",
query: name,
...(cleanNumber
? {
number: cleanNumber,
}
: {}),
limit: 20,
});

if (
  response.error ||
  !response.data ||
  response.data.length === 0
) {
  console.warn(
    `[JustTCG] Aucun résultat pour "${name}" ${cleanNumber}`
  );

  return null;
}

/**
 * ---------------------------------------------------
 * Sélection de la meilleure carte
 * ---------------------------------------------------
 */

let candidates = [...response.data];

/**
 * Filtre numéro si disponible.
 */
if (cleanNumber) {
  const numberMatches = candidates.filter((card: any) => {
    const cardNumber = String(
      card?.number || ""
    )
      .split("/")
      [0]
      .trim();

    return cardNumber === cleanNumber;
  });

  if (numberMatches.length > 0) {
    candidates = numberMatches;
  }
}

/**
 * Filtre extension si possible.
 */
if (params.setName) {
  const wantedSet = String(
    params.setName
  )
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  const setMatches = candidates.filter((card: any) => {
    const setName = String(
      card?.set_name || ""
    )
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    return (
      setName.includes(wantedSet) ||
      wantedSet.includes(setName)
    );
  });

  if (setMatches.length > 0) {
    candidates = setMatches;
  }
}

/**
 * ---------------------------------------------------
 * Trouve la première carte avec un prix réel.
 * ---------------------------------------------------
 */

let selectedCard: any = null;
let selectedVariant: any = null;

for (const card of candidates) {
  const variant = selectBestVariant(
    card?.variants || []
  );

  if (variant) {
    selectedCard = card;
    selectedVariant = variant;
    break;
  }
}

if (!selectedCard || !selectedVariant) {
  console.warn(
    `[JustTCG] Carte trouvée mais aucun prix disponible pour "${name}"`
  );

  return null;
}

const marketUSD = safeNumber(
  selectedVariant.price
);

const marketEUR = usdToEur(
  selectedVariant.price
);

const lowUSD = safeNumber(
  selectedVariant.price
);

const lowEUR = usdToEur(
  selectedVariant.price
);

const highUSD = safeNumber(
  selectedVariant.price
);

const highEUR = usdToEur(
  selectedVariant.price
);

console.info(
  `[JustTCG] ${selectedCard.name} #${selectedCard.number} -> $${marketUSD} / ${marketEUR}€`
);

return {
  found: true,

  cardId: selectedCard.id,
  cardName: selectedCard.name,
  setName: selectedCard.set_name,
  number: selectedCard.number,
  rarity: selectedCard.rarity,

  marketPriceUSD: marketUSD,
  marketPriceEUR: marketEUR,

  lowPriceUSD: lowUSD,
  lowPriceEUR: lowEUR,

  highPriceUSD: highUSD,
  highPriceEUR: highEUR,

  variant:
    selectedVariant.printing ||
    "Normal",

  condition:
    selectedVariant.condition ||
    "Near Mint",

  tcgplayer: {
    prices: {
      normal: {
        low: lowEUR,
        market: marketEUR,
        high: highEUR,
      },

      holofoil: {
        low: lowEUR,
        market: marketEUR,
        high: highEUR,
      },

      reverseHolofoil: {
        low: lowEUR,
        market: marketEUR,
        high: highEUR,
      },
    },
  },

  cardmarket: {
    prices: {
      lowPrice: lowEUR,
      trendPrice: marketEUR,
    },
  },
};

} catch (error) {
console.error(
"[JustTCG] Erreur API :",
error
);
return null;

}
}

/**

* =====================================================
* 🔎 RECHERCHE DIRECTE PAR CARD ID JUSTTCG
* =====================================================
  */

export async function fetchPricesFromJustTCG(
cardId: string
): Promise<JustTcgPriceResult | null> {
if (!client) {
console.warn(
"[JustTCG] JUSTTCG_API_KEY absente."
);
return null;

}

if (!cardId) {
return null;
}

try {
const response =
await client.v1.cards.get({
cardId,
limit: 1,
});

if (
  response.error ||
  !response.data ||
  response.data.length === 0
) {
  return null;
}

const card: any =
  response.data[0];

const variant =
  selectBestVariant(
    card?.variants || []
  );

if (!variant) {
  return null;
}

const marketUSD =
  safeNumber(variant.price);

const marketEUR =
  usdToEur(variant.price);

return {
  found: true,

  cardId: card.id,
  cardName: card.name,
  setName: card.set_name,
  number: card.number,
  rarity: card.rarity,

  marketPriceUSD: marketUSD,
  marketPriceEUR: marketEUR,

  lowPriceUSD: marketUSD,
  lowPriceEUR: marketEUR,

  highPriceUSD: marketUSD,
  highPriceEUR: marketEUR,

  variant:
    variant.printing ||
    "Normal",

  condition:
    variant.condition ||
    "Near Mint",

  tcgplayer: {
    prices: {
      normal: {
        low: marketEUR,
        market: marketEUR,
        high: marketEUR,
      },
    },
  },

  cardmarket: {
    prices: {
      lowPrice: marketEUR,
      trendPrice: marketEUR,
    },
  },
};

} catch (error) {
console.error(
`[JustTCG] Erreur lookup ${cardId}:`,
error
);

return null;

}
}
