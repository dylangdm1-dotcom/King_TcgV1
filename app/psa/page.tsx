// app/psa/page.tsx

"use client";

import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import {
  Award,
  Plus,
  ShieldCheck,
  Sparkles,
  Trash2,
  ExternalLink,
  ShoppingBag,
  Search,
  ReceiptText,
  TrendingUp,
  BadgeEuro,
  Gem,
} from "lucide-react";

import Navbar from "@/components/Navbar";
import PSAGradeCapture from "@/components/psa/PSAGradeCapture";

import {
  psaService,
  PriceChartingCard,
} from "@/lib/psa/psaService";

import {
  PSACard,
  PSAGrade,
  PSAPrices,
} from "@/lib/psa/types";

function formatEUR(value: number): string {
  if (!Number.isFinite(value) || value <= 0) {
    return "Pas de données";
  }

  return `${value.toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} €`;
}

function formatSignedEUR(value: number): string {
  if (!Number.isFinite(value)) return "—";
  const formatted = Math.abs(value).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${value >= 0 ? "+" : "−"}${formatted} €`;
}

function formatSaleDate(date: string): string {
  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  return parsed.toLocaleDateString("fr-FR");
}

export default function PSAPage() {
  const [activeTab, setActiveTab] = useState<
    "collection" | "search" | "estimation"
  >("collection");

  const [collection, setCollection] = useState<PSACard[]>([]);

  const [collectionSearch, setCollectionSearch] = useState("");

  const [filterGrade, setFilterGrade] =
    useState<"all" | PSAGrade>("all");

  const [priceChartingQuery, setPriceChartingQuery] =
    useState("");

  const [priceChartingResults, setPriceChartingResults] =
    useState<PriceChartingCard[]>([]);

  const [priceChartingLoading, setPriceChartingLoading] =
    useState(false);

  const [priceChartingError, setPriceChartingError] =
    useState("");

  const [isAddModalOpen, setIsAddModalOpen] =
    useState(false);

  const [newCert, setNewCert] = useState("");

  const [newName, setNewName] = useState("");

  const [newSet, setNewSet] = useState("");

  const [newNumber, setNewNumber] = useState("");

  const [newGrade, setNewGrade] = useState<PSAGrade>(10);

  const [newPrice, setNewPrice] = useState(0);
  const [newPurchasePrice, setNewPurchasePrice] = useState(0);

  const [newImage, setNewImage] = useState("");

  const [selectedMarketPrices, setSelectedMarketPrices] =
    useState<PSAPrices | undefined>(undefined);

  useEffect(() => {
    setCollection(psaService.getCollection());
  }, []);

  const stats = useMemo(
    () => psaService.calculateStats(collection),
    [collection]
  );

  const handlePriceChartingSearch = async (
    event: FormEvent
  ) => {
    event.preventDefault();

    const query = priceChartingQuery.trim();

    if (!query) return;

    setPriceChartingLoading(true);
    setPriceChartingError("");
    setPriceChartingResults([]);

    try {
      const results =
        await psaService.searchPriceCharting(query);

      setPriceChartingResults(results);

      if (results.length === 0) {
        setPriceChartingError(
          "Aucune carte PriceCharting trouvée."
        );
      }
    } catch (error) {
      console.error(
        "Erreur recherche PriceCharting",
        error
      );

      setPriceChartingResults([]);

      setPriceChartingError(
        error instanceof Error
          ? error.message
          : "Impossible de récupérer les données PriceCharting."
      );
    } finally {
      setPriceChartingLoading(false);
    }
  };

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
      1: card.prices.psa1,
      2: card.prices.psa2,
      3: card.prices.psa3,
      4: card.prices.psa4,
      5: card.prices.psa5,
      6: card.prices.psa6,
      7: card.prices.psa7,
      8: card.prices.psa8,
      9: card.prices.psa9,
      10: card.prices.psa10,
    };

    setNewPrice(prices[grade]);
    setNewPurchasePrice(0);

    setIsAddModalOpen(true);
  };

  const handleAddSubmit = (
    event: FormEvent
  ) => {
    event.preventDefault();

    if (!newCert.trim() || !newName.trim()) {
      return;
    }

    try {
      psaService.addCard({
        psaCertNumber: newCert.trim(),
        cardName: newName.trim(),
        setName: newSet.trim(),
        cardNumber: newNumber.trim(),
        grade: newGrade,
        imageUrl: newImage,
        estimatedValue: Number(newPrice) || 0,
        purchasePrice: Number(newPurchasePrice) || 0,
        salesHistory: [],
        marketPrices: selectedMarketPrices,
        currency: "EUR",
      });

      setCollection(psaService.getCollection());

      setIsAddModalOpen(false);

      setNewCert("");
      setNewName("");
      setNewSet("");
      setNewNumber("");
      setNewPrice(0);
      setNewPurchasePrice(0);
      setNewImage("");
      setSelectedMarketPrices(undefined);
    } catch (error) {
      console.error(
        "Erreur ajout carte PSA",
        error
      );

      alert(
        error instanceof Error
          ? error.message
          : "Impossible d'ajouter cette carte."
      );
    }
  };

  const handleDelete = (id: string) => {
    if (
      !confirm(
        "Supprimer cette carte PSA de votre collection ?"
      )
    ) {
      return;
    }

    psaService.removeCard(id);

    setCollection(psaService.getCollection());
  };

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

  return (
    <>
      <Navbar />

      <main className="kt-premium-shell min-h-screen text-white pb-32">
        <div className="kt-page-wrap space-y-5">

          {/* HEADER */}
          <section className="kt-page-header kt-hero-surface relative overflow-hidden border">
            <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-cyan-400/[0.055] blur-3xl" />
            <div className="pointer-events-none absolute bottom-0 left-1/3 h-px w-36 bg-cyan-300/55 shadow-[0_0_12px_rgba(34,211,238,.7)]" />
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <div className="kt-logo-tile flex h-14 w-20 shrink-0 items-center justify-center rounded-[17px] bg-[#f4f6f8] p-2">
                  <img src="/brands/psa.png" alt="PSA" className="h-full w-full object-contain" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <h1 className="kt-page-title">Espace PSA</h1>
                    <span className="self-center whitespace-nowrap rounded-full border border-cyan-400/20 bg-cyan-400/[0.06] px-2 py-1 text-[9px] font-black uppercase tracking-[0.11em] text-cyan-300">Pokémon TCG</span>
                  </div>
                  <p className="kt-page-subtitle mt-1">
                    Suivez certificats, prix d&apos;achat, valeur estimée et plus-value de vos cartes gradées.
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setNewCert("");
                  setNewName("");
                  setNewSet("");
                  setNewNumber("");
                  setNewGrade(10);
                  setNewPrice(0);
                  setNewPurchasePrice(0);
                  setNewImage("");
                  setSelectedMarketPrices(undefined);
                  setIsAddModalOpen(true);
                }}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-300/40 bg-cyan-300/[0.06] px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.11em] text-cyan-200 shadow-[inset_0_1px_0_rgba(255,255,255,.05)] transition hover:border-cyan-200/65 hover:bg-cyan-300/[0.10] md:w-auto"
              >
                <Plus className="h-4 w-4" />
                Ajouter une dalle
              </button>
            </div>
          </section>

          <section className="kt-psa-feature-strip overflow-hidden rounded-[18px] border border-cyan-300/18 bg-[#0d1620] p-3 sm:p-4">
            <div className="grid md:grid-cols-3">
              <div className="kt-psa-feature-segment p-3 text-center">
                <div className="flex items-center justify-center gap-2">
                  <Award className="h-4 w-4 text-cyan-300" />
                  <p className="text-[11px] font-black uppercase tracking-[0.12em] text-cyan-300">
                    Collection gradée
                  </p>
                </div>
                <p className="mt-1.5 text-[11px] leading-5 text-zinc-100">
                  Retrouvez et gérez facilement toutes vos cartes gradées PSA.
                </p>
              </div>

              <div className="kt-psa-feature-segment p-3 text-center">
                <div className="flex items-center justify-center gap-2">
                  <div className="kt-logo-tile flex h-7 w-12 shrink-0 items-center justify-center rounded-lg bg-[#f4f6f8] px-1 py-0.5">
                    <img
                      src="/marketplaces/pricecharting.png"
                      alt="PriceCharting"
                      className="h-full w-full object-contain"
                    />
                  </div>
                  <p className="text-[11px] font-black uppercase tracking-[0.12em] text-cyan-300">
                    Prix PriceCharting
                  </p>
                </div>
                <p className="mt-1.5 text-[11px] leading-5 text-zinc-100">
                  Consultez les prix PriceCharting disponibles pour chaque grade PSA.
                </p>
              </div>

              <div className="kt-psa-feature-segment p-3 text-center">
                <div className="flex items-center justify-center gap-2">
                  <div className="kt-logo-tile flex h-7 w-11 shrink-0 items-center justify-center rounded-lg bg-[#f4f6f8] px-1 py-0.5">
                    <img
                      src="/brands/psa.png"
                      alt="PSA"
                      className="h-full w-full object-contain"
                    />
                  </div>
                  <p className="text-[11px] font-black uppercase tracking-[0.12em] text-cyan-300">
                    Estimation IA Grade
                  </p>
                </div>
                <p className="mt-1.5 text-[11px] leading-5 text-zinc-100">
                  Estimez le grade PSA de votre carte grâce à l’analyse IA de vos 4 photos.
                </p>
              </div>
            </div>
          </section>

          {/* NAVIGATION */}
          <div className="grid grid-cols-3 gap-1.5 rounded-[18px] border border-cyan-400/12 bg-[#0a1118] p-1.5 shadow-[0_14px_34px_rgba(0,0,0,.18)]">
            {[
              {
                id: "collection",
                label: "Ma Collection",
              },
              {
                id: "search",
                label: "Recherche Prix",
              },
              {
                id: "estimation",
                label: "IA Grade",
              },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() =>
                  setActiveTab(
                    tab.id as
                      | "collection"
                      | "search"
                      | "estimation"
                  )
                }
                className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase transition ${
                  activeTab === tab.id
                    ? "border border-cyan-300/40 bg-cyan-400/[0.11] text-cyan-200 shadow-[0_0_20px_rgba(34,211,238,.06)]"
                    : "border border-transparent text-zinc-300 hover:bg-white/[0.03] hover:text-white"
                }`}
              >
                <span className="flex items-center justify-center gap-1.5">
                  {tab.id === "estimation" ? (
                    <img src="/brands/psa.png" alt="" aria-hidden="true" className="h-4 w-8 rounded-sm bg-white object-contain px-0.5" />
                  ) : null}
                  {tab.label}
                </span>
              </button>
            ))}
          </div>

          {/* COLLECTION */}
          {activeTab === "collection" && (
            <section className="space-y-6">

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard title="Valeur totale" value={formatEUR(stats.totalValue)} icon={<BadgeEuro className="h-4 w-4" />} tone="cyan" />
                <StatCard title="Cartes PSA" value={stats.totalCount} icon={<Award className="h-4 w-4" />} tone="violet" />
                <StatCard title="PSA 10" value={stats.gemMintCount} icon={<Gem className="h-4 w-4" />} tone="amber" />
                <StatCard title="Plus-value" value={formatSignedEUR(stats.netProfit)} icon={<TrendingUp className="h-4 w-4" />} tone={stats.netProfit >= 0 ? "green" : "red"} />
              </div>

              <div className="flex flex-col md:flex-row gap-3">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Rechercher une carte ou un certificat PSA..."
                    value={collectionSearch}
                    onChange={(e) =>
                      setCollectionSearch(e.target.value)
                    }
                    className="w-full rounded-[15px] border border-cyan-400/15 bg-[#0a1118] px-4 py-3 text-xs text-white outline-none transition placeholder:text-zinc-500 focus:border-cyan-300/45"
                  />
                </div>

                <select
                  value={filterGrade}
                  onChange={(e) =>
                    setFilterGrade(
                      e.target.value === "all"
                        ? "all"
                        : (Number(
                            e.target.value
                          ) as PSAGrade)
                    )
                  }
                  className="rounded-[15px] border border-cyan-400/15 bg-[#0a1118] px-4 py-3 text-xs text-white outline-none transition focus:border-cyan-300/45"
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

              {filteredCollection.length === 0 ? (
                <div className="kt-premium-panel rounded-[18px] border-dashed py-14 px-5 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-300/18 bg-cyan-400/[0.045]">
                    <ShieldCheck className="w-6 h-6 text-zinc-200" />
                  </div>

                  <p className="mt-4 text-xs text-zinc-300 uppercase font-black">
                    Aucune carte PSA enregistrée
                  </p>
                  <p className="mx-auto mt-2 max-w-sm text-[11px] leading-relaxed text-zinc-200">
                    Recherchez une carte gradée, choisissez son grade puis ajoutez-la à votre collection pour suivre sa valeur.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {filteredCollection.map((card) => (
                    <article
                      key={card.id}
                      className="group relative min-w-0 overflow-hidden rounded-[18px] border border-cyan-400/14 bg-[#0a1118] p-3 shadow-[0_16px_38px_rgba(0,0,0,.22)] transition duration-200 hover:-translate-y-0.5 hover:border-cyan-300/30 hover:shadow-[0_20px_44px_rgba(0,0,0,.28)]"
                    >
                      <div className="flex min-w-0 items-start gap-3 sm:gap-4">
                        <div className="shrink-0">
                          {card.imageUrl ? (
                            <img
                              src={card.imageUrl}
                              alt={card.cardName}
                              className="kt-card-frame h-28 w-20 rounded-[16px] bg-[#0c151e] object-contain shadow-[0_14px_34px_rgba(0,0,0,0.35)] sm:h-32 sm:w-24"
                              onError={(event) => {
                                event.currentTarget.style.display = "none";
                              }}
                            />
                          ) : (
                            <div className="kt-card-frame flex h-28 w-20 items-center justify-center rounded-[16px] bg-[#0c151e] sm:h-32 sm:w-24">
                              <Award className="w-6 h-6 text-zinc-700" />
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <span className="rounded-full border border-cyan-300/20 bg-cyan-400/[0.10] px-2.5 py-1 text-[10px] font-black text-cyan-200 shadow-[0_0_20px_rgba(34,211,238,0.08)]">
                              PSA {card.grade}
                            </span>

                            <button
                              type="button"
                              onClick={() => handleDelete(card.id)}
                              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-rose-400/20 bg-rose-400/[0.05] text-rose-300 transition hover:border-rose-300/40 hover:bg-rose-400/10 active:scale-95"
                              aria-label={`Supprimer ${card.cardName} de la collection PSA`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          <h3 className="mt-2 break-words text-sm font-black leading-snug text-white">
                            {card.cardName}
                          </h3>

                          <div className="mt-1 space-y-0.5 text-[10px] leading-relaxed text-zinc-100">
                            <p className="break-words">{card.setName || "Extension non renseignée"}</p>
                            {card.cardNumber && (
                              <p className="break-all text-zinc-200">N° {card.cardNumber}</p>
                            )}
                            <p className="break-all text-zinc-200">Certificat : {card.psaCertNumber}</p>
                          </div>

                          <div className="mt-3 grid grid-cols-3 gap-1.5">
                            <ValueChip icon={<ReceiptText className="h-3.5 w-3.5" />} label="Achat" value={formatEUR(card.purchasePrice || 0)} tone="amber" />
                            <ValueChip icon={<BadgeEuro className="h-3.5 w-3.5" />} label="Estimation" value={formatEUR(card.estimatedValue)} tone="cyan" />
                            <ValueChip
                              icon={<TrendingUp className="h-3.5 w-3.5" />}
                              label="Plus-value"
                              value={formatSignedEUR(card.estimatedValue - (card.purchasePrice || 0))}
                              tone={(card.estimatedValue - (card.purchasePrice || 0)) >= 0 ? "green" : "red"}
                            />
                          </div>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* PRICECHARTING SEARCH */}
          {activeTab === "search" && (
            <section className="space-y-6">

              <div className="space-y-4 rounded-[18px] border border-cyan-400/13 bg-[#0a1118] p-4 shadow-[0_16px_38px_rgba(0,0,0,.20)] sm:p-5">
                <div>
                  <h2 className="text-sm font-black uppercase">
                    Recherche Prix Pokémon TCG
                  </h2>

                  <p className="text-xs text-zinc-100 mt-1">
                    Recherche des cartes, valeurs marché
                    et dernières ventes PriceCharting.
                  </p>

                  <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-400/15 bg-amber-400/[0.05] px-3 py-2.5">
                    <span className="mt-0.5 text-sm" aria-hidden="true">🌐</span>
                    <p className="text-[11px] leading-relaxed text-amber-200/80">
                      <span className="font-black text-amber-200">Recherche en anglais pour le moment :</span>{" "}
                      utilisez le nom anglais du Pokémon (ex. <span className="font-bold text-white">Charizard</span>, <span className="font-bold text-white">Pikachu</span> ou <span className="font-bold text-white">Umbreon</span>).
                    </p>
                  </div>
                </div>

                <form
                  onSubmit={handlePriceChartingSearch}
                  className="flex flex-col md:flex-row gap-2"
                >
                  <input
                    type="text"
                    placeholder="Exemple : Dracaufeu, Pikachu, Umbreon..."
                    value={priceChartingQuery}
                    onChange={(e) =>
                      setPriceChartingQuery(
                        e.target.value
                      )
                    }
                    className="kt-control flex-1 rounded-2xl border px-4 py-3 text-xs text-white outline-none transition"
                  />

                  <button
                    type="submit"
                    disabled={priceChartingLoading}
                    className="flex items-center justify-center gap-2 rounded-2xl border border-cyan-200/30 bg-cyan-400 px-5 py-3 text-xs font-black uppercase text-[#041014] shadow-[0_10px_28px_rgba(34,211,238,.18)] transition hover:bg-cyan-300 disabled:opacity-50"
                  >
                    {priceChartingLoading ? <Sparkles className="h-4 w-4 animate-pulse" /> : <Search className="h-4 w-4" />}
                    {priceChartingLoading ? "Analyse des prix..." : "Analyser les prix"}
                  </button>
                </form>
              </div>

              {priceChartingLoading && (
                <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4 text-xs text-cyan-300">
                  Recherche des données publiques
                  PriceCharting...
                </div>
              )}

              {priceChartingError &&
                !priceChartingLoading && (
                  <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-xs text-amber-300">
                    {priceChartingError}
                  </div>
                )}

              <div className="space-y-5">
                {priceChartingResults.map((card) => (
                  <div
                    key={card.id}
                    className="psa-result-card rounded-[18px] border border-cyan-300/16 bg-[linear-gradient(145deg,rgba(18,29,40,.98),rgba(9,15,22,.98))] p-4 space-y-4"
                  >

                    {/* CARD HEADER */}
                    <div className="flex flex-col md:flex-row gap-5">

                      {/* IMAGE */}
                      <div className="shrink-0">
                        {card.imageUrl ? (
                          <img
                            src={card.imageUrl}
                            alt={card.cardName}
                            className="psa-card-image kt-card-frame w-28 h-40 object-contain rounded-xl bg-neutral-950"
                            onError={(event) => {
                              event.currentTarget.style.display =
                                "none";

                              const fallback =
                                event.currentTarget
                                  .nextElementSibling as HTMLElement | null;

                              if (fallback) {
                                fallback.style.display =
                                  "flex";
                              }
                            }}
                          />
                        ) : null}

                        <div
                          style={{
                            display: card.imageUrl
                              ? "none"
                              : "flex",
                          }}
                          className="kt-card-frame w-28 h-40 rounded-xl bg-neutral-950 items-center justify-center"
                        >
                          <div className="text-center px-2">
                            <Award className="w-7 h-7 mx-auto text-zinc-700" />

                            <span className="block mt-2 text-[10px] text-zinc-200 uppercase font-black">
                              Image indisponible
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* INFO */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-black">
                            {card.cardName}
                          </h3>

                          {card.cardNumber && (
                            <span className="text-[10px] px-2 py-1 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                              {card.cardNumber}
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-zinc-100 mt-2">
                          {card.setName}
                        </p>

                        {card.language && (
                          <p className="text-[10px] text-zinc-200 mt-1">
                            Langue : {card.language}
                          </p>
                        )}

                        {card.rarity && (
                          <p className="text-[10px] text-zinc-200">
                            Rareté : {card.rarity}
                          </p>
                        )}

                        <a
                          href={card.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 mt-4 text-[10px] text-zinc-200 hover:text-cyan-400 underline"
                        >
                          Voir la fiche PriceCharting
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>

                    {/* PRICES */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-1 h-4 bg-cyan-500 rounded-full" />

                        <h4 className="text-xs font-black uppercase">
                          Prix marché
                        </h4>

                        <span className="text-[10px] text-zinc-200 uppercase">
                          EUR
                        </span>
                      </div>

                      <div className="psa-price-grid grid grid-cols-2 md:grid-cols-5 gap-2">
                        <PriceBox
                          label="Non gradée"
                          price={card.prices.ungraded}
                        />

                        <PriceBox
                          label="PSA 1"
                          price={card.prices.psa1}
                          onClick={card.prices.psa1 > 0 ? () =>
                            handleSelectPriceChartingCard(
                              card,
                              1
                            ) : undefined
                          }
                        />

                        <PriceBox
                          label="PSA 2"
                          price={card.prices.psa2}
                          onClick={card.prices.psa2 > 0 ? () =>
                            handleSelectPriceChartingCard(
                              card,
                              2
                            ) : undefined
                          }
                        />

                        <PriceBox
                          label="PSA 3"
                          price={card.prices.psa3}
                          onClick={card.prices.psa3 > 0 ? () =>
                            handleSelectPriceChartingCard(
                              card,
                              3
                            ) : undefined
                          }
                        />

                        <PriceBox
                          label="PSA 4"
                          price={card.prices.psa4}
                          onClick={card.prices.psa4 > 0 ? () =>
                            handleSelectPriceChartingCard(
                              card,
                              4
                            ) : undefined
                          }
                        />

                        <PriceBox
                          label="PSA 5"
                          price={card.prices.psa5}
                          onClick={card.prices.psa5 > 0 ? () =>
                            handleSelectPriceChartingCard(
                              card,
                              5
                            ) : undefined
                          }
                        />

                        <PriceBox
                          label="PSA 6"
                          price={card.prices.psa6}
                          onClick={card.prices.psa6 > 0 ? () =>
                            handleSelectPriceChartingCard(
                              card,
                              6
                            ) : undefined
                          }
                        />

                        <PriceBox
                          label="PSA 7"
                          price={card.prices.psa7}
                          onClick={card.prices.psa7 > 0 ? () =>
                            handleSelectPriceChartingCard(
                              card,
                              7
                            ) : undefined
                          }
                        />

                        <PriceBox
                          label="PSA 8"
                          price={card.prices.psa8}
                          onClick={card.prices.psa8 > 0 ? () =>
                            handleSelectPriceChartingCard(
                              card,
                              8
                            ) : undefined
                          }
                        />

                        <PriceBox
                          label="PSA 9"
                          price={card.prices.psa9}
                          onClick={card.prices.psa9 > 0 ? () =>
                            handleSelectPriceChartingCard(
                              card,
                              9
                            ) : undefined
                          }
                        />

                        <PriceBox
                          label="PSA 10"
                          price={card.prices.psa10}
                          onClick={card.prices.psa10 > 0 ? () =>
                            handleSelectPriceChartingCard(
                              card,
                              10
                            ) : undefined
                          }
                        />
                      </div>
                    </div>

                    {/* RECENT SALES */}
                    {card.recentSales?.length > 0 && (
                      <div className="border-t border-cyan-300/12 pt-5">
                        <div className="flex items-center gap-2 mb-3">
                          <ShoppingBag className="w-4 h-4 text-cyan-400" />

                          <h4 className="text-xs font-black uppercase">
                            3 dernières ventes
                          </h4>

                          <span className="text-[10px] text-zinc-200">
                            Réalisées
                          </span>
                        </div>

                        <div className="space-y-2">
                          {card.recentSales
                            .slice(0, 3)
                            .map((sale, index) => (
                              <div
                                key={`${sale.date}-${index}`}
                                className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 rounded-xl bg-cyan-400/[0.025] border border-cyan-300/12 p-3"
                              >
                                <span className="text-[10px] text-zinc-200 shrink-0">
                                  {formatSaleDate(
                                    sale.date
                                  )}
                                </span>

                                <span className="text-[10px] text-zinc-300 flex-1 line-clamp-2">
                                  {sale.title}
                                </span>

                                <span className="text-xs font-black text-cyan-400 shrink-0">
                                  {formatEUR(sale.price)}
                                </span>

                                <span className="text-[10px] text-zinc-200 uppercase shrink-0">
                                  {sale.source}
                                </span>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* IA */}
          {activeTab === "estimation" && (
            <section className="space-y-6">
              <div className="kt-premium-panel rounded-[18px] p-4 sm:p-5">
                <div className="flex items-start gap-3">
                    <div className="kt-logo-tile flex h-10 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#f4f6f8] p-1.5">
                      <img src="/brands/psa.png" alt="PSA" className="h-full w-full object-contain" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-300">V5.01 · Caméra + Gemini</p>
                      <h2 className="mt-1 text-base font-black text-white">Estimation visuelle du grade</h2>
                      <p className="mt-1 max-w-2xl text-[10px] leading-4 text-zinc-100">Quatre vues guidées, puis un contrôle manuel pour affiner les défauts difficiles à voir.</p>
                      <span className="mt-2 inline-flex rounded-full border border-amber-300/15 bg-amber-400/[0.06] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.11em] text-amber-200">Estimation non officielle</span>
                    </div>
                  </div>
                </div>

              <PSAGradeCapture />
            </section>
          )}
        </div>
      </main>

      {/* MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-xl">
          <div className="kt-premium-panel w-full max-w-md rounded-[18px] p-6 space-y-5">

            <h3 className="text-sm font-black uppercase">
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
                onChange={(e) =>
                  setNewCert(e.target.value)
                }
                className="kt-control w-full rounded-2xl border px-4 py-3 text-xs text-white outline-none transition"
              />

              <input
                required
                placeholder="Nom de la carte"
                value={newName}
                onChange={(e) =>
                  setNewName(e.target.value)
                }
                className="kt-control w-full rounded-2xl border px-4 py-3 text-xs text-white outline-none transition"
              />

              <input
                placeholder="Extension"
                value={newSet}
                onChange={(e) =>
                  setNewSet(e.target.value)
                }
                className="kt-control w-full rounded-2xl border px-4 py-3 text-xs text-white outline-none transition"
              />

              <input
                placeholder="Numéro de carte"
                value={newNumber}
                onChange={(e) =>
                  setNewNumber(e.target.value)
                }
                className="kt-control w-full rounded-2xl border px-4 py-3 text-xs text-white outline-none transition"
              />

              <div className="grid grid-cols-2 gap-3">
                <select
                  value={newGrade}
                  onChange={(e) =>
                    setNewGrade(
                      Number(
                        e.target.value
                      ) as PSAGrade
                    )
                  }
                  className="kt-control rounded-xl border px-3 py-3 text-xs"
                >
                  {[
                    10, 9, 8, 7,
                    6, 5, 4, 3,
                    2, 1,
                  ].map((grade) => (
                    <option
                      key={grade}
                      value={grade}
                    >
                      PSA {grade}
                    </option>
                  ))}
                </select>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={newPrice}
                  onChange={(e) => setNewPrice(Number(e.target.value))}
                  placeholder="Valeur estimée €"
                  className="kt-control rounded-xl border px-3 py-3 text-xs text-white"
                />
              </div>

              <label className="block">
                <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.11em] text-zinc-200">Prix d&apos;achat</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={newPurchasePrice}
                  onChange={(e) => setNewPurchasePrice(Number(e.target.value))}
                  placeholder="Montant payé €"
                  className="w-full rounded-xl border border-amber-300/15 bg-amber-400/[0.05] px-3 py-3 text-xs text-white outline-none focus:border-amber-300/35"
                />
              </label>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() =>
                    setIsAddModalOpen(false)
                  }
                  className="px-4 py-2 text-xs text-zinc-100"
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  className="bg-cyan-400 text-black shadow-[0_8px_24px_rgba(34,211,238,0.18)] px-5 py-2 rounded-xl text-xs font-black uppercase"
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

function ValueChip({ icon, label, value, tone }: { icon: ReactNode; label: string; value: string; tone: "amber" | "cyan" | "green" | "red" }) {
  const tones = {
    amber: "border-amber-300/15 bg-amber-400/[0.055] text-amber-200",
    cyan: "border-cyan-300/15 bg-cyan-400/[0.055] text-cyan-200",
    green: "border-emerald-300/15 bg-emerald-400/[0.055] text-emerald-200",
    red: "border-rose-300/15 bg-rose-400/[0.055] text-rose-200",
  };
  return (
    <div className={`min-w-0 rounded-xl border px-2 py-2 ${tones[tone]}`}>
      <div className="flex items-center gap-1">{icon}<span className="truncate text-[10px] font-bold uppercase tracking-[0.11em] opacity-70">{label}</span></div>
      <p className="mt-1 truncate text-[10px] font-black tabular-nums text-white">{value}</p>
    </div>
  );
}

function PriceBox({
  label,
  price,
  onClick,
}: {
  label: string;
  price: number;
  onClick?: () => void;
}) {
  const clickable = typeof onClick === "function";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!clickable}
      className={`text-left rounded-xl p-3 border transition ${
        clickable
          ? "bg-neutral-950 border-zinc-800 hover:border-cyan-500 cursor-pointer"
          : "bg-neutral-950 border-white/[0.06] cursor-default"
      }`}
    >
      <span className="block text-[10px] text-zinc-200 uppercase font-black">
        {label}
      </span>

      <span className="block text-sm font-black mt-1">
        {formatEUR(price)}
      </span>

      {clickable && (
        <span className="block text-[10px] text-cyan-400 mt-1 uppercase font-black">
          Ajouter
        </span>
      )}
    </button>
  );
}

function StatCard({ title, value, icon, tone }: { title: string; value: string | number; icon: ReactNode; tone: "cyan" | "violet" | "amber" | "green" | "red" }) {
  const tones = {
    cyan: "border-cyan-300/15 bg-cyan-400/[0.055] text-cyan-200",
    violet: "border-violet-300/15 bg-violet-400/[0.055] text-violet-200",
    amber: "border-amber-300/15 bg-amber-400/[0.055] text-amber-200",
    green: "border-emerald-300/15 bg-emerald-400/[0.055] text-emerald-200",
    red: "border-rose-300/15 bg-rose-400/[0.055] text-rose-200",
  };
  return (
    <div className={`rounded-[16px] border p-3 ${tones[tone]}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-black uppercase tracking-[0.13em] opacity-70">{title}</span>
        <span className="opacity-90">{icon}</span>
      </div>
      <p className="mt-2 truncate text-base font-black tabular-nums text-white">{value}</p>
    </div>
  );
}
