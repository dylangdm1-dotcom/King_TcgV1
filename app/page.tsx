// app/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { 
  Layers, Library, Bookmark, Wallet, 
  LayoutDashboard, Camera, Star, Zap, Sparkles, Award, Search,
  Bell, TrendingUp, Crown
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

      <main className="kt-premium-shell min-h-screen pb-32 text-white">
        {/* HERO V5.0 */}
        <section className="kt-hero-surface relative mx-auto mt-5 max-w-[1180px] overflow-hidden rounded-[20px] border px-5 py-7 text-center sm:px-8 sm:py-10">
          <div className="pointer-events-none absolute left-1/2 top-[-8rem] h-96 w-96 -translate-x-1/2 rounded-full bg-cyan-400/[0.11] blur-[105px]" />
          <div className="pointer-events-none absolute bottom-0 left-1/2 h-px w-44 -translate-x-1/2 bg-cyan-300/70 shadow-[0_0_14px_rgba(34,211,238,.85)]" />

          <div className="kt-rise-in relative z-10 mx-auto max-w-3xl space-y-5">
            <span className="mx-auto inline-flex items-center gap-1.5 rounded-full border border-cyan-400/20 bg-cyan-400/[0.06] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.14em] text-cyan-300">
              <Sparkles className="w-3 h-3" />
              King_TCG v5.0 • Accès anticipé
            </span>

            <h1 className="flex items-center justify-center">
              <img src="/brands/king-tcg-logo.png" alt="King_TCG — Pokémon TCG Market & Collection" className="kt-home-hero-logo h-20 w-auto max-w-full object-contain drop-shadow-[0_0_24px_rgba(34,211,238,.20)] sm:h-28" />
            </h1>

            <p className="mx-auto max-w-xl text-[12px] leading-6 text-zinc-300 sm:text-[13px]">
              Scannez, recherchez et organisez vos cartes Pokémon, puis suivez leur valeur grâce aux données de marché réunies dans une interface simple.
            </p>

            {/* Scanner IA */}
            <div className="pt-2">
              <button
                onClick={() => router.push("/scanner")}
                className="mx-auto flex w-full max-w-sm items-center justify-center gap-2 rounded-[16px] border border-cyan-300/35 bg-cyan-400 px-6 py-3.5 text-[11px] font-black uppercase tracking-[0.12em] text-[#031014] shadow-[0_16px_34px_rgba(34,211,238,.16)] transition hover:bg-cyan-300 active:scale-[0.99]"
              >
                <Camera className="w-4 h-4 text-black" />
                Scanner IA V5
                <Zap className="w-3.5 h-3.5 fill-black" />
              </button>
            </div>

            {/* Raccourcis Alertes / Opportunités */}
            <div className="mx-auto grid max-w-md grid-cols-2 gap-3 pt-2">
              <Link
                href="/alerts"
                className="flex items-center justify-center gap-2 rounded-[14px] border border-rose-400/[0.46] bg-rose-400/[0.055] px-3 py-3 shadow-[0_0_20px_rgba(251,113,133,.06)] transition hover:border-rose-300/[0.68] hover:bg-rose-400/[0.09] active:scale-[0.98]"
              >
                <Bell className="w-4 h-4 text-red-400" />
                <span className="text-[10px] font-bold uppercase tracking-[0.11em] text-red-300">
                  Alertes
                </span>
              </Link>

              <Link
                href="/opportunity"
                className="flex items-center justify-center gap-2 rounded-[14px] border border-amber-400/[0.46] bg-amber-400/[0.055] px-3 py-3 shadow-[0_0_20px_rgba(251,191,36,.06)] transition hover:border-amber-300/[0.68] hover:bg-amber-400/[0.09] active:scale-[0.98]"
              >
                <TrendingUp className="w-4 h-4 text-amber-400" />
                <span className="text-[10px] font-bold uppercase tracking-[0.11em] text-amber-300">
                  Opportunités
                </span>
              </Link>
            </div>
          </div>
        </section>

        {/* Analyse Portfolio */}
        <section className="kt-fade-in mx-auto max-w-[1180px] space-y-4 px-4 py-7 sm:px-5">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.13em] text-cyan-300">
              Analyse du Portfolio
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
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
              icon={<Wallet className="w-4 h-4 text-emerald-300" />}
              title="Valeur estimée"
              value={`${portfolioValue.toFixed(2)} €`}
            />
          </div>
        </section>

        {/* Modules King_TCG */}
        <section className="mx-auto max-w-[1180px] space-y-5 px-4 sm:px-5">
          <span className="block px-1 text-[10px] font-black uppercase tracking-[0.13em] text-cyan-300">
            Modules King_TCG
          </span>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <QuickCard
              href="/parametres/compte"
              title="Espace utilisateur"
              subtitle="Compte, préférences et paramètres King_TCG"
              icon={<Wallet className="w-5 h-5 text-cyan-400" />}
            />

            <QuickCard
              href="/dashboard"
              title="Tableau de bord"
              subtitle="Valeur, rendement et stratégie du portefeuille"
              icon={<LayoutDashboard className="w-5 h-5 text-cyan-400" />}
            />

            <QuickCard
              href="/scanner"
              title="Scanner IA"
              subtitle="Identification Mono, Batch et multilingue"
              icon={<Camera className="w-5 h-5 text-cyan-400" />}
            />

            <QuickCard
              href="/recherche"
              title="Recherche"
              subtitle="Cartes, extensions, images et cotations"
              icon={<Search className="w-5 h-5 text-cyan-400" />}
            />

            <QuickCard
              href="/collection"
              title="Collection"
              subtitle="Quantités, états, achats et plus-values"
              icon={<Library className="w-5 h-5 text-cyan-400" />}
            />

            <QuickCard
              href="/favoris"
              title="Favoris"
              subtitle="Suivi rapide des actifs et opportunités"
              icon={<Star className="w-5 h-5 text-cyan-400" />}
            />

            <QuickCard
              href="/psa"
              title="PSA Gradation"
              subtitle="Prix, collection gradée et estimation IA"
              icon={<img src="/brands/psa.png" alt="PSA" className="h-9 w-14 rounded-lg object-contain" />}
              isSpecial={true}
            />
          </div>

          {/* WHATNOT */}
          <div className="pt-2">
            <div className="kt-section-surface relative overflow-hidden rounded-[20px] border p-5">
              <div className="flex items-center gap-2.5 mb-2">
                <div className="kt-logo-tile flex h-8 w-8 items-center justify-center overflow-hidden rounded-xl bg-[#f4f6f8] p-1">
                  <img src="/brands/whatnot.png" alt="Whatnot" className="h-full w-full object-contain" />
                </div>
                <h3 className="text-[13px] font-black uppercase tracking-[0.09em] text-white">
                  Lives Pokémon Whatnot
                </h3>
              </div>

              <p className="mb-1 text-[12px] font-black text-white">
                Découvre les ouvertures Pokémon en direct
              </p>

              <p className="mb-4 text-[11px] leading-5 text-zinc-300">
                Soutiens la communauté King_TCG avec le code partenaire :
              </p>

              <a
                href="https://whatnot.com/invite/dylang_tcg"
                target="_blank"
                rel="noopener noreferrer"
                className="mb-3 block rounded-xl border border-cyan-400/18 bg-cyan-400/[0.035] py-2.5 text-center font-mono text-xs font-black tracking-widest text-cyan-300 transition hover:border-cyan-300/35"
              >
                Dylang_TCG
              </a>

              <a
                href="https://whatnot.com/s/J0IWStNW"
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center rounded-[13px] border border-violet-400/20 bg-violet-400/[0.05] py-2.5 text-[10px] font-black uppercase tracking-[0.10em] text-violet-200 transition hover:border-violet-300/35 hover:bg-violet-400/[0.08]"
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
    <div className="kt-home-stat kt-metric-tile relative flex h-[76px] flex-col justify-between overflow-hidden rounded-[15px] border px-3 py-2.5 transition">
      <div className="flex justify-between items-start">
        <span className="line-clamp-2 min-h-[22px] pr-1 text-[8px] font-black uppercase leading-[11px] tracking-[0.08em] text-zinc-400 sm:text-[9px]">
          {title}
        </span>
        <div>
          {icon}
        </div>
      </div>

      <div className={`text-base font-black leading-none tabular-nums ${title === "Valeur estimée" ? "text-emerald-300" : "text-white"}`}>
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
        className={`kt-section-surface relative overflow-hidden rounded-[18px] border p-4 transition-all hover:-translate-y-0.5 ${
          isSpecial
            ? "border-cyan-400/26 bg-cyan-400/[0.035] group-hover:border-cyan-300/45"
            : "border-transparent group-hover:border-cyan-400/16"
        }`}
      >
        <div className="flex items-center gap-3">
          <div className={`${isSpecial ? "kt-logo-tile flex h-11 w-16 items-center justify-center overflow-hidden rounded-xl bg-[#f4f6f8] p-0" : "flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-400/[0.07] text-cyan-300"} transition-transform group-hover:scale-105`}>
            {icon}
          </div>

          <div>
            <h3 className="text-[11px] font-black uppercase tracking-[0.08em] text-white transition-colors group-hover:text-cyan-300">
              {title}
            </h3>

            <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-zinc-400">
              {subtitle}
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}
