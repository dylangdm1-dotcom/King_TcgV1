// lib/priceProviders/JustTcgProvider.ts

import { JustTCG } from "justtcg-js";
import type {
  CardCondition,
} from "../types";

/**
 * =====================================================
 * 💰 KING_TCG — JUSTTCG PROVIDER V5.0
 * =====================================================
 *
 * Source indépendante :
 *                  JustTCG
 *
 * PRINCIPES V5.0 :
 *
 * - Near Mint par défaut
 * - condition explicitement demandée
 * - aucune conversion artificielle de condition
 * - aucune fabrication de données Cardmarket
 * - aucune fabrication de données TCGPlayer
 * - aucune valeur fallback par rareté
 * - aucune valeur inventée si la condition demandée
 *   n'est pas disponible
 * - JustTCG reste identifié comme JustTCG
 *
 * IMPORTANT :
 * JUSTTCG_API_KEY reste uniquement côté serveur.
 *
 * JustTCG V1 retourne les prix dans :
 *
 *   card.variants[]
 *
 * et non plus :
 *
 *   card.prices
 *
 * =====================================================
 */

const apiKey =
  process.env.JUSTTCG_API_KEY;

const client = apiKey
  ? new JustTCG({
      apiKey,
    })
  : null;

/**
 * Taux utilisé par le provider pour convertir
 * les données USD de JustTCG en EUR.
 */
const USD_TO_EUR = 0.92;

// =====================================================
// 🔢 HELPERS
// =====================================================

function safeNumber(
  value: unknown
): number {
  const number = Number(value);

  if (
    !Number.isFinite(number) ||
    number <= 0
  ) {
    return 0;
  }

  return Number(
    number.toFixed(2)
  );
}

function usdToEur(
  value: unknown
): number {
  const usd =
    safeNumber(value);

  if (usd <= 0) {
    return 0;
  }

  return Number(
    (usd * USD_TO_EUR).toFixed(2)
  );
}

// =====================================================
// 🧹 CONDITION
// =====================================================

const DEFAULT_CONDITION: CardCondition =
  "Near Mint";

/**
 * Normalise les différentes écritures possibles
 * d'une condition retournée par JustTCG ou envoyée
 * par l'application.
 */
function normalizeCondition(
  condition?: string | null
): CardCondition {
  const normalized =
    String(
      condition ||
        DEFAULT_CONDITION
    )
      .trim()
      .toLowerCase();

  const conditions: Record<
    string,
    CardCondition
  > = {
    mint: "Mint",

    "near mint": "Near Mint",
    nm: "Near Mint",

    excellent: "Excellent",
    ex: "Excellent",

    good: "Good",

    "light played":
      "Light Played",
    lp: "Light Played",

    played: "Played",
    mp: "Played",

    poor: "Poor",
    damaged: "Poor",
  };

  return (
    conditions[normalized] ??
    DEFAULT_CONDITION
  );
}

/**
 * Compare une condition JustTCG avec la condition
 * demandée par King_TCG.
 */
function conditionMatches(
  variant: any,
  requestedCondition: CardCondition
): boolean {
  const variantCondition =
    normalizeCondition(
      variant?.condition
    );

  return (
    variantCondition ===
    requestedCondition
  );
}

// =====================================================
// 🧾 RÉSULTAT JUSTTCG
// =====================================================

export interface JustTcgPriceResult {
  found: boolean;

  cardId?: string;
  cardName?: string;
  setName?: string;
  number?: string;
  rarity?: string;

  /**
   * Prix réellement retourné par JustTCG.
   */
  marketPriceUSD: number;
  marketPriceEUR: number;

  /**
   * JustTCG ne nous donne pas nécessairement
   * un low/high distinct dans les données utilisées
   * actuellement.
   *
   * On ne fabrique donc plus ces valeurs.
   */
  lowPriceUSD: number;
  lowPriceEUR: number;

  highPriceUSD: number;
  highPriceEUR: number;

  variant?: string;

  /**
   * Condition réellement sélectionnée.
   */
  condition?: CardCondition;

  /**
   * Source unique.
   *
   * IMPORTANT :
   * aucun objet TCGPlayer/Cardmarket artificiel.
   */
  source: "JustTCG";
}

// =====================================================
// 🔎 EXTRACTION D'UNE VARIANTE
// =====================================================

/**
 * Sélectionne la meilleure variante correspondant
 * EXACTEMENT à la condition demandée.
 *
 * V5.0 :
 *
 * 1. condition demandée
 * 2. prix réel positif
 * 3. prix le plus bas
 *
 * Si aucune variante de cette condition n'existe :
 *
 * → null
 *
 * On ne retombe JAMAIS automatiquement sur Near Mint.
 */
function selectBestVariant(
  variants: any[],
  requestedCondition: CardCondition
): any | null {
  if (
    !Array.isArray(variants) ||
    variants.length === 0
  ) {
    return null;
  }

  const matchingVariants =
    variants.filter(
      (variant) => {
        return (
          conditionMatches(
            variant,
            requestedCondition
          ) &&
          safeNumber(
            variant?.price
          ) > 0
        );
      }
    );

  if (
    matchingVariants.length === 0
  ) {
    return null;
  }

  return [
    ...matchingVariants,
  ].sort((a, b) => {
    return (
      safeNumber(a?.price) -
      safeNumber(b?.price)
    );
  })[0];
}

// =====================================================
// 🔎 MATCHING CARTE
// =====================================================

function normalizeText(
  value: unknown
): string {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .trim();
}

/**
 * Vérifie si le set correspond suffisamment
 * au set demandé.
 */
function setMatches(
  card: any,
  wantedSet: string
): boolean {
  if (!wantedSet) {
    return true;
  }

  const cardSet =
    normalizeText(
      card?.set_name
    );

  const wanted =
    normalizeText(
      wantedSet
    );

  if (
    !cardSet ||
    !wanted
  ) {
    return false;
  }

  return (
    cardSet.includes(wanted) ||
    wanted.includes(cardSet)
  );
}

/**
 * Vérifie le numéro de carte.
 *
 * Exemple :
 *
 * 101/084 → 101
 */
function cardNumberMatches(
  card: any,
  wantedNumber: string
): boolean {
  if (!wantedNumber) {
    return true;
  }

  const cardNumber =
    String(
      card?.number || ""
    )
      .split("/")
      [0]
      .trim();

  return (
    cardNumber ===
    wantedNumber
  );
}

// =====================================================
// 💰 CONSTRUCTION DU RÉSULTAT
// =====================================================

function buildResult(
  card: any,
  variant: any,
  condition: CardCondition
): JustTcgPriceResult | null {
  const marketUSD =
    safeNumber(
      variant?.price
    );

  if (marketUSD <= 0) {
    return null;
  }

  const marketEUR =
    usdToEur(
      marketUSD
    );

  if (marketEUR <= 0) {
    return null;
  }

  /**
   * IMPORTANT :
   *
   * Le provider actuel ne dispose pas de données
   * séparées fiables pour low / high.
   *
   * On ne présente donc plus le même prix trois fois
   * sous trois noms différents.
   *
   * Les champs restent à 0 pour compatibilité avec
   * l'ancienne interface, mais ils ne sont PAS utilisés
   * comme statistiques de marché.
   */
  return {
    found: true,

    cardId:
      card?.id,

    cardName:
      card?.name,

    setName:
      card?.set_name,

    number:
      card?.number,

    rarity:
      card?.rarity,

    marketPriceUSD:
      marketUSD,

    marketPriceEUR:
      marketEUR,

    lowPriceUSD:
      0,

    lowPriceEUR:
      0,

    highPriceUSD:
      0,

    highPriceEUR:
      0,

    variant:
      variant?.printing ||
      "Normal",

    condition,

    source:
      "JustTCG",
  };
}

// =====================================================
// 💰 RECHERCHE JUSTTCG
// =====================================================

/**
 * Recherche une carte sur JustTCG.
 *
 * La condition est désormais explicite.
 *
 * Near Mint est utilisée par défaut.
 */
export async function searchPricesFromJustTCG(
  params: {
    name?: string;
    number?: string;
    setName?: string;
    rarity?: string;
    condition?: CardCondition | string;
  }
): Promise<JustTcgPriceResult | null> {
  if (!client) {
    console.warn(
      "[JustTCG V5.0] JUSTTCG_API_KEY absente."
    );

    return null;
  }

  const name =
    String(
      params.name || ""
    ).trim();

  if (!name) {
    return null;
  }

  const requestedCondition =
    normalizeCondition(
      params.condition
    );

  const cleanNumber =
    String(
      params.number || ""
    )
      .split("/")
      [0]
      .trim();

  try {
    const response =
      await client.v1.cards.get({
        game: "Pokemon",

        query: name,

        ...(cleanNumber
          ? {
              number:
                cleanNumber,
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
        `[JustTCG V5.0] Aucun résultat pour "${name}" ${cleanNumber}`
      );

      return null;
    }

    // -------------------------------------------------
    // 🧾 CANDIDATS
    // -------------------------------------------------

    let candidates =
      [...response.data];

    // -------------------------------------------------
    // 🔢 NUMÉRO
    // -------------------------------------------------

    if (cleanNumber) {
      const numberMatches =
        candidates.filter(
          (card: any) =>
            cardNumberMatches(
              card,
              cleanNumber
            )
        );

      if (
        numberMatches.length > 0
      ) {
        candidates =
          numberMatches;
      }
    }

    // -------------------------------------------------
    // 📦 SET
    // -------------------------------------------------

    if (params.setName) {
      const matchingSets =
        candidates.filter(
          (card: any) =>
            setMatches(
              card,
              String(
                params.setName
              )
            )
        );

      if (
        matchingSets.length > 0
      ) {
        candidates =
        matchingSets;
      }
    }

    // -------------------------------------------------
    // 💰 CONDITION + PRIX
    // -------------------------------------------------

    let selectedCard:
      | any
      | null = null;

    let selectedVariant:
      | any
      | null = null;

    for (
      const card of candidates
    ) {
      const variant =
        selectBestVariant(
          card?.variants || [],
          requestedCondition
        );

      if (variant) {
        selectedCard =
          card;

        selectedVariant =
          variant;

        break;
      }
    }

    // -------------------------------------------------
    // ❌ PAS DE PRIX POUR CET ÉTAT
    // -------------------------------------------------

    if (
      !selectedCard ||
      !selectedVariant
    ) {
      console.warn(
        `[JustTCG V5.0] Carte trouvée mais aucun prix ${requestedCondition} disponible pour "${name}"`
      );

      return null;
    }

    const result =
      buildResult(
        selectedCard,
        selectedVariant,
        requestedCondition
      );

    if (!result) {
      return null;
    }

    console.info(
      `[JustTCG V5.0] ${result.cardName} #${result.number} | ${requestedCondition} → $${result.marketPriceUSD} / ${result.marketPriceEUR}€`
    );

    return result;
  } catch (error) {
    console.error(
      "[JustTCG V5.0] Erreur API :",
      error
    );

    return null;
  }
}

// =====================================================
// 🔎 RECHERCHE DIRECTE PAR CARD ID
// =====================================================

/**
 * Récupération directe d'une carte JustTCG.
 *
 * Near Mint par défaut.
 */
export async function fetchPricesFromJustTCG(
  cardId: string,
  condition: CardCondition | string =
    DEFAULT_CONDITION
): Promise<JustTcgPriceResult | null> {
  if (!client) {
    console.warn(
      "[JustTCG V5.0] JUSTTCG_API_KEY absente."
    );

    return null;
  }

  if (!cardId) {
    return null;
  }

  const requestedCondition =
    normalizeCondition(
      condition
    );

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
        card?.variants || [],
        requestedCondition
      );

    if (!variant) {
      console.warn(
        `[JustTCG V5.0] Aucun prix ${requestedCondition} pour ${cardId}`
      );

      return null;
    }

    return buildResult(
      card,
      variant,
      requestedCondition
    );
  } catch (error) {
    console.error(
      `[JustTCG V5.0] Erreur lookup ${cardId}:`,
      error
    );

    return null;
  }
}