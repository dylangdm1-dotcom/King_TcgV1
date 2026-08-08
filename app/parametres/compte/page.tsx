"use client";

import { useState } from "react";
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
  Zap,
} from "lucide-react";
import Navbar from "../../../components/Navbar";

export default function AccountManagementPage() {
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [isSubLoading, setIsSubLoading] = useState(false);

  const handleGoogleLogin = () => {
    setIsAuthLoading(true);
    setTimeout(() => {
      alert("La connexion Google sera disponible dans une prochaine mise à jour.");
      setIsAuthLoading(false);
    }, 1200);
  };

  const handleSubscribe = () => {
    setIsSubLoading(true);
    setTimeout(() => {
      alert("Le système d'abonnement Premium sera disponible prochainement.");
      setIsSubLoading(false);
    }, 1200);
  };

  const features = [
    "Quota de scans mensuel étendu",
    "Synchronisation Cloud de la collection",
    "Historique de prix avancé",
    "Analyses et statistiques enrichies",
    "Sauvegarde multi-appareils",
    "Accès anticipé aux nouveautés",
    "Support prioritaire",
  ];

  return (
    <>
      <Navbar />

      <main className="kt-premium-shell min-h-screen pb-32 text-white">
        <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:px-6">
          <Link
            href="/parametres"
            className="kt-premium-button-secondary inline-flex items-center gap-2 px-3.5 py-2 text-[9px] uppercase tracking-wider"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Retour aux paramètres
          </Link>

          <section className="kt-premium-panel relative overflow-hidden rounded-[26px] p-5 sm:p-7">
            <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-cyan-400/[0.07] blur-3xl" />
            <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-4">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] border border-cyan-300/20 bg-cyan-400/[0.08] text-cyan-300 shadow-[0_0_34px_rgba(34,211,238,0.09)]">
                  <UserRound className="h-7 w-7" />
                </span>
                <div>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/15 bg-cyan-400/[0.06] px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.16em] text-cyan-300">
                    <LockKeyhole className="h-3 w-3" />
                    Espace personnel
                  </span>
                  <h1 className="mt-3 text-xl font-black tracking-tight sm:text-2xl">
                    Gestion du compte
                  </h1>
                  <p className="mt-1 text-xs font-bold text-zinc-400">
                    Profil, sauvegarde et futurs services Premium
                  </p>
                  <p className="mt-3 max-w-2xl text-[11px] leading-5 text-zinc-500">
                    Les fonctions de compte sont en préparation. Votre collection actuelle reste stockée localement tant qu’aucune connexion Cloud n’est activée.
                  </p>
                </div>
              </div>
              <span className="w-fit rounded-full border border-amber-400/15 bg-amber-400/[0.06] px-3 py-1.5 text-[8px] font-black uppercase tracking-[0.14em] text-amber-300">
                Prochainement
              </span>
            </div>
          </section>

          <section className="grid gap-3 sm:grid-cols-3">
            {[
              { icon: Database, label: "Données actuelles", value: "Stockage local" },
              { icon: Cloud, label: "Synchronisation", value: "En préparation" },
              { icon: ShieldCheck, label: "Confidentialité", value: "Contrôle utilisateur" },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="kt-premium-panel rounded-[20px] p-4">
                <Icon className="h-4 w-4 text-cyan-300" />
                <p className="mt-3 text-[8px] font-black uppercase tracking-[0.14em] text-zinc-500">
                  {label}
                </p>
                <p className="mt-1 text-[11px] font-black text-white">{value}</p>
              </div>
            ))}
          </section>

          <section className="kt-premium-panel rounded-[24px] p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-cyan-400/15 bg-cyan-400/[0.06] text-cyan-300">
                <Cloud className="h-5 w-5" />
              </span>
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.14em] text-cyan-300">
                  Compte & synchronisation
                </p>
                <h2 className="mt-1 text-base font-black text-white">
                  Retrouvez votre collection sur tous vos appareils
                </h2>
                <p className="mt-2 max-w-2xl text-[11px] leading-5 text-zinc-500">
                  La future connexion permettra de sauvegarder la collection, les favoris, les alertes et les préférences. Aucune migration n’est lancée aujourd’hui sans action explicite de votre part.
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-[20px] border border-white/[0.07] bg-black/20 p-4">
              <button
                onClick={handleGoogleLogin}
                disabled={isAuthLoading}
                className="flex w-full items-center justify-center gap-2.5 rounded-2xl bg-white px-5 py-3 text-xs font-black text-black transition hover:bg-zinc-100 active:scale-[0.98] disabled:opacity-50 sm:w-auto"
              >
                <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#EA4335" d="M5.266 9.765A7.077 7.077 0 0 1 12 4.909c1.69 0 3.218.6 4.418 1.582L19.91 3A11.945 11.945 0 0 0 12 .909a11.944 11.944 0 0 0-8.527 3.518l1.793 5.338Z" />
                  <path fill="#4285F4" d="M23.455 12.273c0-.818-.073-1.609-.209-2.373H12v4.509h6.427a5.51 5.51 0 0 1-2.391 3.618v3.009h3.864c2.264-2.09 3.555-5.173 3.555-8.763Z" />
                  <path fill="#FBBC05" d="M5.266 14.235 3.473 19.573A11.944 11.944 0 0 0 12 23.091c3.155 0 6.027-1.018 8.245-2.773l-3.864-3.01a7.116 7.116 0 0 1-4.381 1.374 7.078 7.078 0 0 1-6.734-4.855Z" />
                  <path fill="#34A853" d="M1.055 7.618A11.943 11.943 0 0 0 .91 12c0 1.582.31 3.1.864 4.5l3.49-4.264L5.267 9.764l-4.212-2.146Z" />
                </svg>
                {isAuthLoading ? "Connexion…" : "Continuer avec Google"}
              </button>
              <p className="mt-3 text-[9px] leading-4 text-zinc-500">
                Bouton de prévisualisation : l’authentification réelle n’est pas encore activée.
              </p>
            </div>
          </section>

          <section className="kt-premium-panel relative overflow-hidden rounded-[24px] p-5 sm:p-6">
            <div className="pointer-events-none absolute -bottom-24 -right-24 h-60 w-60 rounded-full bg-cyan-400/[0.05] blur-3xl" />
            <div className="relative grid gap-6 lg:grid-cols-[1fr_0.9fr] lg:items-start">
              <div>
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-400/15 bg-cyan-400/[0.06] text-cyan-300">
                    <Crown className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.14em] text-cyan-300">
                      King_TCG Premium
                    </p>
                    <h2 className="mt-1 text-lg font-black text-white">
                      Une expérience enrichie, sans masquer l’essentiel
                    </h2>
                  </div>
                </div>
                <p className="mt-4 text-[11px] leading-5 text-zinc-500">
                  L’offre Premium est une présentation de la future formule. Les fonctionnalités gratuites actuelles restent accessibles et aucun paiement n’est actif dans cette version.
                </p>

                <div className="mt-5 flex items-end gap-2">
                  <span className="text-3xl font-black tabular-nums text-white">5,99 €</span>
                  <span className="pb-1 text-[10px] font-bold uppercase text-zinc-500">/ mois envisagé</span>
                </div>

                <button
                  onClick={handleSubscribe}
                  disabled={isSubLoading}
                  className="kt-premium-button-primary mt-5 inline-flex w-full items-center justify-center gap-2 px-5 py-3 text-[10px] uppercase tracking-wider sm:w-auto"
                >
                  <Sparkles className="h-4 w-4" />
                  {isSubLoading ? "Ouverture…" : "Découvrir Premium"}
                </button>
              </div>

              <div className="rounded-[20px] border border-white/[0.07] bg-black/20 p-4">
                <p className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.14em] text-zinc-500">
                  <Zap className="h-3.5 w-3.5 text-cyan-300" />
                  Fonctions envisagées
                </p>
                <ul className="mt-4 space-y-3">
                  {features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-[10px] leading-4 text-zinc-400">
                      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-cyan-400/15 bg-cyan-400/[0.06] text-cyan-300">
                        <Check className="h-2.5 w-2.5" />
                      </span>
                      {feature}
                    </li>
                  ))}
                </ul>
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
