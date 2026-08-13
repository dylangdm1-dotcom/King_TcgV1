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
  "Scanner limité (Mono) · 30 scans / mois",
  "PSA · Estimation simple par image",
  "Collection & Favoris · Fonctions principales",
  "Dashboard · Vue standard",
  "Alertes · Fonctions principales",
  "Opportunités · Vue standard",
];

const premiumHighlights = [
  {
    title: "Scanner Premium",
    description: "Mono, Batch et Quadra · 500 scans / mois",
    icon: ScanLine,
    tone: "gold",
  },
  {
    title: "PSA · Analyse détaillée",
    description: "Contrôles supplémentaires et estimation approfondie",
    icon: ShieldCheck,
    tone: "gold",
  },
  {
    title: "Dashboard amélioré",
    description: "Analyses Premium et tendances marché",
    icon: BarChart3,
    tone: "gold",
  },
  {
    title: "Alertes Premium",
    description: "Cause du mouvement et lecture King_TCG",
    icon: BellRing,
    tone: "gold",
  },
  {
    title: "Opportunités Premium",
    description: "Potentiel estimé et confiance King_TCG",
    icon: Star,
    tone: "gold",
  },
] as const;

const extraPremium = [
  {
    title: "Tous les modes de scan",
    description: "Mono, Batch et Quadra pour plus de flexibilité.",
    icon: ScanLine,
  },
  {
    title: "Limite mensuelle élevée",
    description: "500 scans par mois avec quota global partagé.",
    icon: Crown,
  },
  {
    title: "Analyses avancées",
    description: "Dashboard amélioré et lecture marché enrichie.",
    icon: BarChart3,
  },
  {
    title: "Fonctions exclusives",
    description: "Alertes, PSA détaillée et opportunités Premium.",
    icon: ShieldCheck,
  },
] as const;

function PlanFeature({ children, premium = false }: { children: React.ReactNode; premium?: boolean }) {
  return (
    <li className="flex items-start gap-3 text-[11px] leading-5 text-zinc-200">
      <span
        className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border ${
          premium
            ? "border-[#f5c451]/25 bg-[#f5c451]/[0.09] text-[#f5c451]"
            : "border-cyan-400/20 bg-cyan-400/[0.08] text-cyan-300"
        }`}
      >
        <Check className="h-3.5 w-3.5" />
      </span>
      <span className="pt-1">{children}</span>
    </li>
  );
}

export default function AccountManagementPage() {
  return (
    <>
      <Navbar />

      <main className="kt-premium-shell min-h-screen pb-32 text-white">
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-7">
          <Link
            href="/parametres"
            className="inline-flex items-center gap-2 rounded-lg border border-cyan-400/20 bg-[#0b1219] px-3 py-2 text-[11px] font-semibold text-zinc-200 transition hover:border-cyan-300/40 hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5 text-cyan-300" />
            Retour aux paramètres
          </Link>

          <header className="mt-4 rounded-[18px] border border-white/[0.12] bg-[#0a1118] p-5 shadow-[0_16px_40px_rgba(0,0,0,.22)] sm:p-6">
            <div className="flex items-center gap-4">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-blue-400/25 bg-blue-500/20 text-blue-300">
                <UserRound className="h-7 w-7" />
              </span>
              <div>
                <h1 className="text-2xl font-black tracking-tight text-white sm:text-[28px]">Compte</h1>
                <p className="mt-1 text-[12px] leading-5 text-zinc-300 sm:text-[13px]">
                  Gérez votre compte et votre abonnement.
                </p>
              </div>
            </div>
          </header>

          <section className="mt-4 rounded-[18px] border border-white/[0.10] bg-[#0a1118] p-4 sm:p-5">
            <div className="mb-4">
              <h2 className="text-lg font-black text-white">Choisissez votre formule</h2>
              <p className="mt-1 text-[11px] text-zinc-300">
                Sélectionnez la formule qui correspond le mieux à vos besoins.
              </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <article className="flex h-full flex-col rounded-[18px] border border-cyan-400/35 bg-[#0d151e] p-5 shadow-[0_18px_44px_rgba(0,0,0,.22)] sm:p-6">
                <div className="flex items-start gap-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-blue-400/20 bg-blue-500/15 text-blue-300">
                    <UserRound className="h-6 w-6" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-xl font-black text-white">Compte Normal</h3>
                      <span className="rounded-md border border-white/[0.10] bg-white/[0.05] px-2 py-1 text-[10px] font-bold text-zinc-200">Gratuit</span>
                    </div>
                    <p className="mt-2 text-[11px] leading-5 text-zinc-300">
                      Accès aux fonctions principales pour démarrer.
                    </p>
                  </div>
                </div>

                <div className="my-5 h-px bg-white/[0.08]" />

                <ul className="space-y-3">
                  {normalFeatures.map((feature) => (
                    <PlanFeature key={feature}>{feature}</PlanFeature>
                  ))}
                </ul>

                <button
                  type="button"
                  className="mt-auto pt-5"
                  aria-label="Formule actuelle"
                >
                  <span className="flex w-full items-center justify-center rounded-xl border border-white/[0.10] bg-white/[0.04] px-4 py-3 text-[11px] font-black text-zinc-500">
                    Formule actuelle
                  </span>
                </button>
              </article>

              <article className="relative flex h-full flex-col overflow-hidden rounded-[18px] border-2 border-[#f5c451]/80 bg-[#0d151e] p-5 shadow-[0_18px_44px_rgba(0,0,0,.24),0_0_34px_rgba(245,196,81,.08)] sm:p-6">
                <div className="absolute right-0 top-0 rounded-bl-xl bg-[#f5c451] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.08em] text-[#1a1304]">
                  Recommandé
                </div>

                <div className="flex items-start gap-4 pr-16">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#f5c451]/25 bg-[#f5c451]/15 text-[#f5c451]">
                    <Crown className="h-6 w-6" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-xl font-black text-white">Compte Premium</h3>
                    <p className="mt-1 text-2xl font-black text-[#f5c451]">4,99 € <span className="text-sm">/ mois</span></p>
                    <p className="mt-2 text-[11px] leading-5 text-zinc-300">
                      Accédez aux fonctionnalités Premium et augmentez vos limites.
                    </p>
                  </div>
                </div>

                <div className="my-5 h-px bg-[#f5c451]/15" />

                <div className="space-y-3">
                  {premiumHighlights.map(({ title, description, icon: Icon }) => (
                    <div key={title} className="flex items-start gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#f5c451]/20 bg-[#f5c451]/[0.08] text-[#f5c451]">
                        <Icon className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="text-[11px] font-black text-white">{title}</p>
                        <p className="mt-0.5 text-[10px] leading-4 text-zinc-300">{description}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  className="mt-auto pt-5"
                >
                  <span className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#f5c451]/50 bg-[#f5c451] px-4 py-3 text-[11px] font-black text-[#181108] shadow-[0_10px_26px_rgba(245,196,81,.15)] transition hover:brightness-105">
                    <Crown className="h-4 w-4" />
                    Passer au Premium — 4,99 € / mois
                  </span>
                </button>
              </article>
            </div>
          </section>

          <section className="mt-4 rounded-[18px] border border-white/[0.10] bg-[#0a1118] p-4 sm:p-5">
            <h2 className="text-[14px] font-black text-white">Avantages Premium en plus</h2>
            <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
              {extraPremium.map(({ title, description, icon: Icon }) => (
                <div key={title} className="min-w-0 text-center">
                  <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-blue-400/20 bg-blue-500/15 text-blue-300">
                    <Icon className="h-5 w-5" />
                  </span>
                  <p className="mt-3 text-[11px] font-black text-white">{title}</p>
                  <p className="mt-1 text-[10px] leading-4 text-zinc-300">{description}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-4 rounded-[18px] border border-white/[0.10] bg-[#0a1118] p-4 sm:p-5">
            <h2 className="text-[14px] font-black text-white">Informations du compte</h2>

            <div className="mt-3 flex flex-col gap-3 rounded-[14px] border border-white/[0.08] bg-[#0d151e] p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-400/15 bg-cyan-400/[0.06] text-cyan-300">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-[12px] font-black text-black">G</span>
                </span>
                <div>
                  <p className="text-[11px] font-black text-white">Connexion Google</p>
                  <p className="mt-0.5 text-[10px] text-zinc-300">Connectez votre compte King_TCG avec Google.</p>
                </div>
              </div>

              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-400/[0.07] px-4 py-2.5 text-[11px] font-black text-cyan-200 transition hover:border-cyan-300/50 hover:text-white"
              >
                Se connecter avec Google
              </button>
            </div>
          </section>

          <section className="mt-4 rounded-[16px] border border-white/[0.09] bg-[#0d151e] p-4">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cyan-400/15 bg-cyan-400/[0.06] text-cyan-300">
                <LockKeyhole className="h-4 w-4" />
              </span>
              <div>
                <p className="text-[11px] font-black text-white">Un quota unique pour chaque compte</p>
                <p className="mt-1 text-[10px] leading-5 text-zinc-300">
                  Le Premium dispose de 500 scans mensuels partagés entre Mono, Batch et Quadra. Le Compte Normal dispose de 30 scans mensuels en mode Mono.
                </p>
              </div>
            </div>
          </section>

          <footer className="mt-5 border-t border-white/[0.06] pt-5 text-center">
            <p className="text-[11px] font-black tracking-[0.18em] text-white">King_TCG</p>
            <p className="mt-1 text-[10px] text-zinc-400">Pokémon Trading Card Companion</p>
          </footer>
        </div>
      </main>
    </>
  );
}
