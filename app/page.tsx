"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { 
  Layers, Library, Bookmark, Wallet, 
  LayoutDashboard, Camera, Star, Video 
} from "lucide-react";
import { getCollection, getFavorites } from "@/lib/storage";
import { getCardById } from "@/lib/pokemon";
import { getMarketData } from "@/lib/marketEngine";

export default function Home() {
  const [totalCards, setTotalCards] = useState(0);
  const [uniqueCards, setUniqueCards] = useState(0);
  const [favorites, setFavorites] = useState(0);
  const [portfolioValue, setPortfolioValue] = useState(0);

  useEffect(() => {
    async function loadStats() {
      const collection = getCollection();
      const ids = Object.keys(collection);
      setUniqueCards(ids.length);
      setTotalCards(ids.reduce((sum, id) => sum + collection[id], 0));
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
        value += market.average * item.qty;
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

      <main className="min-h-screen bg-neutral-950 text-white pb-24">

        {/* Section Hero */}
        <section className="relative overflow-hidden border-b border-zinc-900 py-20">
          <div className="relative mx-auto max-w-7xl px-6 text-center">

            <span className="inline-flex items-center gap-1.5 rounded-md border border-cyan-500/30 bg-cyan-500/5 px-3 py-1 text-xs font-semibold text-cyan-400">
              Accès anticipé
            </span>

            <h1 className="mt-8 text-5xl font-black tracking-tight md:text-7xl text-white">
              King<span className="text-cyan-400">_TCG</span>
            </h1>

            <p className="mx-auto mt-4 max-w-2xl text-base text-zinc-400 leading-relaxed">
              Gérez votre collection Pokémon, suivez la valeur de vos cartes et analysez l'évolution du marché depuis une seule plateforme.
            </p>

          </div>
        </section>


        {/* Vue globale collection */}
        <section className="mx-auto max-w-7xl px-6 py-12">

          <div className="mb-6 flex items-center gap-2">
            <div className="px-3 py-1 rounded-md border border-zinc-800 bg-zinc-900 text-xs font-bold uppercase tracking-widest text-zinc-400">
              Vue d'ensemble
            </div>
          </div>


          <div className="grid gap-4 grid-cols-2 md:grid-cols-4">

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
        <section className="mx-auto max-w-7xl px-6">

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">

            <div className="xl:col-span-2 grid gap-4 sm:grid-cols-2">

              <QuickCard 
                href="/dashboard" 
                title="Tableau de bord" 
                subtitle="Suivi de votre portefeuille" 
                icon={<LayoutDashboard className="w-5 h-5" />} 
              />


              <QuickCard 
                href="/scanner" 
                title="Scanner" 
                subtitle="Identifier une carte rapidement" 
                icon={<Camera className="w-5 h-5" />} 
              />

              <QuickCard 
                href="/collection" 
                title="Collection" 
                subtitle="Consulter et gérer vos cartes" 
                icon={<Library className="w-5 h-5" />} 
              />

              <QuickCard 
                href="/favoris" 
                title="Favoris" 
                subtitle="Suivre vos cartes importantes" 
                icon={<Star className="w-5 h-5" />} 
              />

            </div>
            {/* Blocs Compte & Live */}
            <div className="space-y-4">

              {/* COMPTE UTILISATEUR */}
              <div className="glass-card rounded-2xl p-6">
                <h3 className="font-bold text-white mb-2 text-base">
                  Espace utilisateur
                </h3>

                <p className="text-xs text-zinc-400 mb-4">
                  Gérez votre profil, vos préférences et vos services King_TCG.
                </p>

                <Link
                  href="/parametres/compte"
                  className="block w-full text-center bg-cyan-500 hover:bg-cyan-400 text-black font-bold py-2 rounded-xl text-xs transition-all"
                >
                  Accéder au compte
                </Link>
              </div>

              {/* PARTENARIAT WHATNOT */}
              <div className="glass-card rounded-2xl p-6">

                <div className="flex items-center gap-2.5 mb-3">

                  <div className="w-8 h-8 flex items-center justify-center bg-zinc-900 rounded-full border border-zinc-800">
                    <Video className="w-4 h-4 text-cyan-400" />
                  </div>

                  <h3 className="font-bold text-white text-base">
                    Lives Pokémon
                  </h3>

                </div>

                <p className="text-white font-semibold text-sm mb-1">
                  Découvre mes ouvertures Pokémon en direct !
                </p>

                <p className="text-xs text-zinc-400 mb-4">

                  Profite d'un bonus de bienvenue avec mon code partenaire :

                  <a
                    href="https://whatnot.com/invite/dylangdm"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block mt-1.5 text-white font-mono bg-zinc-900 border border-zinc-800 px-2 py-1 rounded text-center hover:underline"
                  >
                    DYLANGDM
                  </a>

                </p>

                <a
                  href="https://www.whatnot.com/fr-FR/user/dylangdm"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full text-center bg-white text-black font-bold py-2 rounded-xl text-xs hover:bg-zinc-200 transition-all"
                >
                  Voir les lives Pokémon
                </a>

              </div>

            </div>

          </div>

        </section>

      </main>

    </>
  );
}


function Stat({ icon, title, value }: any) {

  return (

    <div className="glass-card rounded-xl p-4 flex flex-col justify-between min-h-[100px]">

      <div className="flex justify-between items-start">

        <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
          {title}
        </span>

        <div>
          {icon}
        </div>

      </div>

      <div className="mt-3 text-2xl font-black tracking-tight text-white">
        {value}
      </div>

    </div>
  );
}

function QuickCard({
  href,
  icon,
  title,
  subtitle
}: any) {

  return (

    <Link
      href={href}
      className="group block"
    >

      <div className="glass-card rounded-xl p-5 transition-all group-hover:border-cyan-500/30 group-hover:bg-zinc-900/40">
        <div className="flex items-center gap-3.5">
          <div className="text-zinc-400 group-hover:text-cyan-400 transition-colors">
            {icon}
          </div>
          <div>
            <h3 className="font-bold text-white group-hover:text-cyan-400 transition-colors text-base">
              {title}
            </h3>
            <p className="text-xs text-zinc-400">
              {subtitle}
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}