// app/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { 
  Layers, Library, Bookmark, Wallet, 
  LayoutDashboard, Camera, Star, Video, Zap, Sparkles, Award, Search,
  Bell, TrendingUp
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

      setTotalCards(
        ids.reduce((sum, id) => {
          const entry = collection[id] as any;
          const qty =
            typeof entry === "number"
              ? entry
              : entry?.quantity || 1;

          return sum + qty;
        }, 0)
      );

      setFavorites(getFavorites().length);

      let value = 0;

      const cards = await Promise.all(
        ids.map(async (id) => {
          const card = await getCardById(id);

          if (!card) return null;

          return {
            card,
            qty: collection[id],
          };
        })
      );

      cards.filter(Boolean).forEach((item: any) => {
        const market = getMarketData(item.card);

        const qty =
          typeof item.qty === "number"
            ? item.qty
            : item.qty?.quantity || 1;

        value += (market?.average || 0) * qty;
      });

      setPortfolioValue(value);
    }

    loadStats();

    window.addEventListener(
      "king_tcg_update",
      loadStats
    );

    return () => {
      window.removeEventListener(
        "king_tcg_update",
        loadStats
      );
    };
  }, []);

  return (
    <>
      <Navbar />

      <main className="kt-app-shell pb-32">
        {/* HERO V5.0 */}
        <section className="relative overflow-hidden border-b border-cyan-400/[0.08] px-4 py-12 text-center sm:py-16">
          <div className="absolute left-1/2 top-[-7rem] h-80 w-80 -translate-x-1/2 rounded-full bg-cyan-400/[0.11] blur-[90px] pointer-events-none" />

          <div className="relative z-10 mx-auto max-w-xl space-y-4 kt-rise-in">
            <span className="kt-eyebrow">
              <Sparkles className="w-3 h-3" />
              King_TCG v5.0 • Intelligence Collection
            </span>

            <h1 className="text-4xl font-black tracking-[-0.045em] text-white sm:text-6xl">
              King<span className="text-cyan-400">_TCG</span>
            </h1>

            <p className="mx-auto max-w-md text-[13px] leading-6 text-zinc-400">
              Scannez, recherchez et organisez vos cartes Pokémon, puis suivez leur valeur grâce aux données de marché réunies dans une interface simple.
            </p>

            {/* Scanner IA */}
            <div className="pt-2">
              <button
                onClick={() => router.push("/scanner")}
                className="kt-primary-button mx-auto w-full max-w-sm px-6 py-3.5 text-xs uppercase tracking-[0.11em]"
              >
                <Camera className="w-4 h-4 text-black" />
                Scanner IA V5
                <Zap className="w-3.5 h-3.5 fill-black" />
              </button>
            </div>

            {/* Raccourcis Alertes / Opportunités */}
            <div className="grid grid-cols-2 gap-3 pt-3 max-w-sm mx-auto">
              <Link
                href="/alerts"
                className="kt-premium-card-soft flex items-center justify-center gap-2 px-3 py-3 transition hover:border-red-400/30 hover:bg-red-500/[0.05] active:scale-[0.98]"
              >
                <Bell className="w-4 h-4 text-red-400" />
                <span className="text-[10px] font-black uppercase tracking-wider text-red-300">
                  Alertes
                </span>
              </Link>

              <Link
                href="/opportunity"
                className="kt-premium-card-soft flex items-center justify-center gap-2 px-3 py-3 transition hover:border-amber-400/30 hover:bg-amber-500/[0.05] active:scale-[0.98]"
              >
                <TrendingUp className="w-4 h-4 text-amber-400" />
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-300">
                  Opportunités
                </span>
              </Link>
            </div>
          </div>
        </section>

        {/* Analyse Portfolio */}
        <section className="mx-auto max-w-xl space-y-4 px-4 py-8 kt-fade-in">
          <div className="flex items-center justify-between">
            <span className="kt-section-label">
              Analyse du Portfolio
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
              title="Cartes uniques"
              value={String(uniqueCards)}
            />

            <Stat
              icon={<Bookmark className="w-4 h-4 text-cyan-400" />}
              title="Favoris suivis"
              value={String(favorites)}
            />

            <Stat
              icon={<Wallet className="w-4 h-4 text-cyan-400" />}
              title="Valeur estimée"
              value={`${portfolioValue.toFixed(2)} €`}
            />
          </div>
        </section>

        {/* Modules King_TCG */}
        <section className="mx-auto max-w-xl space-y-4 px-4">
          <span className="kt-section-label block px-1">
            Modules King_TCG
          </span>

          <div className="grid gap-3 sm:grid-cols-2">
            <QuickCard
              href="/dashboard"
              title="Tableau de bord"
              subtitle="Analyse portefeuille"
              icon={<LayoutDashboard className="w-5 h-5 text-cyan-400" />}
            />

            <QuickCard
              href="/scanner"
              title="Scanner IA"
              subtitle="Identification automatique"
              icon={<Camera className="w-5 h-5 text-cyan-400" />}
            />

            <QuickCard
              href="/recherche"
              title="Recherche"
              subtitle="Base cartes TCG"
              icon={<Search className="w-5 h-5 text-cyan-400" />}
            />

            <QuickCard
              href="/collection"
              title="Collection"
              subtitle="Gestion des cartes"
              icon={<Library className="w-5 h-5 text-cyan-400" />}
            />

            <QuickCard
              href="/favoris"
              title="Favoris"
              subtitle="Cartes à surveiller"
              icon={<Star className="w-5 h-5 text-cyan-400" />}
            />

            <QuickCard
              href="/psa"
              title="PSA Gradation"
              subtitle=" Prix, collection & analyse"
              icon={<img src="/brands/psa.svg" alt="PSA" className="h-6 w-10 rounded-md object-contain" />}
              isSpecial={true}
            />
          </div>

          {/* ESPACE UTILISATEUR */}
          <div className="space-y-3 pt-2">
            <div className="kt-premium-card kt-interactive-card rounded-[18px] p-5">
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-7 h-7 flex items-center justify-center bg-black/40 rounded-lg border border-zinc-800 text-cyan-400">
                  <Wallet className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-white text-sm uppercase tracking-wide">
                  Espace utilisateur
                </h3>
              </div>

              <p className="text-[11px] text-zinc-400 mb-3">
                Gérez votre compte, vos préférences et les paramètres avancés
                de votre environnement King_TCG.
              </p>

              <Link
                href="/parametres/compte"
                className="kt-primary-button w-full py-2.5 text-[11px] uppercase tracking-wider"
              >
                Accéder au compte
              </Link>
            </div>

            {/* WHATNOT */}
            <div className="kt-premium-card kt-interactive-card rounded-[18px] p-5">
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-7 h-7 flex items-center justify-center bg-zinc-900 rounded-full border border-zinc-800 text-cyan-400">
                  <Video className="w-3.5 h-3.5" />
                </div>
                <h3 className="font-bold text-white text-sm uppercase tracking-wide">
                  Lives Pokémon Whatnot
                </h3>
              </div>

              <p className="text-white font-semibold text-xs mb-1">
                Découvre les ouvertures Pokémon en direct
              </p>

              <p className="text-[11px] text-zinc-400 mb-3">
                Soutiens la communauté King_TCG avec le code partenaire :
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
                className="kt-secondary-button w-full py-2.5 text-[11px] uppercase tracking-wider"
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

function Stat({
  icon,
  title,
  value
}: any) {
  return (
    <div className="kt-premium-card kt-interactive-card flex min-h-[104px] flex-col justify-between rounded-[18px] p-4">
      <div className="flex justify-between items-start">
        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
          {title}
        </span>
        <div>
          {icon}
        </div>
      </div>

      <div className="kt-stat-value mt-3 text-xl font-black">
        {value}
      </div>
    </div>
  );
}

function QuickCard({
  href,
  icon,
  title,
  subtitle,
  isSpecial = false
}: any) {
  return (
    <Link
      href={href}
      className="group block"
    >
      <div
        className={`kt-premium-card kt-interactive-card rounded-[18px] p-4 transition-all ${
          isSpecial
            ? "border-cyan-400/25 bg-cyan-400/[0.035] group-hover:border-cyan-300/45"
            : "border-white/[0.07] group-hover:border-cyan-400/25"
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="rounded-xl border border-cyan-400/12 bg-cyan-400/[0.055] p-2.5 text-cyan-300 transition-transform group-hover:scale-105">
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