// app/psa/page.tsx

"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Award,
  Plus,
  ShieldCheck,
  Sparkles,
  Trash2,
} from "lucide-react";

import Navbar from "@/components/Navbar";

import {
  psaService,
  MOCK_PRICECHARTING_DATABASE,
  type PriceChartingCard,
} from "@/lib/psa/psaService";

import type {
  PSACard,
  PSAGrade,
  PSAPrices,
} from "@/lib/psa/types";

export default function PSAPage() {
  const [activeTab, setActiveTab] = useState<
    "collection" | "search" | "estimation"
  >("collection");

  // =====================================================
  // COLLECTION PSA
  // =====================================================

  const [collection, setCollection] = useState<PSACard[]>([]);

  const [collectionSearch, setCollectionSearch] =
    useState("");

  const [filterGrade, setFilterGrade] =
    useState<"all" | PSAGrade>("all");

  // =====================================================
  // PRICECHARTING
  // =====================================================

  const [priceChartingQuery, setPriceChartingQuery] =
    useState("");

  const [priceChartingResults, setPriceChartingResults] =
    useState<PriceChartingCard[]>(
      MOCK_PRICECHARTING_DATABASE
    );

  // =====================================================
  // MODAL AJOUT
  // =====================================================

  const [isAddModalOpen, setIsAddModalOpen] =
    useState(false);

  const [newCert, setNewCert] = useState("");
  const [newName, setNewName] = useState("");
  const [newSet, setNewSet] = useState("");
  const [newNumber, setNewNumber] = useState("");
  const [newGrade, setNewGrade] =
    useState<PSAGrade>(10);
  const [newPrice, setNewPrice] = useState(0);
  const [newImage, setNewImage] = useState("");

  const [selectedMarketPrices, setSelectedMarketPrices] =
    useState<PSAPrices | undefined>(undefined);

  // =====================================================
  // CHARGEMENT COLLECTION
  // =====================================================

  useEffect(() => {
    setCollection(psaService.getCollection());
  }, []);

  // =====================================================
  // STATISTIQUES
  // =====================================================

  const stats = useMemo(
    () => psaService.calculateStats(collection),
    [collection]
  );

  // =====================================================
  // RESET FORMULAIRE
  // =====================================================

  const resetForm = () => {
    setNewCert("");
    setNewName("");
    setNewSet("");
    setNewNumber("");
    setNewGrade(10);
    setNewPrice(0);
    setNewImage("");
    setSelectedMarketPrices(undefined);
  };

  // =====================================================
  // OUVERTURE MODAL AJOUT
  // =====================================================

  const openAddModal = () => {
    resetForm();
    setIsAddModalOpen(true);
  };

  // =====================================================
  // RECHERCHE PRICECHARTING
  // =====================================================

  const handlePriceChartingSearch = (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    const query = priceChartingQuery.trim();

    if (!query) {
      setPriceChartingResults(
        MOCK_PRICECHARTING_DATABASE
      );
      return;
    }

    setPriceChartingResults(
      psaService.searchPriceCharting(query)
    );
  };

  // =====================================================
  // SELECTION PRICECHARTING
  // =====================================================

  const handleSelectPriceChartingCard = (
    card: PriceChartingCard,
    grade: PSAGrade
  ) => {
    setNewName(card.cardName);
    setNewSet(card.setName);
    setNewNumber(card.cardNumber);
    setNewImage(card.imageUrl);
    setSelectedMarketPrices(card.prices);
    setNewGrade(grade);

    const prices: Record<PSAGrade, number> = {
      1: card.prices.ungraded,
      2: card.prices.ungraded,
      3: card.prices.ungraded,
      4: card.prices.ungraded,
      5: card.prices.ungraded,
      6: card.prices.ungraded,
      7: card.prices.psa7,
      8: card.prices.psa8,
      9: card.prices.psa9,
      10: card.prices.psa10,
    };

    setNewPrice(prices[grade]);
    setIsAddModalOpen(true);
  };

  // =====================================================
  // AJOUT CARTE PSA
  // =====================================================

  const handleAddSubmit = (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    const certificate = newCert.trim();
    const name = newName.trim();

    if (!certificate || !name) {
      return;
    }

    try {
      psaService.addCard({
        psaCertNumber: certificate,
        cardName: name,
        setName: newSet.trim(),
        cardNumber: newNumber.trim(),
        grade: newGrade,
        imageUrl: newImage.trim(),
        estimatedValue: Number.isFinite(newPrice)
          ? newPrice
          : 0,
        salesHistory: [],
        marketPrices: selectedMarketPrices,
      });

      setCollection(
        psaService.getCollection()
      );

      setIsAddModalOpen(false);
      resetForm();
    } catch (error) {
      console.error(
        "[King_TCG] Erreur ajout carte PSA :",
        error
      );
    }
  };

  // =====================================================
  // SUPPRESSION CARTE
  // =====================================================

  const handleDelete = (id: string) => {
    if (
      !confirm(
        "Supprimer cette carte PSA de votre collection ?"
      )
    ) {
      return;
    }

    try {
      psaService.removeCard(id);
      setCollection(
        psaService.getCollection()
      );
    } catch (error) {
      console.error(
        "[King_TCG] Erreur suppression carte PSA :",
        error
      );
    }
  };

  // =====================================================
  // FILTRAGE COLLECTION
  // =====================================================

  const filteredCollection = useMemo(() => {
    let cards = psaService.searchCollection(
      collection,
      collectionSearch
    );

    if (filterGrade !== "all") {
      cards = cards.filter(
        (card) => card.grade === filterGrade
      );
    }

    return cards;
  }, [
    collection,
    collectionSearch,
    filterGrade,
  ]);

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-neutral-950 text-white pb-32">
        <div className="mx-auto max-w-5xl px-4 py-6 space-y-6">

          {/* =================================================
              HEADER
          ================================================= */}

          <section className="rounded-2xl border border-zinc-900 bg-neutral-900/40 p-5 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">

            <div className="flex items-center gap-3">

              <div className="p-3 rounded-xl bg-cyan-500/15 border border-cyan-500/20 text-cyan-400">
                <Award className="w-7 h-7" />
              </div>

              <div>

                <div className="flex items-center gap-2">

                  <h1 className="text-lg font-black uppercase">
                    Collection PSA
                  </h1>

                  <span className="px-2 py-0.5 rounded bg-cyan-500/15 border border-cyan-500/20 text-cyan-400 text-[9px] font-black uppercase">
                    Pokémon TCG
                  </span>

                </div>

                <p className="text-xs text-zinc-400 mt-1">
                  Gestion de vos cartes gradées,
                  valeurs marché et estimation IA.
                </p>

              </div>

            </div>

            <button
              type="button"
              onClick={openAddModal}
              className="w-full md:w-auto bg-cyan-500 hover:bg-cyan-400 text-black font-black text-xs uppercase px-5 py-3 rounded-xl transition flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Ajouter une dalle PSA
            </button>

          </section>

          {/* =================================================
              NAVIGATION
          ================================================= */}

          <div className="flex gap-2 bg-neutral-900/60 p-1.5 rounded-2xl border border-zinc-900">

            {[
              {
                id: "collection" as const,
                label: "Ma Collection",
              },
              {
                id: "search" as const,
                label: "Recherche Prix",
              },
              {
                id: "estimation" as const,
                label: "IA Grade",
              },
            ].map((tab) => (

              <button
                key={tab.id}
                type="button"
                onClick={() =>
                  setActiveTab(tab.id)
                }
                className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase transition ${
                  activeTab === tab.id
                    ? "bg-cyan-500 text-black"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                {tab.label}
              </button>

            ))}

          </div>

          {/* =================================================
              COLLECTION
          ================================================= */}

          {activeTab === "collection" && (
            <section className="space-y-6">

              {/* STATISTIQUES */}

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">

                <StatCard
                  title="Valeur totale"
                  value={`${stats.totalValue.toLocaleString()} €`}
                />

                <StatCard
                  title="Cartes PSA"
                  value={stats.totalCount}
                />

                <StatCard
                  title="PSA 10"
                  value={stats.gemMintCount}
                />

                <StatCard
                  title="Plus-value"
                  value={`${stats.netProfit >= 0 ? "+" : ""}${stats.netProfit} €`}
                />

              </div>

              {/* RECHERCHE COLLECTION */}

              <div className="flex flex-col md:flex-row gap-3">

                <div className="flex-1">

                  <input
                    type="text"
                    placeholder="Rechercher une carte ou un certificat PSA..."
                    value={collectionSearch}
                    onChange={(event) =>
                      setCollectionSearch(
                        event.target.value
                      )
                    }
                    className="w-full bg-neutral-900 border border-zinc-800 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-cyan-500"
                  />

                </div>

                <select
                  value={filterGrade}
                  onChange={(event) =>
                    setFilterGrade(
                      event.target.value === "all"
                        ? "all"
                        : (Number(
                            event.target.value
                          ) as PSAGrade)
                    )
                  }
                  className="bg-neutral-900 border border-zinc-800 rounded-xl px-4 py-3 text-xs"
                >

                  <option value="all">
                    Tous les grades
                  </option>

                  {[10, 9, 8, 7, 6, 5].map(
                    (grade) => (
                      <option
                        key={grade}
                        value={grade}
                      >
                        PSA {grade}
                      </option>
                    )
                  )}

                </select>

              </div>

              {/* LISTE */}

              {filteredCollection.length === 0 ? (

                <div className="text-center py-16 rounded-2xl border border-zinc-900 bg-neutral-900/20">

                  <ShieldCheck className="mx-auto w-10 h-10 text-zinc-600" />

                  <p className="mt-3 text-xs text-zinc-400 uppercase font-bold">
                    Aucune carte PSA enregistrée
                  </p>

                </div>

              ) : (

                <div className="grid md:grid-cols-2 gap-4">

                  {filteredCollection.map(
                    (card) => (

                      <div
                        key={card.id}
                        className="bg-neutral-900/60 border border-zinc-800 rounded-2xl p-4 flex gap-4 items-center"
                      >

                        {card.imageUrl ? (
                          <img
                            src={card.imageUrl}
                            alt={card.cardName}
                            className="w-16 h-24 object-cover rounded-lg"
                          />
                        ) : (
                          <div className="w-16 h-24 rounded-lg bg-neutral-800 flex items-center justify-center">
                            <Award className="w-6 h-6 text-zinc-600" />
                          </div>
                        )}

                        <div className="flex-1">

                          <span className="text-[10px] bg-red-600 px-2 py-1 rounded font-black">
                            PSA {card.grade}
                          </span>

                          <h3 className="text-xs font-black mt-2">
                            {card.cardName}
                          </h3>

                          <p className="text-[10px] text-zinc-400">
                            {card.setName}
                          </p>

                          <p className="text-cyan-400 text-xs font-bold">
                            {card.estimatedValue} €
                          </p>

                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            handleDelete(card.id)
                          }
                          className="text-zinc-500 hover:text-red-400"
                          aria-label="Supprimer la carte PSA"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>

                      </div>

                    )
                  )}

                </div>

              )}

            </section>
          )}

          {/* =================================================
              PRICECHARTING
          ================================================= */}

          {activeTab === "search" && (
            <section className="space-y-6">

              <div className="bg-neutral-900/40 border border-zinc-900 rounded-2xl p-6 space-y-4">

                <div>

                  <h2 className="text-sm font-black uppercase">
                    Recherche Prix Pokémon TCG
                  </h2>

                  <p className="text-xs text-zinc-400 mt-1">
                    Consultez la valeur estimée des cartes
                    selon leur état et leur grade PSA.
                  </p>

                </div>

                <form
                  onSubmit={
                    handlePriceChartingSearch
                  }
                  className="flex gap-2"
                >

                  <div className="flex-1">

                    <input
                      type="text"
                      placeholder="Exemple : Dracaufeu, Pikachu, Umbreon..."
                      value={priceChartingQuery}
                      onChange={(event) =>
                        setPriceChartingQuery(
                          event.target.value
                        )
                      }
                      className="w-full bg-neutral-950 border border-zinc-800 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-cyan-500"
                    />

                  </div>

                  <button
                    type="submit"
                    className="bg-cyan-500 hover:bg-cyan-400 text-black px-5 rounded-xl text-xs font-black uppercase"
                  >
                    Rechercher
                  </button>

                </form>

              </div>

              <div className="space-y-4">

                {priceChartingResults.map(
                  (card) => (

                    <div
                      key={card.id}
                      className="bg-neutral-900/60 border border-zinc-800 rounded-2xl p-4 space-y-4"
                    >

                      <div className="flex gap-4">

                        {card.imageUrl ? (
                          <img
                            src={card.imageUrl}
                            alt={card.cardName}
                            className="w-20 h-28 object-cover rounded-xl border border-zinc-800"
                          />
                        ) : (
                          <div className="w-20 h-28 rounded-xl bg-neutral-800 flex items-center justify-center">
                            <Award className="w-7 h-7 text-zinc-600" />
                          </div>
                        )}

                        <div>

                          <h3 className="text-sm font-black">
                            {card.cardName}
                          </h3>

                          <p className="text-xs text-zinc-400">
                            {card.setName}
                          </p>

                          <p className="text-xs text-zinc-500">
                            Carte : {card.cardNumber}
                          </p>

                          <p className="mt-2 text-xs text-cyan-400 font-bold">
                            Non gradée :{" "}
                            {card.prices.ungraded} €
                          </p>

                        </div>

                      </div>

                      {/* PRIX PAR GRADE */}

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">

                        {[
                          {
                            grade: 7,
                            price:
                              card.prices.psa7,
                          },
                          {
                            grade: 8,
                            price:
                              card.prices.psa8,
                          },
                          {
                            grade: 9,
                            price:
                              card.prices.psa9,
                          },
                          {
                            grade: 10,
                            price:
                              card.prices.psa10,
                          },
                        ].map((item) => (

                          <button
                            key={item.grade}
                            type="button"
                            onClick={() =>
                              handleSelectPriceChartingCard(
                                card,
                                item.grade as PSAGrade
                              )
                            }
                            className="bg-neutral-950 border border-zinc-800 hover:border-cyan-500 rounded-xl p-3 transition"
                          >

                            <span className="block text-[10px] text-zinc-500 uppercase font-black">
                              PSA {item.grade}
                            </span>

                            <span className="text-sm font-black">
                              {item.price} €
                            </span>

                            <span className="block text-[9px] text-cyan-400 mt-1 uppercase">
                              Ajouter
                            </span>

                          </button>

                        ))}

                      </div>

                    </div>

                  )
                )}

              </div>

            </section>
          )}

          {/* =================================================
              ESTIMATION IA
          ================================================= */}

          {activeTab === "estimation" && (
            <section className="space-y-6">

              <div className="rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-cyan-950/30 to-neutral-900 p-8 text-center space-y-5">

                <Sparkles className="mx-auto w-10 h-10 text-amber-400" />

                <div>

                  <h2 className="text-base font-black uppercase">
                    Estimation IA Grade PSA
                  </h2>

                  <p className="text-xs text-zinc-300 mt-2 max-w-lg mx-auto">
                    Envoyez des photos haute qualité de
                    votre carte Pokémon. L'intelligence
                    artificielle analysera les critères
                    utilisés par les graders.
                  </p>

                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">

                  {[
                    {
                      title: "Centering",
                      desc: "Alignement du visuel",
                    },
                    {
                      title: "Corners",
                      desc: "État des coins",
                    },
                    {
                      title: "Edges",
                      desc: "Bords et usure",
                    },
                    {
                      title: "Surface",
                      desc: "Rayures et défauts",
                    },
                  ].map((item) => (

                    <div
                      key={item.title}
                      className="bg-black/40 border border-zinc-800 rounded-xl p-3"
                    >

                      <span className="block text-[10px] text-cyan-400 font-black uppercase">
                        {item.title}
                      </span>

                      <span className="text-[10px] text-zinc-500">
                        {item.desc}
                      </span>

                    </div>

                  ))}

                </div>

                <button
                  type="button"
                  disabled
                  className="bg-zinc-800 text-zinc-500 px-8 py-3 rounded-xl text-xs font-black uppercase cursor-not-allowed"
                >
                  Analyse IA bientôt disponible
                </button>

              </div>

            </section>
          )}

        </div>
      </main>

      {/* =================================================
          MODAL AJOUT CARTE PSA
      ================================================= */}

      {isAddModalOpen && (

        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="psa-modal-title"
        >

          <div className="bg-neutral-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md space-y-5">

            <h3
              id="psa-modal-title"
              className="text-sm font-black uppercase"
            >
              Ajouter une carte PSA
            </h3>

            <form
              onSubmit={handleAddSubmit}
              className="space-y-4"
            >

              <input
                required
                placeholder="Numéro certificat PSA"
                value={newCert}
                onChange={(event) =>
                  setNewCert(event.target.value)
                }
                className="w-full bg-neutral-950 border border-zinc-800 rounded-xl px-4 py-3 text-xs"
              />

              <input
                required
                placeholder="Nom de la carte"
                value={newName}
                onChange={(event) =>
                  setNewName(event.target.value)
                }
                className="w-full bg-neutral-950 border border-zinc-800 rounded-xl px-4 py-3 text-xs"
              />

              <input
                placeholder="Extension"
                value={newSet}
                onChange={(event) =>
                  setNewSet(event.target.value)
                }
                className="w-full bg-neutral-950 border border-zinc-800 rounded-xl px-4 py-3 text-xs"
              />

              <input
                placeholder="Numéro de carte"
                value={newNumber}
                onChange={(event) =>
                  setNewNumber(event.target.value)
                }
                className="w-full bg-neutral-950 border border-zinc-800 rounded-xl px-4 py-3 text-xs"
              />

              <div className="grid grid-cols-2 gap-3">

                <select
                  value={newGrade}
                  onChange={(event) =>
                    setNewGrade(
                      Number(
                        event.target.value
                      ) as PSAGrade
                    )
                  }
                  className="bg-neutral-950 border border-zinc-800 rounded-xl px-3 py-3 text-xs"
                >

                  {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map(
                    (grade) => (

                      <option
                        key={grade}
                        value={grade}
                      >
                        PSA {grade}
                      </option>

                    )
                  )}

                </select>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={newPrice}
                  onChange={(event) =>
                    setNewPrice(
                      Number(event.target.value)
                    )
                  }
                  placeholder="Valeur €"
                  className="bg-neutral-950 border border-zinc-800 rounded-xl px-3 py-3 text-xs"
                />

              </div>

              <div className="flex justify-end gap-2 pt-3">

                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    resetForm();
                  }}
                  className="px-4 py-2 text-xs text-zinc-400"
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  className="bg-cyan-500 text-black px-5 py-2 rounded-xl text-xs font-black uppercase"
                >
                  Enregistrer
                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </>
  );
}

// =====================================================
// STAT CARD
// =====================================================

function StatCard({
  title,
  value,
}: {
  title: string;
  value: string | number;
}) {
  return (
    <div className="bg-neutral-900/40 border border-zinc-900 rounded-xl p-4">

      <span className="text-[10px] uppercase font-black text-zinc-500">
        {title}
      </span>

      <p className="text-xl font-black text-cyan-400 mt-1">
        {value}
      </p>

    </div>
  );
}
