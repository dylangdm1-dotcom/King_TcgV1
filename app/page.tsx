// app/page.tsx
"use client";

import Navbar from "../components/Navbar";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Layers,
  Library,
  Bookmark,
  Wallet,
  LayoutDashboard,
  Camera,
  Star,
  Video,
  Zap,
  Sparkles,
  Award,
  Search,
  Bell,
  TrendingUp,
} from "lucide-react";

import { getCollection, getFavorites } from "@/lib/storage";
import { getCardById } from "@/lib/pokemon";
import { getMarketData } from "@/lib/marketEngine";

type CollectionEntry =
  | number
  | {
      quantity?: number;
    }
  | undefined;

function getQuantity(entry: CollectionEntry): number {
  if (typeof entry === "number") {
    return entry > 0 ? entry : 0;
  }

  if (
    entry &&
    typeof entry.quantity === "number"
  ) {
    return entry.quantity > 0
      ? entry.quantity
      : 0;
  }

  return entry ? 1 : 0;
}

export default function Home() {
  const router = useRouter();

  const [totalCards, setTotalCards] = useState(0);
  const [uniqueCards, setUniqueCards] = useState(0);
  const [favorites, setFavorites] = useState(0);
  const [portfolioValue, setPortfolioValue] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadStats() {
      try {
        const collection = getCollection() || {};
        const ids = Object.keys(collection);

        const total = ids.reduce(
          (sum, id) =>
            sum +
            getQuantity(
              collection[id] as CollectionEntry
            ),
          0
        );

        const favoriteCount = getFavorites().length;

        if (!cancelled) {
          setUniqueCards(ids.length);
          setTotalCards(total);
          setFavorites(favoriteCount);
        }

        if (ids.length === 0) {
          if (!cancelled) {
            setPortfolioValue(0);
          }

          return;
        }

        const cards = await Promise.all(
          ids.map(async (id) => {
            const card = await getCardById(id);

            if (!card) {
              return null;
            }

            return {
              card,
              quantity: getQuantity(
                collection[id] as CollectionEntry
              ),
            };
          })
        );

        let value = 0;

        for (const item of cards) {
          if (!item || item.quantity <= 0) {
            continue;
          }

          const market = getMarketData(item.card);

          /**
           * V5 :
           * La valeur de portefeuille repose sur le prix
           * réellement disponible le moins cher parmi
           * les sources réelles.
           *
           * Aucun fallback artificiel.
           */
          const unitPrice = market.lowestPrice;

          if (unitPrice > 0) {
            value += unitPrice * item.quantity;
          }
        }

        if (!cancelled) {
          setPortfolioValue(value);
        }
      } catch (error) {
        console.error(
          "[King_TCG] Erreur chargement statistiques accueil :",
          error
        );

        if (!cancelled) {
          setPortfolioValue(0);
        }
      }
    }

    loadStats();

    window.addEventListener(
      "king_tcg_update",
      loadStats
    );

    return () => {
      cancelled = true;

      window.removeEventListener(
        "king_tcg_update",
        loadStats
      );
    };
  }, []);

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-neutral-950 text-white pb-32">
        {/* HERO V5.0 */}
        <section className="relative overflow-hidden border-b border-zinc-900 py-10 px-4 text-center bg-gradient-to-b from-neutral-900/50 via-neutral-950 to-neutral-950">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative mx-auto max-w-xl space-y-3 z-10">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-cyan-400">
              <Sparkles className="w-3 h-3" />
              King_TCG v5.0 • Intelligence Collection
            </span>

            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white uppercase">
              King<span className="text-cyan-400">_TCG</span>
            </h1>

            <p className="mx-auto max-w-sm text-xs text-zinc-400 leading-relaxed">
              Scanner IA nouvelle génération, gestion intelligente
              de collection, analyse du marché et suivi complet
              de votre patrimoine TCG.
            </p>

            {/* Scanner IA */}
            <div className="pt-2">
              <button
                onClick={() => router.push("/scanner")}
                className="w-full max-w-sm mx-auto rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 py-3.5 px-6 text-xs font-black uppercase tracking-wider text-black shadow-lg shadow-cyan-500/20 active:scale-[0.98] transition flex items-center justify-center gap-2 border border-cyan-400/30"
              >
                <Camera className="w-4 h-4 text-black" />
                Scanner IA V5
                <Zap className="w-3.5 h-3.5 fill-black" />
              </button>
            </div>
          </div>
        </section>

        {/* Analyse Portfolio */}
        <section className="mx-auto max-w-xl px-4 py-8 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
              Analyse du Portfolio
            </span>
          </div>

          <div className="grid gap-3 grid-cols-2">
            <Stat
              icon={
                <Layers className="w-4 h-4 text-cyan-400" />
              }
              title="Cartes en collection"
              value={String(totalCards)}
            />

            <Stat
              icon={
                <Library className="w-4 h-4 text-cyan-400" />
              }
              title="Cartes uniques"
              value={String(uniqueCards)}
            />

            <Stat
              icon={
                <Bookmark className="w-4 h-4 text-cyan-400" />
              }
              title="Favoris suivis"
              value={String(favorites)}
            />

            <Stat
              icon={
                <Wallet className="w-4 h-4 text-cyan-400" />
              }
              title="Valeur estimée"
              value={`${portfolioValue.toFixed(2)} €`}
            />
          </div>
        </section>

        {/* Modules King_TCG */}
        <section className="mx-auto max-w-xl px-4 space-y-4">
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 block px-1">
            Modules King_TCG
          </span>

          <div className="grid gap-3 sm:grid-cols-2">
            <QuickCard
              href="/dashboard"
              title="Tableau de bord"
              subtitle="Analyse portefeuille"
              icon={
                <LayoutDashboard className="w-5 h-5 text-cyan-400" />
              }
            />

            <QuickCard
              href="/scanner"
              title="Scanner IA"
              subtitle="Identification automatique"
              icon={
                <Camera className="w-5 h-5 text-cyan-400" />
              }
            />

            <QuickCard
              href="/recherche"
              title="Recherche"
              subtitle="Base cartes TCG"
              icon={
                <Search className="w-5 h-5 text-cyan-400" />
              }
            />

            <QuickCard
              href="/collection"
              title="Collection"
              subtitle="Gestion des cartes"
              icon={
                <Library className="w-5 h-5 text-cyan-400" />
              }
            />

            <QuickCard
              href="/favoris"
              title="Favoris"
              subtitle="Cartes à surveiller"
              icon={
                <Star className="w-5 h-5 text-cyan-400" />
              }
            />

            <QuickCard
              href="/psa"
              title="PSA Gradation"
              subtitle="Prix & estimation IA"
              icon={
                <Award className="w-5 h-5 text-cyan-400" />
              }
              isSpecial={true}
            />
          </div>

          {/* ALERTS + DEALS */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <Link
              href="/alerts"
              className="group block"
            >
              <div className="rounded-xl border border-red-500/20 bg-red-950/10 p-4 transition-all group-hover:border-red-400/40 group-hover:bg-red-950/20">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg border border-red-500/20 bg-black/40 p-2 text-red-400 transition-transform group-hover:scale-110">
                    <Bell className="h-5 w-5" />
                  </div>

                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wide text-white transition-colors group-hover:text-red-400">
                      Alerts
                    </h3>

                    <p className="mt-0.5 text-[10px] text-zinc-400">
                      Surveillance des cartes
                    </p>
                  </div>
                </div>
              </div>
            </Link>

            <Link
              href="/opportunity"
              className="group block"
            >
              <div className="rounded-xl border border-amber-500/20 bg-amber-950/10 p-4 transition-all group-hover:border-amber-400/40 group-hover:bg-amber-950/20">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg border border-amber-500/20 bg-black/40 p-2 text-amber-400 transition-transform group-hover:scale-110">
                    <TrendingUp className="h-5 w-5" />
                  </div>

                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wide text-white transition-colors group-hover:text-amber-400">
                      Deals
                    </h3>

                    <p className="mt-0.5 text-[10px] text-zinc-400">
                      Opportunités du marché
                    </p>
                  </div>
                </div>
              </div>
            </Link>
          </div>

          {/* ESPACE UTILISATEUR */}
          <div className="space-y-3 pt-2">
            <div className="glass-card rounded-xl p-5 border border-zinc-900 bg-neutral-900/40">
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-7 h-7 flex items-center justify-center bg-black/40 rounded-lg border border-zinc-800 text-cyan-400">
                  <Wallet className="w-4 h-4" />
                </div>

                <h3 className="font-bold text-white text-sm uppercase tracking-wide">
                  Espace utilisateur
                </h3>
              </div>

              <p className="text-[11px] text-zinc-400 mb-3">
                Gérez votre compte, vos préférences et les paramètres
                avancés de votre environnement King_TCG.
              </p>

              <Link
                href="/parametres/compte"
                className="block w-full text-center bg-cyan-500 hover:bg-cyan-400 text-black font-black uppercase tracking-wider py-2.5 rounded-lg text-[11px] transition-all shadow-md shadow-cyan-500/10"
              >
                Accéder au compte
              </Link>
            </div>

            {/* WHATNOT */}
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

type StatProps = {
  icon: React.ReactNode;
  title: string;
  value: string;
};

function Stat({
  icon,
  title,
  value,
}: StatProps) {
  return (
    <div className="glass-card rounded-xl p-3.5 flex flex-col justify-between border border-zinc-900 bg-neutral-900/40">
      <div className="flex justify-between items-start">
        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
          {title}
        </span>

        <div>{icon}</div>
      </div>

      <div className="mt-2 text-xl font-black tracking-tight text-white tabular-nums">
        {value}
      </div>
    </div>
  );
}

type QuickCardProps = {
  href: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  isSpecial?: boolean;
};

function QuickCard({
  href,
  icon,
  title,
  subtitle,
  isSpecial = false,
}: QuickCardProps) {
  return (
    <Link
      href={href}
      className="group block"
    >
      <div
        className={`glass-card rounded-xl p-4 border transition-all ${
          isSpecial
            ? "border-cyan-500/40 bg-cyan-950/10 group-hover:border-cyan-400 group-hover:bg-cyan-950/20"
            : "border-zinc-900 bg-neutral-900/40 group-hover:border-cyan-500/40 group-hover:bg-neutral-900/80"
        }`}
      >
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