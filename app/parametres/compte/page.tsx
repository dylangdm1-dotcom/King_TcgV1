"use client";

import { useState } from "react";
import Link from "next/link";
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
    "Jusqu'à 1 200 scans par mois",
    "Synchronisation Cloud de la collection",
    "Historique avancé des prix",
    "Analyses et statistiques enrichies",
    "Sauvegarde sécurisée",
    "Accès anticipé aux nouvelles fonctionnalités",
    "Support prioritaire",
  ];

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-black text-white pb-20 selection:bg-cyan-500/10">
        <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:px-6">
          
          <div className="flex items-center justify-between">
            <Link
              href="/parametres"
              className="inline-flex items-center gap-1.5 text-zinc-500 hover:text-white transition-colors font-black text-[9px] uppercase tracking-wider bg-neutral-950/40 border border-zinc-900 px-3 py-2 rounded-xl"
            >
              Retour aux Paramètres
            </Link>
          </div>

          {/* En-tête Technique */}
          <section className="rounded-xl border border-zinc-900 bg-neutral-950/40 p-4 sm:p-5">
            <span className="text-[9px] font-black uppercase tracking-wider text-zinc-500">Compte utilisateur</span>
            <h1 className="mt-0.5 text-lg font-black uppercase tracking-tight text-white">Mon compte</h1>
          </section>

          <div className="space-y-4">
            
            {/* SECTION 1 : AUTHENTIFICATION */}
            <section className="rounded-xl border border-zinc-900 bg-neutral-950/40 p-5">
              <div className="space-y-1">
                <span className="text-[9px] font-black uppercase tracking-wider text-zinc-500">Sécurisation & Synchronisation</span>
                <h2 className="text-sm font-black text-white uppercase tracking-tight">Compte & Synchronisation</h2>
                <p className="text-xs text-zinc-400 font-medium leading-relaxed max-w-2xl pt-1">
                  La création de compte sera bientôt disponible pour vous permettre de sauvegarder automatiquement votre collection, sécuriser votre portefeuille, retrouver vos favoris et synchroniser l'ensemble de vos données sur tous vos appareils.
                </p>
              </div>

              <div className="mt-5 border-t border-zinc-900/60 pt-4">
                <button
                  onClick={handleGoogleLogin}
                  disabled={isAuthLoading}
                  className="flex w-full sm:w-auto items-center justify-center gap-2.5 rounded-md bg-white px-4 py-2.5 text-xs font-black text-black transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                >
                  <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#EA4335"
                      d="M5.266 9.765A7.077 7.077 0 0 1 12 4.909c1.69 0 3.218.6 4.418 1.582L19.91 3A11.945 11.945 0 0 0 12 .909a11.944 11.944 0 0 0-8.527 3.518l1.793 5.338Z"
                    />
                    <path
                      fill="#4285F4"
                      d="M23.455 12.273c0-.818-.073-1.609-.209-2.373H12v4.509h6.427a5.51 5.51 0 0 1-2.391 3.618v3.009h3.864c2.264-2.09 3.555-5.173 3.555-8.763Z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.266 14.235 3.473 19.573A11.944 11.944 0 0 0 12 23.091c3.155 0 6.027-1.018 8.245-2.773l-3.864-3.01a7.116 7.116 0 0 1-4.381 1.374 7.078 7.078 0 0 1-6.734-4.855Z"
                    />
                    <path
                      fill="#34A853"
                      d="M1.055 7.618A11.943 11.943 0 0 0 .91 12c0 1.582.31 3.1.864 4.5l3.49-4.264L5.267 9.764l-4.212-2.146Z"
                    />
                  </svg>
                  <span>{isAuthLoading ? "Connexion..." : "Continuer avec Google"}</span>
                </button>
              </div>
            </section>

            {/* SECTION 2 : SUBSCRIPTION LICENCE */}
            <section className="rounded-xl border border-zinc-900 bg-neutral-950/40 p-5">
              <div className="space-y-1">
                <span className="text-[9px] font-black uppercase tracking-wider text-zinc-500">King_TCG Premium</span>
                <h2 className="text-sm font-black text-white uppercase tracking-tight">Abonnement Premium</h2>
                <p className="text-xs text-zinc-400 font-medium leading-relaxed max-w-2xl pt-1">
                  Le mode Premium donnera accès aux fonctionnalités avancées de King_TCG ainsi qu'aux futurs services en ligne.
                </p>
              </div>

              <div className="mt-5 border-t border-zinc-900/60 pt-4">
                <div className="relative overflow-hidden rounded-xl border border-zinc-900 bg-neutral-950 p-5 max-w-md">
                  
                  <div className="absolute top-4 right-4 rounded bg-cyan-500/5 border border-cyan-500/20 px-2 py-0.5 text-[8px] font-black uppercase tracking-widest text-cyan-400">
                    PREMIUM
                  </div>

                  <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">King_TCG Premium</p>
                  
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-2xl font-black tracking-tight text-white tabular-nums">5,99 €</span>
                    <span className="text-[10px] font-bold text-zinc-600 uppercase">/ mois</span>
                  </div>

                  <ul className="mt-5 space-y-2 border-t border-zinc-900/60 pt-3">
                    {features.map((feat, index) => (
                      <li key={index} className="flex items-start gap-2 text-xs text-zinc-400 font-medium leading-tight">
                        <span className="text-cyan-500 font-black text-[11px] select-none shrink-0 mt-0.5">▪</span>
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={handleSubscribe}
                    disabled={isSubLoading}
                    className="mt-5 w-full flex items-center justify-center rounded bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-black py-2.5 transition-colors uppercase tracking-wider disabled:opacity-50 cursor-pointer"
                  >
                    {isSubLoading ? "Ouverture..." : "Découvrir Premium"}
                  </button>
                </div>
              </div>
            </section>

          </div>

          {/* Pied de page King_TCG standardisé */}
          <footer className="mt-16 text-center border-t border-zinc-900 pt-6">
            <p className="text-[9px] font-black text-zinc-700 uppercase tracking-[0.3em]">
              King_TCG • Collection Manager • Version 1.x
            </p>
          </footer>
        </div>
      </main>
    </>
  );
}