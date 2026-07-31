// app/psa/page.tsx

"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { Award, Search, Plus, TrendingUp, ShieldCheck, Sparkles, Trash2, BarChart2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import { psaService } from "@/lib/psa/psaService";
import { PSACard } from "@/lib/psa/types";

export default function PSAPage() {
  const [activeTab, setActiveTab] = useState<"collection" | "search" | "estimation">("collection");
  const [collection, setCollection] = useState<PSACard[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterGrade, setFilterGrade] = useState<string>("all");

  // Modal d'ajout rapide de test
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newCert, setNewCert] = useState("");
  const [newName, setNewName] = useState("");
  const [newGrade, setNewGrade] = useState<number>(10);
  const [newPrice, setNewPrice] = useState<number>(150);

  useEffect(() => {
    setCollection(psaService.getCollection());
  }, []);

  const stats = psaService.calculateStats(collection);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newCert) return;

    psaService.addCard({
      psaCertNumber: newCert,
      cardName: newName,
      setName: "Base Set",
      cardNumber: "4/102",
      grade: newGrade as any,
      imageUrl: "https://images.pokemontcg.io/base1/4_hires.png",
      estimatedValue: Number(newPrice),
      salesHistory: [{ date: "2026-03-01", price: Number(newPrice), source: "Marché PSA" }],
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
    const matchesSearch = c.cardName.toLowerCase().includes(searchQuery.toLowerCase()) || c.psaCertNumber.includes(searchQuery);
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
              <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
                <Award className="w-7 h-7" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-black uppercase tracking-tight">Module PSA & Gradation</h1>
                  <span className="px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[9px] font-black uppercase">Certifié v1.0</span>
                </div>
                <p className="text-xs text-zinc-400 mt-0.5">Gestion des dalles certifiées et outils d'estimation de grade.</p>
              </div>
            </div>

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase px-5 py-3 rounded-xl transition shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" /> Enregistrer une dalle PSA
            </button>
          </div>

          {/* Navigation par Onglets */}
          <div className="flex items-center gap-2 bg-neutral-900/60 p-1.5 rounded-2xl border border-zinc-900">
            <button
              onClick={() => setActiveTab("collection")}
              className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition ${
                activeTab === "collection" ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20" : "text-zinc-400 hover:text-white"
              }`}
            >
              Ma Collection PSA ({collection.length})
            </button>
            <button
              onClick={() => setActiveTab("search")}
              className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition ${
                activeTab === "search" ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20" : "text-zinc-400 hover:text-white"
              }`}
            >
              Recherche Registre PSA
            </button>
            <button
              onClick={() => setActiveTab("estimation")}
              className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition ${
                activeTab === "estimation" ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20" : "text-zinc-400 hover:text-white"
              }`}
            >
              IA Estimation Grade <Sparkles className="w-3 h-3 inline ml-1 text-amber-400" />
            </button>
          </div>

          {/* ONGLET 1 : COLLECTION */}
          {activeTab === "collection" && (
            <div className="space-y-6 animate-fadeIn">
              {/* Statistiques Rapides */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-neutral-900/40 border border-zinc-900 p-4 rounded-xl">
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Valeur Totale</span>
                  <p className="text-xl font-black text-indigo-400 mt-1">{stats.totalValue.toLocaleString()} €</p>
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
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Plus-value / Bilan</span>
                  <p className={`text-xl font-black mt-1 ${stats.netProfit >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {stats.netProfit >= 0 ? `+${stats.netProfit}` : stats.netProfit} €
                  </p>
                </div>
              </div>

              {/* Filtres & Recherche Collection */}
              <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Filtrer par nom ou numéro de cert..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-neutral-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <select
                  value={filterGrade}
                  onChange={(e) => setFilterGrade(e.target.value)}
                  className="bg-neutral-900 border border-zinc-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="all">Tous les grades</option>
                  <option value="10">PSA 10 (Gem Mint)</option>
                  <option value="9">PSA 9 (Mint)</option>
                  <option value="8">PSA 8 (NM-MT)</option>
                  <option value="7">PSA 7 ou moins</option>
                </select>
              </div>

              {/* Grille des Dalles PSA */}
              {filteredCollection.length === 0 ? (
                <div className="text-center py-16 bg-neutral-900/20 border border-zinc-900 rounded-2xl space-y-3">
                  <ShieldCheck className="w-10 h-10 text-zinc-600 mx-auto" />
                  <p className="text-xs font-bold text-zinc-400 uppercase">Aucune dalle PSA enregistrée</p>
                  <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="text-xs font-black text-indigo-400 hover:underline uppercase"
                  >
                    Ajouter votre première carte
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
                          <p className="text-xs font-bold text-indigo-400 pt-1">{card.estimatedValue} €</p>
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

          {/* ONGLET 2 : RECHERCHE REGISTRE PSA */}
          {activeTab === "search" && (
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-neutral-900/40 border border-zinc-900 rounded-2xl p-8 text-center space-y-4">
                <Search className="w-8 h-8 text-indigo-400 mx-auto" />
                <div className="space-y-1 max-w-md mx-auto">
                  <h2 className="text-sm font-black uppercase text-white">Registre Officiel & Historique des Ventes</h2>
                  <p className="text-xs text-zinc-400">Recherchez par numéro de certification PSA ou nom de carte pour consulter l'historique des ventes aux enchères.</p>
                </div>
                
                <div className="flex gap-2 max-w-md mx-auto">
                  <input
                    type="text"
                    placeholder="Ex: 84729102 ou Dracaufeu PSA 10..."
                    className="flex-1 bg-neutral-900 border border-zinc-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                  <button className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 rounded-xl text-xs font-black uppercase transition">
                    Rechercher
                  </button>
                </div>
              </div>

              <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-300 text-xs flex items-center gap-3">
                <TrendingUp className="w-5 h-5 flex-shrink-0 text-indigo-400" />
                <span>L'architecture est prête à recevoir les API de cotation tierces (PriceCharting / PSA API) pour alimenter les graphiques de prix en temps réel.</span>
              </div>
            </div>
          )}

          {/* ONGLET 3 : ESTIMATION IA */}
          {activeTab === "estimation" && (
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-gradient-to-br from-indigo-950/40 to-neutral-900 border border-indigo-500/20 rounded-2xl p-8 text-center space-y-4 relative overflow-hidden">
                <div className="absolute top-3 right-3 px-3 py-1 bg-amber-500/20 border border-amber-500/40 rounded-full text-amber-400 text-[10px] font-black uppercase tracking-widest">
                  Bientôt disponible • Coming Soon
                </div>

                <Sparkles className="w-10 h-10 text-amber-400 mx-auto animate-pulse" />
                <div className="space-y-2 max-w-lg mx-auto">
                  <h2 className="text-base font-black uppercase text-white">IA d'Estimation de Gradation</h2>
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    Envoyez des photos haute résolution sous différents angles. Notre modèle IA analysera les 4 piliers de la notation professionnelle :
                  </p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-lg mx-auto pt-2">
                  <div className="bg-black/40 border border-zinc-800 p-3 rounded-xl">
                    <span className="text-[10px] font-black uppercase text-indigo-400 block">Centering</span>
                    <span className="text-[10px] text-zinc-500">Front / Back ratio</span>
                  </div>
                  <div className="bg-black/40 border border-zinc-800 p-3 rounded-xl">
                    <span className="text-[10px] font-black uppercase text-indigo-400 block">Corners</span>
                    <span className="text-[10px] text-zinc-500">Micro-impacts</span>
                  </div>
                  <div className="bg-black/40 border border-zinc-800 p-3 rounded-xl">
                    <span className="text-[10px] font-black uppercase text-indigo-400 block">Edges</span>
                    <span className="text-[10px] text-zinc-500">Blanchiment / Usure</span>
                  </div>
                  <div className="bg-black/40 border border-zinc-800 p-3 rounded-xl">
                    <span className="text-[10px] font-black uppercase text-indigo-400 block">Surface</span>
                    <span className="text-[10px] text-zinc-500">Rayures / Print lines</span>
                  </div>
                </div>

                <div className="pt-4">
                  <button disabled className="bg-zinc-800 text-zinc-500 font-black text-xs uppercase px-8 py-3.5 rounded-xl cursor-not-allowed">
                    Envoyer les photos (Prochainement)
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
            <h3 className="text-sm font-black uppercase text-white">Ajouter une dalle PSA</h3>
            
            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block mb-1">Numéro de Certification PSA</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: 84729102"
                  value={newCert}
                  onChange={(e) => setNewCert(e.target.value)}
                  className="w-full bg-neutral-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block mb-1">Nom de la carte</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Dracaufeu Ombre 4/102"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-neutral-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block mb-1">Grade PSA</label>
                  <select
                    value={newGrade}
                    onChange={(e) => setNewGrade(Number(e.target.value))}
                    className="w-full bg-neutral-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((g) => (
                      <option key={g} value={g}>PSA {g}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block mb-1">Valeur Estimée (€)</label>
                  <input
                    type="number"
                    required
                    value={newPrice}
                    onChange={(e) => setNewPrice(Number(e.target.value))}
                    className="w-full bg-neutral-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
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
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase px-5 py-2.5 rounded-xl transition"
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