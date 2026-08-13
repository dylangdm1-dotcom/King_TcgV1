"use client";

import Link from "next/link";
import {
  ArrowLeft,
  BarChart3,
  BellRing,
  Check,
  Crown,
  LockKeyhole,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Star,
  UserRound,
} from "lucide-react";
import Navbar from "../../../components/Navbar";

const normalFeatures = [
  "Recherche FR / EN / JP / CN et fiches cartes",
  "Prix multi-sources et cote King_TCG",
  "Collection, favoris et fonctions principales du dashboard",
  "Alertes et opportunités avec informations principales",
  "Scanner Mono",
  "30 scans par mois au total",
  "PSA : estimation simple à partir de l’image",
  "Historique et graphiques de l’application",
  "Export / import des données locales",
];

const premiumHighlights = [
  {
    title: "Tous les modes de scan",
    description: "Mono, Batch et Quadra",
    icon: ScanLine,
    tone: "cyan",
  },
  {
    title: "Quota Premium",
    description: "500 scans / mois · quota global partagé",
    icon: Crown,
    tone: "gold",
  },
  {
    title: "Dashboard amélioré",
    description: "Analyses Premium et tendances marché",
    icon: BarChart3,
    tone: "violet",
  },
  {
    title: "Alertes Premium",
    description: "Cause du mouvement et lecture King_TCG",
    icon: BellRing,
    tone: "orange",
  },
  {
    title: "Analyse PSA détaillée",
    description: "Contrôles supplémentaires et estimation approfondie",
    icon: ShieldCheck,
    tone: "blue",
  },
  {
    title: "Opportunités Premium",
    description: "Potentiel estimé et confiance King_TCG",
    icon: Star,
    tone: "gold",
  },
] as const;

const premiumTones = {
  cyan: "border-cyan-400/20 bg-cyan-400/[0.08] text-cyan-300",
  gold: "border-[#f5c451]/25 bg-[#f5c451]/[0.09] text-[#f5c451]",
  violet: "border-violet-400/20 bg-violet-400/[0.09] text-violet-300",
  orange: "border-amber-400/20 bg-amber-400/[0.08] text-amber-300",
  blue: "border-blue-400/20 bg-blue-400/[0.08] text-blue-300",
};

function NormalFeatureRow({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5 text-[11px] leading-5 text-zinc-100">
      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-cyan-400/20 bg-cyan-400/[0.07] text-cyan-300">
        <Check className="h-2.5 w-2.5" />
      </span>
      {children}
    </li>
  );
}

export default function AccountManagementPage() {
  return (
    <>
      <Navbar />

      <main className="kt-premium-shell min-h-screen pb-32 text-white">
        <div className="mx-auto max-w-5xl space-y-7 px-4 py-6 sm:px-6">
          <Link
            href="/parametres"
            className="kt-premium-button-secondary inline-flex items-center gap-2 px-3.5 py-2 text-[11px] font-bold uppercase tracking-wide"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Retour aux paramètres
          </Link>

          <header className="flex flex-col gap-4 rounded-[20px] border border-cyan-400/25 bg-[#0a1118] p-4 shadow-[0_18px_48px_rgba(0,0,0,.24)] sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div className="flex items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[15px] border border-cyan-300/20 bg-cyan-400/[0.08] text-cyan-300">
                <UserRound className="h-6 w-6" />
              </span>
              <div>
                <h1 className="flex items-center gap-2 text-xl font-black tracking-tight sm:text-2xl">
                  <Crown className="h-5 w-5 text-[#f5c451]" />
                  <span>Compte <span className="text-cyan-300">KING_TCG</span></span>
                </h1>
                <p className="mt-1 text-[13px] font-medium leading-5 text-zinc-200">
                  Gérez votre compte et choisissez l’offre adaptée à votre collection.
                </p>
              </div>
            </div>

            <button
              type="button"
              className="inline-flex w-full items-center justify-center gap-2 rounded-[14px] border border-cyan-400/40 bg-[#0d1822] px-4 py-3 text-[11px] font-black text-white shadow-[0_0_24px_rgba(34,211,238,.06)] transition hover:border-cyan-300/65 hover:bg-[#10212c] sm:w-auto"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-[12px] font-black text-black">G</span>
              Se connecter avec Google
            </button>
          </header>

          <section>
            <div className="mb-3 flex items-center gap-3">
              <ShieldCheck className="h-4 w-4 text-cyan-300" />
              <h2 className="whitespace-nowrap text-[13px] font-black uppercase tracking-[0.08em] text-cyan-300">
                Compte Normal
              </h2>
              <span className="h-px flex-1 bg-gradient-to-r from-cyan-400/45 to-transparent" />
            </div>

            <div className="relative overflow-hidden rounded-[20px] border border-cyan-400/45 bg-[#0d141c] p-5 shadow-[0_20px_60px_rgba(0,0,0,.30),0_0_36px_rgba(34,211,238,.055)] sm:p-6">
              <div className="pointer-events-none absolute -bottom-24 -right-20 h-56 w-56 rounded-full bg-cyan-400/[0.045] blur-3xl" />
              <div className="relative">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-lg font-black text-white">Gratuit · 0 € / mois</p>
                  <p className="mt-1 max-w-2xl text-[12px] leading-5 text-zinc-200">
                    L’essentiel de King_TCG pour rechercher, suivre et gérer votre collection au quotidien.
                  </p>
                </div>
                <div className="rounded-[14px] border border-cyan-400/20 bg-cyan-400/[0.06] px-4 py-2.5 text-center">
                  <p className="text-[10px] font-black uppercase tracking-[0.08em] text-cyan-300">Quota scanner</p>
                  <p className="mt-1 text-sm font-black text-white">30 scans / mois</p>
                </div>
              </div>

              <ul className="mt-5 grid gap-2.5 sm:grid-cols-2">
                {normalFeatures.map((feature) => (
                  <NormalFeatureRow key={feature}>{feature}</NormalFeatureRow>
                ))}
              </ul>
              </div>
            </div>
          </section>

          <section className="relative overflow-hidden rounded-[20px] border border-[#f5c451]/55 bg-[#0d141c] p-5 shadow-[0_20px_60px_rgba(0,0,0,.34),0_0_42px_rgba(245,196,81,.07)] sm:p-7">
<div className="pointer-events-none absolute -left-20 -top-24 h-56 w-56 rounded-full bg-[#f5c451]/[0.055] blur-3xl" />
            <div className="pointer-events-none absolute -bottom-28 -right-20 h-64 w-64 rounded-full bg-[#f5c451]/[0.05] blur-3xl" />

            <div className="relative flex flex-col items-center text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#f5c451]/30 bg-[#f5c451]/[0.08] text-[#f5c451] shadow-[0_0_28px_rgba(245,196,81,.09)]">
                <Crown className="h-7 w-7" />
              </span>
              <h2 className="mt-3 text-xl font-black tracking-tight text-white sm:text-2xl">
                <span className="text-[#f5c451]">PREMIUM</span> KING_TCG
              </h2>
              <p className="mt-1 text-[12px] font-medium text-zinc-200">
                Débloquez les fonctions avancées de King_TCG.
              </p>

              <div className="mt-4 flex items-end justify-center gap-2">
                <span className="text-3xl font-black tracking-tight text-white sm:text-4xl">4,99 €</span>
                <span className="pb-1 text-sm font-bold text-zinc-200">/ mois</span>
              </div>

              <span className="mt-3 rounded-full border border-[#f5c451]/25 bg-[#f5c451]/[0.07] px-3 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-[#f5c451]">
                Sans engagement · annulable à tout moment
              </span>
            </div>
            <div className="relative mt-6 border-t border-[#f5c451]/18 pt-5">
<div className="mb-3 flex items-center gap-3">
              <Sparkles className="h-4 w-4 text-[#f5c451]" />
              <h2 className="whitespace-nowrap text-[13px] font-black uppercase tracking-[0.08em] text-[#f5c451]">
                Ce qui est inclus
              </h2>
              <span className="h-px flex-1 bg-gradient-to-r from-[#f5c451]/45 to-transparent" />
            </div>

            <div className="overflow-hidden rounded-[18px] border border-[#f5c451]/18 bg-black/15 shadow-[0_18px_48px_rgba(0,0,0,.28)]">
              {premiumHighlights.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={feature.title}
                    className={`flex items-center gap-3 px-3.5 py-3.5 sm:px-4 ${
                      index > 0 ? "border-t border-white/[0.08]" : ""
                    }`}
                  >
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${premiumTones[feature.tone]}`}>
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-black text-white sm:text-[13px]">{feature.title}</p>
                      <p className="mt-0.5 text-[11px] leading-4 text-zinc-200">{feature.description}</p>
                    </div>
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#f5c451]/35 text-[#f5c451]">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-[15px] border border-[#f5c451]/45 bg-gradient-to-r from-[#8a5b08] via-[#b77908] to-[#7a4b05] px-4 py-3.5 text-[12px] font-black uppercase tracking-[0.07em] text-white shadow-[0_16px_38px_rgba(245,196,81,.12)] transition hover:brightness-110"
            >
              <Crown className="h-4 w-4" />
              <span className="flex flex-col items-center leading-tight">
                <span>Passer Premium</span>
                <span className="mt-0.5 text-[10px] font-bold normal-case tracking-normal">4,99 € / mois</span>
              </span>
            </button>
            </div>
          </section>

          <section className="rounded-[18px] border border-white/[0.09] bg-[#111821] p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cyan-400/15 bg-cyan-400/[0.06] text-cyan-300">
                <LockKeyhole className="h-4 w-4" />
              </span>
              <div>
                <p className="text-[12px] font-black text-white">Un quota unique pour chaque compte</p>
                <p className="mt-1 text-[11px] leading-5 text-zinc-200">
                  Le Premium dispose de 500 scans mensuels partagés entre Mono, Batch et Quadra. Le Compte Normal dispose de 30 scans mensuels en mode Mono.
                </p>
              </div>
            </div>
          </section>

          <footer className="border-t border-white/[0.06] pt-6 text-center">
            <p className="text-[11px] font-black tracking-[0.18em] text-white">King_TCG</p>
            <p className="mt-1 text-[11px] font-bold text-zinc-300">Pokémon Trading Card Companion</p>
          </footer>
        </div>
      </main>
    </>
  );
}
