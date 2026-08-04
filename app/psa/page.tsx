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
  PriceChartingCard,
} from "@/lib/psa/psaService";

import { PSACard, PSAGrade, PSAPrices } from "@/lib/psa/types";

export default function PSAPage() {
  const [activeTab, setActiveTab] = useState<
    "collection" | "search" | "estimation"
  >("collection");

  /**
   * Collection personnelle PSA
   */
  const [collection, setCollection] = useState<PSACard[]>([]);

  /**
   * Recherche collection
   */
  const [collectionSearch, setCollectionSearch] = useState("");
  const [filterGrade, setFilterGrade] = useState<"all" | PSAGrade>("all");

  /**
   * Recherche PriceCharting
   */
  const [priceChartingQuery, setPriceChartingQuery] = useState("");
  const [priceChartingResults, setPriceChartingResults] = useState<PriceChartingCard[]>(
    MOCK_PRICECHARTING_DATABASE
  );

  /**
   * Modal ajout carte PSA
   */
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newCert, setNewCert] = useState("");
  const [newName, setNewName] = useState("");
  const [newSet, setNewSet] = useState("");
  const [newNumber, setNewNumber] = useState("");
  const [newGrade, setNewGrade] = useState<PSAGrade>(10);
  const [newPrice, setNewPrice] = useState(0);
  const [newImage, setNewImage] = useState("");
  const [selectedMarketPrices, setSelectedMarketPrices] =
  useState<PSAPrices | undefined>(undefined);

  /**
   * Chargement collection locale
   */
  useEffect(() => {
    setCollection(psaService.getCollection());
  }, []);

  /**
   * Statistiques collection
   */
  const stats = useMemo(
    () => psaService.calculateStats(collection),
    [collection]
  );

  /**
   * Recherche carte PriceCharting
   */
  const handlePriceChartingSearch = (event: React.FormEvent) => {
    event.preventDefault();
    setPriceChartingResults(
      psaService.searchPriceCharting(priceChartingQuery)
    );
  };

  /**
   * Sélection d'une carte du catalogue
   */
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

    const prices = card.prices;
    const gradePrices: Record<PSAGrade, number> = {
      1: prices.ungraded,
      2: prices.ungraded,
      3: prices.ungraded,
      4: prices.ungraded,
      5: prices.ungraded,
      6: prices.ungraded,
      7: prices.psa7,
      8: prices.psa8,
      9: prices.psa9,
      10: prices.psa10,
    };

    setNewPrice(gradePrices[grade]);
    setIsAddModalOpen(true);
  };

  /**
   * Ajout carte collection
   */
  const handleAddSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (!newCert.trim() || !newName.trim()) {
      return;
    }

    try {
      psaService.addCard({
        psaCertNumber: newCert.trim(),
        cardName: newName.trim(),
        setName: newSet,
        cardNumber: newNumber,
        grade: newGrade,
        imageUrl: newImage,
        estimatedValue: Number(newPrice),
        salesHistory: [],
        marketPrices: selectedMarketPrices,
      });

      setCollection(psaService.getCollection());
      setIsAddModalOpen(false);
      setNewCert("");
      setNewName("");
    } catch (error) {
      console.error("Erreur ajout carte PSA", error);
    }
  };

  /**
   * Suppression carte
   */
  const handleDelete = (id: string) => {
    if (!confirm("Supprimer cette carte PSA de votre collection ?")) {
      return;
    }

    psaService.removeCard(id);
    setCollection(psaService.getCollection());
  };

  /**
   * Filtrage collection
   */
  const filteredCollection = useMemo(() => {
    let cards = psaService.searchCollection(collection, collectionSearch);

    if (filterGrade !== "all") {
      cards = cards.filter((card) => card.grade === filterGrade);
    }

    return cards;
  }, [collection, collectionSearch, filterGrade]);

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-neutral-950 text-white pb-32">
        <div className="mx-auto max-w-5xl px-4 py-6 space-y-6">

          {/* HEADER MODULE PSA */}
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
                  Gestion de vos cartes gradées, valeurs marché et estimation IA.
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                setNewCert("");
                setNewName("");
                setNewSet("");
                setNewNumber("");
                setNewPrice(0);
                setIsAddModalOpen(true);
              }}
              className="w-full md:w-auto bg-cyan-500 hover:bg-cyan-400 text-black font-black text-xs uppercase px-5 py-3 rounded-xl transition flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Ajouter une dalle PSA
            </button>
          </section>

          {/* NAVIGATION */}
          <div className="flex gap-2 bg-neutral-900/60 p-1.5 rounded-2xl border border-zinc-900">
            {[
              { id: "collection", label: "Ma Collection" },
              { id: "search", label: "Recherche Prix" },
              { id: "estimation", label: "IA Grade" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() =>
                  setActiveTab(
                    tab.id as "collection" | "search" | "estimation"
                  )
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

          {/* ONGLET COLLECTION */}
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
                    onChange={(e) => setCollectionSearch(e.target.value)}
                    className="w-full bg-neutral-900 border border-zinc-800 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <select
                  value={filterGrade}
                  onChange={(e) =>
                    setFilterGrade(
                      e.target.value === "all"
                        ? "all"
                        : (Number(e.target.value) as PSAGrade)
                    )
                  }
                  className="bg-neutral-900 border border-zinc-800 rounded-xl px-4 py-3 text-xs"
                >
                  <option value="all">Tous les grades</option>
                  {[10, 9, 8, 7, 6, 5].map((grade) => (
                    <option key={grade} value={grade}>
                      PSA {grade}
                    </option>
                  ))}
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
                  {filteredCollection.map((card) => (
                    <div
                      key={card.id}
                      className="bg-neutral-900/60 border border-zinc-800 rounded-2xl p-4 flex gap-4 items-center"
                    >
                      <img
                        src={card.imageUrl}
                        alt={card.cardName}
                        className="w-16 h-24 object-cover rounded-lg"
                      />
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
                        onClick={() => handleDelete(card.id)}
                        className="text-zinc-500 hover:text-red-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* ONGLET RECHERCHE PRICECHARTING */}
          {activeTab === "search" && (
            <section className="space-y-6">
              <div className="bg-neutral-900/40 border border-zinc-900 rounded-2xl p-6 space-y-4">
                <div>
                  <h2 className="text-sm font-black uppercase">
                    Recherche Prix Pokémon TCG
                  </h2>
                  <p className="text-xs text-zinc-400 mt-1">
                    Consultez la valeur estimée des cartes selon leur état et leur grade PSA.
                  </p>
                </div>

                <form onSubmit={handlePriceChartingSearch} className="flex gap-2">
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder="Exemple : Dracaufeu, Pikachu, Umbreon..."
                      value={priceChartingQuery}
                      onChange={(e) => setPriceChartingQuery(e.target.value)}
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
                {priceChartingResults.map((card) => (
                  <div
                    key={card.id}
                    className="bg-neutral-900/60 border border-zinc-800 rounded-2xl p-4 space-y-4"
                  >
                    <div className="flex gap-4">
                      <img
                        src={card.imageUrl}
                        alt={card.cardName}
                        className="w-20 h-28 object-cover rounded-xl border border-zinc-800"
                      />
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
                          Non gradée : {card.prices.ungraded} €
                        </p>
                      </div>
                    </div>

                    {/* PRIX PAR GRADE PSA */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {[
                        { grade: 7, price: card.prices.psa7 },
                        { grade: 8, price: card.prices.psa8 },
                        { grade: 9, price: card.prices.psa9 },
                        { grade: 10, price: card.prices.psa10 },
                      ].map((item) => (
                        <button
                          key={item.grade}
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
                ))}
              </div>
            </section>
          )}

          {/* ONGLET IA ESTIMATION PSA */}
          {activeTab === "estimation" && (
            <section className="space-y-6">
              <div className="rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-cyan-950/30 to-neutral-900 p-8 text-center space-y-5">
                <Sparkles className="mx-auto w-10 h-10 text-amber-400" />
                <div>
                  <h2 className="text-base font-black uppercase">
                    Estimation IA Grade PSA
                  </h2>
                  <p className="text-xs text-zinc-300 mt-2 max-w-lg mx-auto">
                    Envoyez des photos haute qualité de votre carte Pokémon. L'intelligence artificielle analysera les critères utilisés par les graders.
                  </p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { title: "Centering", desc: "Alignement du visuel" },
                    { title: "Corners", desc: "État des coins" },
                    { title: "Edges", desc: "Bords et usure" },
                    { title: "Surface", desc: "Rayures et défauts" },
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

      {/* MODAL AJOUT CARTE PSA */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md space-y-5">
            <h3 className="text-sm font-black uppercase">
              Ajouter une carte PSA
            </h3>

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <input
                required
                placeholder="Numéro certificat PSA"
                value={newCert}
                onChange={(e) => setNewCert(e.target.value)}
                className="w-full bg-neutral-950 border border-zinc-800 rounded-xl px-4 py-3 text-xs"
              />

              <input
                required
                placeholder="Nom de la carte"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full bg-neutral-950 border border-zinc-800 rounded-xl px-4 py-3 text-xs"
              />

              <div className="grid grid-cols-2 gap-3">
                <select
                  value={newGrade}
                  onChange={(e) =>
                    setNewGrade(Number(e.target.value) as PSAGrade)
                  }
                  className="bg-neutral-950 border border-zinc-800 rounded-xl px-3 py-3 text-xs"
                >
                  {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((grade) => (
                    <option key={grade} value={grade}>
                      PSA {grade}
                    </option>
                  ))}
                </select>

                <input
                  type="number"
                  value={newPrice}
                  onChange={(e) => setNewPrice(Number(e.target.value))}
                  placeholder="Valeur €"
                  className="bg-neutral-950 border border-zinc-800 rounded-xl px-3 py-3 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
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

/**
 * Carte statistique réutilisable
 */
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