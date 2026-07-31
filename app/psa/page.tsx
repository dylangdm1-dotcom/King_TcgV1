// app/psa/page.tsx

"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { Award, Search, Plus, TrendingUp, ShieldCheck, Sparkles, Trash2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import { psaService, MOCK_PRICEMARKET_DATABASE } from "@/lib/psa/psaService";
import { PSACard } from "@/lib/psa/types";

export default function PSAPage() {
  const [activeTab, setActiveTab] = useState<"collection" | "search" | "estimation">("collection");
  const [collection, setCollection] = useState<PSACard[]>([]);
  const [collectionSearch, setCollectionSearch] = useState("");
  const [filterGrade, setFilterGrade] = useState<string>("all");

  // États pour la recherche PriceMarket
  const [marketQuery, setMarketQuery] = useState("");
  const [marketResults, setMarketResults] = useState(MOCK_PRICEMARKET_DATABASE);

  // Modal d'ajout
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newCert, setNewCert] = useState("");
  const [newName, setNewName] = useState("");
  const [newSet, setNewSet] = useState("Base Set");
  const [newNumber, setNewNumber] = useState("4/102");
  const [newGrade, setNewGrade] = useState<number>(10);
  const [newPrice, setNewPrice] = useState<number>(150);
  const [newImage, setNewImage] = useState("https://images.pokemontcg.io/base1/4_hires.png");

  useEffect(() => {
    setCollection(psaService.getCollection());
  }, []);

  const stats = psaService.calculateStats(collection);

  const handleMarketSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setMarketResults(psaService.searchMarketPrices(marketQuery));
  };

  const handleSelectMarketCard = (item: typeof MOCK_PRICEMARKET_DATABASE[0], gradeSelected: number) => {
    setNewName(item.cardName);
    setNewSet(item.setName);
    setNewNumber(item.cardNumber);
    setNewImage(item.imageUrl);
    setNewGrade(gradeSelected);

    // Ajuster le prix estimé selon le grade choisi
    let estimatedVal = item.prices.ungraded;
    if (gradeSelected === 10) estimatedVal = item.prices.psa10;
    else if (gradeSelected === 9) estimatedVal = item.prices.psa9;
    else if (gradeSelected === 8) estimatedVal = item.prices.psa8;
    else if (gradeSelected === 7) estimatedVal = item.prices.psa7;
    setNewPrice(estimatedVal);

    setIsAddModalOpen(true);
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newCert) return;

    psaService.addCard({
      psaCertNumber: newCert,
      cardName: newName,
      setName: newSet,
      cardNumber: newNumber,
      grade: newGrade as any,
      imageUrl: newImage,
      estimatedValue: Number(newPrice),
      salesHistory: [{ date: new Date().toISOString().split("T")[0], price: Number(newPrice), source: "PriceMarket / PriceCharting", grade: newGrade }],
    });

    setCollection(psaService.getCollection());
    setIsAddModalOpen(false);
    setNewCert("");
    setNewName("");
  };

  const handleDelete = (id: string) => {
    if (confirm("Supprimer cette carte PSA de votre collection ?")) {
      psaService.removeCard(id);
      setCollection(psaService.getCollection());
    }
  };

  const filteredCollection = collection.filter((c) => {
    const matchesSearch = c.cardName.toLowerCase().includes(collectionSearch.toLowerCase()) || c.psaCertNumber.includes(collectionSearch);
    const matchesGrade = filterGrade === "all" || c.grade.toString() === filterGrade;
    return matchesSearch && matchesGrade;
  });

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-neutral-950 text-white pb-32">
        <div className="mx-auto max-w-4xl px-4 py-6 space-y-6">
          
          {/* Header Module PSA */}
          <div className="rounded-2xl border border-zinc-900 bg-neutral-900/40 p-5 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-xl text-cyan-400">
                <Award className="w-7 h-7" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-black uppercase tracking-tight">Module PSA & PriceMarket</h1>
                  <span className="px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[9px] font-black uppercase">Live Cotations</span>
                </div>
                <p className="text-xs text-zinc-400 mt-0.5">Suivi des dalles certifiées et index des prix (Style PriceCharting).</p>
              </div>
            </div>

            <button
              onClick={() => {
                setNewCert("");
                setNewName("");
                setIsAddModalOpen(true);
              }}
              className="w-full md:w-auto bg-cyan-500 hover:bg-cyan-400 text-black font-black text-xs uppercase px-5 py-3 rounded-xl transition shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" /> Enregistrer une dalle PSA
            </button>
          </div>

          {/* Navigation par Onglets */}
          <div className="flex items-center gap-2 bg-neutral-900/60 p-1.5 rounded-2xl border border-zinc-900">
            <button
              onClick={() => setActiveTab("collection")}
              className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition ${
                activeTab === "collection" ? "bg-cyan-500 text-black shadow-lg shadow-cyan-500/20" : "text-zinc-400 hover:text-white"
              }`}
            >
              Ma Collection PSA ({collection.length})
            </button>
            <button
              onClick={() => setActiveTab("search")}
              className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition ${
                activeTab === "search" ? "bg-cyan-500 text-black shadow-lg shadow-cyan-500/20" : "text-zinc-400 hover:text-white"
              }`}
            >
              Recherche PriceMarket
            </button>
            <button
              onClick={() => setActiveTab("estimation")}
              className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition ${
                activeTab === "estimation" ? "bg-cyan-500 text-black shadow-lg shadow-cyan-500/20" : "text-zinc-400 hover:text-white"
              }`}
            >
              IA Estimation Grade <Sparkles className="w-3 h-3 inline ml-1 text-amber-400" />
            </button>
          </div>

          {/* ONGLET 1 : COLLECTION */}
          {activeTab === "collection" && (
            <div className="space-y-6 animate-fadeIn">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-neutral-900/40 border border-zinc-900 p-4 rounded-xl">
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Valeur Totale</span>
                  <p className="text-xl font-black text-cyan-400 mt-1">{stats.totalValue.toLocaleString()} €</p>
                </div>
                <div className="bg-neutral-900/40 border border-zinc-900 p-4 rounded-xl">
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Total Dalles</span>
                  <p className="text-xl font-black text-white mt-1">{stats.totalCount}</p>
                </div>
                <div className="bg-neutral-900/40 border border-zinc-900 p-4 rounded-xl">
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Gem Mint (PSA 10)</span>
                  <p className="text-xl font-black text-emerald-400 mt-1">{stats.gemMintCount}</p>
                </div>
                <div className="bg-neutral-900/40 border border-zinc-900 p-4 rounded-xl">
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Bilan / Plus-value</span>
                  <p className={`text-xl font-black mt-1 ${stats.netProfit >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {stats.netProfit >= 0 ? `+${stats.netProfit}` : stats.netProfit} €
                  </p>
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Filtrer par nom ou numéro de cert..."
                    value={collectionSearch}
                    onChange={(e) => setCollectionSearch(e.target.value)}
                    className="w-full bg-neutral-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <select
                  value={filterGrade}
                  onChange={(e) => setFilterGrade(e.target.value)}
                  className="bg-neutral-900 border border-zinc-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="all">Tous les grades</option>
                  <option value="10">PSA 10 (Gem Mint)</option>
                  <option value="9">PSA 9 (Mint)</option>
                  <option value="8">PSA 8 (NM-MT)</option>
                  <option value="7">PSA 7 ou moins</option>
                </select>
              </div>

              {filteredCollection.length === 0 ? (
                <div className="text-center py-16 bg-neutral-900/20 border border-zinc-900 rounded-2xl space-y-3">
                  <ShieldCheck className="w-10 h-10 text-zinc-600 mx-auto" />
                  <p className="text-xs font-bold text-zinc-400 uppercase">Aucune dalle PSA enregistrée</p>
                  <button
                    onClick={() => setActiveTab("search")}
                    className="text-xs font-black text-cyan-400 hover:underline uppercase"
                  >
                    Explorer les prix PriceMarket
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredCollection.map((card) => (
                    <div key={card.id} className="bg-neutral-900/60 border border-zinc-800 rounded-2xl p-4 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="relative w-16 h-24 bg-black rounded-lg border border-zinc-700 overflow-hidden flex-shrink-0">
                          <img src={card.imageUrl} alt={card.cardName} className="w-full h-full object-cover" />
                        </div>
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded bg-red-600 text-white font-black text-[10px] tracking-wider uppercase">
                              PSA {card.grade}
                            </span>
                            <span className="text-[10px] font-mono text-zinc-400">#{card.psaCertNumber}</span>
                          </div>
                          <h3 className="text-xs font-black text-white truncate">{card.cardName}</h3>
                          <p className="text-[10px] text-zinc-400">{card.setName} • {card.cardNumber}</p>
                          <p className="text-xs font-bold text-cyan-400 pt-1">{card.estimatedValue} €</p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDelete(card.id)}
                        className="p-2.5 rounded-xl text-zinc-500 hover:text-rose-400 hover:bg-neutral-800 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ONGLET 2 : RECHERCHE PRICEMARKET (STYLE PRICECHARTING) */}
          {activeTab === "search" && (
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-neutral-900/40 border border-zinc-900 rounded-2xl p-6 space-y-4">
                <div className="space-y-1">
                  <h2 className="text-sm font-black uppercase text-white">Index des Prix PriceMarket</h2>
                  <p className="text-xs text-zinc-400">Consultez instantanément les valeurs par grade et ajoutez directement vos cartes à votre collection.</p>
                </div>
                
                <form onSubmit={handleMarketSearch} className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-zinc-500" />
                    <input
                      type="text"
                      placeholder="Rechercher par nom (ex: Dracaufeu, Umbreon)..."
                      value={marketQuery}
                      onChange={(e) => setMarketQuery(e.target.value)}
                      className="w-full bg-neutral-950 border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-xs text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <button type="submit" className="bg-cyan-500 hover:bg-cyan-400 text-black px-5 rounded-xl text-xs font-black uppercase transition">
                    Rechercher
                  </button>
                </form>
              </div>

              <div className="space-y-4">
                {marketResults.map((item) => (
                  <div key={item.id} className="bg-neutral-900/60 border border-zinc-800 rounded-2xl p-4 space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-24 bg-black rounded-lg border border-zinc-800 overflow-hidden flex-shrink-0">
                        <img src={item.imageUrl} alt={item.cardName} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                        <span className="text-[10px] font-black uppercase text-cyan-400">{item.setName} • {item.cardNumber}</span>
                        <h3 className="text-sm font-black text-white truncate">{item.cardName}</h3>
                        <p className="text-[11px] text-zinc-400">Brut (Ungraded) : <strong className="text-white">{item.prices.ungraded} €</strong></p>
                      </div>
                    </div>

                    {/* Grille des prix par grade avec action rapide d'ajout */}
                    <div className="grid grid-cols-4 gap-2 pt-2 border-t border-zinc-800/80">
                      {[
                        { grade: 7, price: item.prices.psa7 },
                        { grade: 8, price: item.prices.psa8 },
                        { grade: 9, price: item.prices.psa9 },
                        { grade: 10, price: item.prices.psa10 },
                      ].map((tier) => (
                        <button
                          key={tier.grade}
                          onClick={() => handleSelectMarketCard(item, tier.grade)}
                          className="bg-neutral-950 hover:bg-cyan-950/30 border border-zinc-800 hover:border-cyan-500/50 p-2.5 rounded-xl text-center transition group"
                        >
                          <span className="block text-[9px] font-black uppercase text-zinc-500 group-hover:text-cyan-400">PSA {tier.grade}</span>
                          <span className="text-xs font-black text-white mt-0.5 block">{tier.price} €</span>
                          <span className="text-[9px] text-cyan-400 uppercase tracking-tight block mt-1 opacity-0 group-hover:opacity-100 transition">+ Ajouter</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ONGLET 3 : ESTIMATION IA */}
          {activeTab === "estimation" && (
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-gradient-to-br from-cyan-950/30 to-neutral-900 border border-cyan-500/20 rounded-2xl p-8 text-center space-y-4 relative overflow-hidden">
                <div className="absolute top-3 right-3 px-3 py-1 bg-amber-500/20 border border-amber-500/40 rounded-full text-amber-400 text-[10px] font-black uppercase tracking-widest">
                  Bientôt disponible • Coming Soon
                </div>

                <Sparkles className="w-10 h-10 text-amber-400 mx-auto animate-pulse" />
                <div className="space-y-2 max-w-lg mx-auto">
                  <h2 className="text-base font-black uppercase text-white">IA d'Estimation de Gradation</h2>
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    Envoyez des photos haute résolution de votre carte. Notre intelligence artificielle analysera automatiquement les 4 critères professionnels :
                  </p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-lg mx-auto pt-2">
                  <div className="bg-black/40 border border-zinc-800 p-3 rounded-xl">
                    <span className="text-[10px] font-black uppercase text-cyan-400 block">Centering</span>
                    <span className="text-[10px] text-zinc-500">Ratios recto/verso</span>
                  </div>
                  <div className="bg-black/40 border border-zinc-800 p-3 rounded-xl">
                    <span className="text-[10px] font-black uppercase text-cyan-400 block">Corners</span>
                    <span className="text-[10px] text-zinc-500">État des coins</span>
                  </div>
                  <div className="bg-black/40 border border-zinc-800 p-3 rounded-xl">
                    <span className="text-[10px] font-black uppercase text-cyan-400 block">Edges</span>
                    <span className="text-[10px] text-zinc-500">Tranches & usure</span>
                  </div>
                  <div className="bg-black/40 border border-zinc-800 p-3 rounded-xl">
                    <span className="text-[10px] font-black uppercase text-cyan-400 block">Surface</span>
                    <span className="text-[10px] text-zinc-500">Rayures / Défauts</span>
                  </div>
                </div>

                <div className="pt-4">
                  <button disabled className="bg-zinc-800 text-zinc-500 font-black text-xs uppercase px-8 py-3.5 rounded-xl cursor-not-allowed">
                    Analyser une carte (Prochainement)
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* Modal Ajout Rapide Dalle */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-zinc-800 w-full max-w-md rounded-2xl p-6 space-y-5 shadow-2xl">
            <h3 className="text-sm font-black uppercase text-white">Enregistrer une dalle PSA</h3>
            
            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block mb-1">Numéro de Certification PSA</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: 84729102"
                  value={newCert}
                  onChange={(e) => setNewCert(e.target.value)}
                  className="w-full bg-neutral-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block mb-1">Nom de la carte</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-neutral-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block mb-1">Grade PSA</label>
                  <select
                    value={newGrade}
                    onChange={(e) => setNewGrade(Number(e.target.value))}
                    className="w-full bg-neutral-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                  >
                    {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((g) => (
                      <option key={g} value={g}>PSA {g}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block mb-1">Valeur du Marché (€)</label>
                  <input
                    type="number"
                    required
                    value={newPrice}
                    onChange={(e) => setNewPrice(Number(e.target.value))}
                    className="w-full bg-neutral-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-zinc-400 hover:text-white transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="bg-cyan-500 hover:bg-cyan-400 text-black font-black text-xs uppercase px-5 py-2.5 rounded-xl transition"
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
