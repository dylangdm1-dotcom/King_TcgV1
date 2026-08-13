"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Cloud,
  Crown,
  Database,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  UserRound,
  X,
  Zap,
} from "lucide-react";
import Navbar from "../../../components/Navbar";

const normalFeatures = [
  "Recherche FR / EN / JP / CN et fiches cartes",
  "Prix multi-sources et cote King_TCG",
  "Collection, favoris et fonctions principales du tableau de bord",
  "Alertes et opportunités avec informations principales",
  "Scanner Mono avec quota réduit : 20 à 30 scans / mois à finaliser",
  "PSA : estimation simple à partir de l’image",
  "Historique et graphiques disponibles dans l’application",
  "Export / import des données locales",
];

const premiumPlanned = [
  "Scanner Mono, Batch et Quad",
  "Quota scanner Premium envisagé : environ 500 scans / mois",
  "PSA : analyse détaillée avec informations et questions supplémentaires",
  "Opportunités : Analyse Premium avec potentiel estimé et confiance King_TCG",
  "Alertes : Analyse Premium avec cause du mouvement et lecture King_TCG",
  "Dashboard amélioré : contenu Premium exact encore à définir",
];

function FeatureRow({ children, active = true }: { children: React.ReactNode; active?: boolean }) {
  return (
    <li className="flex items-start gap-2.5 text-[10px] leading-4 text-zinc-400">
      <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${active ? "border-emerald-400/20 bg-emerald-400/[0.07] text-emerald-300" : "border-zinc-700 bg-zinc-900 text-zinc-500"}`}>
        {active ? <Check className="h-2.5 w-2.5" /> : <X className="h-2.5 w-2.5" />}
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
                  <p className="mt-1 text-xs font-bold text-zinc-400">Compte Normal et formule Premium</p>
                  <p className="mt-3 max-w-2xl text-[11px] leading-5 text-zinc-500">
                    Cette page présente la répartition prévue entre le compte Normal et la formule Premium. Les comptes et abonnements Premium ne sont pas encore activés dans cette version de test.
                  </p>
                </div>
              </div>
              <span className="w-fit rounded-full border border-emerald-400/15 bg-emerald-400/[0.06] px-3 py-1.5 text-[8px] font-black uppercase tracking-[0.14em] text-emerald-300">
                Version test
              </span>
            </div>
          </section>

          <section className="grid gap-3 sm:grid-cols-3">
            {[
              { icon: Database, label: "Compte actuel", value: "Version test" },
              { icon: ShieldCheck, label: "Compte Normal", value: "Fonctions principales" },
              { icon: Crown, label: "Premium", value: "Non actif" },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="kt-premium-panel rounded-[20px] p-4">
                <Icon className="h-4 w-4 text-cyan-300" />
                <p className="mt-3 text-[8px] font-black uppercase tracking-[0.14em] text-zinc-500">{label}</p>
                <p className="mt-1 text-[11px] font-black text-white">{value}</p>
              </div>
            ))}
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <div className="kt-premium-panel rounded-[24px] p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.06] text-emerald-300">
                    <UserRound className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.14em] text-emerald-300">Normal</p>
                    <h2 className="mt-1 text-lg font-black text-white">Fonctions prévues</h2>
                  </div>
                </div>
                <span className="rounded-full border border-emerald-400/15 bg-emerald-400/[0.06] px-2.5 py-1 text-[8px] font-black uppercase text-emerald-300">Prévu</span>
              </div>
              <p className="mt-4 text-[11px] leading-5 text-zinc-500">
                Le compte Normal conserve les fonctions principales de King_TCG. Les quotas ci-dessous correspondent à la répartition prévue et seront appliqués lorsque les comptes seront activés.
              </p>
              <ul className="mt-5 space-y-3">
                {normalFeatures.map((feature) => <FeatureRow key={feature}>{feature}</FeatureRow>)}
              </ul>
            </div>

            <div className="kt-premium-panel relative overflow-hidden rounded-[24px] p-5 sm:p-6">
              <div className="pointer-events-none absolute -bottom-24 -right-24 h-60 w-60 rounded-full bg-cyan-400/[0.05] blur-3xl" />
              <div className="relative">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-400/15 bg-cyan-400/[0.06] text-cyan-300">
                      <Crown className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-[0.14em] text-cyan-300">Premium</p>
                      <h2 className="mt-1 text-lg font-black text-white">Fonctions Premium prévues</h2>
                    </div>
                  </div>
                  <span className="rounded-full border border-amber-400/15 bg-amber-400/[0.06] px-2.5 py-1 text-[8px] font-black uppercase text-amber-300">Non actif</span>
                </div>

                <p className="mt-4 text-[11px] leading-5 text-zinc-500">
                  Le Premium n’est pas encore activé. La liste ci-dessous contient uniquement les différences déjà validées pour préparer l’intégration des comptes, sans ajouter de fonctions non décidées.
                </p>

                <ul className="mt-5 space-y-3">
                  {premiumPlanned.map((feature) => <FeatureRow key={feature} active={false}>{feature}</FeatureRow>)}
                </ul>

                <div className="mt-5 rounded-[18px] border border-cyan-400/12 bg-cyan-400/[0.04] p-4">
                  <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.13em] text-cyan-300">
                    <Zap className="h-3.5 w-3.5" />
                    Principe produit
                  </div>
                  <p className="mt-2 text-[10px] leading-4 text-zinc-500">
                    Le Premium ajoute des analyses et capacités avancées sans retirer les fonctions principales du compte Normal. Les quotas restent ajustables tant que les comptes ne sont pas activés.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="kt-premium-panel rounded-[24px] p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-cyan-400/15 bg-cyan-400/[0.06] text-cyan-300">
                <Cloud className="h-5 w-5" />
              </span>
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.14em] text-cyan-300">Activation des comptes</p>
                <h2 className="mt-1 text-base font-black text-white">Normal / Premium en préparation</h2>
                <p className="mt-2 max-w-3xl text-[11px] leading-5 text-zinc-500">
                  La séparation Normal / Premium est préparée dans l’interface, mais les droits réels ne sont pas encore reliés à un compte utilisateur. Les fonctions actuelles restent donc accessibles en version test.
                </p>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 rounded-[18px] border border-white/[0.07] bg-black/20 p-3 text-[10px] text-zinc-500">
              <Sparkles className="h-4 w-4 shrink-0 text-cyan-300" />
              Authentification, abonnement et contrôle réel des droits Premium restent désactivés dans cette version de test.
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
