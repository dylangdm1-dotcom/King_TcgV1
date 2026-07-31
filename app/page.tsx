// app/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { 
  Layers, Library, Bookmark, Wallet, 
  LayoutDashboard, Camera, Star, Video, Zap, Sparkles, Award 
} from "lucide-react";
import { getCollection, getFavorites } from "@/lib/storage";
import { getCardById } from "@/lib/pokemon";
import { getMarketData } from "@/lib/marketEngine";

export default function Home() {
  const router = useRouter();
  const [totalCards, setTotalCards] = useState(0);
  const [uniqueCards, setUniqueCards] = useState(0);
  const [favorites, setFavorites] = useState(0);
  const [portfolioValue, setPortfolioValue] = useState(0);

  useEffect(() => {
    async function loadStats() {
      const collection = getCollection();
      const ids = Object.keys(collection);
      setUniqueCards(ids.length);
      
      // Extraction sécurisée de la quantité
      setTotalCards(ids.reduce((sum, id) => {
        const entry = collection[id] as any;
        const qty = typeof entry === "number" ? entry : (entry?.quantity || 1);
        return sum + qty;
      }, 0));
      
      setFavorites(getFavorites().length);

      let value = 0;
      const cards = await Promise.all(
        ids.map(async (id) => {
          const card = await getCardById(id);
          if (!card) return null;
          return { card, qty: collection[id] };
        })
      );

      cards.filter(Boolean).forEach((item: any) => {
        const market = getMarketData(item.card);
        const qty = typeof item.qty === "number" ? item.qty : (item.qty?.quantity || 1);
        const price = market?.average || 0;
        value += price * qty;
      });
      setPortfolioValue(value);
    }

    loadStats();
    window.addEventListener("king_tcg_update", loadStats);
    return () => {
      window.removeEventListener("king_tcg_update", loadStats);
    };
  }, []);

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-neutral-950 text-white pb-32">

        {/* Section Hero Immersive Mobile-First */}
        <section className="relative overflow-hidden border-b border-zinc-900 py-10 px-4 text-center bg-gradient-to-b from-neutral-900/50 via-neutral-950 to-neutral-950">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative mx-auto max-w-xl space-y-3 z-10">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-cyan-400">
              <Sparkles className="w-3 h-3" /> King_TCG v4.00 • Multilingue
            </span>

            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white uppercase">
              King<span className="text-cyan-400">_TCG</span>
            </h1>

            <p className="mx-auto max-w-sm text-xs text-zinc-400 leading-relaxed">
              Scanne tes cartes en un clin d'œil, suis ton portfolio et pilote ton collectionnariat Pokémon en toute simplicité.
            </p>

            {/* CTA Flash Scanner Direct */}
            <div className="pt-2">
              <button
                onClick={() => router.push("/scanner")}
                className="w-full max-w-sm mx-auto rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 py-3.5 px-6 text-xs font-black uppercase tracking-wider text-black shadow-lg shadow-cyan-500/20 active:scale-[0.98] transition flex items-center justify-center gap-2 border border-cyan-400/30"
              >
                <Camera className="w-4 h-4 text-black" />
                Lancer le scanner IA <Zap className="w-3.5 h-3.5 fill-black" />
              </button>
            </div>
          </div>
        </section>


        {/* Vue globale collection */}
        <section className="mx-auto max-w-xl px-4 py-8 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
              Vue d'ensemble du Portfolio
            </span>
          </div>

          <div className="grid gap-3 grid-cols-2">
            <Stat 
              icon={<Layers className="w-4 h-4 text-cyan-400" />} 
              title="Cartes en collection" 
              value={String(totalCards)} 
            />
            <Stat 
              icon={<Library className="w-4 h-4 text-cyan-400" />} 
              title="Cartes différentes" 
              value={String(uniqueCards)} 
            />
            <Stat 
              icon={<Bookmark className="w-4 h-4 text-cyan-400" />} 
              title="Favoris" 
              value={String(favorites)} 
            />
            <Stat 
              icon={<Wallet className="w-4 h-4 text-cyan-400" />} 
              title="Valeur estimée" 
              value={`${portfolioValue.toFixed(2)} €`} 
            />
          </div>
        </section>

        {/* Accès rapides */}
        <section className="mx-auto max-w-xl px-4 space-y-4">
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 block px-1">
            Navigation Rapide
          </span>

          <div className="grid gap-3 sm:grid-cols-2">
            <QuickCard 
              href="/dashboard" 
              title="Tableau de bord" 
              subtitle="Suivi de portefeuille" 
              icon={<LayoutDashboard className="w-5 h-5 text-cyan-400" />} 
            />
            <QuickCard 
              href="/scanner" 
              title="Scanner IA" 
              subtitle="Identifier une carte" 
              icon={<Camera className="w-5 h-5 text-cyan-400" />} 
            />
            <QuickCard 
              href="/collection" 
              title="Collection" 
              subtitle="Gérer vos cartes" 
              icon={<Library className="w-5 h-5 text-cyan-400" />} 
            />
            <QuickCard 
              href="/favoris" 
              title="Favoris" 
              subtitle="Suivre vos pépites" 
              icon={<Star className="w-5 h-5 text-cyan-400" />} 
            />
            {/* Nouveau Module PSA avec design cyan distinct */}
            <QuickCard 
              href="/psa" 
              title="PSA (Gradation)" 
              subtitle="Dalles & Estimation IA" 
              icon={<Award className="w-5 h-5 text-cyan-400" />} 
              isSpecial={true}
            />
          </div>

          {/* Blocs Compte & Live */}
          <div className="space-y-3 pt-2">

            {/* COMPTE UTILISATEUR */}
            <div className="glass-card rounded-xl p-5 border border-zinc-900 bg-neutral-900/40">
              <h3 className="font-bold text-white mb-1 text-sm uppercase tracking-wide">
                Espace utilisateur
              </h3>
              <p className="text-[11px] text-zinc-400 mb-3">
                Gérez votre profil, vos préférences et vos paramètres King_TCG.
              </p>
              <Link
                href="/parametres/compte"
                className="block w-full text-center bg-cyan-500 hover:bg-cyan-400 text-black font-black uppercase tracking-wider py-2.5 rounded-lg text-[11px] transition-all shadow-md shadow-cyan-500/10"
              >
                Accéder au compte
              </Link>
            </div>

            {/* PARTENARIAT WHATNOT */}
            <div className="glass-card rounded-xl p-5 border border-zinc-900 bg-neutral-900/40">
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-7 h-7 flex items-center justify-center bg-zinc-900 rounded-full border border-zinc-800 text-cyan-400">
                  <Video className="w-3.5 h-3.5" />
                </div>
                <h3 className="font-bold text-white text-sm uppercase tracking-wide">
                  Lives Pokémon Whatnot
                </h3>
              </div>

              <p className="text-white font-semibold text-xs mb-1">
                Découvre l'application Whatnot 
              </p>
              <p className="text-[11px] text-zinc-400 mb-3">
                Profite d'un bonus de bienvenue avec le code partenaire :
              </p>

              <a
                href="https://whatnot.com/invite/dylangdm"
                target="_blank"
                rel="noopener noreferrer"
                className="block mb-3 text-cyan-400 font-mono font-bold bg-black/60 border border-zinc-800 py-2 rounded-lg text-center text-xs tracking-widest hover:border-cyan-500/40 transition"
              >
                DYLANGDM
              </a>

              <a
                href="https://www.whatnot.com/fr-FR/user/dylangdm"
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full text-center bg-white text-black font-black uppercase tracking-wider py-2.5 rounded-lg text-[11px] hover:bg-zinc-200 transition-all shadow-md"
              >
                Voir les lives Pokémon
              </a>
            </div>

          </div>

        </section>

      </main>
    </>
  );
}

function Stat({ icon, title, value }: any) {
  return (
    <div className="glass-card rounded-xl p-3.5 flex flex-col justify-between border border-zinc-900 bg-neutral-900/40">
      <div className="flex justify-between items-start">
        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
          {title}
        </span>
        <div>{icon}</div>
      </div>
      <div className="mt-2 text-xl font-black tracking-tight text-white">
        {value}
      </div>
    </div>
  );
}

function QuickCard({ href, icon, title, subtitle, isSpecial = false }: any) {
  return (
    <Link href={href} className="group block">
      <div className={`glass-card rounded-xl p-4 border transition-all ${
        isSpecial 
          ? "border-cyan-500/40 bg-cyan-950/10 group-hover:border-cyan-400 group-hover:bg-cyan-950/20" 
          : "border-zinc-900 bg-neutral-900/40 group-hover:border-cyan-500/40 group-hover:bg-neutral-900/80"
      }`}>
        <div className="flex items-center gap-3">
          <div className="text-cyan-400 p-2 rounded-lg bg-black/40 border border-zinc-800 group-hover:scale-110 transition-transform">
            {icon}
          </div>
          <div>
            <h3 className="font-bold text-white group-hover:text-cyan-400 transition-colors text-xs uppercase tracking-wide">
              {title}
            </h3>
            <p className="text-[10px] text-zinc-400 mt-0.5">
              {subtitle}
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}
