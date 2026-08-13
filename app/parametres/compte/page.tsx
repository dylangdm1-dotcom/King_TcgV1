"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Crown,
  LockKeyhole,
  ShieldCheck,
  UserRound,
  Zap,
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

const premiumFeatures = [
  "Toutes les fonctions du Compte Normal",
  "Scanner Mono, Batch et Quad",
  "500 scans par mois au total, quota partagé entre les 3 modes",
  "PSA : analyse détaillée avec informations et questions supplémentaires",
  "Opportunités : Analyse Premium avec potentiel estimé et confiance King_TCG",
  "Alertes : Analyse Premium avec cause du mouvement et lecture King_TCG",
  "Dashboard amélioré",
];

function FeatureRow({ children, premium = false }: { children: React.ReactNode; premium?: boolean }) {
  return (
    <li className="flex items-start gap-2.5 text-[10px] leading-4 text-zinc-400">
      <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${premium ? "border-cyan-400/20 bg-cyan-400/[0.07] text-cyan-300" : "border-emerald-400/20 bg-emerald-400/[0.07] text-emerald-300"}`}>
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
          <Link href="/parametres" className="kt-premium-button-secondary inline-flex items-center gap-2 px-3.5 py-2 text-[9px] uppercase tracking-wider">
            <ArrowLeft className="h-3.5 w-3.5" />
            Retour aux paramètres
          </Link>

          <section className="kt-premium-panel relative overflow-hidden rounded-[26px] p-5 sm:p-7">
            <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-cyan-400/[0.07] blur-3xl" />
            <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-4">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] border border-cyan-300/20 bg-cyan-400/[0.08] text-cyan-300">
                  <UserRound className="h-7 w-7" />
                </span>
                <div>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/15 bg-cyan-400/[0.06] px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.16em] text-cyan-300">
                    <LockKeyhole className="h-3 w-3" />
                    Compte King_TCG
                  </span>
                  <h1 className="mt-3 text-xl font-black tracking-tight sm:text-2xl">Gestion du compte</h1>
                  <p className="mt-1 text-xs font-bold text-zinc-400">Gérez votre compte et votre abonnement King_TCG</p>
                </div>
              </div>

              <button type="button" className="kt-premium-button-secondary inline-flex w-full items-center justify-center gap-2 px-4 py-2.5 text-[10px] font-black sm:w-auto">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[11px] font-black text-black">G</span>
                Connexion avec Google
              </button>
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <div className="kt-premium-panel rounded-[24px] p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.06] text-emerald-300">
                    <ShieldCheck className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.14em] text-emerald-300">Compte Normal</p>
                    <h2 className="mt-1 text-lg font-black text-white">0 € / mois</h2>
                  </div>
                </div>
                <span className="rounded-full border border-emerald-400/15 bg-emerald-400/[0.06] px-2.5 py-1 text-[8px] font-black uppercase text-emerald-300">Gratuit</span>
              </div>

              <p className="mt-4 text-[11px] leading-5 text-zinc-500">
                L’essentiel de King_TCG pour rechercher, suivre et gérer sa collection au quotidien.
              </p>

              <div className="mt-4 rounded-[18px] border border-emerald-400/10 bg-emerald-400/[0.03] p-3">
                <p className="text-[9px] font-black uppercase tracking-[0.12em] text-emerald-300">Quota scanner</p>
                <p className="mt-1 text-sm font-black text-white">30 scans / mois</p>
                <p className="mt-1 text-[9px] text-zinc-500">Quota global du compte Normal.</p>
              </div>

              <ul className="mt-5 space-y-3">
                {normalFeatures.map((feature) => <FeatureRow key={feature}>{feature}</FeatureRow>)}
              </ul>
            </div>

            <div className="kt-premium-panel relative overflow-hidden rounded-[24px] border-cyan-400/20 p-5 sm:p-6">
              <div className="pointer-events-none absolute -bottom-24 -right-24 h-60 w-60 rounded-full bg-cyan-400/[0.07] blur-3xl" />
              <div className="relative">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-400/15 bg-cyan-400/[0.06] text-cyan-300">
                      <Crown className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-[0.14em] text-cyan-300">Compte Premium</p>
                      <div className="mt-1 flex items-end gap-1.5">
                        <h2 className="text-lg font-black text-white">6,99 €</h2>
                        <span className="pb-0.5 text-[9px] font-bold text-zinc-500">/ mois</span>
                      </div>
                    </div>
                  </div>
                  <span className="rounded-full border border-cyan-400/15 bg-cyan-400/[0.06] px-2.5 py-1 text-[8px] font-black uppercase text-cyan-300">Premium</span>
                </div>

                <p className="mt-4 text-[11px] leading-5 text-zinc-500">
                  Pour profiter de tous les modes de scan et des analyses avancées King_TCG.
                </p>

                <div className="mt-4 rounded-[18px] border border-cyan-400/12 bg-cyan-400/[0.04] p-3">
                  <p className="text-[9px] font-black uppercase tracking-[0.12em] text-cyan-300">Quota scanner global</p>
                  <p className="mt-1 text-sm font-black text-white">500 scans / mois</p>
                  <p className="mt-1 text-[9px] leading-4 text-zinc-500">Un seul quota partagé entre Mono, Batch et Quad.</p>
                </div>

                <ul className="mt-5 space-y-3">
                  {premiumFeatures.map((feature) => <FeatureRow key={feature} premium>{feature}</FeatureRow>)}
                </ul>

                <button type="button" className="kt-premium-button mt-6 inline-flex w-full items-center justify-center gap-2 px-4 py-3 text-[10px] font-black uppercase tracking-[0.1em]">
                  <Crown className="h-4 w-4" />
                  Passer au Premium — 5,99 € / mois
                </button>
              </div>
            </div>
          </section>

          <section className="kt-premium-panel rounded-[24px] p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-cyan-400/15 bg-cyan-400/[0.06] text-cyan-300">
                <Zap className="h-5 w-5" />
              </span>
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.14em] text-cyan-300">Abonnement Premium</p>
                <h2 className="mt-1 text-base font-black text-white">Plus d’analyse, plus de scans</h2>
                <p className="mt-2 max-w-3xl text-[11px] leading-5 text-zinc-500">
                  Le quota Premium de 500 scans est commun aux trois modes du scanner : chaque carte analysée consomme le même quota mensuel, qu’elle soit scannée en Mono, Batch ou Quad.
                </p>
              </div>
            </div>
          </section>

          <footer className="border-t border-white/[0.06] pt-6 text-center">
            <p className="text-[10px] font-black tracking-[0.18em] text-white">King_TCG</p>
            <p className="mt-1 text-[9px] font-bold text-zinc-500">Pokémon Trading Card Companion</p>
          </footer>
        </div>
      </main>
    </>
  );
}
