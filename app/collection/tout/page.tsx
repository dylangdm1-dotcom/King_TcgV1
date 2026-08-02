"use client";

import { useEffect, useMemo, useState } from "react";
import {
Search,
ArrowUpDown,
Layers,
Sparkles,
Filter,
X,
ShieldCheck,
TrendingUp,
} from "lucide-react";

import Navbar from "../../../components/Navbar";
import BackButton from "../../../components/BackButton";
import CardResult from "@/components/cards/CardResult";

import { getCollection } from "../../../lib/storage";
import { getCardById } from "../../../lib/pokemon";
import { calculateRealMarketPrices } from "../../../lib/priceTracker";
import type { PokemonCard } from "../../../lib/types";

/**

* ======================================================
* KING TCG V5.0
* Inventaire global
*
* * Quantité sécurisée depuis le stockage
* * Prix marché via le moteur V5
* * Valeur totale = prix unitaire × quantité
* * Near Mint géré par priceTracker
* * Tri sans mutation de l'état React
* * Synchronisation du stockage
* ======================================================
  */

type StoredQuantity =
| number
| {
quantity: number;
};

type CollectionCardType = PokemonCard & {
qty: StoredQuantity;
};

function getSafeQty(qty: unknown): number {
if (typeof qty === "number" && Number.isFinite(qty)) {
return Math.max(0, qty);
}

if (
qty &&
typeof qty === "object" &&
"quantity" in qty &&
typeof (qty as { quantity?: unknown }).quantity === "number"
) {
return Math.max(
0,
(qty as { quantity: number }).quantity
);
}

return 1;
}

type SortOption =
| "value_desc"
| "value_asc"
| "qty_desc"
| "name_asc"
| "rarity";

export default function CollectionToutPage() {
const [cards, setCards] = useState<CollectionCardType[]>([]);
const [loading, setLoading] = useState(true);
const [search, setSearch] = useState("");
const [sortBy, setSortBy] =
useState<SortOption>("value_desc");
const [filterRarity, setFilterRarity] =
useState<string>("all");

/**

* ======================================================
* CHARGEMENT COLLECTION
* ======================================================
  */
  const loadCollection = async () => {
  setLoading(true);


try {

  const collection = getCollection();

  const safeCollection =
    collection && typeof collection === "object"
      ? collection
      : {};

  const ids = Object.keys(safeCollection);

  if (ids.length === 0) {
    setCards([]);
    return;
  }

  const results = await Promise.all(
    ids.map(async (id) => {
      try {
        const card = await getCardById(id);

        if (!card) {
          return null;
        }

        return {
          ...card,
          qty: safeCollection[id] ?? 1,
        } as CollectionCardType;
      } catch (error) {
        console.error(
          "[King_TCG V5.0] Erreur chargement carte :",
          id,
          error
        );

        return null;
      }
    })
  );

  const cleaned = results.filter(
    (card): card is CollectionCardType =>
      card !== null
  );

  setCards(cleaned);
} catch (error) {
  console.error(
    "[King_TCG V5.0] Erreur inventaire global :",
    error
  );

  setCards([]);
} finally {
  setLoading(false);
}

};

/**

* ======================================================
* SYNCHRONISATION STOCKAGE
* ======================================================
  */
  useEffect(() => {
  void loadCollection();


const refresh = () => {

  void loadCollection();
};

window.addEventListener(
  "king_tcg_update",
  refresh
);

window.addEventListener(
  "storage_collection_update",
  refresh
);

return () => {
  window.removeEventListener(
    "king_tcg_update",
    refresh
  );

  window.removeEventListener(
    "storage_collection_update",
    refresh
  );
};

}, []);

/**

* ======================================================
* RARETÉS DISPONIBLES
* ======================================================
  */
  const availableRarities = useMemo(() => {
  const rarities = new Set<string>();

for (const card of cards) {

  if (card.rarity) {
    rarities.add(card.rarity);
  }
}

return Array.from(rarities).sort((a, b) =>
  a.localeCompare(b)
);


}, [cards]);

/**

* ======================================================
* PRIX MARCHÉ V5
*
* Le priceTracker reste la source de vérité.
* ======================================================
  */
  const marketPrices = useMemo(() => {
  const prices = new Map<string, number>();


for (const card of cards) {

  try {
    const market = calculateRealMarketPrices(card);

    const price =
      typeof market?.average === "number" &&
      Number.isFinite(market.average)
        ? Math.max(0, market.average)
        : 0;

    prices.set(card.id, price);
  } catch (error) {
    console.error(
      "[King_TCG V5.0] Erreur calcul prix :",
      card.id,
      error
    );

    prices.set(card.id, 0);
  }
}

return prices;

}, [cards]);

/**

* ======================================================
* RECHERCHE + FILTRES + TRI
* ======================================================
  */
  const processedCards = useMemo(() => {
  const query = search.trim().toLowerCase();


const filtered = cards.filter((card) => {

  const searchable = [
    card.name,
    card.number,
    card.set?.name,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const matchesSearch =
    !query || searchable.includes(query);

  const matchesRarity =
    filterRarity === "all" ||
    card.rarity === filterRarity;

  return matchesSearch && matchesRarity;
});

return [...filtered].sort((a, b) => {
  const priceA = marketPrices.get(a.id) ?? 0;
  const priceB = marketPrices.get(b.id) ?? 0;

  const qtyA = getSafeQty(a.qty);
  const qtyB = getSafeQty(b.qty);

  switch (sortBy) {
    case "value_desc":
      return priceB * qtyB - priceA * qtyA;

    case "value_asc":
      return priceA * qtyA - priceB * qtyB;

    case "qty_desc":
      return qtyB - qtyA;

    case "name_asc":
      return a.name.localeCompare(b.name);

    case "rarity":
      return (b.rarity ?? "").localeCompare(
        a.rarity ?? ""
      );

    default:
      return 0;
  }
});


}, [
cards,
search,
filterRarity,
sortBy,
marketPrices,
]);

/**

* ======================================================
* KPI : EXEMPLAIRES
* ======================================================
  */
  const totalCardsCount = useMemo(() => {
  return cards.reduce(
  (sum, card) =>
  sum + getSafeQty(card.qty),
  0
  );
  }, [cards]);

/**

* ======================================================
* KPI : DOUBLONS
* ======================================================
  */
  const totalDuplicates = useMemo(() => {
  return Math.max(
  0,
  totalCardsCount - cards.length
  );
  }, [totalCardsCount, cards.length]);

/**

* ======================================================
* VALEUR DE LA SÉLECTION
* ======================================================
  */
  const filteredTotalValue = useMemo(() => {
  return processedCards.reduce(
  (sum, card) => {
  const price =
  marketPrices.get(card.id) ?? 0;

  const quantity =
  getSafeQty(card.qty);

  return sum + price * quantity;
  },
  0
  );
  }, [processedCards, marketPrices]);

return (
<> <Navbar />


  <main className="min-h-screen bg-neutral-950 text-white pb-32 selection:bg-cyan-500/20">
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">

      {/* NAVIGATION */}
      <div className="flex items-center justify-between">
        <BackButton />
      </div>

      {/* HEADER */}
      <section className="relative overflow-hidden rounded-2xl border border-zinc-900 bg-neutral-900/40 p-5 shadow-xl sm:p-6">
        <div className="pointer-events-none absolute right-0 top-0 h-64 w-64 rounded-full bg-cyan-500/5 blur-3xl" />

        <div className="relative z-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <span className="mb-2 flex w-fit items-center gap-1.5 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-cyan-400">
              <ShieldCheck className="h-3.5 w-3.5" />
              Registre d'Inventaire V5.0
            </span>

            <h1 className="text-lg font-black uppercase tracking-tight">
              Inventaire Global & Doublons
            </h1>

            <p className="mt-0.5 text-[11px] text-zinc-400">
              Gestion des actifs Pokémon,
              valeurs marché et suivi de collection.
            </p>
          </div>

          {!loading && cards.length > 0 && (
            <div className="flex items-center gap-2.5 rounded-xl border border-zinc-800 bg-neutral-900 px-4 py-2.5 shadow-lg">
              <TrendingUp className="h-4 w-4 text-cyan-400" />

              <span className="text-[10px] font-bold uppercase text-zinc-400">
                Valeur sélection :
              </span>

              <span className="text-sm font-black tabular-nums text-cyan-400">
                {filteredTotalValue.toFixed(2)} €
              </span>
            </div>
          )}
        </div>
      </section>

      {/* KPI */}
      {!loading && cards.length > 0 && (
        <section className="grid grid-cols-3 gap-3">

          <div className="rounded-2xl border border-zinc-900 bg-neutral-900/40 p-4 shadow-xl">
            <span className="flex items-center gap-1.5 text-[10px] font-black uppercase text-zinc-500">
              <Layers className="h-3.5 w-3.5 text-cyan-400" />
              Modèles uniques
            </span>

            <div className="mt-1 text-xl font-black tabular-nums">
              {cards.length}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-900 bg-neutral-900/40 p-4 shadow-xl">
            <span className="flex items-center gap-1.5 text-[10px] font-black uppercase text-zinc-500">
              <Sparkles className="h-3.5 w-3.5 text-zinc-400" />
              Exemplaires
            </span>

            <div className="mt-1 text-xl font-black tabular-nums">
              {totalCardsCount}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-900 bg-neutral-900/40 p-4 shadow-xl">
            <span className="flex items-center gap-1.5 text-[10px] font-black uppercase text-zinc-500">
              <Layers className="h-3.5 w-3.5 text-cyan-400" />
              Doublons
            </span>

            <div className="mt-1 text-xl font-black tabular-nums text-cyan-400">
              {totalDuplicates}
            </div>
          </div>

        </section>
      )}

      {/* RECHERCHE / TRI / FILTRES */}
      <section className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row">

          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />

            <input
              type="text"
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              placeholder="Rechercher nom, numéro, extension..."
              className="w-full rounded-2xl border border-zinc-900 bg-neutral-900/40 py-3 pl-11 pr-10 text-xs outline-none transition-all placeholder:text-zinc-600 focus:border-cyan-500/50"
            />

            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 transition hover:text-white"
                aria-label="Effacer la recherche"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">

            <div className="relative flex-1 sm:w-52">
              <ArrowUpDown className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-cyan-400" />

              <select
                value={sortBy}
                onChange={(e) =>
                  setSortBy(
                    e.target.value as SortOption
                  )
                }
                className="w-full appearance-none rounded-2xl border border-zinc-900 bg-neutral-900/40 py-3 pl-9 pr-3 text-xs font-bold outline-none focus:border-cyan-500/50"
              >
                <option value="value_desc">
                  Valeur décroissante
                </option>

                <option value="value_asc">
                  Valeur croissante
                </option>

                <option value="qty_desc">
                  Quantité
                </option>

                <option value="name_asc">
                  Nom A-Z
                </option>

                <option value="rarity">
                  Rareté
                </option>
              </select>
            </div>

            {availableRarities.length > 0 && (
              <div className="relative flex-1 sm:w-44">
                <Filter className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />

                <select
                  value={filterRarity}
                  onChange={(e) =>
                    setFilterRarity(e.target.value)
                  }
                  className="w-full appearance-none rounded-2xl border border-zinc-900 bg-neutral-900/40 py-3 pl-9 pr-3 text-xs font-bold outline-none focus:border-cyan-500/50"
                >
                  <option value="all">
                    Toutes raretés
                  </option>

                  {availableRarities.map(
                    (rarity) => (
                      <option
                        key={rarity}
                        value={rarity}
                      >
                        {rarity}
                      </option>
                    )
                  )}
                </select>
              </div>
            )}

          </div>
        </div>

        {(search ||
          filterRarity !== "all") && (
          <div className="flex items-center gap-3 text-xs text-zinc-400">
            <span>
              Résultats :{" "}
              <strong className="text-white">
                {processedCards.length}
              </strong>
            </span>

            <button
              type="button"
              onClick={() => {
                setSearch("");
                setFilterRarity("all");
              }}
              className="text-cyan-400 underline transition hover:text-cyan-300"
            >
              Réinitialiser
            </button>
          </div>
        )}
      </section>

      {/* CARTES */}
      {loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {Array.from({ length: 12 }).map(
            (_, index) => (
              <div
                key={index}
                className="aspect-[0.72] animate-pulse rounded-2xl border border-zinc-900 bg-neutral-900/40"
              />
            )
          )}
        </div>
      ) : processedCards.length === 0 ? (
        <div className="rounded-2xl border border-zinc-900 bg-neutral-900/40 p-12 text-center">
          <p className="text-xs italic text-zinc-500">
            {search ||
            filterRarity !== "all"
              ? "Aucun actif correspondant."
              : "Votre inventaire est vide."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {processedCards.map((card) => {
            const quantity =
              getSafeQty(card.qty);

            return (
              <div
                key={card.id}
                className="group relative"
              >
                <CardResult card={card} />

                {quantity > 1 && (
                  <div className="absolute right-3 top-3 z-10 rounded-lg border border-cyan-500/40 bg-black/80 px-2 py-0.5 text-[10px] font-black text-cyan-400 shadow-xl backdrop-blur-md">
                    x{quantity}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

    </div>
  </main>
</>


);
}
