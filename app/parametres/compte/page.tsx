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
  "PSA : estimation simple à partir de l’image",
  "Historique et graphiques de l’application",
  "Export / import des données locales",
];

const premiumHighlights = [
  {
    title: "Tous les modes de scan",
    description: "Mono, Batch et Quadra",
    icon: ScanLine,
  },
  {
    title: "Dashboard amélioré",
    description: "Analyses Premium et tendances marché",
    icon: BarChart3,
  },
  {
    title: "Alertes Premium",
    description: "Cause du mouvement et lecture King_TCG",
    icon: BellRing,
  },
  {
    title: "Analyse PSA détaillée",
    description: "Contrôles supplémentaires et estimation approfondie",
    icon: ShieldCheck,
  },
  {
    title: "Opportunités Premium",
    description: "Potentiel estimé et confiance King_TCG",
    icon: Star,
  },
] as const;

function FeatureRow({
  children,
  premium = false,
}: {
  children: React.ReactNode;
  premium?: boolean;
}) {
  return (
    <li className="flex items-start gap-2.5 text-[11px] leading-5 text-zinc-100">
      <span
        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
          premium
            ? "border-[#f5c451]/35 bg-[#f5c451]/[0.08] text-[#f5c451]"
            : "border-cyan-400/30 bg-cyan-400/[0.08] text-cyan-300"
        }`}
      >
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
        <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6">
          <Link
            href="/parametres"
            className="inline-flex items-center gap-2 rounded-[12px] border border-cyan-400/20 bg-[#111821] px-3 py-2 text-[10px] font-bold text-zinc-200 transition hover:border-cyan-300/35 hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5 text-cyan-300" />
            Retour aux paramètres
          </Link>

          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-cyan-300" />
            <p className="text-[11px] font-black uppercase tracking-[0.12em] text-cyan-300">
              Espace compte
            </p>
          </div>

          <header className="relative overflow-hidden rounded-[22px] border border-cyan-400/30 bg-[#0a1118] p-5 shadow-[0_18px_48px_rgba(0,0,0,.24),0_0_34px_rgba(34,211,238,.05)] sm:p-6">
            <div className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-cyan-400/[0.055] blur-3xl" />
            <div className="relative flex items-center gap-4">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] border border-cyan-300/25 bg-cyan-400/[0.08] text-cyan-300 shadow-[0_0_26px_rgba(34,211,238,.08)]">
                <UserRound className="h-7 w-7" />
              </span>
              <div className="min-w-0">
                <h1 className="text-[22px] font-black tracking-tight text-white sm:text-[26px]">
                  Compte <span className="text-cyan-300">KING_TCG</span>
                </h1>
                <p className="mt-1 max-w-xl text-[12px] leading-5 text-zinc-200">
                  Gérez votre accès et choisissez la formule adaptée à votre utilisation de King_TCG.
                </p>
              </div>
            </div>
          </header>

          <section>
            <div className="mb-3 flex items-center gap-3">
              <Crown className="h-4 w-4 text-cyan-300" />
              <h2 className="whitespace-nowrap text-[13px] font-black uppercase tracking-[0.08em] text-cyan-300">
                Choisissez votre formule
              </h2>
              <span className="h-px flex-1 bg-gradient-to-r from-cyan-400/40 to-transparent" />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <article className="relative overflow-hidden rounded-[20px] border border-cyan-400/60 bg-[#0d141c] p-5 shadow-[0_20px_60px_rgba(0,0,0,.34),0_0_42px_rgba(34,211,238,.07)] sm:p-6">
                <div className="pointer-events-none absolute -left-20 -top-24 h-56 w-56 rounded-full bg-cyan-400/[0.055] blur-3xl" />
                <div className="pointer-events-none absolute -bottom-28 -right-20 h-64 w-64 rounded-full bg-cyan-400/[0.05] blur-3xl" />

                <div className="relative flex flex-col items-center text-center">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-400/30 bg-cyan-400/[0.08] text-cyan-300 shadow-[0_0_28px_rgba(34,211,238,.09)]">
                    <ShieldCheck className="h-7 w-7" />
                  </span>

                  <h3 className="mt-3 text-xl font-black tracking-tight text-white sm:text-2xl">
                    <span className="text-cyan-300">NORMAL</span> KING_TCG
                  </h3>

                  <p className="mt-1 text-[12px] font-medium text-zinc-200">
                    Les fonctions essentielles de King_TCG au quotidien.
                  </p>

                  <div className="mt-4 flex items-end justify-center gap-2">
                    <span className="text-3xl font-black tracking-tight text-white sm:text-4xl">
                      0 €
                    </span>
                    <span className="pb-1 text-sm font-bold text-zinc-200">/ mois</span>
                  </div>

                  <span className="mt-3 rounded-full border border-cyan-400/25 bg-cyan-400/[0.07] px-3 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-cyan-300">
                    Formule gratuite
                  </span>

                  <div className="mt-4 w-full rounded-[14px] border border-cyan-400/22 bg-cyan-400/[0.055] px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-left">
                        <p className="text-[10px] font-black uppercase tracking-[0.08em] text-cyan-300">
                          Scanner Mono
                        </p>
                        <p className="mt-1 text-[11px] text-zinc-300">
                          Quota mensuel inclus
                        </p>
                      </div>
                      <p className="text-right text-xl font-black text-white">
                        30 <span className="text-[11px] font-bold text-zinc-300">scans / mois</span>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="relative mt-5 border-t border-cyan-400/18 pt-5">
                  <div className="mb-3 flex items-center gap-3">
                    <Sparkles className="h-4 w-4 text-cyan-300" />
                    <h4 className="whitespace-nowrap text-[12px] font-black uppercase tracking-[0.08em] text-cyan-300">
                      Ce qui est inclus
                    </h4>
                    <span className="h-px flex-1 bg-gradient-to-r from-cyan-400/45 to-transparent" />
                  </div>

                  <div className="overflow-hidden rounded-[16px] border border-cyan-400/18 bg-black/15">
                    {normalFeatures.map((feature, index) => (
                      <div
                        key={feature}
                        className={`flex items-center gap-3 px-3.5 py-3 ${
                          index > 0 ? "border-t border-white/[0.06]" : ""
                        }`}
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cyan-400/22 bg-cyan-400/[0.06] text-cyan-300">
                          <Check className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex-1 text-left">
                          <p className="text-[11px] font-black text-white sm:text-[12px]">
                            {feature}
                          </p>
                        </div>
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-cyan-400/35 text-cyan-300">
                          <Check className="h-3.5 w-3.5" />
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-[14px] border border-cyan-400/30 bg-cyan-400/[0.05] px-4 py-3.5 text-[11px] font-black uppercase tracking-[0.06em] text-cyan-300">
                    <ShieldCheck className="h-4 w-4" />
                    Formule actuelle
                  </div>
                </div>
              </article>

              <article className="relative overflow-hidden rounded-[20px] border border-[#f5c451]/60 bg-[#0d141c] p-5 shadow-[0_20px_60px_rgba(0,0,0,.34),0_0_42px_rgba(245,196,81,.07)] sm:p-6">
                <div className="pointer-events-none absolute -left-20 -top-24 h-56 w-56 rounded-full bg-[#f5c451]/[0.055] blur-3xl" />
                <div className="pointer-events-none absolute -bottom-28 -right-20 h-64 w-64 rounded-full bg-[#f5c451]/[0.05] blur-3xl" />

                <div className="relative flex flex-col items-center text-center">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#f5c451]/30 bg-[#f5c451]/[0.08] text-[#f5c451] shadow-[0_0_28px_rgba(245,196,81,.09)]">
                    <Crown className="h-7 w-7" />
                  </span>

                  <h3 className="mt-3 text-xl font-black tracking-tight text-white sm:text-2xl">
                    <span className="text-[#f5c451]">PREMIUM</span> KING_TCG
                  </h3>

                  <p className="mt-1 text-[12px] font-medium text-zinc-200">
                    Débloquez les fonctions avancées de King_TCG.
                  </p>

                  <div className="mt-4 flex items-end justify-center gap-2">
                    <span className="text-3xl font-black tracking-tight text-white sm:text-4xl">
                      4,99 €
                    </span>
                    <span className="pb-1 text-sm font-bold text-zinc-200">/ mois</span>
                  </div>

                  <span className="mt-3 rounded-full border border-[#f5c451]/25 bg-[#f5c451]/[0.07] px-3 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-[#f5c451]">
                    Sans engagement · annulable à tout moment
                  </span>

                  <div className="mt-4 w-full rounded-[14px] border border-[#f5c451]/22 bg-[#f5c451]/[0.055] px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-left">
                        <p className="text-[10px] font-black uppercase tracking-[0.08em] text-[#f5c451]">
                          Mono · Batch · Quadra
                        </p>
                        <p className="mt-1 text-[11px] text-zinc-300">
                          Quota global partagé
                        </p>
                      </div>
                      <p className="text-right text-xl font-black text-white">
                        500 <span className="text-[11px] font-bold text-zinc-300">scans / mois</span>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="relative mt-5 border-t border-[#f5c451]/18 pt-5">
                  <button
                    type="button"
                    className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-[14px] border border-[#f5c451]/50 bg-gradient-to-r from-[#8a5b08] via-[#b77908] to-[#7a4b05] px-4 py-3.5 text-[11px] font-black uppercase tracking-[0.06em] text-white shadow-[0_14px_34px_rgba(245,196,81,.11)] transition hover:brightness-110"
                  >
                    <Crown className="h-4 w-4" />
                    Passer Premium · 4,99 € / mois
                  </button>
                </div>
              </article>
            </div>
          </section>

          <section className="rounded-[20px] border border-[#f5c451]/28 bg-[#0a1118] p-5 shadow-[0_18px_48px_rgba(0,0,0,.22)] sm:p-6">
            <div className="mb-4 flex items-center gap-3">
              <Sparkles className="h-4 w-4 text-[#f5c451]" />
              <h2 className="whitespace-nowrap text-[13px] font-black uppercase tracking-[0.08em] text-white">
                Avantages Premium
              </h2>
              <span className="h-px flex-1 bg-gradient-to-r from-[#f5c451]/35 to-transparent" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-[16px] border border-[#f5c451]/16 bg-[#f5c451]/[0.035] p-4 text-center">
                <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl border border-[#f5c451]/22 bg-[#f5c451]/[0.07] text-[#f5c451]">
                  <ScanLine className="h-5 w-5" />
                </span>
                <p className="mt-3 text-[11px] font-black text-white">Tous les modes de scan</p>
                <p className="mt-1 text-[10px] leading-4 text-zinc-300">Mono, Batch et Quadra</p>
              </div>

              <div className="rounded-[16px] border border-[#f5c451]/16 bg-[#f5c451]/[0.035] p-4 text-center">
                <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl border border-[#f5c451]/22 bg-[#f5c451]/[0.07] text-[#f5c451]">
                  <BarChart3 className="h-5 w-5" />
                </span>
                <p className="mt-3 text-[11px] font-black text-white">Dashboard amélioré</p>
                <p className="mt-1 text-[10px] leading-4 text-zinc-300">Analyses Premium et tendances marché</p>
              </div>

              <div className="rounded-[16px] border border-[#f5c451]/16 bg-[#f5c451]/[0.035] p-4 text-center">
                <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl border border-[#f5c451]/22 bg-[#f5c451]/[0.07] text-[#f5c451]">
                  <ShieldCheck className="h-5 w-5" />
                </span>
                <p className="mt-3 text-[11px] font-black text-white">PSA détaillée</p>
                <p className="mt-1 text-[10px] leading-4 text-zinc-300">Contrôles et estimation approfondie</p>
              </div>

              <div className="rounded-[16px] border border-[#f5c451]/16 bg-[#f5c451]/[0.035] p-4 text-center">
                <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl border border-[#f5c451]/22 bg-[#f5c451]/[0.07] text-[#f5c451]">
                  <Star className="h-5 w-5" />
                </span>
                <p className="mt-3 text-[11px] font-black text-white">Fonctions Premium</p>
                <p className="mt-1 text-[10px] leading-4 text-zinc-300">Alertes et opportunités enrichies</p>
              </div>
            </div>
          </section>

          <section className="rounded-[20px] border border-cyan-400/24 bg-[#0a1118] p-5 shadow-[0_18px_48px_rgba(0,0,0,.22)] sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-cyan-400/25 bg-cyan-400/[0.07] text-cyan-300">
                  <LockKeyhole className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.11em] text-cyan-300">
                    Informations du compte
                  </p>
                  <h2 className="mt-1 text-[15px] font-black text-white">
                    Accès et synchronisation
                  </h2>
                  <p className="mt-1 max-w-xl text-[11px] leading-5 text-zinc-300">
                    Connectez votre compte Google pour accéder à votre espace King_TCG et retrouver vos informations associées.
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="inline-flex w-full items-center justify-center gap-2.5 rounded-[14px] border border-cyan-400/35 bg-cyan-400/[0.065] px-4 py-3 text-[11px] font-black text-white transition hover:border-cyan-300/60 hover:bg-cyan-400/[0.1] sm:w-auto"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-[13px] font-black text-black">
                  G
                </span>
                Se connecter avec Google
              </button>
            </div>
          </section>

          <footer className="border-t border-white/[0.06] pt-5 text-center">
            <p className="text-[11px] font-black tracking-[0.18em] text-white">King_TCG</p>
            <p className="mt-1 text-[11px] font-bold text-zinc-300">
              Pokémon Trading Card Companion
            </p>
          </footer>
        </div>
      </main>
    </>
  );
}
