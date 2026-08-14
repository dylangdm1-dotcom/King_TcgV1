"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BarChart3,
  BellRing,
  Check,
  Crown,
  LockKeyhole,
  Mail,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Star,
  UserRound,
} from "lucide-react";
import Navbar from "../../../components/Navbar";

const PROFILE_STORAGE_KEY = "king_tcg_account_profile_v1";

const normalFeatures = [
  {
    title: "Scanner Mono (manuel)",
    description: "30 scans mensuels pour identifier une carte et ouvrir sa fiche.",
  },
  {
    title: "Historique, collection & favoris",
    description: "Cartes, quantités, états, achats, favoris et évolution locale regroupés.",
  },
  {
    title: "Suivi du portefeuille",
    description: "Valeur actuelle, investissement, rendement et actifs principaux dans le dashboard.",
  },
  {
    title: "Alertes & opportunités basiques",
    description: "Mouvements et opportunités essentiels détectés sur la collection et les favoris.",
  },
  {
    title: "Recherche FR / EN / JP / CN",
    description: "Recherche par nom ou extension et accès aux fiches détaillées.",
  },
  {
    title: "Prix multi-sources",
    description: "Sources disponibles séparées et cote King_TCG clairement identifiée.",
  },
  {
    title: "PSA : estimation simple",
    description: "Première estimation à partir des images fournies.",
  },
  {
    title: "Export / import local",
    description: "Sauvegarde et restauration des données actuellement présentes.",
  },
  {
    title: "Synchronisation du compte",
    description: "Préparée avec la connexion Google lors de l’activation des comptes.",
  },
] as const;

const premiumHighlights = [
  {
    title: "Tous les modes de scan",
    description: "Mono, Batch et Quadra avec un quota global de 500 scans par mois.",
    icon: ScanLine,
  },
  {
    title: "Dashboard amélioré",
    description: "Tendances marché, lecture stratégique et indicateurs enrichis.",
    icon: BarChart3,
  },
  {
    title: "Alertes Premium",
    description: "Alertes illimitées, cause du mouvement et lecture King_TCG.",
    icon: BellRing,
  },
  {
    title: "Analyse PSA détaillée",
    description: "Contrôles supplémentaires et estimation approfondie par zone.",
    icon: ShieldCheck,
  },
  {
    title: "Opportunités Premium",
    description: "Potentiel estimé, niveau de confiance et signaux prioritaires.",
    icon: Star,
  },
] as const;

export default function AccountManagementPage() {
  const [profile, setProfile] = useState({ nickname: "", email: "" });

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(PROFILE_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      setProfile({
        nickname: typeof parsed?.nickname === "string" ? parsed.nickname : "",
        email: typeof parsed?.email === "string" ? parsed.email : "",
      });
    } catch {
      setProfile({ nickname: "", email: "" });
    }
  }, []);

  return (
    <>
      <Navbar />

      <main className="kt-premium-shell min-h-screen pb-32 text-white">
        <div className="kt-page-wrap space-y-5">
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

          <header className="kt-page-header kt-hero-surface relative overflow-hidden border">
            <div className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-cyan-400/[0.055] blur-3xl" />
            <div className="relative flex items-center gap-4">
              <span className="kt-page-icon flex shrink-0 items-center justify-center text-cyan-300">
                <UserRound className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <h1 className="kt-page-title">
                  Compte <span className="text-cyan-300">KING_TCG</span>
                </h1>
                <p className="kt-page-subtitle mt-1">
                  Gérez votre accès et choisissez la formule adaptée à votre utilisation de King_TCG.
                </p>
              </div>
            </div>
          </header>

          <section className="kt-section-surface rounded-[20px] border p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-cyan-400/25 bg-cyan-400/[0.07] text-cyan-300">
                  <LockKeyhole className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.11em] text-cyan-300">
                    Connexion du compte
                  </p>
                  <h2 className="mt-1 text-[15px] font-black text-white">
                    Accès et synchronisation Google
                  </h2>
                  <p className="mt-1 max-w-xl text-[11px] leading-5 text-zinc-300">
                    La connexion Google associera votre profil et permettra de retrouver les données synchronisées de votre compte King_TCG.
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="inline-flex w-full items-center justify-center gap-3 rounded-[10px] border border-zinc-300 bg-white px-4 py-3 text-[12px] font-bold text-[#202124] shadow-[0_2px_8px_rgba(0,0,0,.22)] transition hover:bg-[#f8f9fa] sm:w-auto"
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 shrink-0">
                  <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.41Z"/>
                  <path fill="#34A853" d="M12 22c2.7 0 4.97-.9 6.62-2.36l-3.24-2.54c-.9.6-2.05.96-3.38.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.62A10 10 0 0 0 12 22Z"/>
                  <path fill="#FBBC05" d="M6.39 13.93A6 6 0 0 1 6.08 12c0-.67.12-1.32.31-1.93V7.45H3.04A10 10 0 0 0 2 12c0 1.61.39 3.14 1.04 4.55l3.35-2.62Z"/>
                  <path fill="#EA4335" d="M12 5.94c1.47 0 2.79.5 3.83 1.5l2.87-2.87A9.63 9.63 0 0 0 12 2a10 10 0 0 0-8.96 5.45l3.35 2.62C7.18 7.7 9.39 5.94 12 5.94Z"/>
                </svg>
                Continuer avec Google
              </button>
            </div>

            <div className="mt-5 grid gap-2 border-t border-cyan-400/[0.12] pt-4 sm:grid-cols-2">
              <div className="kt-subpanel flex items-center gap-3 px-3.5 py-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-400/[0.08] text-cyan-300">
                  <UserRound className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-[9px] font-black uppercase tracking-[0.10em] text-zinc-400">Pseudo</p>
                  <p className="mt-0.5 truncate text-[11px] font-black text-white">
                    {profile.nickname || "Non renseigné"}
                  </p>
                </div>
              </div>

              <div className="kt-subpanel flex items-center gap-3 px-3.5 py-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-400/[0.08] text-cyan-300">
                  <Mail className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-[9px] font-black uppercase tracking-[0.10em] text-zinc-400">Adresse mail</p>
                  <p className="mt-0.5 truncate text-[11px] font-black text-white">
                    {profile.email || "Connexion Google requise"}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section>
            <div className="mb-3 flex items-center gap-3">
              <Crown className="h-4 w-4 text-cyan-300" />
              <h2 className="whitespace-nowrap text-[13px] font-black uppercase tracking-[0.08em] text-cyan-300">
                Choisissez votre formule
              </h2>
              <span className="h-px flex-1 bg-gradient-to-r from-cyan-400/40 to-transparent" />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <article className="kt-plan-card kt-plan-normal relative overflow-hidden rounded-[18px] border p-4 sm:p-5">
                <div className="pointer-events-none absolute -left-20 -top-24 h-56 w-56 rounded-full bg-cyan-400/[0.055] blur-3xl" />
                <div className="pointer-events-none absolute -bottom-28 -right-20 h-64 w-64 rounded-full bg-cyan-400/[0.05] blur-3xl" />

                <div className="relative flex flex-col items-center text-center">
                  <span className="flex h-10 w-10 items-center justify-center rounded-[13px] border border-cyan-400/30 bg-cyan-400/[0.08] text-cyan-300 shadow-[0_0_24px_rgba(34,211,238,.10)]">
                    <ShieldCheck className="h-5 w-5" />
                  </span>

                  <h3 className="mt-3 text-[17px] font-black tracking-tight text-white sm:text-[19px]">
                    <span className="text-cyan-300">NORMAL</span> KING_TCG
                  </h3>

                  <p className="mt-1 text-[12px] font-medium text-zinc-200">
                    Les fonctions essentielles de King_TCG au quotidien.
                  </p>

                  <div className="mt-4 flex items-end justify-center gap-2">
                    <span className="text-[26px] font-black tracking-tight text-white sm:text-[30px]">
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

                  <div className="kt-feature-list overflow-hidden rounded-[16px] bg-black/15">
                    {normalFeatures.map((feature, index) => (
                      <div
                        key={feature.title}
                        className={`flex items-center gap-3 px-3.5 py-3 ${
                          index > 0 ? "border-t border-white/[0.06]" : ""
                        }`}
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-400/[0.07] text-cyan-300">
                          <Check className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex-1 text-left">
                          <p className="text-[11px] font-black text-white">{feature.title}</p>
                          <p className="mt-0.5 text-[10px] leading-4 text-zinc-300">{feature.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-[14px] border border-cyan-400/30 bg-cyan-400/[0.05] px-4 py-3.5 text-[11px] font-black uppercase tracking-[0.06em] text-cyan-300">
                    <ShieldCheck className="h-4 w-4" />
                    Formule actuelle
                  </div>
                </div>
              </article>

              <article className="kt-plan-card kt-plan-premium relative overflow-hidden rounded-[18px] border p-4 sm:p-5">
                <div className="pointer-events-none absolute -left-20 -top-24 h-56 w-56 rounded-full bg-[#f5c451]/[0.055] blur-3xl" />
                <div className="pointer-events-none absolute -bottom-28 -right-20 h-64 w-64 rounded-full bg-[#f5c451]/[0.05] blur-3xl" />

                <div className="relative flex flex-col items-center text-center">
                  <span className="flex h-10 w-10 items-center justify-center rounded-[13px] border border-[#f5c451]/30 bg-[#f5c451]/[0.08] text-[#f5c451] shadow-[0_0_24px_rgba(245,196,81,.10)]">
                    <Crown className="h-5 w-5" />
                  </span>

                  <h3 className="mt-3 text-[17px] font-black tracking-tight text-white sm:text-[19px]">
                    <span className="text-[#f5c451]">PREMIUM</span> KING_TCG
                  </h3>

                  <p className="mt-1 text-[12px] font-medium text-zinc-200">
                    Débloquez les fonctions avancées de King_TCG.
                  </p>

                  <div className="mt-4 flex items-end justify-center gap-2">
                    <span className="text-[26px] font-black tracking-tight text-white sm:text-[30px]">
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
                  <div className="mb-3 flex items-center gap-3">
                    <Sparkles className="h-4 w-4 text-[#f5c451]" />
                    <h4 className="whitespace-nowrap text-[12px] font-black uppercase tracking-[0.08em] text-[#f5c451]">
                      Ce qui est inclus
                    </h4>
                    <span className="h-px flex-1 bg-gradient-to-r from-[#f5c451]/45 to-transparent" />
                  </div>

                  <div className="kt-feature-list overflow-hidden rounded-[16px] bg-black/15">
                    {premiumHighlights.map(({ title, description, icon: Icon }, index) => (
                      <div
                        key={title}
                        className={`flex items-center gap-3 px-3.5 py-3 ${
                          index > 0 ? "border-t border-white/[0.06]" : ""
                        }`}
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#f5c451]/[0.08] text-[#f5c451]">
                          <Icon className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex-1 text-left">
                          <p className="text-[11px] font-black text-white">{title}</p>
                          <p className="mt-0.5 text-[10px] leading-4 text-zinc-300">{description}</p>
                        </div>
                      </div>
                    ))}
                    <div className="border-t border-white/[0.06] px-3.5 py-3 text-left">
                      <p className="text-[10px] leading-4 text-zinc-300">
                        Inclut également toutes les fonctions de la formule Normal.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-[14px] border border-[#f5c451]/50 bg-gradient-to-r from-[#8a5b08] via-[#b77908] to-[#7a4b05] px-4 py-3 text-[10px] font-black uppercase tracking-[0.06em] text-white shadow-[0_14px_34px_rgba(245,196,81,.11)] transition hover:brightness-110"
                  >
                    <Crown className="h-4 w-4" />
                    Passer Premium · 4,99 € / mois
                  </button>
                </div>
              </article>
            </div>
          </section>

          <section className="kt-section-surface rounded-[20px] border p-5 sm:p-6">
            <div className="mb-4 flex items-center gap-3">
              <Sparkles className="h-4 w-4 text-[#f5c451]" />
              <h2 className="whitespace-nowrap text-[13px] font-black uppercase tracking-[0.08em] text-white">
                Avantages Premium
              </h2>
              <span className="h-px flex-1 bg-gradient-to-r from-[#f5c451]/35 to-transparent" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="kt-benefit-tile rounded-[16px] p-4 text-center">
                <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-[#f5c451]/[0.07] text-[#f5c451]">
                  <ScanLine className="h-5 w-5" />
                </span>
                <p className="mt-3 text-[11px] font-black text-white">Tous les modes de scan</p>
                <p className="mt-1 text-[10px] leading-4 text-zinc-300">Mono, Batch et Quadra</p>
              </div>

              <div className="kt-benefit-tile rounded-[16px] p-4 text-center">
                <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-[#f5c451]/[0.07] text-[#f5c451]">
                  <BarChart3 className="h-5 w-5" />
                </span>
                <p className="mt-3 text-[11px] font-black text-white">Dashboard amélioré</p>
                <p className="mt-1 text-[10px] leading-4 text-zinc-300">Analyses Premium et tendances marché</p>
              </div>

              <div className="kt-benefit-tile rounded-[16px] p-4 text-center">
                <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-[#f5c451]/[0.07] text-[#f5c451]">
                  <ShieldCheck className="h-5 w-5" />
                </span>
                <p className="mt-3 text-[11px] font-black text-white">PSA détaillée</p>
                <p className="mt-1 text-[10px] leading-4 text-zinc-300">Contrôles et estimation approfondie</p>
              </div>

              <div className="kt-benefit-tile rounded-[16px] p-4 text-center">
                <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-[#f5c451]/[0.07] text-[#f5c451]">
                  <Star className="h-5 w-5" />
                </span>
                <p className="mt-3 text-[11px] font-black text-white">Fonctions Premium</p>
                <p className="mt-1 text-[10px] leading-4 text-zinc-300">Alertes et opportunités enrichies</p>
              </div>
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
