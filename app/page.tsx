// app/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { 
  Layers, Library, Bookmark, Wallet, 
  LayoutDashboard, Camera, Star, Zap, Sparkles, Search,
  Bell, TrendingUp, Crown, BadgeCheck, Handshake, ChevronDown,
  ExternalLink, Video, Heart, CalendarDays, Newspaper, CircleDollarSign, PackageOpen
} from "lucide-react";
import { getCollection, getFavorites } from "@/lib/storage";
import { getCardById } from "@/lib/pokemon";
import { getMarketData } from "@/lib/marketEngine";
import { UPCOMING_OFFICIAL_RELEASES } from "@/lib/setCatalog";

export default function Home() {
  const router = useRouter();

  const [totalCards, setTotalCards] = useState(0);
  const [uniqueCards, setUniqueCards] = useState(0);
  const [favorites, setFavorites] = useState(0);
  const [portfolioValue, setPortfolioValue] = useState(0);
  const [creatorOpen, setCreatorOpen] = useState(false);
  const [newsOpen, setNewsOpen] = useState(false);

  const upcomingKingTcgItems = [
    {
      title: "Catalogue japonais enrichi",
      text: "La B287 a ajouté 64 extensions japonaises ouvrables et 7 330 cartes locales.",
      badge: "B287",
    },
    {
      title: "Espace Items indépendant",
      text: "ETB, displays, boosters, coffrets, bundles et UPC disposent maintenant de leur propre recherche et de leur propre fiche.",
      badge: "V288",
    },
    {
      title: "Collection et favoris Items",
      text: "Les produits scellés restent séparés des cartes, avec quantités, achats, favoris et export CSV dédiés.",
      badge: "V288",
    },
    {
      title: "Cotes de produits scellés",
      text: "Prochaine étape : connecter une source autorisée en séparant prix de sortie officiel et cote actuelle du marché.",
      badge: "À venir",
    },
    {
      title: "Scanner de stock PRO",
      text: "Étude d’un inventaire gros volume sans prix, exportable en CSV ou Excel.",
      badge: "PRO",
    },
  ] as const;

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
              King_TCG V288 • Accès anticipé
            </span>

            <h1 className="flex items-center justify-center">
              <img src="/brands/king-tcg-logo.png" alt="King_TCG — Pokémon TCG Market & Collection" className="kt-home-hero-logo h-20 w-auto max-w-full object-contain drop-shadow-[0_0_24px_rgba(34,211,238,.20)] sm:h-28" />
            </h1>

            <p className="mx-auto max-w-xl text-[12px] leading-6 text-zinc-300 sm:text-[13px]">
              Scannez et organisez vos cartes Pokémon, puis gérez séparément vos produits scellés dans le nouvel espace Items.
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

        {/* Actus & à venir */}
        <section className="mx-auto mt-5 max-w-[1180px] px-4 sm:px-5">
          <div className="overflow-hidden rounded-[18px] border border-cyan-300/[0.14] bg-gradient-to-br from-cyan-400/[0.055] via-sky-400/[0.025] to-transparent">
            <button
              type="button"
              onClick={() => setNewsOpen((value) => !value)}
              aria-expanded={newsOpen}
              className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left sm:px-5"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cyan-300/20 bg-cyan-300/[0.07]">
                  <Newspaper className="h-4 w-4 text-cyan-300" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[10px] font-black uppercase tracking-[0.15em] text-cyan-300">
                    Actus & à venir
                  </span>
                  <span className="mt-0.5 block truncate text-[11px] font-bold text-zinc-300">
                    B287, nouvel espace Items V288 et prochaines connexions de données
                  </span>
                </span>
              </div>
              <ChevronDown className={`h-4 w-4 shrink-0 text-cyan-300 transition ${newsOpen ? "rotate-180" : ""}`} />
            </button>

            {newsOpen ? (
              <div className="space-y-2.5 border-t border-cyan-300/[0.09] p-3">
                <div className="rounded-[14px] border border-amber-300/[0.12] bg-amber-300/[0.035] px-3 py-2.5">
                  <div className="mb-2 flex items-center gap-2">
                    <CalendarDays className="h-3.5 w-3.5 shrink-0 text-amber-300" />
                    <p className="text-[9px] font-black uppercase tracking-[0.13em] text-amber-300">
                      Pokémon · Sorties officielles
                    </p>
                  </div>
                  <div className="space-y-2">
                    {UPCOMING_OFFICIAL_RELEASES.map((release) => (
                      <div key={release.id} className="flex min-w-0 items-start justify-between gap-3 border-t border-amber-200/[0.08] pt-2 first:border-t-0 first:pt-0">
                        <div className="min-w-0">
                          <h3 className="truncate text-[11px] font-black text-white">{release.name}</h3>
                          <p className="mt-0.5 text-[9px] leading-4 text-zinc-300">
                            {release.language === "ja" ? "Japon" : String(release.language).toUpperCase()} · {new Date(release.releaseDate).toLocaleDateString("fr-FR")} · {release.contents}
                          </p>
                        </div>
                        <a
                          href={release.officialUrl}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={`Source officielle ${release.name}`}
                          className="mt-0.5 shrink-0 text-amber-300 transition hover:text-white"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-[14px] border border-cyan-300/[0.13] bg-cyan-300/[0.035] px-3 py-2.5">
                  <div className="mb-1.5 flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5 shrink-0 text-cyan-300" />
                    <p className="text-[9px] font-black uppercase tracking-[0.13em] text-cyan-300">
                      King_TCG · Prochaines améliorations
                    </p>
                  </div>
                  <div className="divide-y divide-cyan-200/[0.07]">
                    {upcomingKingTcgItems.map((item) => (
                      <div key={item.title} className="flex items-start gap-2 py-1.5 first:pt-0 last:pb-0">
                        <span className={`mt-[3px] h-1.5 w-1.5 shrink-0 rounded-full ${item.badge === "PRO" ? "bg-amber-300/80" : "bg-cyan-300/70"}`} />
                        <p className="min-w-0 text-[9px] leading-4 text-zinc-300">
                          <span className={`font-black ${item.badge === "PRO" ? "text-amber-300" : "text-cyan-200"}`}>{item.badge}</span>
                          <span className="text-zinc-500"> · </span>
                          <span className={`font-bold ${item.badge === "PRO" ? "text-amber-100" : "text-white"}`}>{item.title}</span>
                          <span className="hidden sm:inline"> — {item.text}</span>
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
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

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
              subtitle="Identification de cartes en Mono, Batch et Quad"
              icon={<Camera className="w-5 h-5 text-cyan-400" />}
            />

            <QuickCard
              href="/recherche"
              title="Cartes & extensions"
              subtitle="Recherche uniquement les cartes et leurs extensions"
              icon={<Search className="w-5 h-5 text-cyan-400" />}
            />

            <QuickCard
              href="/items"
              title="Items scellés"
              badge="Premium · PRO"
              subtitle="ETB, displays, boosters, coffrets, bundles et UPC"
              icon={<PackageOpen className="h-5 w-5 text-amber-300" />}
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
              title="Espace PSA"
              subtitle="Prix PSA, collection gradée et estimation IA"
              icon={<BadgeCheck className="w-5 h-5 text-cyan-400" />}
            />

            <QuickCard
              href="/parametres/testeurs"
              title="Partenaires & Testeurs"
              subtitle="Équipe terrain, retours et communautés King_TCG"
              icon={<Handshake className="w-5 h-5 text-cyan-400" />}
            />

            <QuickCard
              href="/ventes"
              title="Ventes"
              badge="Premium"
              subtitle="Cartes vendues · prix de vente · bénéfices réalisés"
              icon={<CircleDollarSign className="h-5 w-5 text-cyan-400" />}
            />
          </div>
        </section>

        {/* Créateur — barre indépendante et dépliable */}
        <section className="mx-auto mt-5 max-w-[1180px] px-4 sm:px-5">
          <div
            className={`kt-panel kt-creator-panel overflow-hidden rounded-[18px] ${
              creatorOpen ? "kt-creator-panel-open" : ""
            }`}
          >
            <button
              type="button"
              onClick={() => setCreatorOpen((value) => !value)}
              aria-expanded={creatorOpen}
              aria-controls="creator-details"
              className={`flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition sm:px-5 ${
                creatorOpen ? "bg-amber-300/[0.035]" : "hover:bg-amber-300/[0.025]"
              }`}
            >
              <span className="flex min-w-0 items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] border border-amber-300/30 bg-gradient-to-br from-amber-300/[0.13] to-amber-500/[0.045] text-amber-300 shadow-[0_0_18px_rgba(251,191,36,.08)]">
                  <Crown className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[11px] font-black uppercase tracking-[0.09em] text-amber-200 drop-shadow-[0_0_10px_rgba(251,191,36,.16)]">
                    Qui est le créateur ?
                  </span>
                  <span className="mt-1 block truncate text-[10px] text-zinc-400">
                    DYLANG_TCG · Le projet et les lives Pokémon
                  </span>
                </span>
              </span>

              <ChevronDown
                className={`h-4 w-4 shrink-0 text-zinc-400 transition-transform duration-200 ${
                  creatorOpen ? "rotate-180 text-amber-300" : ""
                }`}
              />
            </button>

            <div
              id="creator-details"
              className={`grid transition-all duration-200 ease-out ${
                creatorOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
              }`}
            >
              <div className="overflow-hidden">
                <div className="border-t border-cyan-300/[0.13] px-5 py-7 text-center sm:px-8 sm:py-9">
                  <div className="mx-auto flex max-w-3xl flex-col items-center">
                    <div className="relative flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-cyan-300 via-cyan-300/65 to-amber-300 p-[2px] shadow-[0_0_26px_rgba(34,211,238,.28),0_0_24px_rgba(251,191,36,.19)] sm:h-32 sm:w-32">
                      <img
                        src="/brands/dylang-tcg-avatar.png"
                        alt="Avatar de DYLANG_TCG, créateur de King_TCG"
                        className="h-full w-full rounded-full object-cover"
                      />
                    </div>

                    <h2 className="mt-4 flex items-center justify-center gap-2 text-[15px] font-black tracking-[0.02em] text-amber-200 drop-shadow-[0_0_12px_rgba(251,191,36,.13)] sm:text-base">
                      <Crown className="h-4 w-4 shrink-0 text-amber-300" />
                      DYLANG_TCG
                    </h2>
                    <p className="mt-1 text-[10px] font-black uppercase tracking-[0.12em] text-zinc-300 sm:text-[11px]">
                      Créateur de <span className="text-cyan-300">King_TCG</span>
                    </p>

                    <CreatorSeparator />

                    <section className="w-full text-center">
                      <h3 className="text-[12px] font-black text-cyan-200 drop-shadow-[0_0_10px_rgba(34,211,238,.14)] sm:text-[13px]">
                        Pourquoi j’ai créé King_TCG
                      </h3>
                      <div className="mx-auto mt-3 max-w-2xl space-y-3 text-[11px] leading-[1.8] text-zinc-300 sm:text-[12px]">
                        <p>
                          Collectionneur et passionné de Pokémon, j’ai créé King_TCG pour réunir dans une seule application les outils que j’aurais aimé avoir pour gérer, comprendre et suivre ma propre collection.
                        </p>
                        <p>
                          Le projet avance à partir des besoins réels des collectionneurs, de tests concrets et des retours de la communauté, avec l’objectif de rendre chaque information plus claire, utile et accessible.
                        </p>
                      </div>
                    </section>

                    <CreatorSeparator />

                    <section className="w-full text-center">
                      <h3 className="flex items-center justify-center gap-2 text-[12px] font-black text-cyan-200 drop-shadow-[0_0_10px_rgba(34,211,238,.14)] sm:text-[13px]">
                        <Video className="h-4 w-4 shrink-0 text-cyan-300" />
                        DYLANG_TCG sur Whatnot
                      </h3>
                      <div className="mx-auto mt-3 max-w-2xl space-y-2 text-[11px] leading-[1.8] text-zinc-300 sm:text-[12px]">
                        <p>
                          Retrouvez-moi régulièrement en live sur Whatnot pour partager des ouvertures de boosters français et chinois, découvrir de nouvelles cartes et échanger autour de Pokémon.
                        </p>
                        <p>
                          Chaque live est avant tout un moment convivial pour discuter collection, répondre aux questions et faire vivre la communauté DYLANG_TCG.
                        </p>
                      </div>

                      <div className="mx-auto mt-4 grid max-w-2xl gap-2.5 sm:grid-cols-2">
                        <a
                          href="https://whatnot.com/invite/dylang_tcg"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex min-h-11 min-w-0 items-center justify-center gap-2 rounded-xl border border-cyan-300/30 bg-cyan-300/[0.065] px-3 py-2.5 text-center text-[10px] font-black leading-4 text-cyan-200 transition hover:border-cyan-200/55 hover:bg-cyan-300/[0.11]"
                        >
                          <span className="min-w-0 whitespace-normal">Code partenaire · DYLANG_TCG</span>
                          <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                        </a>

                        <a
                          href="https://whatnot.com/s/J0IWStNW"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex min-h-11 min-w-0 items-center justify-center gap-2 rounded-xl border border-cyan-300/30 bg-cyan-300/[0.065] px-3 py-2.5 text-center text-[10px] font-black leading-4 text-cyan-200 transition hover:border-cyan-200/55 hover:bg-cyan-300/[0.11]"
                        >
                          <Video className="h-3.5 w-3.5 shrink-0" />
                          <span className="min-w-0 whitespace-normal">Voir mes lives Pokémon</span>
                        </a>
                      </div>
                    </section>

                    <CreatorSeparator />

                    <section className="w-full text-center">
                      <h3 className="flex items-center justify-center gap-2 text-[12px] font-black text-amber-200 sm:text-[13px]">
                        <Crown className="h-4 w-4 shrink-0 text-amber-300" />
                        Soutenir King_TCG
                      </h3>
                      <div className="mx-auto mt-3 max-w-2xl space-y-2 text-[11px] leading-[1.8] text-amber-50/85 sm:text-[12px]">
                        <p>Vous aimez King_TCG et souhaitez participer à son développement sur le long terme ?</p>
                        <p>
                          Votre soutien peut aider à faire évoluer l’application, améliorer ses données et préparer de nouvelles fonctions pour tous les collectionneurs. Cette démarche reste entièrement libre et facultative.
                        </p>
                      </div>
                      <a
                        href="https://paypal.me/dylangdm"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mx-auto mt-4 flex min-h-11 w-full max-w-xs items-center justify-center gap-2 rounded-xl border border-amber-300/30 bg-amber-300/[0.075] px-4 py-2.5 text-[10px] font-black text-amber-200 transition hover:border-amber-200/55 hover:bg-amber-300/[0.12]"
                      >
                        <Heart className="h-3.5 w-3.5 shrink-0" />
                        Soutenir le projet
                        <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                      </a>
                    </section>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

function CreatorSeparator() {
  return (
    <div aria-hidden="true" className="my-7 flex w-full max-w-[220px] items-center justify-center gap-3 text-cyan-300 sm:my-8">
      <span className="h-px flex-1 bg-gradient-to-r from-transparent to-cyan-300/75 shadow-[0_0_8px_rgba(34,211,238,.55)]" />
      <Sparkles className="h-3.5 w-3.5 shrink-0 drop-shadow-[0_0_8px_rgba(34,211,238,.75)]" />
      <span className="h-px flex-1 bg-gradient-to-l from-transparent to-cyan-300/75 shadow-[0_0_8px_rgba(34,211,238,.55)]" />
    </div>
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
  badge
}: any) {
  return (
    <Link
      href={href}
      className="group block"
    >
      <div
        className="kt-section-surface relative overflow-hidden rounded-[18px] border border-transparent p-4 transition-all hover:-translate-y-0.5 group-hover:border-cyan-400/16"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-400/[0.07] text-cyan-300 transition-transform group-hover:scale-105">
            {icon}
          </div>

          <div>
            <div className="flex min-w-0 items-center gap-2">
              <h3 className="text-[11px] font-black uppercase tracking-[0.08em] text-white transition-colors group-hover:text-cyan-300">
                {title}
              </h3>
              {badge ? (
                <span className="shrink-0 rounded-full border border-amber-300/20 bg-amber-300/[0.07] px-1.5 py-0.5 text-[7px] font-black uppercase tracking-[0.08em] text-amber-300">
                  {badge}
                </span>
              ) : null}
            </div>

            <p className="mt-1 truncate text-[10px] leading-4 text-zinc-400">
              {subtitle}
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}
